exports.SystemProcess=SystemProcess;
exports.stop_all=stop_all;

var common=require(__dirname+'/common.js');

var all_running_processes={};
function stop_all() {
	for (var id in all_running_processes) {
		console.log('Terminating process...');
		all_running_processes[id].kill();
	}
}

function SystemProcess() {
	this.setCommand=function(cmd) {m_command=cmd;};
	this.start=function() {start();};
	this.onFinished=function(handler) {m_finished_handlers.push(handler);};
	this.error=function() {return m_error;};

	var m_command='';
	var m_finished_handlers=[];
	var m_process=null;
	var m_error='';
	var m_id=common.make_random_id(10);

	function start() {
		var list=m_command.split(' ');
		var exe=list[0]||'';
		var args=list.slice(1);
		try {	
			P=require('child_process').spawn(exe,args);
			all_running_processes[m_id]=P;
		}
		catch(err) {
			report_error("Problem launching: "+exe+" "+args.join(" "));
			return;
		}
		m_process=P;
		P.stdout.on('data',function(chunk) {
			console.log (chunk.toString('utf8'));
		});
		P.stderr.on('data',function(chunk) {
			console.log (chunk.toString('utf8'));
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
		call_finished_handlers();
	}

	function call_finished_handlers() {
		for (var i in m_finished_handlers) {
			m_finished_handlers[i]();
		}
	}

}