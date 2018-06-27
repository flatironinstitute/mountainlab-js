exports.MLClientImpl = MLClientImpl;
exports.stop_all_processes = stop_all_processes;

const EventEmitter = require('events');
class MyEmitter extends EventEmitter {}

const timeout = ms => new Promise(res => setTimeout(res, ms));

function MLClientImpl() {
  let m_jobs = {};

  this.addProcess = function(processor_name, inputs, outputs, parameters, opts) {
  	if (!inputs) {
  		A=processor_name;
  		processor_name=A.processor_name;
  		inputs=A.inputs||{};
  		outputs=A.outputs||{};
  		parameters=A.parameters||{};
  		opts=A.opts||{};
  	}
    let job_id = make_random_id(10);
    let JJ = {
      id: job_id,
      processor_name: processor_name,
      inputs: inputs,
      outputs: outputs,
      parameters: parameters,
      opts: opts
    };
    JJ.input_files = flatten_iops(inputs);
    JJ.output_files = flatten_iops(outputs);
    JJ.status = 'pending';
    m_jobs[job_id] = JJ;
  };

  this.run = async function() {
  	try {
  		let last_status_string='';
	    while (true) {
	      let num_running = 0;
	      let num_finished = 0;
	      let num_pending = 0;
	      let num_canceled = 0;
	      let num_stopped = 0;
	      for (let id in m_jobs) {
	        let job = m_jobs[id];
	        if (job.status == 'running') {
	          num_running++;
	        } else if (job.status == 'error') {
	          throw new Error(`Error running process ${job.processor_name}: ` + job.error);
	        } else if (job.status == 'finished') {
	          num_finished++;
	        } else if (job.status == 'pending') {
	          if (input_files_are_ready(job)) {
	            start_job(job);
	            num_running++;
	          } else {
	            num_pending++;
	          }
	        }
	        else if (job.status=='canceled') {
	        	num_canceled++;
	        }
	        else if (job.status=='stopped') {
	        	num_stopped++;
	        }
	      }
	      
	      let status_string=`JOBS: pending:${num_pending} running:${num_running} finished:${num_finished}`;
	      if (status_string!=last_status_string) {
	      	console.info(status_string);
	      }
	      last_status_string=status_string;

	      if ((num_running == 0) && (num_pending == 0)) {
	        return true;
	      }
	      if ((num_running == 0) && (num_pending > 0)) {
	        throw new Error('Error running pipeline. Are there cyclic dependencies?');
	      }
	      
	      await timeout(500);
	    }
	  }
	  catch(err) {
	  	for (let id in m_jobs) {
	  		let job=m_jobs[id];
	  		if (job.status=='running')
	  			job.status='stopped';
	  		else if (job.status=='pending')
	  			job.status='canceled';
	  	}
	  	stop_all_processes();
	  	throw(err);
	  }
  }

  function start_job(job) {
    job.status = 'running';
    let inputs_list = create_args_list(job.inputs);
    let outputs_list = create_args_list(job.outputs);
    let params_list = create_args_list(job.parameters);
    let opts_list = [];
    let mode = job.opts.mode||'run';
    let cmd = `${__dirname}/../../mlproc/mlproc run-process --mode=${mode} ${job.processor_name} -i ${inputs_list.join(' ')} -o ${outputs_list.join(' ')} -p ${params_list.join(' ')} ${opts_list.join(' ')}`;
    console.info('Running: ' + cmd);
    run_cmd(cmd).then(function() {
        if (job.status=='running') { //not stoped
          job.status = 'finished';
        }
      })
      .catch(function(err) {
        if (job.status=='running') { //not stopped
          job.status = 'error';
          job.error = err.message;
        }
      });
  }

  function input_files_are_ready(job) {
    for (fname in job.input_files) {
      for (id in m_jobs) {
      	let job2=m_jobs[id];
      	if ((job2.status=='pending')||(job2.status=='running')) {
	        if ((fname in job2.output_files)||(fname+'.prv' in job2.output_files)) {
	          if (job.id == job2.id) {
	            throw new Error(`Input file cannot be same as output file in ${job.processor_name}`);
	          }
	          return false;
	        }
	      }
      }
    }
    return true;
  }
}

function flatten_iops(X) {
  let ret = {};
  for (let key in X) {
    let val = X[key];
    if (typeof(val) != 'object') {
      ret[val] = true;
    } else {
      for (let i in val) {
        ret[val[i]] = true;
      }
    }
  }
  return ret;
}

function run_cmd(cmd) {
  return new Promise(function(resolve, reject) {
    let SP = new SysProc();
    SP.setCommand(cmd);
    SP.onFinished(function() {
      resolve({});
    });
    SP.onError(function(err) {
      reject(err);
    });
    SP.onStdout(function(txt) {
      console.info(txt.trim());
    });
    SP.onStderr(function(txt) {
      console.error(txt.trim());
    });
    SP.start();
  });
}

function create_args_list(iops) {
  let ret = [];
  for (let key in iops) {
    let val = iops[key];
    if (typeof(val) != 'object') {
      ret.push(`${key}:${val}`);
    } else {
      for (let i in val) {
        ret.push(`${key}:${val[i]}`);
      }
    }
  }
  return ret;
}

const all_processes = [];

function stop_all_processes() {
  for (let i in all_processes) {
    if (all_processes[i]) {
      try {
        console.info('Stopping process.');
        all_processes[i].kill();
      } catch (err) {}
    }
  }
}

function SysProc() {
  this.setCommand = function(cmd) {
    m_command = cmd;
  };
  this.start = function() {
    start();
  };
  this.onFinished = function(handler) {
    m_emitter.on('finished', handler);
  };
  this.onError = function(handler) {
    m_emitter.on('error', handler);
  };
  this.onStdout = function(handler) {
    m_emitter.on('stdout', handler);
  };
  this.onStderr = function(handler) {
    m_emitter.on('stderr', handler);
  };

  let m_command = '';
  let m_emitter = new MyEmitter();
  let m_index = -1;

  function start() {
    let P;
    try {
      let args = m_command.split(' ');
      P = require('child_process').spawn(args[0], args.slice(1), {
        shell: false
      });
      all_processes.push(P);
      m_index = all_processes.length - 1;
    } catch (err) {
      m_emitter.emit(new Error('Problem launching: ' + m_command));
      return;
    }
    P.stdout.on('data', function(chunk) {
      m_emitter.emit('stdout', chunk.toString('utf8'));
    });
    P.stderr.on('data', function(chunk) {
      m_emitter.emit('stderr', chunk.toString('utf8'));
    });
    P.on('close', function(code) {
      all_processes[m_index] = null;
      if (code == 0) {
        m_emitter.emit('finished');
      } else {
        m_emitter.emit('error', new Error('Process returned with non-zero exit code.'));
      }
    });
  }
}

function make_random_id(len) {
  // return a random string of characters
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < len; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}