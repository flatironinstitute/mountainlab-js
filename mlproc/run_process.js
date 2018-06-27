exports.cmd_run_process = cmd_run_process;
exports.cleanup = cleanup; //in case process terminated prematurely

const KBClient = require('kbclient').v1;

var tempdir_for_cleanup = '';
var keep_tempdir = false;
var processor_job_id_for_cleanup = '';

var common = require(__dirname + '/common.js');
var prv_utils = require(__dirname + '/prv_utils.js');
var db_utils = require(__dirname + '/db_utils.js');
var SystemProcess = new require(__dirname + '/systemprocess.js').SystemProcess;
var sha1 = require('node-sha1');
var max_num_simultaneous_processor_jobs = 2;

var canonical_stringify = require('canonical-json');

function cmd_run_process(processor_name, opts, callback) {
  console.info('[ Getting processor spec... ]');
  common.get_processor_spec(processor_name, opts, function(err, spec0) {
    if (err) {
      callback(err);
      return;
    }
    if (!spec0) {
      callback(`Processor not found: ${processor_name}`);
      return;
    }
    spec0.outputs = spec0.outputs || [];
    spec0.outputs.push({
      name: 'console_out',
      optional: true
    });
    run_process_2(processor_name, opts, spec0, callback);
  });
}

function remove_processor_job_from_database(job_id, callback) {
  db_utils.removeDocuments('processor_jobs', {
    _id: job_id
  }, function(err) {
    callback(err);
  });
}

function run_process_2(processor_name, opts, spec0, callback) {
  var inputs, outputs, parameters, iops;
  try {
    inputs = parse_iop(opts.inputs || '', 'input');
    outputs = parse_iop(opts.outputs || '', 'output');
    parameters = parse_iop(opts.parameters || '', 'parameter');
    iops = parse_iop(opts.iops || '', 'iop');
    separate_iops(inputs, outputs, parameters, iops, spec0.inputs || [], spec0.outputs || [], spec0.parameters || []);
    check_iop(inputs, spec0.inputs || [], 'input');
    check_iop(outputs, spec0.outputs || [], 'output');
    check_iop(parameters, spec0.parameters || [], 'parameter');
  } catch (err) {
    console.error(err.stack);
    callback(err.message);
    return;
  }

  var process_signature = '';
  var pending_output_prvs = [];
  var mode = opts.mode || 'run';
  var already_completed = false;
  var tempdir_path = '';
  var queued_processor_job_id = '';

  var steps = [];

  // Check inputs, set default parameters and substitute prvs
  steps.push(function(cb) {
    console.info('[ Checking inputs and substituting prvs ... ]');
    check_inputs_and_substitute_prvs(inputs, '', opts, function(err) {
      if (err) {
        finalize(err);
        return;
      }
      cb();
    });
  });

  // Compute process signature
  steps.push(function(cb) {
    //if (mode=='exec') {
    //	cb();
    //	return;
    //}
    console.info('[ Computing process signature ... ]');
    compute_process_signature(spec0, inputs, parameters, function(err, sig) {
      if (err) {
        finalize(err);
        return;
      }
      process_signature = sig;
      cb();
    });
  });

  // Check outputs
  steps.push(function(cb) {
    console.info('[ Checking outputs... ]');
    check_outputs_and_substitute_prvs(outputs, process_signature, function(err, tmp) {
      if (err) {
        finalize(err);
        return;
      }
      pending_output_prvs = tmp.pending_output_prvs;
      cb();
    });
  });

  // Check process cache
  steps.push(function(cb) {
    if (mode == 'exec') {
      cb();
      return;
    }
    console.info('[ Checking process cache ... ]');
    find_in_process_cache(process_signature, outputs, function(err, doc0) {
      if (err) {
        finalize(err);
        return;
      }
      if (doc0) {
        console.info(`[ Process ${processor_name} already completed. ]`);
        already_completed = true;
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
    if ((mode == 'exec') || (mode == 'run')) {
      cb();
      return;
    }
    console.info('[ Waiting for ready to run ... ]');
    wait_for_ready_run(spec0, inputs, outputs, parameters, function(err, job_id) {
      if (err) {
        finalize(err);
        return;
      }
      queued_processor_job_id = job_id;
      processor_job_id_for_cleanup = job_id;
      cb();
    })
  });

  // Create temporary directory
  steps.push(function(cb) {
    if (already_completed) {
      cb();
      return;
    }
    console.info('[ Creating temporary directory ... ]');
    var tmp_dir = common.temporary_directory();
    tempdir_path = tmp_dir + '/tempdir_' + process_signature.slice(0, 10) + '_' + common.make_random_id(6);
    tempdir_for_cleanup = tempdir_path; //in case process is terminated prematurely
    if (opts.keep_tempdir)
      keep_tempdir = true;
    common.mkdir_if_needed(tempdir_path);
    cb();
  });


  // Run the process
  steps.push(function(cb) {
    if (already_completed) {
      cb();
      return;
    }
    console.info('[ Initializing process ... ]');
    do_run_process(spec0, inputs, outputs, parameters, {
      tempdir_path: tempdir_path,
      queued_processor_job_id: queued_processor_job_id
    }, function(err) {
      if (err) {
        finalize(err);
        return;
      }
      cb();
    });
  });

  // Handle pending output prvs
  steps.push(function(cb) {
    common.foreach_async(pending_output_prvs, function(ii, X, cb2) {
      console.info(`[ Creating output prv for ${X.name} ... ]`);
      prv_utils.prv_create(X.output_fname, function(err, obj) {
        if (err) {
          finalize(err);
          return;
        }
        common.write_json_file(X.prv_fname, obj);
        cb2();
      });
    }, function() {
      cb();
    });
  });

  // Save to process cache
  steps.push(function(cb) {
    if (already_completed) {
      cb();
      return;
    }
    if (mode == 'exec') {
      cb();
      return;
    }
    console.info('[ Saving to process cache ... ]');
    save_to_process_cache(process_signature, spec0, inputs, outputs, parameters, function(err) {
      if (err) {
        finalize(err);
      }
      cb();
    });
  });

  // Remove from database (if mode=queued)
  steps.push(function(cb) {
    if (!queued_processor_job_id) {
      cb();
      return;
    }
    console.info('[ Removing processor job from database ... ]');
    remove_processor_job_from_database(queued_processor_job_id, function(err) {
      if (err) {
        finalize(err);
      }
      cb();
    });
  });

  common.foreach_async(steps, function(ii, step, cb) {
    step(cb);
  }, function() {
    finalize(null);
  });

  function finalize(err00) {
    remove_temporary_directory(tempdir_path, function(err) {
      if (err) {
        console.warn('Error removing temporary directory (' + tempdir_path + '): ' + err);
      }
      if (!err00) {
        console.info('[ Done. ]')
      }
      callback(err00);
    });
  }
}

function cleanup(callback) {
  // only called if process is terminated prematurely
  cleanup_tempdir(function() {
    remove_from_database(function() {
      callback();
    });
  });

  function cleanup_tempdir(cb) {
    if (tempdir_for_cleanup) {
      remove_temporary_directory(tempdir_for_cleanup, function() {
        cb();
      });
    } else {
      cb();
    }
  }

  function remove_from_database(cb) {
    if (processor_job_id_for_cleanup) {
      remove_processor_job_from_database(processor_job_id_for_cleanup, function() {
        cb();
      });
    }
    else {
    	cb();
    }
  }
}

function remove_temporary_directory(tempdir_path, callback) {
  if (keep_tempdir) {
    callback(null);
    return;
  }
  if (!tempdir_path) {
    callback(null);
    return;
  }
  console.info('[ Removing temporary directory ... ]')
  if (!common.starts_with(tempdir_path, common.temporary_directory() + '/')) {
    //for safety
    callback('Invalid (unsafe) path for temporary directory: ' + tempdir_path);
    return;
  }
  var files = common.read_dir_safe(tempdir_path);
  common.foreach_async(files, function(ii, file, cb) {
    var fname = tempdir_path + '/' + file;
    var stat0 = common.stat_file(fname);
    if (stat0) {
      if (stat0.isFile()) {
        try {
          require('fs').unlinkSync(fname);
        } catch (err) {
          callback('Unable to remove file from temporary directory: ' + fname);
          return;
        }
        cb();
      } else if (stat0.isDirectory()) {
        remove_temporary_directory(fname, function(err0) {
          if (err0) {
            callback(err0);
            return;
          }
          cb();
        });
      } else {
        callback('File is not a file or directory: ' + fname);
        return;
      }
    }
  }, function() {
    require('fs').rmdir(tempdir_path, function(err) {
      if (err) {
        callback('Unable to remove directory: ' + tempdir_path);
        return;
      }
      callback(null);
    });
  });
}

function compute_input_file_stats(inputs, callback) {
  var ret = {};
  for (var key in inputs) {
    var val = inputs[key];
    if (val instanceof Array) {
      var list = [];
      for (var ii in val) {
        //var stat0=compute_input_file_stat(val[ii]);
        var stat0 = common.stat_file(val[ii]);
        if (!stat0) {
          callback('Problem computing stat for input file: ' + key + '[' + ii + ']');
          return;
        }
        list.push(stat0);
      }
      ret[key] = list;
    } else {
      //var stat0=compute_input_file_stat(val);
      var stat0 = common.stat_file(val);
      if (!stat0) {
        callback('Problem computing stat for input file: ' + key);
        return;
      }
      ret[key] = stat0;
    }
  }
  callback(null, ret);
}

function check_input_file_stats_are_consistent(inputs, input_file_stats, callback) {
  compute_input_file_stats(inputs, function(err, stats2) {
    if (err) {
      callback(err);
      return;
    }
    var same = (canonical_stringify(input_file_stats) == canonical_stringify(stats2));
    if (!same) {
      callback('Detected a change in input files.');
      return;
    }
    callback(null);
  });
}

function add_processor_job_to_queue(spec0, inputs, outputs, parameters, callback) {
  var doc0 = {
    spec: spec0,
    inputs: inputs,
    outputs: outputs,
    parameters: parameters,
    status: 'queued',
    queued_timestamp: (new Date()) - 0,
    checked_timestamp: (new Date()) - 0
  };
  var job_id = common.make_random_id(10);
  doc0._id = job_id;
  db_utils.saveDocument('processor_jobs', doc0, function(err) {
    if (err) {
      callback(err);
      return;
    }
    callback(null, job_id);
  });
}

function check_queued_job_ready_to_run(job_id, callback) {
  if (debugging) console.info('check_queued_job_ready_to_run');
  db_utils.findDocuments('processor_jobs', {}, function(err, docs) {
    if (err) {
      callback(err);
      return;
    }
    var earliest_queued_index = -1;
    var this_job_index = -1;
    var num_running = 0;
    for (var i = 0; i < docs.length; i++) {
      var doc0 = docs[i];
      if (doc0.status == 'queued') {
        if (
          (earliest_queued_index < 0) ||
          (is_earlier_than(doc0, docs[earliest_queued_index]))
        ) {
          earliest_queued_index = i;
        }
        if (doc0._id == job_id) {
          this_job_index = i;
        }
      } else if (doc0.status == 'running') {
        num_running++;
      }
      if (doc0.status == 'queued') {
        var elapsed_since_last_checked = (new Date()) - Number(doc0.checked_timestamp);
        if (elapsed_since_last_checked > 12 * 1000) {
          console.warn('Removing queued processor job that has not been checked for a while.');
          db_utils.removeDocuments('processor_jobs', {
            _id: doc0._id
          }, function(err0) {
            if (err0) {
              console.error('Problem removing queued processor job from database.')
            }
          });
        }
      }
    }
    if (this_job_index < 0) {
      callback('Unable to find queued job in database.');
      return;
    }
    if (debugging) console.info('earliest_queued_index=' + earliest_queued_index);
    if (debugging) console.info('this_job_index=' + this_job_index);
    if (debugging) console.info('num_running=' + num_running);
    if (debugging) console.info('max_num_simultaneous_processor_jobs=' + max_num_simultaneous_processor_jobs);
    if ((num_running < max_num_simultaneous_processor_jobs) && (earliest_queued_index == this_job_index)) {
      //ready
      if (debugging) console.info('looks like we are ready');
      doc0 = docs[this_job_index];
      doc0.status = 'running';
      db_utils.saveDocument('processor_jobs', doc0, function(err) {
        if (err) {
          callback(err);
          return;
        }
        callback(null, true);
      });
    } else {
      //not ready
      if (debugging) console.info('not ready yet');
      doc0 = docs[this_job_index];
      doc0.checked_timestamp = (new Date()) - 0;
      db_utils.saveDocument('processor_jobs', doc0, function(err) {
        if (err) {
          callback(err);
          return;
        }
        callback(null, false);
      });
    }
  });

  function is_earlier_than(doc0, doc1) {
    if (Number(doc0.queued_timestamp) < Number(doc1.queued_timestamp))
      return true;
    else if (Number(doc0.queued_timestamp) == Number(doc1.queued_timestamp))
      if (doc0._id < doc1._id)
        return true;
    return false;
  }
}

var debugging = false;

function wait_for_ready_run(spec0, inputs, outputs, parameters, callback) {
  // TODO: finish this
  if (debugging) console.info('wait_for_ready_run');
  compute_input_file_stats(inputs, function(err, input_file_stats) {
    if (err) {
      callback(err);
      return;
    }
    add_processor_job_to_queue(spec0, inputs, outputs, parameters, function(err, job_id) {
      if (err) {
        callback(err);
        return;
      }
      do_check();

      function do_check() {
        if (debugging) console.info('do_check');
        check_input_file_stats_are_consistent(inputs, input_file_stats, function(err) {
          if (err) {
            callback(err);
            return;
          }
          if (debugging) console.info('input file stats are consistent');
          check_queued_job_ready_to_run(job_id, function(err, ready) {
            if (err) {
              callback(err);
              return;
            }
            if (ready) {
              callback(null, job_id);
            } else {
              setTimeout(do_check, 1000);
            }
          });
        });
      }
    });
  });
}

function erase_output_files(outputs) {
  for (key in outputs) {
    var fname = outputs[key];
    if (require('fs').existsSync(fname)) {
      require('fs').unlinkSync(fname);
    }
  }
}

function do_run_process(spec0, inputs, outputs, parameters, info, callback) {
  erase_output_files(outputs);
  var cmd = filter_exe_command(spec0.exe_command, spec0, inputs, outputs, info, parameters);
  console.info('[ Running ... ] ' + cmd);
  var timer = new Date();
  var P = new SystemProcess();
  P.setCommand(cmd);
  P.setTempdirPath(info.tempdir_path || '');
  if ('console_out' in outputs) {
    P.setConsoleOutFile(outputs['console_out']);
  }
  P.onFinished(function() {
    if (!P.error()) {
      var elapsed = (new Date()) - timer;
      console.info(`Elapsed time for processor ${spec0.name}: ${elapsed/1000} sec`);
    }
    callback(P.error());
  });
  P.start();
}

function filter_exe_command(cmd, spec, inputs_in, outputs_in, info, parameters) {
  var inputs = JSON.parse(JSON.stringify(inputs_in));
  var outputs = JSON.parse(JSON.stringify(outputs_in));

  for (var i in (spec.inputs || [])) {
    var ikey = spec.inputs[i].name;
    if (!(ikey in inputs))
      inputs[ikey] = '';
  }
  for (var i in (spec.outputs || [])) {
    var okey = spec.outputs[i].name;
    if (!(okey in outputs))
      outputs[okey] = '';
  }

  var iop = {};
  for (var key in inputs)
    iop[key] = inputs[key];
  for (var key in outputs)
    iop[key] = outputs[key];
  for (var key in parameters)
    iop[key] = parameters[key];

  var arguments = [];
  var argfile_lines = [];
  var console_out_file = '';
  for (var key in iop) {
    var val = iop[key];
    if (val !== undefined) {
      if (typeof(val) != 'object') {
        if (key != 'console_out') {
          arguments.push(`--${key}=${val}`);
          argfile_lines.push(`${key}=${val}`);
        }
        cmd = cmd.split('$' + key + '$').join(val);
      } else {
        for (var i in val) {
          arguments.push(`--${key}=${val[i]}`);
        }
      }
    } else {
      cmd = cmd.split('$' + key + '$').join('');
    }
  } {
    arguments.push(`--_tempdir=${info.tempdir_path}`);
    cmd = cmd.split('$(tempdir)').join(info.tempdir_path);
  }
  cmd = cmd.split('$(arguments)').join(arguments.join(' '));

  if (cmd.indexOf('$(argfile)') >= 0) {
    var argfile_fname = info.tempdir_path + '/argfile.txt';
    if (!common.write_text_file(argfile_fname, argfile_lines.join('\n'))) {
      console.warn('Unable to write argfile: ' + argfile_fname); //but we don't have ability to return an error. :(
    }
    cmd = cmd.split('$(argfile)').join(argfile_fname);
  }

  return cmd;
}

function check_inputs_and_substitute_prvs(inputs, prefix, opts, callback) {
  var ikeys = Object.keys(inputs);
  common.foreach_async(ikeys, function(ii, key, cb) {
    if (typeof(inputs[key]) != 'object') {
      var fname = inputs[key];
      if ((!fname.startsWith('kbucket://')) && (!fname.startsWith('sha1://')) && (!fname.startsWith('http://')) && (!fname.startsWith('https://')))
        fname = require('path').resolve(process.cwd(), fname);
      let KBC = new KBClient();
      let opts0 = {
        download_if_needed: true
      };
      if ((!common.ends_with(fname,'.prv'))&&(!file_exists(fname))&&(file_exists(fname+'.prv'))) {
      	fname=fname+'.prv';
      }
      if (common.ends_with(fname, '.prv')) {
        prv_utils.prv_locate(fname, {}, function(err, fname2) {
          if ((err) || (!fname2) || (is_url(fname2))) {
            try_kbucket();
            return;
          }
          inputs[key] = fname2;
          cb();
        });
      } else {
        try_kbucket();
      }

      function try_kbucket() {
        KBC.realizeFile(fname, opts0)
          .then(function(path_or_url) {
            if (is_url(path_or_url)) {
              callback(`Error in input ${(prefix||'')+key} (${fname}): Could not realize file for ${path_or_url}`);
              return;
            }
            inputs[key] = path_or_url;
            cb();
          })
          .catch(function(err) {
            callback(`Error in input ${(prefix||'')+key} (${fname}): ${err}`);
          });
      }
      /*
      inputs[key]=fname;
      if (!require('fs').existsSync(fname)) {
      	callback(`Input file (${(prefix||'')+key}) does not exist: ${fname}`);
      	return;
      }
      if (common.ends_with(fname,'.prv')) {
      	var prv_opts={};
      	if ('locate_remote' in opts) {
      		prv_opts['local']=true;
      		prv_opts['remote']=true;
      	}
      	prv_utils.prv_locate(fname,prv_opts,function(err,fname2) {
      		if (err) {
      			console.error(err);
      		}
      		if (!fname2) {
      			callback(`Unable to locate file for input prv: ${(prefix||'')+key}`);
      			return;
      		}
      		if (!is_url(fname2)) {
      			inputs[key]=fname2;
      			cb();
      		}
      		else {
      			prv_utils.prv_download(fname,prv_opts,function(err,fname3) {
      				if (err) {
      					callback(`Error downloading prv: `+err);
      					return;
      				}
      				inputs[key]=fname3;
      				cb();
      			});
      		}
      	});
      }
      else {
      	cb();
      }
      */
    } else {
      check_inputs_and_substitute_prvs(inputs[key], key + '/', function(err) {
        if (err) {
          callback(err);
          return;
        }
        cb();
      });
    }
  }, function() {
    callback(null);
  });
}

function is_url(path_or_url) {
  return ((path_or_url.startsWith('http://')) || (path_or_url.startsWith('https://')));
}

function get_file_extension_for_prv_file_including_dot(prv_fname) {
  var list1 = prv_fname.split('/');
  var list2 = list1[list1.length - 1].split('.');
  if (list2.length >= 3) { //important: must have length at least 3 for prv file, otherwise extension is empty
    return '.' + list2[list2.length - 2];
  } else {
    return '';
  }
}

function check_outputs_and_substitute_prvs(outputs, process_signature, callback) {
  var pending_output_prvs = [];
  var okeys = Object.keys(outputs);
  var tmp_dir = common.temporary_directory();
  common.foreach_async(okeys, function(ii, key, cb) {
    var fname = outputs[key];
    fname = require('path').resolve(process.cwd(), fname);
    outputs[key] = fname;
    if (common.ends_with(fname, '.prv')) {
      var file_extension_including_dot = get_file_extension_for_prv_file_including_dot(fname);
      var fname2 = tmp_dir + `/output_${process_signature}_${key}${file_extension_including_dot}`;
      pending_output_prvs.push({
        name: key,
        prv_fname: fname,
        output_fname: fname2
      });
      outputs[key] = fname2;
      cb();
    } else {
      cb();
    }
  }, function() {
    callback(null, {
      pending_output_prvs: pending_output_prvs
    });
  });
}

function compute_process_signature(spec0, inputs, parameters, callback) {
  compute_process_signature_object(spec0, inputs, parameters, function(err, obj) {
    if (err) {
      callback(err);
      return;
    }
    callback(null, sha1(JSON.stringify(obj)));
  });
}

function compute_process_signature_object(spec0, inputs, parameters, callback) {
  var signature_object = {};
  signature_object.version = '0.1';
  signature_object.processor_name = spec0.name;
  signature_object.processor_version = spec0.version;
  signature_object.parameters = parameters;
  compute_process_signature_object_inputs(inputs, function(err, inputs0) {
    if (err) {
      callback(err);
      return;
    }
    signature_object.inputs = inputs0;
    callback('', signature_object);
  });
}

function compute_process_signature_object_inputs(inputs, callback) {
  // See the warning for the outputs and file extensions elsewhere in this file
  get_checksums_for_files(inputs, {
    mode: 'process_signature'
  }, callback);
}

function find_in_process_cache(process_signature, outputs, callback) {
  db_utils.findDocuments('process_cache', {
    process_signature: process_signature
  }, function(err, docs) {
    if (err) {
      callback(err);
      return;
    }
    if (docs.length == 0) {
      callback(null, null);
      return;
    }
    check_outputs_consistent_with_process_cache(outputs, docs[0], function(err, consistent) {
      if (consistent) {
        callback(null, docs[0]);
      } else {
        callback(null, null);
      }
    });
  });

}

function check_outputs_consistent_with_process_cache(outputs, doc0, callback) {
  /*
  	Warning: if we ever decide to allow copying of outputs with different
  	file paths, we need to make sure we respect the file extension, 
  	because processor behavior may be different depending on the
  	output file extension.
  	Note that we don't have to worry about such things for input files,
  	because the sha-1 hash is computed for those. Persumably if the 
  	extension is different, and it matters for functionality, then
  	the sha-1 will be different as well. (I suppose there could be
  	an exception to this, but I'd be surprised)
  */
  for (var key in outputs) {
    var fname = outputs[key];
    var stat0 = common.stat_file(fname);
    if (!stat0) {
      callback(`Unable to stat output file (${key}): ${fname}`);
      return;
    }
    var output0 = doc0.outputs[key] || {};
    if (output0.path != fname) {
      callback(null, false);
      return;
    }
    if ((output0.size != stat0.size) || (output0.mtime != stat0.mtime.toISOString()) || (output0.ctime != stat0.ctime.toISOString()) || (output0.ino != stat0.ino)) {
      callback(null, false);
      return;
    }
  }
  callback(null, true);
}

function save_to_process_cache(process_signature, spec0, inputs, outputs, parameters, callback) {
  db_utils.removeDocuments('process_cache', {
    process_signature: process_signature
  }, function(err) {
    if (err) {
      callback(err);
      return;
    }
    get_checksums_for_files(inputs, {
      mode: 'process_cache'
    }, function(err, inputs_with_checksums) {
      if (err) {
        callback(err);
        return;
      }
      get_checksums_for_files(outputs, {
        mode: 'process_cache'
      }, function(err, outputs_with_checksums) {
        if (err) {
          callback(err);
          return;
        }
        var doc0 = {
          process_signature: process_signature,
          spec: spec0,
          inputs: inputs_with_checksums,
          outputs: outputs_with_checksums,
          parameters: parameters
        };
        db_utils.saveDocument('process_cache', doc0, function(err) {
          callback(err);
        });
      });
    });
  });

}

function get_checksums_for_files(inputs, opts, callback) {
  var ret = {};
  var keys = Object.keys(inputs);
  common.foreach_async(keys, function(ii, key, cb) {
    var val = inputs[key];
    if (typeof(val) != 'object') {
      var stat0 = common.stat_file(val);
      if (!stat0) {
        callback(`Unable to stat file (${key}): ${val}`);
        return;
      }
      prv_utils.compute_file_sha1(val, function(err, sha1) {
        if (err) {
          callback(err);
          return;
        }
        if (opts.mode == 'process_cache') {
          ret[key] = {
            path: val,
            sha1: sha1,
            mtime: stat0.mtime.toISOString(),
            ctime: stat0.ctime.toISOString(),
            size: stat0.size,
            ino: stat0.ino
          };
        } else if (opts.mode == 'process_signature') {
          ret[key] = sha1;
        } else {
          callback('Unexpected mode in get_checksums_for_files: ' + opts.mode);
          return;
        }
        cb();
      });
    } else {
      get_checksums_for_files(inputs[key], opts, function(err, tmp) {
        if (err) {
          callback(err);
          return;
        }
        ret[key] = tmp;
        cb();
      });
    }
  }, function() {
    callback(null, ret);
  });
}

function separate_iops(inputs, outputs, parameters, iops, spec_inputs, spec_outputs, spec_parameters) {
  var B_inputs = {};
  for (var i in spec_inputs) {
    var key0 = spec_inputs[i].name;
    if (key0) {
      B_inputs[key0] = spec_inputs[i];
    }
  }
  var B_outputs = {};
  for (var i in spec_outputs) {
    var key0 = spec_outputs[i].name;
    if (key0) {
      B_outputs[key0] = spec_outputs[i];
    }
  }
  var B_parameters = {};
  for (var i in spec_parameters) {
    var key0 = spec_parameters[i].name;
    if (key0) {
      B_parameters[key0] = spec_parameters[i];
    }
  }
  for (var key in iops) {
    if (key in B_inputs) {
      inputs[key] = iops[key];
    } else if (key in B_outputs) {
      outputs[key] = iops[key];
    } else if (key in B_parameters) {
      parameters[key] = iops[key];
    } else {
      throw new Error(`Unexpected argument: ${key}`);
    }
  }
}

function check_iop(A, Bspec, iop_name, opts) {
  if (!opts) opts = {};
  var B = {};
  for (var i in Bspec) {
    var key0 = Bspec[i].name;
    if (key0) {
      B[key0] = Bspec[i];
    }
  }
  for (var key in A) {
    if (!(key in B)) {
      throw new Error(`Unexpected ${iop_name}: ${key}`);
    }
  }
  for (var key in B) {
    if (!(key in A)) {
      if (B[key].optional) {
        if (opts.substitute_defaults) {
          A[key] = B[key].default_value;
        }
      } else {
        throw new Error(`Missing required ${iop_name}: ${key}`);
      }
    }
  }
  return true;
}

function parse_iop(str, iop_name) {
  var ret = {};
  var list = str.split('[---]');
  for (var i in list) {
    var str0 = list[i];
    if (str0) {
      var ind0 = str0.indexOf(':');
      if (ind0 < 0) {
        throw new Error(`Error in ${iop_name}: ${str0}`);
      }
      var key0 = str0.slice(0, ind0);
      var val0 = str0.slice(ind0 + 1);
      if (!(key0 in ret)) {
        ret[key0] = val0;
      } else {
        if (typeof(ret[key0]) != 'object') {
          ret[key0] = [ret[key0], val0];
        } else {
          ret[key0].push(val0);
        }
      }
    }
  }
  return ret;
}

function file_exists(fname) {
	return require('fs').existsSync(fname);
}