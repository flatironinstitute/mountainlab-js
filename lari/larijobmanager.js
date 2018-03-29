exports.LariJobManager=LariJobManager;
exports.LariProcessorJob=LariProcessorJob;
exports.execute_and_read_output=execute_and_read_output;

var common=require(__dirname+'/laricommon.js');

function LariJobManager() {
	var that=this;

	this.addJob=function(job_id,J) {m_jobs[job_id]=J;};
	this.job=function(job_id) {return job(job_id);};
	this.removeJob=function(job_id) {removeJob(job_id);};

	var m_jobs={};

	function housekeeping() {
		//cleanup here
		setTimeout(housekeeping,10000);	
	}
	//setTimeout(housekeeping,10000);	
	function removeJob(job_id) {
		delete m_jobs[job_id];
	}
	function job(job_id) {
		if (job_id in m_jobs) {
			return m_jobs[job_id];
		}
		else return null;
	}
}

function LariProcessorJob() {
	var that=this;

	this.start=function(processor_name,processor_version,inputs,outputs,parameters,resources,opts,callback) {start(processor_name,processor_version,inputs,outputs,parameters,resources,opts,callback);};
	this.keepAlive=function() {m_alive_timer=new Date();};
	this.cancel=function(callback) {cancel(callback);};
	this.isComplete=function() {return m_is_complete;};
	this.result=function() {return m_result;};
	this.elapsedSinceKeepAlive=function() {return (new Date())-m_alive_timer;};

	//this.outputFilesStillValid=function() {return outputFilesStillValid();};
	this.takeLatestConsoleOutput=function() {return takeLatestConsoleOutput();};

	var m_result=null;
	var m_alive_timer=new Date();
	var m_is_complete=false;
	var m_process_object=null;
	//var m_output_file_stats={};
	var m_latest_console_output='';
	var m_job_id=common.make_random_id(10); //internal for now (just for naming the temporary files)

	function start(processor_name,processor_version,inputs,outputs,parameters,resources,opts,callback) {
		/*
		if (!process.env.DATA_DIRECTORY) {
			callback('Environment variable not set: DATA_DIRECTORY');
			return;
		}
		*/
		var tmp_dir=common.temporary_directory();
		var exe='ml-queue-process';
		var args=[];
		args.push(processor_name);

		// Handle inputs
		args.push('--inputs');
		for (var key in inputs) {
			var val=inputs[key];
			if (typeof(val)!='object') {
				callback(`Unexpected string type for input (${key})`);
				return;
			}
			if (!('original_checksum' in val)) {
				callback(`Missing original_checksum field in input (${key})`);
				return;	
			}
			var tmp_fname=tmp_dir+'/lari_input_'+m_job_id+'_'+key+'.prv';
			args.push(key+':'+tmp_fname);
			if (!lari_write_text_file(tmp_fname,JSON.stringify(val,null,4))) {
				callback(`Problem writing text file for input (${key}): ${tmp_fname}`);
				return;
			}
		}

		// Handle parameters
		args.push('--parameters');
		for (var key in parameters) {
			var val=parameters[key];
			if (typeof(val)!='object') {
				args.push(key+':'+val);
			}
			else {
				for (var ii in val) {
					args.push(key+':'+val[ii]);		
				}
			}
		}

		// Handle outputs
		args.push('--outputs');
		var tmp_output_files={};
		for (var key in outputs) {
			if (outputs[key]) {
				var tmp_fname=tmp_dir+'/lari_output_'+m_job_id+'_'+key+'.prv';
				args.push(key+':'+tmp_fname);
				tmp_output_files[key]=tmp_fname;
			}
		}

		// Start housekeeping
		setTimeout(housekeeping,1000);

		// Start process
		console.log ('Running: '+exe+' '+args.join(' '));
		m_process_object=execute_and_read_output(exe,args,{on_stdout:on_stdout,on_stderr:on_stderr},function(err,stdout,stderr,exit_code) {
			if (err) {
				m_result={success:false,error:err};
				m_is_complete=true;
				return;
			}
			if (exit_code!=0) {
				m_result={success:false,error:`Exit code is non-zero (${exit_code})`};
				m_is_complete=true;
				return;
			}
			var output_prv_objects={};
			var missing_outputs=false;
			for (var key in tmp_output_files) {
				var tmp_fname=tmp_output_files[key];
				if (require('fs').existsSync(tmp_fname)) {
					var obj=read_json_file(tmp_fname);
					output_prv_objects[key]=obj;
					remove_file(tmp_fname);
				}
				else {
					missing_outputs=true;
					output_prv_objects[key]=null;
				}
			}
			if (!missing_outputs) {
				m_result={success:true,outputs:output_prv_objects};
				m_is_complete=true;
			}
			else {
				m_result={success:false,error:'Some outputs were missing.'};
				m_is_complete=true;
			}
		});
		function on_stdout(txt) {
			m_latest_console_output+=txt;
		}
		function on_stderr(txt) {
			m_latest_console_output+=txt;
		}
		callback(null);
	}
	function takeLatestConsoleOutput() {
		var ret=m_latest_console_output;
		m_latest_console_output='';
		return ret;
	}
	function cancel(callback) {
		if (m_is_complete) {
			if (callback) callback(null); //already complete
			return;
		}
		if (m_process_object) {
			console.log ('Canceling process: '+m_process_object.pid);
			m_process_object.stdout.pause();
			m_process_object.kill('SIGTERM');
			m_is_complete=true;
			m_result={success:false,error:'Process canceled'};
			if (callback) callback(null);
		}
		else {
			if (callback) callback('m_process_object is null.');
		}
	}
	function housekeeping() {
		if (m_is_complete) return;
		var timeout=20000;
		var elapsed_since_keep_alive=that.elapsedSinceKeepAlive();
		if (elapsed_since_keep_alive>timeout) {
			console.log ('Canceling process due to keep-alive timeout');
			cancel();
		}
		else {
			setTimeout(housekeeping,1000);
		}
	}
	/*
	function compute_output_file_stats(outputs) {
		var stats={};
		for (var key in outputs) {
			stats[key]=compute_output_file_stat(outputs[key].original_path);
		}
		return stats;
	}
	*/
	/*
	function compute_output_file_stat(path) {
		try {
			var ss=require('fs').statSync(path);
			return {
				exists:require('fs').existsSync(path),
				size:ss.size,
				last_modified:(ss.mtime+'') //make it a string
			};
		}	
		catch(err) {
			return {};
		}
	}
	*/
	/*
	function outputFilesStillValid() {
		var outputs0=(m_result||{}).outputs||{};
		var stats0=m_output_file_stats||{};
		var stats1=compute_output_file_stats(outputs0);
		for (var key in stats0) {
			var stat0=stats0[key]||{};
			var stat1=stats1[key]||{};
			if (!stat1.exists) {
				return false;
			}
			if (stat1.size!=stat0.size) {
				return false;
			}
			if (stat1.last_modified!=stat0.last_modified) {
				return false;
			}
		}
		return true;
	}
	*/
}

function lari_write_text_file(fname,txt) {
	try {
		require('fs').writeFileSync(fname,txt,'utf8');
		return true;
	}
	catch(e) {
		console.error('Problem writing file: '+fname);
		return false;
	}	
}

function execute_and_read_output(exe,args,opts,callback) {
	var P;
	try {
		P=require('child_process').spawn(exe,args);
	}
	catch(err) {
		console.log (err);
		callback("Problem launching: "+exe+" "+args.join(" "));
		return;
	}
	var txt_stdout='';
	var txt_stderr='';
	P.stdout.on('data',function(chunk) {
		txt_stdout+=chunk;
		if (opts.on_stdout) {
			opts.on_stdout(chunk);
		}
	});
	P.stderr.on('data',function(chunk) {
		txt_stderr+=chunk;
		if (opts.on_stderr) {
			opts.on_stderr(chunk);
		}
	});
	P.on('close',function(code) {
		callback(null,txt_stdout,txt_stderr,code);
	});
	return P;
}

function remove_file(fname) {
	try {
		require('fs').unlinkSync(fname);
		return true;
	}
	catch(err) {
		return false;
	}
}

function read_text_file(fname) {
	try {
		return require('fs').readFileSync(fname,'utf8');
	}
	catch(err) {
		return '';
	}
}

function read_json_file(fname) {
	try {
		return JSON.parse(read_text_file(fname));
	}
	catch(err) {
		return '';
	}	
}