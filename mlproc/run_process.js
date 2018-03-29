exports.cmd_run_process=cmd_run_process;

var common=require(__dirname+'/common.js');
var prv_utils=require(__dirname+'/prv_utils.js');
var db_utils=require(__dirname+'/db_utils.js');
var SystemProcess=new require(__dirname+'/systemprocess.js').SystemProcess;
var sha1=require('node-sha1');

function cmd_run_process(processor_name,opts,callback) {
	common.get_processor_spec(processor_name,opts,function(err,spec0) {
		if (err) {
			callback(err);
			return;
		}
		if (!spec0) {
			callback(`Processor not found: ${processor_name}`);
			return;
		}
		spec0.outputs=spec0.outputs||[];
		spec0.outputs.push({name:'console_out',optional:true});
		run_process_2(processor_name,opts,spec0,callback);
	});
}

function run_process_2(processor_name,opts,spec0,callback) {
	var inputs,outputs,parameters;
	try {
		inputs=parse_iop(opts.inputs||'','input');
		outputs=parse_iop(opts.outputs||'','output');
		parameters=parse_iop(opts.parameters||'','parameter');
		check_iop(inputs,spec0.inputs||[],'input');
		check_iop(outputs,spec0.outputs||[],'output');
		check_iop(parameters,spec0.parameters||[],'parameter');
	}
	catch(err) {
		console.error(err.stack);
		callback(err.message);
		return;
	}

	var process_signature='';
	var pending_output_prvs=[];
	var mode=opts.mode||'run';
	var already_completed=false;
	var tempdir_path='';

	var steps=[];

	// Check inputs and substitute prvs
	steps.push(function(cb) {
		console.log ('[ Checking inputs and substituting prvs ... ]');
		check_inputs_and_substitute_prvs(inputs,'',function(err) {
			if (err) {
				finalize(err);
				return;
			}
			cb();
		});
	});
	
	// Compute process signature
	steps.push(function(cb) {
		if (mode=='exec') {
			cb();
			return;
		}
		console.log ('[ Computing process signature ... ]');
		compute_process_signature(spec0,inputs,parameters,function(err,sig) {
			if (err) {
				finalize(err);
				return;
			}
			process_signature=sig;
			cb();
		})
	});

	// Check outputs
	steps.push(function(cb) {
		console.log ('[ Checking outputs... ]');
		check_outputs_and_substitute_prvs(outputs,process_signature,function(err,tmp) {
			if (err) {
				finalize(err);
				return;
			}
			pending_output_prvs=tmp.pending_output_prvs;
			cb();
		});
	});

	// Check process cache
	steps.push(function(cb) {
		if (mode=='exec') {
			cb();
			return;
		}
		console.log ('[ Checking process cache ... ]');
		find_in_process_cache(process_signature,outputs,function(err,doc0) {
			if (err) {
				finalize(err);
				return;
			}
			if (doc0) {
				console.log ('[ Process already completed. ]');
				already_completed=true;
			}
			cb();
		});
	});

	// Wait for ready run
	steps.push(function(cb) {
		if (already_completed) {
			cb();
			return;
		}
		if ((mode=='exec')||(mode=='run')) {
			cb();
			return;
		}
		console.log ('[ Waiting for ready to run ... ]');
		wait_for_ready_run(spec0,inputs,outputs,parameters,function(err) {
			if (err) {
				finalize(err);
				return;
			}
			cb();
		})
	});

	// Create temporary directory
	steps.push(function(cb) {
		if (already_completed) {
			cb();
			return;
		}
		console.log ('[ Creating temporary directory ... ]');
		var tmp_dir=common.temporary_directory();
		tempdir_path=tmp_dir+'/tempdir_'+process_signature.slice(0,10)+'_'+common.make_random_id(6);
		common.mkdir_if_needed(tempdir_path);
		cb();
	});
	

	// Run the process
	steps.push(function(cb) {
		if (already_completed) {
			cb();
			return;
		}
		console.log ('[ Initializing process ... ]');
		do_run_process(spec0,inputs,outputs,parameters,{tempdir_path:tempdir_path},function(err) {
			if (err) {
				finalize(err);
				return;
			}
			cb();
		});
	});

	// Handle pending output prvs
	steps.push(function(cb) {
		common.foreach_async(pending_output_prvs,function(ii,X,cb2) {
			console.log (`[ Creating output prv for ${X.name} ... ]`);
			prv_utils.prv_create(X.output_fname,function(err,obj) {
				if (err) {
					finalize(err);
					return;
				}
				common.write_json_file(X.prv_fname,obj);
				cb2();
			});
		},function() {
			cb();
		});
	});

	// Save to process cache
	steps.push(function(cb) {
		if (already_completed) {
			cb();
			return;
		}
		if (mode=='exec') {
			cb();
			return;
		}
		console.log ('[ Saving to process cache ... ]');
		save_to_process_cache(process_signature,spec0,inputs,outputs,parameters,function(err) {
			if (err) {
				finalize(err);
			}
			cb();
		});
	});

	common.foreach_async(steps,function(ii,step,cb) {
		step(cb);
	},function() {
		finalize(null);
	});

	function finalize(err00) {
		remove_temporary_directory(tempdir_path,function(err) {
			if (err) {
				console.warn('Error removing temporary directory: '+tempdir_path);
			}
			if (!err00) {
				console.log ('[ Done. ]')
			}
			callback(err00);
		});
	}
}

function remove_temporary_directory(tempdir_path,callback) {
	if (!tempdir_path) {
		callback(null);
		return;
	}
	console.log ('[ Removing temporary directory ... ]')
	if (!common.starts_with(tempdir_path,common.temporary_directory()+'/')) {
		//for safety
		callback('Invalid (unsafe) path for temporary directory: '+tempdir_path);
		return;
	}
	var files=common.read_dir_safe(tempdir_path);
	common.foreach_async(files,function(ii,file,cb) {
		var fname=tempdir_path+'/'+file;
		var stat0=stat_file(fname);
		if (stat0) {
			if (stat0.isFile()) {
				try {
					require('fs').unlinkSync(fname);
				}
				catch(err) {
					callback('Unable to remove file from temporary directory: '+fname);
					return;
				}
				cb();
			}
			else if (stat0.isDirectory()) {
				remove_temporary_directory(fname,function(err0) {
					if (err0) {
						callback(err0);
						return;
					}
					cb();
				});
			}
			else {
				callback('File is not a file or directory: '+fname);
				return;
			}
		}
	},function() {
		try {
			require('fs').rmdir(tempdir_path);
		}
		catch(err) {
			callback('Unable to remove directory: '+tempdir_path);
			return;
		}
		callback(null);
	});
}

function wait_for_ready_run(spec0,inputs,outputs,parameters,callback) {
	// TODO: look at state of input/output files, and make sure consistent after waiting period
	// TODO: finish this
	callback(null);
}

function do_run_process(spec0,inputs,outputs,parameters,info,callback) {
	var cmd=filter_exe_command(spec0.exe_command,inputs,outputs,info,parameters);
	console.log ('[ Running ... ] '+cmd);
	var P=new SystemProcess();
	P.setCommand(cmd);
	if ('console_out' in outputs) {
		P.setConsoleOutFile(outputs['console_out']);
	}
	P.onFinished(function() {
		callback(P.error());
	});
	P.start();
}

function filter_exe_command(cmd,inputs,outputs,info,parameters) {
	var iop={};
	for (var key in inputs)
		iop[key]=inputs[key];
	for (var key in outputs)
		iop[key]=outputs[key];
	for (var key in parameters)
		iop[key]=parameters[key];
	var arguments=[];
	var console_out_file='';
	for (var key in iop) {
		var val=iop[key];
		if (typeof(val)!='object') {
			if (key!='console_out') {
				arguments.push(`--${key}=${val}`);
			}
			cmd=cmd.split('$'+key+'$').join(val);
		}
		else {
			for (var i in val) {
				arguments.push(`--${key}=${val[i]}`);
			}
		}
	}
	{
		arguments.push(`--_tempdir=${info.tempdir_path}`);
		cmd=cmd.split('$(tempdir)').join(info.tempdir_path);
	}
	cmd=cmd.split('$(arguments)').join(arguments.join(' '));
	return cmd;
}

function check_inputs_and_substitute_prvs(inputs,prefix,callback) {
	var ikeys=Object.keys(inputs);
	common.foreach_async(ikeys,function(ii,key,cb) {
		if (typeof(inputs[key])!='object') {
			var fname=inputs[key];
			fname=require('path').resolve(process.cwd(),fname);
			inputs[key]=fname;
			if (!require('fs').existsSync(fname)) {
				callback(`Input file (${(prefix||'')+key}) does not exist: ${fname}`);
				return;
			}
			if (common.ends_with(fname,'.prv')) {
				prv_utils.prv_locate(fname,{},function(err,fname2) {
					if (err) {
						console.error(err);
					}
					if (!fname2) {
						callback(`Unable to locate file for input prv: ${(prefix||'')+key}`);
						return;
					}
					inputs[key]=fname2;
					cb();
				});
			}
			else {
				cb();
			}
		}
		else {
			check_inputs_and_substitute_prvs(inputs[key],key+'/',function(err) {
				if (err) {
					callback(err);
					return;
				}
				cb();
			});
		}
	},function() {
		callback(null);
	});
}

function check_outputs_and_substitute_prvs(outputs,process_signature,callback) {
	var pending_output_prvs=[];
	var okeys=Object.keys(outputs);
	var tmp_dir=common.temporary_directory();
	common.foreach_async(okeys,function(ii,key,cb) {
		var fname=outputs[key];
		fname=require('path').resolve(process.cwd(),fname);
		outputs[key]=fname;
		if (common.ends_with(fname,'.prv')) {
			var fname2=tmp_dir+`/output_${process_signature}_${key}`;
			pending_output_prvs.push({name:key,prv_fname:fname,output_fname:fname2});
			outputs[key]=fname2;
			cb();
		}
		else {
			cb();	
		}
	},function() {
		callback(null,{pending_output_prvs:pending_output_prvs});
	});
}

function compute_process_signature(spec0,inputs,parameters,callback) {
	compute_process_signature_object(spec0,inputs,parameters,function(err,obj) {
		if (err) {
			callback(err);
			return;
		}
		callback(null,sha1(JSON.stringify(obj)));
	});
}

function compute_process_signature_object(spec0,inputs,parameters,callback) {
	var signature_object={};
	signature_object.processor_name=spec0.name;
	signature_object.processor_version=spec0.version;
	signature_object.parameters=parameters;
	compute_process_signature_object_inputs(inputs,function(err,inputs0) {
		if (err) {
			callback(err);
			return;
		}
		signature_object.inputs=inputs0;
		callback('',signature_object);
	});
}

function compute_process_signature_object_inputs(inputs,callback) {
	get_checksums_for_files(inputs,{mode:'process_signature'},callback);
}

function find_in_process_cache(process_signature,outputs,callback) {
	db_utils.findDocuments('process_cache',{process_signature:process_signature},function(err,docs) {
		if (err) {
			callback(err);
			return;
		}
		if (docs.length==0) {
			callback(null,null);
			return;
		}
		check_outputs_consistent_with_process_cache(outputs,docs[0],function(err,consistent) {
			if (consistent) {
				callback(null,docs[0]);
			}
			else {
				callback(null,null);
			}
		});
	});
	
}

function check_outputs_consistent_with_process_cache(outputs,doc0,callback) {
	for (var key in outputs) {
		var fname=outputs[key];
		var stat0=common.stat_file(fname);
		if (!stat0) {
			callback('Unable to stat file: '+fname);
			return;
		}
		var output0=doc0.outputs[key]||{};
		if (output0.path!=fname) {
			callback(null,false);
			return;
		}
		if ((output0.size!=stat0.size)||(output0.mtime!=stat0.mtime.toISOString())||(output0.ctime!=stat0.ctime.toISOString())||(output0.ino!=stat0.ino)) {
			callback(null,false);
			return;
		}
	}
	callback(null,true);
}

function save_to_process_cache(process_signature,spec0,inputs,outputs,parameters,callback) {
	db_utils.removeDocuments('process_cache',{process_signature:process_signature},function(err) {
		if (err) {
			callback(err);
			return;
		}
		get_checksums_for_files(inputs,{mode:'process_cache'},function(err,inputs_with_checksums) {
			if (err) {
				callback(err);
				return;
			}
			get_checksums_for_files(outputs,{mode:'process_cache'},function(err,outputs_with_checksums) {
				if (err) {
					callback(err);
					return;
				}
				var doc0={
					process_signature:process_signature,
					spec:spec0,
					inputs:inputs_with_checksums,
					outputs:outputs_with_checksums,
					parameters:parameters
				};
				db_utils.saveDocument('process_cache',doc0,function(err) {
					callback(err);
				});
			});
		});
	});
	
}

function get_checksums_for_files(inputs,opts,callback) {
	var ret={};
	var keys=Object.keys(inputs);
	common.foreach_async(keys,function(ii,key,cb) {
		var val=inputs[key];
		if (typeof(val)!='object') {
			prv_utils.compute_file_sha1(val,function(err,sha1) {
				if (err) {
					callback(err);
					return;
				}
				if (opts.mode=='process_cache') {
					var stat0=common.stat_file(val);
					if (!stat0) {
						callback('Unable to stat file: '+val);
						return;
					}
					ret[key]={path:val,sha1:sha1,mtime:stat0.mtime.toISOString(),ctime:stat0.ctime.toISOString(),size:stat0.size,ino:stat0.ino};
				}
				else if (opts.mode=='process_signature') {
					ret[key]=sha1;
				}
				else {
					callback('Unexpected mode in get_checksums_for_files: '+opts.mode);
					return;
				}
				cb();
			});
		}
		else {
			get_checksums_for_files(inputs[key],opts,function(err,tmp) {
				if (err) {
					callback(err);
					return;
				}
				ret[key]=tmp;
				cb();
			});
		}
	},function() {
		callback(null,ret);
	});
}

function check_iop(A,Bspec,iop_name) {
	var B={};
	for (var i in Bspec) {
		var key0=Bspec[i].name;
		if (key0) {
			B[key0]=Bspec[i];
		}
	}
	for (var key in A) {
		if (!(key in B)) {
			throw new Error(`Unexpected ${iop_name}: ${key}`)
		}
	}
	for (var key in B) {
		if (!(key in A)) {
			if (!B[key].optional) {
				throw new Error(`Missing required ${iop_name}: ${key}`);
			}
		}
	}
	return true;
}

function parse_iop(str,iop_name) {
	var ret={};
	var list=str.split('[---]');
	for (var i in list) {
		var str0=list[i];
		if (str0) {
			var ind0=str0.indexOf(':');
			if (ind0<0) {
				throw new Error(`Error in ${iop_name}: ${str0}`);
			}
			var key0=str0.slice(0,ind0);
			var val0=str0.slice(ind0+1);
			if (!(key0 in ret)) {
				ret[key0]=val0;
			}
			else {
				if (typeof(ret[key0])!='object') {
					ret[key0]=[ret[key0],val0];
				}
				else {
					ret[key0].push(val0);
				}
			}
		}
	}
	return ret;
}

