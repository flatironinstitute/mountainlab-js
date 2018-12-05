exports.cmd_run_process = cmd_run_process;
exports.cleanup = cleanup; // in case process terminated prematurely

const KBClient = require('kbclient').v1;
const LariClient = require('lariclient').v1;
const async = require('async');

let DEBUG = true;

let tempdir_for_cleanup = '';
let files_to_cleanup = [];
let keep_tempdir = false;
let processor_job_id_for_cleanup = '';

let common = require(__dirname + '/common.js');
let prv_utils = require(__dirname + '/prv_utils.js');
let db_utils = require(__dirname + '/db_utils.js');
let SystemProcess = new require(__dirname + '/systemprocess.js').SystemProcess;
let sha1 = require('node-sha1');
let max_num_simultaneous_processor_jobs = 2;

let canonical_stringify = require('canonical-json');

function cmd_run_process(processor_name, opts, callback) {
  if (opts.verbose == 'minimal' || opts.verbose == 'jupyter') {
    console.info = function() {};
    console.log = function() {};
  }
  if (opts.verbose == 'none') {
    console.info = function() {};
    console.log = function() {};
    console.warn = function() {};
    console.error = function() {};
  }

  opts.lari_id = opts.lari_id || process.env.LARI_ID;
  opts.lari_passcode = opts.lari_passcode || process.env.LARI_PASSCODE;

  console.info('[ Getting processor spec... ]');
  let spec_opts = {
    lari_id: opts.lari_id,
    lari_passcode: opts.lari_passcode,
    mp_file: opts.mp_file||undefined,
    mp_file_args: opts.mp_file_args||undefined,
    container: opts.container||undefined
  };
  common.get_processor_spec(processor_name, spec_opts, function(err, spec0) {
    if (err) {
      callback(err);
      return;
    }
    if (!spec0) {
      callback(`Processor not found: ${processor_name}`);
      return;
    }
    if ((opts.lari_id)&&(!opts.mp_file)) {
      cmd_run_process_lari(processor_name, spec0, opts, callback);
      return;
    }
    spec0.outputs = spec0.outputs || [];
    spec0.outputs.push({
      name: 'console_out',
      optional: true,
    });
    run_process_2(processor_name, opts, spec0, callback);
  });
}

function LariJob() {
  this.setLariId = function(id, passcode) {
    m_lari_id = id;
    m_lari_passcode = passcode || '';
  };
  this.setLariOutFile = function(outfile) {
    m_lari_out_file = outfile;
  };
  this.runProcess = function(
    processor_name,
    inputs,
    outputs,
    parameters,
    opts
  ) {
    m_processor_name = processor_name;
    m_outputs = JSON.parse(JSON.stringify(outputs));
    let outputs2 = {};
    for (let okey in m_outputs) {
      // let fname = m_outputs[okey];
      outputs2[okey] = true;
    }
    get_prv_objects_for_inputs(inputs, function(err, inputs2) {
      if (err) {
        console.error(err);
        process.exit(-1);
      }
      opts.lari_passcode = m_lari_passcode;
      m_client
        .runProcess(
          m_lari_id,
          processor_name,
          inputs2,
          outputs2,
          parameters,
          opts
        )
        .then(function(resp) {
          if (!resp.success) {
            console.error('Error running process: ' + resp.error);
            process.exit(-1);
          }
          m_job_id = resp.job_id;
          write_lari_out_file();
          setTimeout(function() {
            probe_process();
          }, 500);
        })
        .catch(function(err) {
          console.error(err);
          process.exit(-1);
        });
    });
  };
  let m_lari_id = '';
  let m_lari_passcode = '';
  let m_lari_out_file = '';
  let m_job_id = '';
  let m_client = new LariClient();
  let m_processor_name = '';
  let m_outputs = {};

  // terminal color codes
  /* let ccc = {
    Reset: '\x1b[0m',
    Bright: '\x1b[1m',
    Dim: '\x1b[2m',
    Underscore: '\x1b[4m',
    Blink: '\x1b[5m',
    Reverse: '\x1b[7m',
    Hidden: '\x1b[8m',
    FgBlack: '\x1b[30m',
    FgRed: '\x1b[31m',
    FgGreen: '\x1b[32m',
    FgYellow: '\x1b[33m',
    FgBlue: '\x1b[34m',
    FgMagenta: '\x1b[35m',
    FgCyan: '\x1b[36m',
    FgWhite: '\x1b[37m',
    BgBlack: '\x1b[40m',
    BgRed: '\x1b[41m',
    BgGreen: '\x1b[42m',
    BgYellow: '\x1b[43m',
    BgBlue: '\x1b[44m',
    BgMagenta: '\x1b[45m',
    BgCyan: '\x1b[46m',
    BgWhite: '\x1b[47m',
  };*/

  function write_lari_out_file() {
    if (!m_lari_out_file) return;
    let obj = {
      lari_id: m_lari_id,
      lari_job_id: m_job_id,
    };
    if (!common.write_json_file(m_lari_out_file, obj)) {
      console.error('Unable to write lari out file: ' + m_lari_out_file + '. Aborting.');
      process.exit(-1);
    }
  }

  function probe_process() {
    m_client
      .probeProcess(m_lari_id, m_job_id, {
        lari_passcode: m_lari_passcode,
      })
      .then(function(resp) {
        let msec = 3000;
        if (!('stdout' in resp)) {
          // old system
          if (resp.console_output) {
            let lines = resp.console_output.split('\n');
            for (let i in lines) {
              console.info(lines[i]);
              // console.info(ccc.BgBlack, ccc.FgCyan, lines[i], ccc.Reset);
            }
            msec = 1000;
          }
        } else {
          if (resp.stdout) {
            let lines = resp.stdout.split('\n');
            for (let i in lines) {
              console.info(lines[i]);
              // console.info(ccc.BgBlack, ccc.FgCyan, lines[i], ccc.Reset);
            }
            msec = 1000;
          }
          if (resp.stderr) {
            let lines = resp.stderr.split('\n');
            for (let i in lines) {
              console.info('STDERR: '+lines[i]);
              // console.info(ccc.BgRed, ccc.FgCyan, lines[i], ccc.Reset);
            }
            msec = 1000;
          }
        }

        if (resp.is_complete) {
          let result = resp.result || {};
          if (!result.success) {
            console.error(`${m_processor_name} completed with error: ${result.error}`);
            /*
             console.info(
             ccc.BgBlack,
             ccc.FgRed,
             `${m_processor_name} completed with error: ${result.error}`,
             ccc.Reset
             );
             */
            process.exit(-1);
          }
          let output_keys = Object.keys(m_outputs);
          async.eachSeries(
            output_keys,
            function(okey, cb) {
              let output0 = result.outputs[okey] || null;
              if (!output0) {
                console.error(`Unexpected missing output for ${okey}.`);
                process.exit(-1);
              }
              if (!output0.original_checksum) {
                console.error(`Unexpected format for output ${okey}.`);
                process.exit(-1);
              }
              let fname = m_outputs[okey];
              if (!common.ends_with(fname, '.prv')) {
                if (output0.original_size > 1024 * 1024) {
                  if (require('fs').existsSync(fname)) {
require('fs').unlinkSync(fname);
} // there can be trouble if we don't delete fname
                  fname += '.prv';
                  console.warn(
                    `Output ${okey} is too large to automatically download. Saving .prv file instead: ${fname}`
                  );
                }
              }
              if (common.ends_with(fname, '.prv')) {
                console.info(`Writing output ${okey} to file: ${fname}`);
                common.write_json_file(fname, output0);
                cb();
              } else {
                let KBC = new KBClient();
                KBC.downloadFile(
                  'sha1://' + output0.original_checksum,
                  fname, {}
                )
                  .then(function() {
                    cb();
                  })
                  .catch(function(err) {
                    console.error(err);
                    console.error(
                      `Error downloading output ${okey}: ${err.message}`
                    );
                    process.exit(-1);
                  });
              }
            },
            function() {
              console.info(`${m_processor_name} completed successfully.`);
              /*
                 console.info(
                 ccc.BgBlack,
                 ccc.FgGreen,
                 `${m_processor_name} completed successfully.`,
                 ccc.Reset
                 );
                 */
              process.exit(0);
            }
          );
          return;
        }
        setTimeout(function() {
          probe_process();
        }, msec);
      })
      .catch(function(err) {
        console.error(err);
        process.exit(-1);
      });
  }

  function get_prv_objects_for_inputs(inputs, callback) {
    let ret = JSON.parse(JSON.stringify(inputs));
    let ikeys = Object.keys(ret);
    async.eachSeries(
      ikeys,
      function(ikey, cb) {
        let val = ret[ikey];
        if (val instanceof Array) {
          let indices = Object.keys(val);
          async.eachSeries(
            indices,
            function(ii, cb2) {
              get_prv_object_for_input(val[ii], function(err, obj) {
                if (err) {
                  callback(
                    `Problem getting prv object for input ${ikey}[${ii}]: ${err}`
                  );
                  return;
                }
                val[ii] = obj;
                cb2();
              });
            },
            cb
          );
        } else {
          get_prv_object_for_input(val, function(err, obj) {
            if (err) {
              callback(`Problem getting prv object for input ${ikey}: ${err}`);
              return;
            }
            ret[ikey] = obj;
            cb();
          });
        }
      },
      function() {
        callback(null, ret);
      }
    );
  }

  function get_prv_object_for_input(input, callback) {
    if (typeof input != 'string') {
      callback('Input is not a string.');
      return;
    }
    if (!common.ends_with(input, '.prv')) {
      if (!file_exists(input) && file_exists(input + '.prv')) input += '.prv';
    }
    if (common.ends_with(input, '.prv')) {
      let obj = common.read_json_file(input);
      if (!obj) {
        callback('Error parsing json in prv file.');
        return;
      }
      callback(null, obj);
    } else if (input.startsWith('kbucket://') || input.startsWith('sha1://')) {
      callback(null, input);
    } else {
      prv_utils.prv_create(input, function(err, obj) {
        callback(err, obj);
      });
    }
  }
}

function cmd_run_process_lari(processor_name, spec0, opts, callback) {
  // todo: this functionality is duplicated below, try to combine code
  let inputs; let outputs; let parameters;
  try {
    inputs = parse_iop(opts.inputs || '', 'input');
    outputs = parse_iop(opts.outputs || '', 'output');
    parameters = parse_iop(opts.parameters || '', 'parameter');
    let iops = parse_iop(opts.iops || '', 'iop');
    separate_iops(
      inputs,
      outputs,
      parameters,
      iops,
      spec0.inputs || [],
      spec0.outputs || [],
      spec0.parameters || []
    );
    check_iop(inputs, spec0.inputs || [], 'input');
    check_iop(outputs, spec0.outputs || [], 'output');
    check_iop(parameters, spec0.parameters || [], 'parameter');
  } catch (err) {
    console.error(err.stack);
    callback(err.message);
    return;
  }
  // //////////////////////////////////////////////////////////////

  // let LC =  // Not Used
  new LariClient();
  let p_opts = {};
  if ('force_run' in opts) p_opts.force_run = opts.force_run;
  if ('container' in opts) p_opts.container = opts.container;
  // important -- do not pass through the opts here, because there would be security concerns. Keep the interface minimal. For example, processor_command_prefix should be configured on the server side.

  let LJ = new LariJob();
  LJ.setLariId(opts.lari_id, opts.lari_passcode);
  if (opts.lari_out) LJ.setLariOutFile(opts.lari_out);
  LJ.runProcess(processor_name, inputs, outputs, parameters, p_opts);
}

function remove_processor_job_from_database(job_id, callback) {
  db_utils.removeDocuments(
    'processor_jobs', {
      _id: job_id,
    },
    function(err) {
      callback(err);
    }
  );
}

function run_process_2(processor_name, opts, spec0, callback) {
  let inputs; let outputs; let parameters;
  try {
    inputs = parse_iop(opts.inputs || '', 'input');
    outputs = parse_iop(opts.outputs || '', 'output');
    parameters = parse_iop(opts.parameters || '', 'parameter');
    let iops = parse_iop(opts.iops || '', 'iop');
    separate_iops(
      inputs,
      outputs,
      parameters,
      iops,
      spec0.inputs || [],
      spec0.outputs || [],
      spec0.parameters || []
    );
    check_iop(inputs, spec0.inputs || [], 'input');
    check_iop(outputs, spec0.outputs || [], 'output');
    check_iop(parameters, spec0.parameters || [], 'parameter');
  } catch (err) {
    console.error(err.stack);
    callback(err.message);
    return;
  }

  let process_signature = '';
  let pending_output_prvs = [];
  let mode = opts.mode || 'run';
  let already_completed = false;
  let tempdir_path = '';
  let queued_processor_job_id = '';

  let original_inputs = JSON.parse(JSON.stringify(inputs));
  let temporary_outputs = null;
  let temporary_inputs = null;

  let steps = [];

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
    // if (mode=='exec') {
    //  cb();
    //  return;
    // }
    console.info('[ Computing process signature ... ]');
    compute_process_signature(spec0, inputs, parameters, function(err, sig) {
      if (err) {
        finalize(err);
        return;
      }
      process_signature = sig;
      console.info(`Process signature: ${process_signature}`);
      cb();
    });
  });

  // Check outputs
  steps.push(function(cb) {
    console.info('[ Checking outputs... ]');
    check_outputs_and_substitute_prvs(outputs, process_signature, function(
      err,
      tmp
    ) {
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
    if (mode == 'exec' || opts.force_run) {
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
    if (mode == 'exec' || mode == 'run') {
      cb();
      return;
    }
    console.info('[ Waiting for ready to run ... ]');
    wait_for_ready_run(spec0, inputs, outputs, parameters, function(
      err,
      job_id
    ) {
      if (err) {
        finalize(err);
        return;
      }
      queued_processor_job_id = job_id;
      processor_job_id_for_cleanup = job_id;
      cb();
    });
  });

  // Create temporary directory
  steps.push(function(cb) {
    if (already_completed) {
      cb();
      return;
    }
    console.info('[ Creating temporary directory ... ]');
    let tmp_dir = common.temporary_directory();
    tempdir_path =
      tmp_dir +
      '/tempdir_' +
      process_signature.slice(0, 10) +
      '_' +
      common.make_random_id(6);
    tempdir_for_cleanup = tempdir_path; // in case process is terminated prematurely
    if (opts.keep_tempdir) keep_tempdir = true;
    common.mkdir_if_needed(tempdir_path);
    cb();
  });

  // Create links to input files
  steps.push(function(cb) {
    if (already_completed) {
      cb();
      return;
    }
    console.info('[ Creating links to input files... ]');
    link_inputs(
      inputs,
      original_inputs, {
        tempdir_path: tempdir_path,
      },
      function(err, tmp) {
        if (err) {
          finalize(err);
          return;
        }
        temporary_inputs = tmp.temporary_inputs;
        cb();
      }
    );
  });

  // Make temporary outputs
  steps.push(function(cb) {
    if (already_completed) {
      cb();
      return;
    }
    console.info('[ Preparing temporary outputs... ]');
    make_temporary_outputs(
      outputs,
      process_signature, {
        tempdir_path: tempdir_path,
      },
      function(err, tmp) {
        if (err) {
          finalize(err);
          return;
        }
        temporary_outputs = tmp.temporary_outputs;
        cb();
      }
    );
  });

  // Run the process
  steps.push(function(cb) {
    if (already_completed) {
      cb();
      return;
    }
    console.info('[ Initializing process ... ]');
    do_run_process(
      spec0,
      temporary_inputs,
      outputs,
      temporary_outputs,
      parameters, {
        tempdir_path: tempdir_path,
        queued_processor_job_id: queued_processor_job_id,
        processor_command_prefix: opts.processor_command_prefix || '',
      },
      function(err) {
        if (err) {
          finalize(err);
          return;
        }
        cb();
      }
    );
  });

  // Handle pending output prvs
  steps.push(function(cb) {
    common.foreach_async(
      pending_output_prvs,
      function(ii, X, cb2) {
        console.info(`[ Creating output prv for ${X.name} ... ]`);
        prv_utils.prv_create(X.output_fname, function(err, obj) {
          if (err) {
            finalize(err);
            return;
          }
          common.write_json_file(X.prv_fname, obj);
          cb2();
        });
      },
      function() {
        cb();
      }
    );
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
    save_to_process_cache(
      process_signature,
      spec0,
      inputs,
      outputs,
      parameters,
      function(err) {
        if (err) {
          finalize(err);
        }
        cb();
      }
    );
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

  common.foreach_async(
    steps,
    function(ii, step, cb) {
      step(cb);
    },
    function() {
      finalize(null);
    }
  );

  function finalize(err00) {
    remove_temporary_files(files_to_cleanup, function(err) {
      if (err) {
        console.warn('Error removing temporary files: ' + err);
      }
      remove_temporary_directory(tempdir_path, function(err) {
        if (err) {
          console.warn(
            'Error removing temporary directory (' + tempdir_path + '): ' + err
          );
        }
        if (!err00) {
          console.info('[ Done. ]');
        }
        callback(err00);
      });
    });
  }
}

function move_file(srcpath, dstpath, callback) {
  require('fs').rename(srcpath, dstpath, function(err) {
    if (err) {
      console.warn(
        `This is only a warning: Unable to rename file ${srcpath} -> ${dstpath}. Perhaps temporary directory is not on the same device as the output file directory. Copying instead.`
      );
      require('fs').copyFile(srcpath, dstpath, function(err) {
        if (err) {
          callback(
            `Error renaming file ${srcpath} -> ${dstpath}: ${err.message}`
          );
          return;
        }
        require('fs').unlink(srcpath, function(err) {
          if (err) {
            callback(
              `Error removing file after copy... ${srcpath}: ${err.message}`
            );
            return;
          }
          callback(null);
        });
      });
      return;
    }
    callback(null);
  });
}

function move_file_or_files(srcpath, dstpath, callback) {
  if (srcpath instanceof Array) {
    srcpath.forEach(function(cv, i, arr) {
      move_file(cv, dstpath[i], function(err) {
        if (err) {
          callback(err);
        }
      });
    });
    callback(null);
  } else {
    move_file(srcpath, dstpath, callback);
  }
}

function move_outputs(src_outputs, dst_outputs, callback) {
  let output_keys = Object.keys(src_outputs);
  async.eachSeries(output_keys, function(key, cb) {
    console.info(`Finalizing output ${key}`);
    move_file_or_files(src_outputs[key], dst_outputs[key], function(err) {
      if (err) {
        callback(err);
        return;
      }
      cb();
    });
  }, function() {
    callback(null);
  });
}

function cleanup(callback) {
  // only called if process is terminated prematurely
  cleanup_temp_files(function() {
    cleanup_tempdir(function() {
      remove_from_database(function() {
        callback();
      });
    });
  });

  function cleanup_temp_files(cb) {
    remove_temporary_files(files_to_cleanup, function(err) {
      if (err) {
        console.warn('Error removing temporary files: ' + err);
      }
      cb();
    });
  }

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
      remove_processor_job_from_database(
        processor_job_id_for_cleanup,
        function() {
          cb();
        }
      );
    } else {
      cb();
    }
  }
}

function remove_temporary_files(tmp_files, callback) {
  async.eachSeries(tmp_files, function(fname, cb) {
    try {
      if (require('fs').existsSync(fname)) {
require('fs').unlinkSync(fname);
}
    } catch (err) {
      console.warn('Problem removing temporary file: ' + fname);
    }
    cb();
  }, function() {
    callback(null);
  });
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
  console.info('[ Removing temporary directory ... ]');
  if (!common.starts_with(tempdir_path, common.temporary_directory() + '/')) {
    // for safety
    callback('Invalid (unsafe) path for temporary directory: ' + tempdir_path);
    return;
  }
  let files = common.read_dir_safe(tempdir_path);
  common.foreach_async(
    files,
    function(ii, file, cb) {
      let fname = tempdir_path + '/' + file;
      let stat0 = common.stat_file(fname);
      if (stat0) {
        if (stat0.isFile()) {
          try {
            require('fs').unlinkSync(fname);
          } catch (err) {
            callback(
              'Unable to remove file from temporary directory: ' + fname
            );
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
    },
    function() {
      require('fs').rmdir(tempdir_path, function(err) {
        if (err) {
          callback('Unable to remove directory: ' + tempdir_path);
          return;
        }
        callback(null);
      });
    }
  );
}

function compute_input_file_stats(inputs, callback) {
  let ret = {};
  for (let key in inputs) {
    let val = inputs[key];
    if (val instanceof Array) {
      let list = [];
      for (let ii in val) {
        // var stat0=compute_input_file_stat(val[ii]);
        let stat0 = common.stat_file(val[ii]);
        if (!stat0) {
          callback(
            'Problem computing stat for input file: ' + key + '[' + ii + ']'
          );
          return;
        }
        list.push(stat0);
      }
      ret[key] = list;
    } else {
      // var stat0=compute_input_file_stat(val);
      let stat0 = common.stat_file(val);
      if (!stat0) {
        callback('Problem computing stat for input file: ' + key);
        return;
      }
      ret[key] = stat0;
    }
  }
  callback(null, ret);
}

function check_input_file_stats_are_consistent(
  inputs,
  input_file_stats,
  callback
) {
  compute_input_file_stats(inputs, function(err, stats2) {
    if (err) {
      callback(err);
      return;
    }
    let same =
      canonical_stringify(input_file_stats) == canonical_stringify(stats2);
    if (!same) {
      callback('Detected a change in input files.');
      return;
    }
    callback(null);
  });
}

function add_processor_job_to_queue(
  spec0,
  inputs,
  outputs,
  parameters,
  callback
) {
  let doc0 = {
    spec: spec0,
    inputs: inputs,
    outputs: outputs,
    parameters: parameters,
    status: 'queued',
    queued_timestamp: new Date() - 0,
    checked_timestamp: new Date() - 0,
  };
  let job_id = common.make_random_id(10);
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
    let earliest_queued_index = -1;
    let this_job_index = -1;
    let num_running = 0;
    for (let i = 0; i < docs.length; i++) {
      let doc0 = docs[i];
      if (doc0.status == 'queued') {
        if (
          earliest_queued_index < 0 ||
          is_earlier_than(doc0, docs[earliest_queued_index])
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
        let elapsed_since_last_checked =
          new Date() - Number(doc0.checked_timestamp);
        if (elapsed_since_last_checked > 12 * 1000) {
          console.warn(
            'Removing queued processor job that has not been checked for a while.'
          );
          db_utils.removeDocuments(
            'processor_jobs', {
              _id: doc0._id,
            },
            function(err0) {
              if (err0) {
                console.error(
                  'Problem removing queued processor job from database.'
                );
              }
            }
          );
        }
      }
    }
    if (this_job_index < 0) {
      callback('Unable to find queued job in database.');
      return;
    }
    if (debugging) {
console.info('earliest_queued_index=' + earliest_queued_index);
}
    if (debugging) console.info('this_job_index=' + this_job_index);
    if (debugging) console.info('num_running=' + num_running);
    if (debugging) {
console.info(
        'max_num_simultaneous_processor_jobs=' +
        max_num_simultaneous_processor_jobs
      );
}
    if (
      num_running < max_num_simultaneous_processor_jobs &&
      earliest_queued_index == this_job_index
    ) {
      // ready
      if (debugging) console.info('looks like we are ready');
      let doc0 = docs[this_job_index];
      doc0.status = 'running';
      db_utils.saveDocument('processor_jobs', doc0, function(err) {
        if (err) {
          callback(err);
          return;
        }
        callback(null, true);
      });
    } else {
      // not ready
      if (debugging) console.info('not ready yet');
      let doc0 = docs[this_job_index];
      doc0.checked_timestamp = new Date() - 0;
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
    if (Number(doc0.queued_timestamp) < Number(doc1.queued_timestamp)) {
return true;
} else if (Number(doc0.queued_timestamp) == Number(doc1.queued_timestamp)) {
if (doc0._id < doc1._id) return true;
}
    return false;
  }
}

const debugging = false;

function wait_for_ready_run(spec0, inputs, outputs, parameters, callback) {
  // TODO: finish this
  if (debugging) console.info('wait_for_ready_run');
  compute_input_file_stats(inputs, function(err, input_file_stats) {
    if (err) {
      callback(err);
      return;
    }
    add_processor_job_to_queue(spec0, inputs, outputs, parameters, function(
      err,
      job_id
    ) {
      if (err) {
        callback(err);
        return;
      }
      do_check();

      function do_check() {
        if (debugging) console.info('do_check');
        check_input_file_stats_are_consistent(
          inputs,
          input_file_stats,
          function(err) {
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
          }
        );
      }
    });
  });
}

function erase_output_files(outputs) {
  for (let key in outputs) {
    let fname = outputs[key];
    if (require('fs').existsSync(fname)) {
      require('fs').unlinkSync(fname);
    }
  }
}

function do_run_process(
  spec0,
  temporary_inputs,
  outputs,
  temporary_outputs,
  parameters,
  info,
  callback
) {
  erase_output_files(outputs);
  let singularity_bind_mode=(spec0.exe_command.indexOf('$(singularity_bind)')>=0);
  let cmd = filter_exe_command(
    spec0.exe_command,
    spec0,
    temporary_inputs,
    temporary_outputs,
    info,
    parameters
  );
  if (info.processor_command_prefix) {
    cmd = info.processor_command_prefix + ' ' + cmd;
  }
  console.info('[ Running ... ] ' + cmd);
  let timer = new Date();
  let P = new SystemProcess();
  P.setCommand(cmd);
  let tempdir_path=info.tempdir_path||'';
  if (singularity_bind_mode) {
    tempdir_path='/tmp';
  }
  P.setTempdirPath(tempdir_path);
  if ('console_out' in outputs) {
    P.setConsoleOutFile(outputs['console_out']);
  }
  P.onFinished(function() {
    if (P.error()) {
      callback(P.error());
      return;
    }
    if (!P.error()) {
      let elapsed = new Date() - timer;
      console.info(
        `Elapsed time for processor ${spec0.name}: ${elapsed / 1000} sec`
      );
    }
    move_outputs(temporary_outputs, outputs, function(err) {
      if (err) {
        callback(err);
        return;
      }
      callback(null);
    });
  });
  P.start();
}

function filter_exe_command(
  cmd,
  spec,
  inputs_in,
  outputs_in,
  info,
  parameters
) {
  let inputs = JSON.parse(JSON.stringify(inputs_in));
  let outputs = JSON.parse(JSON.stringify(outputs_in));

  for (let i in spec.inputs || []) {
    let ikey = spec.inputs[i].name;
    if (!(ikey in inputs)) inputs[ikey] = '';
  }
  for (let i in spec.outputs || []) {
    let okey = spec.outputs[i].name;
    if (!(okey in outputs)) outputs[okey] = '';
  }

  let iop = {};
  for (let key in inputs) iop[key] = inputs[key];
  for (let key in outputs) iop[key] = outputs[key];
  for (let key in parameters) iop[key] = parameters[key];

  let singularity_bind_string='';
  let singularity_bind_mode=(cmd.indexOf('$(singularity_bind)')>=0);
  let singularity_bind_index=0

  function handle_singularity_bind(key,val,tempdir) {
    if (!val) return val;
    if (!singularity_bind_mode) {
      return val;
    }
    if ((key in inputs)||(key in outputs)) {
      if (!val.startsWith(tempdir+'/')) {
        console.error(`Problem with ${key}: `+val);
        console.error('When using singularity bind, all input and output files must be in the temporary directory for this job.');
        process.exit(-1);
      }
      return '/tmp/'+val.slice((tempdir+'/').length);
    }
    else {
      return val;
    }
    
  }

  let arguments = [];
  {
    let tempdir=info.tempdir_path;
    if (singularity_bind_mode) {
      singularity_bind_string+=`-B ${tempdir}:/tmp `;
      tempdir='/tmp';
    }
    arguments.push(`--_tempdir=${tempdir}`);
    cmd = cmd.split('$(tempdir)').join(tempdir);
  }

  let argfile_lines = [];
  for (let key in iop) {
    let val = iop[key];
    if (val !== undefined) {
      if (typeof val != 'object') {
        let val2=handle_singularity_bind(key,val,info.tempdir_path);
        if (key != 'console_out') {
          arguments.push(`--${key}=${val2}`);
          argfile_lines.push(`${key}=${val2}`);
        }
        cmd = cmd.split('$' + key + '$').join(val2);
      } else {
        for (let i in val) {
          let val2=handle_singularity_bind(key,val[i],info.tempdir_path);
          arguments.push(`--${key}=${val2}`);
        }
      }
    } else {
      cmd = cmd.split('$' + key + '$').join('');
    }
  } 
  
  cmd = cmd.split('$(arguments)').join(arguments.join(' '));

  if (cmd.indexOf('$(argfile)') >= 0) {
    let argfile_fname = info.tempdir_path + '/argfile.txt';
    if (!common.write_text_file(argfile_fname, argfile_lines.join('\n'))) {
      console.warn('Unable to write argfile: ' + argfile_fname); // but we don't have ability to return an error. :(
    }
    if (singularity_bind_mode) {
      argfile_fname='/tmp/argfile.txt';
    }
    cmd = cmd.split('$(argfile)').join(argfile_fname);
  }

  if (singularity_bind_mode) {
    cmd = cmd.split('$(singularity_bind)').join(singularity_bind_string);  
  }

  return cmd;
}

function check_inputs_and_substitute_prvs(inputs, prefix, opts, callback) {
  let ikeys = Object.keys(inputs);
  common.foreach_async(
    ikeys,
    function(ii, key, cb) {
      if (typeof inputs[key] != 'object') {
        let fname = inputs[key];
        if (!fname.startsWith('kbucket://') &&
          !fname.startsWith('sha1://') &&
          !fname.startsWith('http://') &&
          !fname.startsWith('https://')
        ) {
fname = require('path').resolve(process.cwd(), fname);
}
        let KBC = new KBClient();
        let opts0 = {
          download_if_needed: true,
        };
        if (!common.ends_with(fname, '.prv') &&
          !file_exists(fname) &&
          file_exists(fname + '.prv')
        ) {
          fname = fname + '.prv';
        }
        KBC.realizeFile(fname, opts0)
          .then(function(path) {
            inputs[key] = path;
            cb();
          })
          .catch(function(err) {
            callback(
              `Error in input ${(prefix || '') + key} (${fname}): ${err}`
            );
          });
      } else {
        check_inputs_and_substitute_prvs(inputs[key], key + '/', opts, function(
          err
        ) {
          if (err) {
            callback(err);
            return;
          }
          cb();
        });
      }
    },
    function() {
      callback(null);
    }
  );
}

function get_file_extension_including_dot_ignoring_prv(prv_fname) {
  let fname = require('path').basename(prv_fname);
  if (common.ends_with(fname, '.prv')) {
    fname = fname.slice(0, fname.length - 4);
  }
  let list = fname.split('.');
  if (list.length == 0) return '.';
  return '.' + (list[list.length - 1] || '');
}

/*
   function get_file_extension_including_dot(fname) {
   var list1 = fname.split('/');
   var list2 = list1[list1.length - 1].split('.');
   if (list2.length >= 2) {
//important: must have length at least 2, otherwise extension is empty
return '.' + list2[list2.length - 1];
} else {
return '';
}
}
*/

function check_outputs_and_substitute_prvs(
  outputs,
  process_signature,
  callback
) {
  let pending_output_prvs = [];
  if (DEBUG) {
    console.log(JSON.stringify(outputs));
  }
  let okeys = Object.keys(outputs);
  let tmp_dir = common.temporary_directory();
  common.foreach_async(okeys, function(ii, key, cb) {
    let fname = outputs[key];
    if (DEBUG) {
      console.log('Processing ouput - '+fname);
      console.log(fname instanceof Array);
    }
    if (fname instanceof Array) {
      console.log('Trying Recursive Resolve');
      outputs[key] = fname.map(function c(fnm, i) {
        let tmp = resolve_file(fnm, pending_output_prvs, tmp_dir, key, process_signature);
        console.log(tmp);
        return tmp;
      });
    } else { // Process File
      outputs[key] = resolve_file(fname, pending_output_prvs, tmp_dir, key, process_signature);
    }
    console.log(JSON.stringify(outputs));
    cb();
  }, function() {
    callback(null, {
      pending_output_prvs: pending_output_prvs,
    });
  });
}

function resolve_file(fname, pending_output_prvs, tmp_dir, key, process_signature) {
  fname = require('path').resolve(process.cwd(), fname);
  if (common.ends_with(fname, '.prv')) {
    let file_extension_including_dot = get_file_extension_including_dot_ignoring_prv(fname);
    let fname2 = tmp_dir + `/output_${process_signature}_${key}${file_extension_including_dot}`;
    pending_output_prvs.push({
      name: key,
      prv_fname: fname,
      output_fname: fname2,
    });
    return fname2;
  }
  return fname;
}

function make_temporary_outputs(outputs, process_signature, info, callback) {
  let temporary_outputs = {};
  let okeys = Object.keys(outputs);
  common.foreach_async(okeys, function(ii, key, cb) {
    let fname = outputs[key];
    if (DEBUG) {
      console.log('Processing ouput - '+fname);
      console.log(fname instanceof Array);
    }
    if (fname instanceof Array) {
      temporary_outputs[key] = fname.map(function(fnm, i, arr) {
        fnm = require('path').resolve(process.cwd(), fnm);
        let file_extension_including_dot = get_file_extension_including_dot_ignoring_prv(fnm);
        return info.tempdir_path + `/output_${key}_${i}${file_extension_including_dot}`;
      });
    } else {
      fname = require('path').resolve(process.cwd(), fname);
      let file_extension_including_dot = get_file_extension_including_dot_ignoring_prv(fname);
      temporary_outputs[key] = info.tempdir_path + `/output_${key}${file_extension_including_dot}`;
    }
    cb();
  }, function() {
    callback(null, {
      temporary_outputs: temporary_outputs,
    });
  }
  );
}

function link_inputs(inputs, original_inputs, info, callback) {
  let ret = {
    temporary_inputs: JSON.parse(JSON.stringify(inputs)),
  };
  info.key_prefix = info.key_prefix || '';
  let ikeys = Object.keys(inputs);
  common.foreach_async(
    ikeys,
    function(ii, key, cb) {
      let fname = inputs[key];
      if (typeof fname != 'object') {
        let original_fname = original_inputs[key];
        fname = require('path').resolve(process.cwd(), fname);
        let file_extension_including_dot = get_file_extension_including_dot_ignoring_prv(fname);
        let desired_file_extension_including_dot = get_file_extension_including_dot_ignoring_prv(original_fname);

        //if (file_extension_including_dot == desired_file_extension_including_dot) {
        //  cb();
        //  return;
        //}
        /* get_file_extension_including_dot(
            original_fname
            );*/
        let new_fname = info.tempdir_path+`/input_${info.key_prefix}${key}_${common.make_random_id(8)}${desired_file_extension_including_dot}`;
        //let new_fname = `${fname}.tmplink.${common.make_random_id(8)}${desired_file_extension_including_dot}`;
        make_hard_link_or_copy(fname, new_fname, function(err) {
          if (err) {
            callback(`Error creating hard link for input: ${fname} -> ${new_fname}: ` + err);
            return;
          }
          ret.temporary_inputs[key] = new_fname;
          //files_to_cleanup.push(new_fname);
          cb();
        });
      } else {
        let info2 = JSON.parse(JSON.stringify(info));
        info2.key_prefix = key + '-';
        link_inputs(inputs[key], original_inputs[key], info2, function(err, tmp) {
          if (err) {
            callback(err);
            return;
          }
          ret.temporary_inputs[key] = tmp.temporary_inputs;
          cb();
        });
      }
    },
    function() {
      callback(null, ret);
    }
  );
}

function make_hard_link_or_copy(src_fname, dst_fname, callback) {
  require('fs').symlink(src_fname, dst_fname, function(err) {
    if (err) {
      console.warn(
        `This is only a warning: Unable to hard link file ${src_fname} -> ${dst_fname}. Perhaps temporary directory is not on the same device as the output file directory. Copying instead.`
      );
      require('fs').copyFile(src_fname, dst_fname, function(err) {
        if (err) {
          callback(
            `Error hard linking or copying file ${src_fname} -> ${dst_fname}: ${err.message}`
          );
          return;
        }
        callback(null);
      });
      return;
    }
    callback(null);
  });
}

function compute_process_signature(spec0, inputs, parameters, callback) {
  compute_process_signature_object(spec0, inputs, parameters, function(
    err,
    obj
  ) {
    if (err) {
      callback(err);
      return;
    }
    callback(null, sha1(canonical_stringify(obj)));
  });
}

function compute_process_signature_object(spec0, inputs, parameters, callback) {
  let signature_object = {};
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
  get_checksums_for_files(
    inputs, {
      mode: 'process_signature',
    },
    callback
  );
}

function find_in_process_cache(process_signature, outputs, callback) {
  db_utils.findDocuments(
    'process_cache', {
      process_signature: process_signature,
    },
    function(err, docs) {
      if (err) {
        callback(err);
        return;
      }
      if (docs.length == 0) {
        callback(null, null);
        return;
      }
      async.eachSeries(docs, function(doc, cb) {
        check_outputs_consistent_with_process_cache(outputs, doc, function(
          err,
          consistent,
          msg
        ) {
          if (consistent) {
            callback(null, doc);
          } else {
            cb();
          }
        });
      }, function() {
        callback(null, null);
      });
    }
  );
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
  for (let key in outputs) {
    let fname = outputs[key];
    let stat0 = common.stat_file(fname);
    if (!stat0) {
      callback(`Unable to stat output file (${key}): ${fname}`);
      return;
    }
    let output0 = doc0.outputs[key] || {};
    if (output0.path != fname) {
      callback(null, false, `${output0.path} <> ${fname}`);
      return;
    }
    if (
      output0.size != stat0.size ||
      output0.mtime != stat0.mtime.toISOString() ||
      // output0.ctime != stat0.ctime.toISOString() || //not sure why the ctime is having trouble
      output0.ino != stat0.ino
    ) {
      callback(null, false, `Stats do not match: ${output0.size} ${stat0.size} ${output0.mtime} ${stat0.mtime.toISOString()} ${output0.ctime} ${stat0.ctime.toISOString()} ${output0.ino} ${stat0.ino} ${fname}`);
      return;
    }
  }
  callback(null, true, '');
}

function save_to_process_cache(
  process_signature,
  spec0,
  inputs,
  outputs,
  parameters,
  callback
) {
  db_utils.removeDocuments(
    'process_cache', {
      process_signature: process_signature,
    },
    function(err) {
      if (err) {
        callback(err);
        return;
      }
      get_checksums_for_files(
        inputs, {
          mode: 'process_cache',
        },
        function(err, inputs_with_checksums) {
          if (err) {
            callback(err);
            return;
          }
          get_checksums_for_files(
            outputs, {
              mode: 'process_cache',
            },
            function(err, outputs_with_checksums) {
              if (err) {
                callback(err);
                return;
              }
              let doc0 = {
                process_signature: process_signature,
                spec: spec0,
                inputs: inputs_with_checksums,
                outputs: outputs_with_checksums,
                parameters: parameters,
              };
              db_utils.saveDocument('process_cache', doc0, function(err) {
                callback(err);
              });
            }
          );
        }
      );
    }
  );
}

function get_checksums_for_files(inputs, opts, callback) {
  let ret = {};
  let keys = Object.keys(inputs);
  common.foreach_async(
    keys,
    function(ii, key, cb) {
      let val = inputs[key];
      if (typeof val != 'object') {
        let stat0 = common.stat_file(val);
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
              // ctime: stat0.ctime.toISOString(), //not sure why the ctime is having trouble
              size: stat0.size,
              ino: stat0.ino,
            };
          } else if (opts.mode == 'process_signature') {
            ret[key] = sha1;
          } else {
            callback(
              'Unexpected mode in get_checksums_for_files: ' + opts.mode
            );
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
    },
    function() {
      callback(null, ret);
    }
  );
}

function separate_iops(
  inputs,
  outputs,
  parameters,
  iops,
  spec_inputs,
  spec_outputs,
  spec_parameters
) {
  let B_inputs = {};
  for (let i in spec_inputs) {
    let key0 = spec_inputs[i].name;
    if (key0) {
      B_inputs[key0] = spec_inputs[i];
    }
  }
  let B_outputs = {};
  for (let i in spec_outputs) {
    let key0 = spec_outputs[i].name;
    if (key0) {
      B_outputs[key0] = spec_outputs[i];
    }
  }
  let B_parameters = {};
  for (let i in spec_parameters) {
    let key0 = spec_parameters[i].name;
    if (key0) {
      B_parameters[key0] = spec_parameters[i];
    }
  }
  for (let key in iops) {
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
  let B = {};
  for (let i in Bspec) {
    let key0 = Bspec[i].name;
    if (key0) {
      B[key0] = Bspec[i];
    }
  }
  for (let key in A) {
    if (!(key in B)) {
      throw new Error(`Unexpected ${iop_name}: ${key}`);
    }
  }
  for (let key in B) {
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
  let ret = {};
  let list = str.split('[---]');
  for (let i in list) {
    let str0 = list[i];
    if (str0) {
      let ind0 = str0.indexOf(':');
      if (ind0 < 0) {
        throw new Error(`Error in ${iop_name}: ${str0}`);
      }
      let key0 = str0.slice(0, ind0);
      let val0 = str0.slice(ind0 + 1);
      if (!(key0 in ret)) {
        ret[key0] = val0;
      } else {
        if (typeof ret[key0] != 'object') {
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
