exports.directCall=function(cmd,query,closer,callback) {handle_api_2(cmd,query,closer,callback);};

exports.handle_api_2=handle_api_2;

// For hub servers (type 2), the LariContainerManager manage lari child containers
// that have connected in
var LariContainerManager=require(__dirname+'/laricontainermanager.js').LariContainerManager;
// Here's the global container manager
var container_manager=new LariContainerManager();

// The LariJobManager will manage the queued, running, and finished processing jobs
var LariJobManager=require(__dirname+'/larijobmanager.js').LariJobManager;
// Here's the global job manager
var JM=new LariJobManager();

var stats = require(__dirname+'/container-stats.js')
//var os    = require('os');

// LariProcessCache is used to cache processes that have already run
//var LariProcessCache=require(__dirname+'/lariprocesscache.js').LariProcessCache;
// Here's the global process cache
/*
var process_cache=new LariProcessCache();
var process_caching_enabled=(process.env.LARI_PROCESS_CACHE=='ON');
if (process_caching_enabled) {
	console.log ('Process cache enabled');
}
else {
	console.log ('Process cache not enabled');
}
*/

// utility
var execute_and_read_output=require(__dirname+'/larijobmanager.js').execute_and_read_output;

// A processor job is a queued, running, or finished processing job
var LariProcessorJob=require(__dirname+'/larijobmanager.js').LariProcessorJob;

// DATA_DIRECTORY is required for processing servers (type 1)
/*
if (process.env.DATA_DIRECTORY) {
	if (process.env.DATA_DIRECTORY=='*') {
		// By default it will be within the tmp directory configured via mlconfig
		process.env.DATA_DIRECTORY=get_default_data_directory();
	}
	mkdir_if_needed(process.env.DATA_DIRECTORY);
	console.log ('Using data directory: '+process.env.DATA_DIRECTORY);
}
*/

var s_query_for_job_id={};
function handle_api_2(cmd,query,closer,callback) {
	// Handle an api request from either the client or a child lari server
	if (!closer) closer=create_closer(null);
	if (cmd=='queue-process') {
		// start or queue a process
		/*
		if (process_caching_enabled) {
			process_cache.getCachedResponse(query,function(resp) {
				if (resp) {
					callback(resp);
					return;
				}
				handle_api_3(cmd,query,closer,function(resp) {
					handle_probe_response(query,resp);
				});
			});
		}
		else {
			*/
			handle_api_3(cmd,query,closer,function(resp) {
				handle_probe_response(query,resp);
			});
			/*
		}
		*/
	}
	else if (cmd=='probe-process') {
		// check that status of an existing process (queued, running, or finished)
		handle_api_3(cmd,query,closer,function(resp) {
			handle_probe_response(null,resp);
		});
	}
	else {
		// the other api commands are handled in handle_api_3
		handle_api_3(cmd,query,closer,callback);
	}

	function handle_probe_response(query_or_null,resp) {
		if (!resp.success) {
			//not successful, just return as usual
			callback(resp);
			return;
		}

		// the query will be associated with the job id
		var query=query_or_null;
		if (query) {
			s_query_for_job_id[resp.job_id]=query;
		}
		else {
			query=s_query_for_job_id[resp.job_id]||null;
		}

		if (!query) {
			// no query, just return as usual (should not happen)
			callback(resp);
			return;
		}
		if ((resp.complete)&&(resp.result.success)) {
			// we have success. Let's cache it!
			/*
			if (process_caching_enabled) {
				process_cache.setCachedResponse(query,resp,function() {
					callback(resp);
				});
			}
			else {
				*/
				callback(resp);
			/*}*/
		}
		else {
			//not complete or not successful, just return as usual
			callback(resp);
		}
	}
}

function handle_api_3(cmd,query,closer,callback) {
	// Handle an api request from either the client or a child lari server (except for those handled above by handle_api_2)
	if (cmd=='poll-from-container') {
		// The child lari server (ie container) has sent a poll http request. We will respond with routed requests from the client.
		var debug_code=lari_make_random_id(5);
		container_manager.handlePollFromContainer(query,closer,function(resp) {
			callback(resp);
		});
		return;
	}
	if (cmd=='responses-from-container') {
		// The child lari server has sent responses to requests that we previously sent in replies to poll-from-container
		container_manager.handleResponsesFromContainer(query,closer,function(resp) {
			callback(resp);
		});
		return;
	}
	if (cmd=='get-available-containers') {
		var available_containers=container_manager.availableContainers();
		if (process.env.LARI_CONTAINER_ID)
			available_containers[process.env.LARI_CONTAINER_ID]={};
		callback({success:true,containers:available_containers});
		return;
	}

	// If the container_id of the query matches this container, then we proceed.
	// Otherwise, we need to route the request to the approriate child lari server
	if ((query.container_id||'')!=(process.env.LARI_CONTAINER_ID||'')) {
		container_manager.handleApiRequest(cmd,query,closer,function(resp) {
			callback(resp);
		});
		return;
	}

	if (cmd=='spec') {
		// The client wants the spec of a processor
		spec(query,closer,function(err,resp) {
			if (err) {
				callback({success:false,error:err});
			}
			else {
				callback(resp);
			}
		});
	}
	else if (cmd=='list-processors') {
		// The client wants a list of available processors
		list_processors(query,closer,function(err,resp) {
			if (err) {
				callback({success:false,error:err});
			}
			else {
				callback(resp);
			}
		});
	}
	else if (cmd=='queue-process') {
		// The client wants to queue a process
		queue_process(query,closer,function(err,resp) {
			if (err) {
				callback({success:false,error:err});
			}
			else {
				callback(resp);
			}
		});
	}
	else if (cmd=='probe-process') {
		// The client wants to check on an existing process
		probe_job(query,function(err,resp) {
			if (err) {
				callback({success:false,error:err});
			}
			else {
				callback(resp);
			}
		});
	}
	else if (cmd=='cancel-process') {
		// The client wants to cancel an existing process
		cancel_job(query,function(err,resp) {
			if (err) {
				callback({success:false,error:err});
			}
			else {
				callback(resp);
			}
		});
	}
	else if (cmd=='find-file') {
		// The client wants to check whether a particular file is on the server (identified via prv object)
		find_file(query,closer,function(err,resp) {
			if (err) {
				callback({success:false,error:err});
			}
			else {
				callback(resp);
			}
		});
	}
	else if (cmd=='get-file-content') {
		// The client wants the content of a rel small text output file
		get_file_content(query,closer,function(err,resp) {
			if (err) {
				callback({success:false,error:err});
			}
			else {
				callback(resp);
			}
		});
	}
    else if (cmd=='get-stats') {
        // The client wants to know the resources available on the server
        get_stats(query,closer,function(err,resp) {
			if (err) {
				callback({success:false,error:err});
			}
			else {
				callback(resp);
			}
        });
    }
	else {
		// The command is not supported
		callback({success:false,error:'Unsupported command: '+cmd});	
	}

	function spec(query,closer,callback) {
		if (!query.processor_name) {
			callback('Missing query parameter: processor_name');
			return;
		}
		var exe='ml-spec';
		var args=[query.processor_name];
		if (query.package_uri) {
			args.push('--_package_uri='+query.package_uri);
		}
		var opts={closer:closer};
		console.log ('RUNNING: '+exe+' '+args.join(' '));
		var pp=execute_and_read_output(exe,args,opts,function(err,stdout,stderr) {
			if (err) {
				console.error('Error in spec: '+err);
				callback(err);
				return;
			}
			console.log ('Output of process: ['+stdout.length+' bytes]');
			if (stdout[0]!='{') {
				console.error(stderr);
				callback('Error: '+stderr);
				return;
			}
			var obj=try_parse_json(stdout);
			if (!obj) {
				console.error('ERROR PARSING for: '+exe);
				console.error(stdout);
				callback('Error parsing JSON for command: '+exe);
				return;
			}
			if (obj.name!=query.processor_name) {
				callback('Error getting spec for '+query.processor_name+': '+obj.name+' <> '+query.processor_name);
				return;
			}
			callback(null,{success:true,spec:obj});
		});
		closer.on('close',function() {
			console.log ('Canceling spec process.');
			pp.stdout.pause();
			pp.kill('SIGTERM');
		});
	}
	function list_processors(query,closer,callback) {
		var exe='ml-list-processors';
		var args=[];
		if (query.package_uri) {
			args.push('--_package_uri='+query.package_uri);
		}
		var opts={closer:closer};
		console.log ('RUNNING: '+exe+' '+args.join(' '));
		try {
			var pp=execute_and_read_output(exe,args,opts,function(err,stdout,stderr) {
				if (err) {
					console.error('Error in ml-list-processors: '+err);
					callback(err);
					return;
				}
				console.log ('Output of process: ['+stdout.length+' bytes]');
				if (!stdout) {
					callback('No stdout received for ml-list-processors');
					return;
				}
				var list=stdout.split('\n');
				var list2=[];
				for (var i in list) {
					if (list[i])
						list2.push(list[i]);
				}
				callback(null,{success:true,processors:list2});
			});
		}
		catch(err) {
			callback('Error calling: '+exe);
		}
		closer.on('close',function() {
			console.log ('Canceling ml-list-processors process.');
			pp.stdout.pause();
			pp.kill('SIGTERM');
		});
	}
	function find_file(query,closer,callback) {
		/*
		if (!process.env.DATA_DIRECTORY) {
			callback('Environment variable not set: DATA_DIRECTORY');
			return;
		}
		*/
		if ((!query.checksum)||(!('size' in query))||(!('fcs' in query))) {
			callback("Invalid query.");	
			return;
		}
		var pp=execute_and_read_output('ml-prv-locate',['--sha1='+query.checksum,'--size='+query.size,'--fcs='+(query.fcs||'')],{},function(err,path) {
			path=path.trim();
			if (err) {
				callback('Error in prv-locate: '+err);
				return;
			}
			if (!require('fs').existsSync(path)) {
				callback(null,{success:true,found:false});
				return;
			}
			callback(null,{success:true,found:true});
		});
		closer.on('close',function() {
			console.log ('Canceling prv-locate process.');
			pp.stdout.pause();
			pp.kill('SIGTERM');
		});
	}
	function get_file_content(query,closer,callback) {
		/*
		if (!process.env.DATA_DIRECTORY) {
			callback('Environment variable not set: DATA_DIRECTORY');
			return;
		}
		*/
		if ((!query.checksum)||(!('size' in query))||(!('fcs' in query))) {
			callback("Invalid query.");	
			return;
		}
		var pp=execute_and_read_output('ml-prv-locate',['--sha1='+query.checksum,'--size='+query.size,'--fcs='+(query.fcs||'')],{},function(err,path) {
			path=path.trim();
			var size0=Number(query.size);
			if (size0>1024*1024) {
				callback('Cannot get file content for file of size '+size0);
				return;
			}
			if (err) {
				callback('Error in prv-locate: '+err);
				return;
			}
			if (!require('fs').existsSync(path)) {
				callback('Unable to find file: '+path);
				return;
			}
			var content=read_text_file(path);
			if (!content) {
				callback('Unable to read text file, or file is empty: '+path);
				return;
			}
			callback(null,{success:true,content:content});
		});
		closer.on('close',function() {
			console.log ('Canceling prv-locate process.');
			pp.stdout.pause();
			pp.kill('SIGTERM');
		});
	}
	function read_text_file(fname) {
		try {
			return require('fs').readFileSync(fname,'utf8');
		}
		catch(err) {
			return '';
		}
	}
    function get_stats(query,closer,callback) {
        try {
           callback(null, {success:true,content:{
               "FreeMemory"     : stats.freemem(),
               "FreeMemoryPer"  : stats.freememPercentage(),
               "TotalMemory"    : stats.totalmem(),
               "CPU1"           : stats.loadavg(1),
               "CPU15"          : stats.loadavg(15),
               "Platform"       : stats.platform() 
           }
           });
        }
        catch(err) {
           callback(err);
        }
    }
	function queue_process(query,closer,callback) {
		var processor_name=query.processor_name||'';
		var processor_version=query.processor_version||'';
		var inputs=query.inputs||{};
		var outputs=query.outputs||{};
		var parameters=query.parameters||{};
		var resources=query.resources||{};
		var opts=query.opts||{};
		if ('process_id' in query) {
			callback('process_id parameter is not allowed in queue-process.'); //used to be
			return;
		}
		var job_id=lari_make_random_id(10);
		var Jnew=new LariProcessorJob();
		Jnew.start(processor_name,processor_version,inputs,outputs,parameters,resources,opts,function(err) {
			if (err) {
				callback(err);
				return;
			}
			JM.addJob(job_id,Jnew);
			var check_timer=new Date();
			if (!('wait_msec' in query))
				query.wait_msec=100;
			check_it();
			function check_it() {
				var elapsed=(new Date()) -check_timer;
				if ((elapsed>=Number(query.wait_msec))||(Jnew.isComplete())) {
					make_response_for_job(job_id,Jnew,callback);
					return;
				}
				else {
					setTimeout(check_it,10);
				}
			}
		});	
		closer.on('close',function() {
			console.log ('Canceling process.');
			Jnew.cancel();
		});
	}
	function probe_job(query,callback) {
		var job_id=query.job_id||'';
		var J=JM.job(job_id);
		if (!J) {
			callback('Job with id not found: '+job_id);
			return;
		}
		J.keepAlive();
		make_response_for_job(job_id,J,callback);
	}
	function cancel_job(query,callback) {
		var job_id=query.job_id||'';
		var J=JM.job(job_id);
		if (!J) {
			callback('Job with id not found: '+job_id);
			return;
		}
		J.cancel(callback);
	}
	function make_response_for_job(job_id,J,callback) {
		var resp={success:true};
		resp.job_id=job_id;
		resp.complete=J.isComplete();
		if (J.isComplete())
			resp.result=J.result();
		resp.latest_console_output=J.takeLatestConsoleOutput();
		callback(null,resp);
	}
}

function mkdir_if_needed(path) {
	try {
		require('fs').mkdirSync(path);
	}
	catch(err) {

	}
}

function get_default_data_directory() {
	var conf=get_ml_config();
	if (!conf) {
		throw new Error('Unable to get mlconfig');
	}
	var tmpdir=(conf.general||{}).temporary_path||null;
	return tmpdir+'/lari';
}


function get_ml_config() {
	var r = require('child_process').execSync('mlconfig print');
	var str=r.toString();
	var obj=try_parse_json(str.trim());
	if (!obj) {
		console.error('Error parsing json in output of mlconfig');
		return null;
	}
	return obj;
}

function create_closer(REQ) {
	return REQ||{on:function(str,handler) {}};
}

function lari_make_random_id(len) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < len; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function try_parse_json(json) {
	try {
		return JSON.parse(json);
	}
	catch(err) {
		return null;
	}
}
