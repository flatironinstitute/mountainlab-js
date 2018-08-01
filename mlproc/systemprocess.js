exports.SystemProcess=SystemProcess;
exports.stop_all=stop_all;

var common=require(__dirname+'/common.js');

var all_running_processes={};
function stop_all(callback) {
	for (var id in all_running_processes) {
		console.info(`Terminating process {pid=${all_running_processes[id].pid}}...`);
		all_running_processes[id].kill();
	}
	setTimeout(function() {
		callback();
	},500);
}

function SystemProcess() {
	this.setCommand=function(cmd) {m_command=cmd;};
	this.setConsoleOutFile=function(fname) {m_console_out_fname=fname;};
	this.start=function() {start();};
	this.onFinished=function(handler) {m_finished_handlers.push(handler);};
	this.error=function() {return m_error;};
	this.setTempdirPath=function(path) {m_tempdir_path=path;};

	var m_command='';
	var m_finished_handlers=[];
	var m_process=null;
	var m_error='';
	var m_id=common.make_random_id(10);
	var m_console_out_fname='';
	var m_stdout_txt='';
	var m_stderr_txt='';
	var m_tempdir_path='';

	function start() {
		//var list=m_command.split(' ');
		//var exe=list[0]||'';
		//var args=list.slice(1);
		try {	
			var env = Object.create( process.env );
			if (m_tempdir_path) env.ML_PROCESSOR_TEMPDIR = m_tempdir_path;
			let args=m_command.split(' ');
			//P=require('child_process').spawn(args[0],args.slice(1),{env:env,shell:false});
			P=require('child_process').spawn(args[0],args.slice(1),{env:env,shell:true});
			all_running_processes[m_id]=P;
		}
		catch(err) {
			report_error("Problem launching: "+m_command);
			return;
		}
		m_process=P;
		P.stdout.on('data',function(chunk) {
			m_stdout_txt+=chunk.toString('utf8');
			console.log (chunk.toString('utf8'));
		});
		P.stderr.on('data',function(chunk) {
			m_stderr_txt+=chunk.toString('utf8');
			console.error (chunk.toString('utf8'));
		});
		P.on('close',function(code) {
			delete all_running_processes[m_id];
			if (code==0) {
				report_finished();
			}
			else {
				report_error('Process returned with non-zero exit code.');
			}
		});
	}

	function report_error(err) {
		m_error=err;
		report_finished();
	}

	function report_finished(err) {
		if (m_console_out_fname) {
			common.write_text_file(m_console_out_fname,m_stdout_txt);
		}
		call_finished_handlers();
	}

	function call_finished_handlers() {
		for (var i in m_finished_handlers) {
			m_finished_handlers[i]();
		}
	}

}