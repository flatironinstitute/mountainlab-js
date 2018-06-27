exports.BatchJob=BatchJob;

var JSQObject=require('./jsqcore/jsqobject.js').JSQObject;
var mlutils=require('./mlutils.js');
var KBucketClient=require('./kbucketclient2.js').KBucketClient;

//fix the following
var mlpLog=require('./mlplog.js').mlpLog;

//var Module;
//if (false) { // (using_nodejs()) {
//   Module=require('module');
//}

function BatchJob(O,lari_client) {
  O=O||this;
  JSQObject(O);

  this.setBatchScript=function(script) {m_script=script;};
  this.setAllScripts=function(scripts) {m_all_scripts=scripts;};
  this.setStudyObject=function(obj) {m_study_object=obj;};
  this.setInputs=function(inputs) {m_inputs=JSQ.clone(inputs);};
  this.setOutputs=function(outputs) {m_outputs=JSQ.clone(outputs);};
  this.setParameters=function(parameters) {m_parameters=JSQ.clone(parameters);};
  this.setOpts=function(opts) {m_opts=JSQ.clone(opts);};
  this.id=function() {return m_id;};
  this.start=function() {start();};
  this.stop=function() {_stop();};
  this.resultNames=function() {return resultNames();};
  this.result=function(name) {return result(name);};
  this.results=function() {return JSQ.clone(m_results);};
  this.setResults=function(X) {m_results=JSQ.clone(X);};
  this.setDocStorClient=function(DSC) {m_docstor_client=DSC;};
  this.setKBucketUrl=function(url) {m_kbucket_url=url;};
  this.queuedProcessCount=function() {return m_queued_processes.length;};
  this.queuedProcessInfo=function(i) {return queuedProcessInfo(i);};
  this.processorJob=function(job_id) {return m_processor_jobs_by_id[job_id]||null;}
  this.setIsCompleted=function(val) {m_is_completed=val;};
  this.isCompleted=function() {return m_is_completed;};
  this.error=function() {return m_reported_error;};
  this.isRunning=function() {return (!m_is_completed);};
  this.getSpec=function(callback) {return getSpec(callback);};
  this.setAutoDownload=function(val) {m_auto_download=val;};
  this.setRunMode=function(mode) {m_run_mode=mode;};

  var m_id=JSQ.makeRandomId(6);
  var m_script='';
  var m_all_scripts={};
  var m_study_object={};
  var m_queued_processes=[];
  var m_outputs={};
  var m_results={};
  var m_max_simultaneous_processor_jobs=10;
  var m_is_completed=false;
  var m_reported_error='';
  var m_load_study_tasks=[];
  var m_load_file_tasks=[];
  var m_find_or_download_to_server_tasks=[];
  var m_upload_tasks=[];
  var m_wait_callbacks=[];
  var m_docstor_client=null;
  var m_kbucket_url='';
  var m_processor_jobs_by_id={};
  //these go into the call to main()
  var m_inputs={}; 
  var m_outputs={};
  var m_parameters={};
  var m_opts={};
  var m_auto_download=true; //todo: should be false by default
  var m_run_mode='run';

  function getSpec(callback) {
    //need dummy values
    var _MLS={
      study:{},
      runProcess:function() {},
      setResult:function() {},
      loadStudy:function() {},
      loadFile:function() {},
      upload:function() {},
      wait:function(callback) {callback();},
      prvToUrl: function() {},
      require: function() {}
    };
    var script2=`(function() {var exports={}; ${m_script}\n return exports;})()`;
    var result=null;
    try {
      result=run_some_code(function() {
        return eval(script2);
      });
      if (!result) {
        callback('Error running script.');
        return;
      }
      if (!result.spec) {
        callback(null,{inputs:[],outputs:[],parameters:[]});
        return;
      }
      var spec=result.spec();
      callback(null,spec);
    }
    catch(err) {
      callback(`Error evaluating script: ${err.message}`);
      return;
    }
  }

  function start() {
    var _MLS={
      study:JSQ.clone(m_study_object),
      runProcess:_run_process,
      setResult:_set_result,
      loadStudy:_load_study,
      loadFile:_load_file,
      upload:_upload,
      wait:_wait,
      prvToUrl: _prv_to_url,
      require:_mlsrequire
    };

    _MLS._context={study:_MLS.study};

    function require(str) {
      throw new Error(`Trying to require ${str}: require function not allowed. Instead, use _MLS.require.`);
    }

    function _mlsrequire(str,obj) {
      if (!obj) {
        return do_require(str,_MLS._context.study);
      }
      else {
        var ret={loaded:false};
        _load_study(obj,function(study0) {
          var tmp=do_require(str,study0);
          if (!tmp) {
            return;
          }
          ret.loaded=true;
          for (var key in tmp) {
            ret[key]=tmp[key];
          }
        });
        return ret;
      }

      function do_require(str,study0) {
        var old_study=_MLS._context.study;
        _MLS._context.study=study0;

        var all_scripts=study0.scripts;
        if (!(str in all_scripts)) {
          console.error('Error in require, script not found: '+str);
          throw new Error('Error in require, script not found: '+str);
          return;
        }
        var script_text=all_scripts[str].script;
        var script0=`(function() {var exports={}; ${script_text}\n return exports;})()`;
        var ret=null;
        try {
          ret=run_some_code(function() {
            return eval(script0);
          });
        }
        catch(err) {
          console.error(err);
          throw new Error('Error in module '+str+': '+err.message);
        }

        _MLS._context.study=old_study;
        return ret;
      }
    }

    var script2=`(function() {var exports={}; ${m_script}\n return exports;})()`;
    var result=null;
    try {
      result=run_some_code(function() {
        return eval(script2);
      });
    }
    catch(err) {
      console.error(err);
      report_error('Error evaluating script: '+err.message);
      return;
    }

    if (result) {
      if (result.main) {
        _wait(function() {
          result.main(m_inputs,m_outputs,m_parameters,m_opts);
        });
      }
    }

    schedule_check_queued_processes();
  }

  function _stop() {
    report_error('Stopped.');
  }

  function resultNames() {
    var ret=[];
    for (var rname in m_results) {
      ret.push(rname);
    }
    return ret;
  }

  function result(name) {
    return JSQ.clone(m_results[name]||null);
  }


  function queuedProcessInfo(i) {
    var PP=m_queued_processes[i];
    var ret=JSQ.clone(PP);
    if (PP.job) {
      ret.job_id=PP.job.id();
      if (PP.job.isCompleted()) {
        if (PP.job.error()) {
          ret.status='error';
          ret.error=PP.job.error();
        }
        else {
          ret.status='finished';
        }
      }
      else {
        ret.status='running';
      }
    }
    else {
      ret.status='not started';
    }
    return ret;
  }
  

  /*
  function set_pending_output_if_available(rr) {
    if (!rr) return;
    if (typeof(rr)!='object') return true;
    if (!rr.value) return true;
    if (!rr.value._mls_pending_output) {
      if ((!rr.value)||(typeof(rr.value)!='object')) {
        rr.status='finished';
        return;
      }
      rr.status='pending';
      var all_fields_finished=true;
      for (var field in rr.value) {
        var tmp={
          value:rr.value[field]
        };
        set_pending_output_if_available(tmp);
        rr.value[field]=tmp.value;
        if (tmp.status=='error') {
          rr.status='error';
          rr.error=tmp.error;
          rr.processor_name=tmp.processor_name;
          O.emit('results_changed');
        }
        else if (tmp.status=='running') {
          if (rr.status=='pending')
            rr.status='running';
          if (!rr.processor_name)
              rr.processor_name=tmp.processor_name;
        }
        if (tmp.status) {
          if (tmp.status!='finished') {
            all_fields_finished=false;
          }
        }
      }
      if (all_fields_finished) {
        rr.status='finished';
        O.emit('results_changed');
      }
      return;
    }
    if (rr.value._mls_pending_output in m_outputs) {
      var aa=m_outputs[rr.value._mls_pending_output];
      if (aa.status=='finished') {
        //rr.value=JSQ.clone(aa.value);
        if (typeof(aa.value)=='object') {
          for (var key0 in aa.value) { //important to do it this way so that the actual file object gets updated
            rr.value[key0]=JSQ.clone(aa.value[key0]);
          }
          delete rr.value._mls_pending_output;
        }
        else {
          rr.value=JSQ.clone(aa.value);
        }
        rr.status='finished';
        O.emit('results_changed');  
      }
      else if (aa.status=='error') {
        rr.status='error';
        rr.error=aa.error;
        rr.processor_name=aa.processor_name;
        O.emit('results_changed');  
      }
      else if (aa.status=='running') {
        rr.status='running';
        rr.processor_name=aa.processor_name;
        O.emit('results_changed');  
        done_with_all=false;
      }
    }
    else {
      done_with_all=false;
    }
  }
  */

  function check_queued_processes() {
    if (m_is_completed) {
      //we are already done
      return;
    }

    var done_with_all=true; //this will be set to false if something is not yet done

    // count how many running and check whether we are done with all the processes
    var num_running=0;
    for (var i in m_queued_processes) {
      var P=m_queued_processes[i];
      if ((P.job)&&(!P.job.isCompleted())) {
        num_running++;
        done_with_all=false;
      }
      if ((P.job)&&(P.job.isCompleted())) {
        if (!P.handled_outputs) {
          //completed but have not handled outputs yet
          done_with_all=false;
        }
      }
      if (!P.job) {
        done_with_all=false;
      }
    }

    // update the pending results and the statuses
    for (var rname in m_results) {
      var rr=m_results[rname];
      update_pending_outputs(rr);
      if (rr.value) {
        if (object_has_pending_outputs(rr.value)) {
          done_with_all=false;
          var running_outputs=get_running_outputs_for_object(rr.value);
          if (running_outputs.length==0) {
            if (rr.status!='pending') {
              rr.status='pending';
              rr.running_outputs=[];
              O.emit('results_changed');
            }
          }
          else {
            if ((rr.status!='running')||(rr.running_outputs.length!=running_outputs.length)) {
              rr.status='running';
              rr.running_outputs=JSQ.clone(running_outputs);
              O.emit('results_changed');
            }  
          }
        }
        else {
          if (rr.status!='finished') {
            rr.status='finished';
            rr.running_outputs=[];
            O.emit('results_changed');
          }
        }
      }
    }

    // Check on the load study tasks
    for (var i=0; i<m_load_study_tasks.length; i++) {
      if (m_load_study_tasks[i].isFinished()) {
        if (m_load_study_tasks[i].error()) {
          report_error(`Error loading study (${m_load_study_tasks[i].opts.title}): ${m_load_study_tasks[i].error()}`);
          return;
        }
      }
      else {
        done_with_all=false;
      }
    }

    // Check on the load file tasks
    for (var i=0; i<m_load_file_tasks.length; i++) {
      if (m_load_file_tasks[i].isFinished()) {
        if (m_load_file_tasks[i].error()) {
          report_error('Error loading file: '+m_load_file_tasks[i].error());
          return;
        }
      }
      else {
        if (!m_load_file_tasks[i].isRunning()) {
          if (check_load_file_task_ready_to_run(m_load_file_tasks[i])) {
            m_load_file_tasks[i].start();
          }
        }
        done_with_all=false;
      }
    }

    // Check on the download file tasks
    for (var i=0; i<m_find_or_download_to_server_tasks.length; i++) {
      var task=m_find_or_download_to_server_tasks[i];
      if (!task.is_finished) {
        done_with_all=false;
        if (!task.handling) {
          task.handling=true;
          handle_find_or_download_to_server_task(task);
        }
      }
    }

    // Check on the upload tasks
    for (var i=0; i<m_upload_tasks.length; i++) {
      var task=m_upload_tasks[i];
      if (!task.is_finished) {
        done_with_all=false;
        if ((task._mls_pending_output in m_outputs)&&(m_outputs[task._mls_pending_output].status=='finished')) {
          if (!task.handling) {
            task.handling=true;
            handle_upload_task(task);
          }
        }
      }
    }

    // If we are done with all, then we should run the _MLS.wait callbacks
    if (done_with_all) {
      if (m_wait_callbacks.length>0) {
        done_with_all=false;
        var callbacks=m_wait_callbacks;
        m_wait_callbacks=[];
        for (var i=0; i<callbacks.length; i++) {
          run_some_code(function() {
            callbacks[i]();
          });
        }
      }
    }

    // If we are still done with all, then we are really done!
    if (done_with_all) {
      if (!m_is_completed) {
        m_is_completed=true;
        O.emit('completed');
      }
    }

    // Manage the queued and running processes, and update the output files
    for (var i in m_queued_processes) {
      var P=m_queued_processes[i];
      if (!P.job) {
        //not yet started
        if (num_running<m_max_simultaneous_processor_jobs) {
          if (processor_job_ready_to_run(P)) {
            start_processor(P);
            O.emit('jobs_changed');
            num_running++;
          }
        }
      }
      else if (!P.job.isCompleted()) {
        //running
      }
      else if (P.job.error()) {
        //process completed with error
        report_error('Error running process ('+P.processor_name+'): '+P.job.error());
        if (!P.handled_outputs) {
          var output_files=P.job.outputFiles();
          for (var oname in P.outputs) {
            m_outputs[P.outputs[oname]._mls_pending_output]={
              status:'error',
              error:P.job.error(),
              processor_name:P.processor_name
            };
          }
          P.handled_outputs=true;
          O.emit('jobs_changed');
        }
      }
      else {
        //process completed successfully -- so set the outputs
        if (!P.handled_outputs) {
          var output_files=P.job.outputFiles();
          for (var oname in P.outputs) {
            var ofile=output_files[oname]||null;
            if (!ofile) {
              report_error('Unexpected missing output file '+oname+'  for processor '+P.processor_name);
              return;
            }
            m_outputs[P.outputs[oname]._mls_pending_output]={value:JSQ.clone(ofile),status:'finished'};
            for (var key in ofile) {
              P.outputs[oname][key]=JSQ.clone(ofile[key]);
            }
            delete P.outputs[oname]._mls_pending_output;
          }
          P.handled_outputs=true;
          O.emit('jobs_changed');
        }
      }
    }

    if (!m_is_completed) {
      schedule_check_queued_processes();
    }
  }

  var s_check_queued_processes_scheduled=false;
  function schedule_check_queued_processes() {
    if (s_check_queued_processes_scheduled) return;
    s_check_queued_processes_scheduled=true;
    setTimeout(function() {
      s_check_queued_processes_scheduled=false;
      check_queued_processes();
    },100);
  }

  function report_error(err) {
    if (m_is_completed) return;
    O.emit('error',err);
    stop_all_jobs_and_tasks();
    m_is_completed=true;
    m_reported_error=err;
    O.emit('completed');
  }

  function stop_all_jobs_and_tasks() {
    for (var i in m_queued_processes) {
      var P=m_queued_processes[i];
      if (P.job) {
        if (!P.job.isCompleted()) {
          P.job.stop();
        }
      }
    }
    for (var i in m_load_study_tasks) {
      m_load_study_tasks[i].stop();
    }
    for (var i in m_load_file_tasks) {
      m_load_file_tasks[i].stop();
    }
  }

  function check_if_file_is_on_processing_server(prv,callback) {
    lari_client.findFile(prv,{},function(err,found) {
      callback(err,found);
    });
  }

  function handle_find_or_download_to_server_task(task) {
    console.log ('Checking if file is on the processing server: '+task._mls_pending_output);
    check_if_file_is_on_processing_server(task.prv,function(err,found) {
      if (err) {
        report_error('Error checking if file is on server: '+err);
        return;
      }
      if (found) {
        console.log ('File found on processing server: '+task._mls_pending_output);
        m_outputs[task._mls_pending_output]={value:{prv:JSQ.clone(task.prv)},status:'finished'}
        task.is_finished=true;
      }
      else {
        if (m_auto_download) {
          console.log ('File not found on processing server. Will download: '+task._mls_pending_output);
          m_queued_processes.push({
            processor_name:'kbucket.download',
            inputs:{},
            outputs:{file:{_mls_pending_output:task._mls_pending_output}},
            parameters:{sha1:task.prv.original_checksum},
            opts:{force_run:true} // we should force run because we know that the file is not on the server.
          });
          task.is_finished=true;
        }
        else {
          report_error(`File not found on processing server: ${task._mls_pending_output}. sha1=${task.prv.original_checksum}. original_path=${task.prv.original_path}`);
        }
      }
    });
  }

  function processor_job_ready_to_run(P) {
    for (var iname in P.inputs) {
      var input=P.inputs[iname];
      if (!input) {
        report_error('Input '+iname+' is null for processor '+P.processor_name);
        return false;
      }
      if (is_array(input)) {
        for (var ii=0; ii<input.length; ii++) {
          var ifile=get_file_from_input(input[ii]);
          if (!ifile) {
            return false;
          }
        }
      }
      else {
        var ifile=get_file_from_input(input);
        if (!ifile) {
          return false;
        }
      }
    }
    return true;
  }

  function check_load_file_task_ready_to_run(LFT) {
    var file_obj=LFT.fileObject();
    if (file_obj._mls_pending_output) {
      var file0=get_file_from_input(file_obj);
      if (!file0) return false;
      LFT.setFileObject(file0);
    }
    return true;
  }

  function start_processor(P) {
    var X=new ProcessorJob(null,lari_client);
    m_processor_jobs_by_id[X.id()]=X;
    P.job=X;
    X.setProcessorName(P.processor_name);
    var input_files={};
    for (var iname in P.inputs) {
      var input=P.inputs[iname];
      if (is_array(input)) {
        var list0=[];
        for (var ii=0; ii<input.length; ii++) {
          var ifile=get_file_from_input(input[ii]);
          if (!ifile) {
            console.error('Unexpected: unable to get file from input: '+input[ii]);
            return;
          }
          list0.push(ifile);
        }
        input_files[iname]=list0;
      }
      else {
        var ifile=get_file_from_input(input);
        if (!ifile) {
          console.error('Unexpected: unable to get file from input: '+input);
          return;
        }
        input_files[iname]=ifile;
      }
    }
    X.setInputFiles(input_files);
    var outputs_to_return={};
    for (var oname in P.outputs) {
      outputs_to_return[oname]=true;
      m_outputs[P.outputs[oname]._mls_pending_output]={status:'running',processor_name:P.processor_name,processor:P};
    }
    X.setOutputsToReturn(outputs_to_return);
    X.setParameters(P.parameters);
    X.setOptions(P.opts);
    X.setRunMode(m_run_mode);
    X.start();
  }

  function is_array(a) {
    if (!a) return false;
    if (typeof(a)=='object') {
      return ('length' in a);
    }
    else return false;
  }

  function get_file_from_input(input) {
    if (!input) return null;
    if (input._mls_pending_output) {
      if ((input._mls_pending_output in m_outputs)&&(m_outputs[input._mls_pending_output].status=='finished')) {
        return JSQ.clone(m_outputs[input._mls_pending_output].value);
      }
      else {
        return null;
      }
    }
    else {
      if (typeof(input)!='object') {
        return input;
      }
      else {
        var ret={};
        for (var field in input) {
          var tmp=get_file_from_input(input[field]);
          if (!tmp) return null;
          ret[field]=tmp;
        }
        return ret;
      }
    }
  }

  function _run_process(processor_name,inputs,outputs,parameters,opts) {
    if (!parameters) {
      throw new Error('Improper call to runProcess.');
      return;
    }
    if (!opts) opts={};
    for (var oname in outputs) {
      if (outputs[oname]===true) {
        outputs[oname]={_mls_pending_output:processor_name+'--'+oname+'--'+JSQ.makeRandomId(10)};
      }
    }
    var inputs2=JSQ.clone(inputs);
    for (var iname in inputs2) {
      if ((inputs2[iname])&&(inputs2[iname].prv)) {
        //this means it was not generated as an output, so we need to download it if it is not on the server
        var input0=inputs2[iname];
        inputs2[iname]={_mls_pending_output:'tofind--'+iname+'--'+JSQ.makeRandomId(10)};
        m_find_or_download_to_server_tasks.push({
          prv:input0.prv,
          _mls_pending_output:inputs2[iname]._mls_pending_output
        });
      }
      if (!inputs2[iname]) {
        //in this case we will delete the input (e.g., it may be an empty string)
        delete inputs2[iname];
      }
    }
    var PP={
      processor_name:processor_name,
      inputs:inputs2,
      outputs:JSQ.clone(outputs),
      parameters:JSQ.clone(parameters),
      opts:JSQ.clone(opts)
    };
    m_queued_processes.push(PP);
    O.emit('jobs_changed');
    return PP.outputs;
  }

  function object_has_pending_outputs(obj) {
    if (!obj) return false;
    if (typeof(obj)!='object') return false;
    if (obj._mls_pending_output) return true;
    for (var field in obj) {
      if (object_has_pending_outputs(obj[field])) {
        return true;
      }
    }
    return false;
  }

  function get_running_outputs_for_object(obj) {
    if (!obj) return [];
    if (typeof(obj)!='object') return false;
    if (obj._mls_pending_output) {
      if (obj._mls_pending_output in m_outputs) {
        var out=JSQ.clone(m_outputs[obj._mls_pending_output]);
        return [out];
      }
      else {
        return [];
      }
    }
    var ret=[];
    for (var field in obj) {
      var running_outputs0=get_running_outputs_for_object(obj[field]);
      for (var k in running_outputs0) {
        ret.push(running_outputs0[k]);
      }
    }
    return ret;
  }

  function update_pending_outputs(obj) {
    if (!obj) return [];
    if (typeof(obj)!='object') return false;
    if (obj._mls_pending_output) {
      if (obj._mls_pending_output in m_outputs) {
        var out=m_outputs[obj._mls_pending_output];
        if (out.status=='finished') {
          if (typeof(out.value)=='object') {
            for (var field in out.value) {
              obj[field]=JSQ.clone(out.value[field]);
            }
          }
          else {
            report_error('update_pending_outputs: out.value is not an object: '+out.value);
            return;
          }
          delete obj._mls_pending_output;
        }
      }
      return;
    }
    var ret=[];
    for (var field in obj) {
      update_pending_outputs(obj[field]);
    }
  }

  /*
  function result_is_complete(rr) {
    if (!rr) return;
    if (typeof(rr)!='object') return true;
    if (!rr.value) return true;
    if (rr.value._mls_pending_output) {
      return false;
    }
    for (var field in rr.value) {
      if (!result_is_complete(rr.value[field]))
        return false;
    }
  }
  */

  function _set_result(obj,fname,file) {
    if (!file) {
      file=fname;
      fname=obj;
      obj=null;
    }
    if (obj) fname=obj.id+'/'+fname;
    if (object_has_pending_outputs(file)) {
      m_results[fname]={value:JSQ.clone(file),status:'pending'};
    }
    else {
      m_results[fname]={value:JSQ.clone(file),status:'finished'};
    }
    O.emit('results_changed');
  }
  function _load_study(opts,callback) {
    var ret={loaded:false,opts:opts};
    var LST=new LoadStudyTask(opts,m_docstor_client);
    m_load_study_tasks.push(LST);
    LST.onFinished(function(err,study0) {
      if (err) {
        var str=`Error loading study (${opts.title}): ${err}`;
        console.error(str);
        report_error(str);
        return;
      }
      try {
        run_some_code(function() {
          for (key in study0) {
            ret[key]=study0[key];
          }
          if (callback) callback(study0);
        });
      }
      catch(err) {
        console.error(err);
        report_error(err.message);
        return;
      }
    });
    LST.start();
    return ret;
  }
  function _prv_to_url(prv,fname) {
    if (typeof(prv)=='string') return prv; //already a url, probably
    if (!m_kbucket_url) {
      console.error('kbucket url not set.');
      return null;
    }
    if (prv.prv) prv=prv.prv;
    if (!prv.original_checksum) {
      console.error('Missing field in prv object: original_checksum');
      return null;  
    }
    var url=m_kbucket_url+'/download/'+prv.original_checksum;
    if (fname) {
      url+='/'+fname;
    }
    return url;
  }
  function _load_file(file_obj,opts,callback) {
    var LFT=new LoadFileTask(opts,lari_client);
    LFT.setFileObject(file_obj);
    m_load_file_tasks.push(LFT);
    LFT.onFinished(function(err,resp) {
      if (err) {
        console.error('Error loading file: '+err);
        report_error('Error loading file: '+err);
        return;
      }
      try {
        run_some_code(function() {
          callback(resp);
        });
      }
      catch(err) {
        console.error(err);
        report_error(err.message);
        return;
      }
    });
  }
  function _upload(obj) {
    if (!obj) return;
    if (typeof(obj)!='object') return;
    if (obj.prv) {
      add_upload_process(JSQ.clone(obj.prv));
      return;
    }
    if (obj._mls_pending_output) {
      m_upload_tasks.push(JSQ.clone(obj));
      return;
    }
    for (var key in obj) {
      _upload(obj[key]);
    }
  }

  function handle_upload_task(task) {
    var prv=m_outputs[task._mls_pending_output].value.prv;
    add_upload_process(prv);
    task.is_finished=true;
  }

  function add_upload_process(prv) {
    check_on_kbucket(prv,function(err,tmp) {
      if (err) {
        console.error('Error checking kbucket: '+err);
      }
      if ((err)||(!tmp.found)) {
        m_queued_processes.push({
          processor_name:'kbucket.upload',
          inputs:{file:{prv:prv}},
          outputs:{},
          parameters:{sha1:prv.original_checksum},
          opts:{}
        });
      }
    });
  }

  function check_on_kbucket(prv,callback) {
    var KC=new KBucketClient();
    KC.setKBucketUrl(m_kbucket_url);
    KC.findFile(prv.original_checksum,'',function(err,res) {
      callback(err,res);
    });
  }
  
  function _wait(callback) {
    m_wait_callbacks.push(callback);
  }
}

function LoadStudyTask(opts,docstor_client) {
  this.onFinished=function(handler) {m_finished_handlers.push(handler);};
  this.start=function() {start();};
  this.stop=function() {stop();};
  this.isFinished=function() {return m_is_finished;};
  this.error=function() {return m_error;};
  this.opts=function() {return JSQ.clone(opts);};

  var m_finished_handlers=[];
  var m_error=null;
  var m_is_finished=false;

  function start() {
    if (!docstor_client) {
      finalize('docstor_client is null.');
      return;
    }
    mlutils.download_document_content_from_docstor(docstor_client,opts.owner,opts.title,function(err,content) {
      if (m_is_finished) return;
      if (err) {
        finalize(err);
        return;
      }
      var obj=try_parse_json(content);
      if (!obj) {
        console.log (content);
        finalize('Unable to parse mls file content');
        return;
      }
      obj.scripts=obj.scripts||obj.batch_scripts||{};
      finalize(null,obj);
    });

    function try_parse_json(str) {
      try {
        return JSON.parse(str);
      }
      catch(err) {
        return null;
      }
    }
  }

  function stop() {
    if (m_is_finished) return;
    m_is_finished=true;
    m_error='Stopped.';
  }

  function finalize(err,study0) {
    for (var i=0; i<m_finished_handlers.length; i++) {
      m_finished_handlers[i](err,study0);
    }
    m_error=err;
    m_is_finished=true;
  }
}

function LoadFileTask(opts,lari_client) {
  this.onFinished=function(handler) {m_finished_handlers.push(handler);};
  this.start=function() {start();};
  this.stop=function() {stop();};
  this.isFinished=function() {return m_is_finished;};
  this.isRunning=function() {return ((m_is_started)&&(!m_is_finished));};
  this.error=function() {return m_error;};
  this.setFileObject=function(obj) {m_file_object=JSQ.clone(obj);};
  this.fileObject=function() {return JSQ.clone(m_file_object);};

  var m_finished_handlers=[];
  var m_error=null;
  var m_is_started=false;
  var m_is_finished=false;

  function start() {
    if (!lari_client) {
      finalize('lari_client is null.');
      return;
    }
    var format=opts.format||'text';
    if (!m_file_object.prv) {
      finalize('LoadFileTask: file object is not a prv.');
      return;
    }
    m_is_started=true;
    lari_client.getFileContent(m_file_object.prv,{},function(err,tmp) {
      if (m_is_finished) {
        return;
      }
      if (err) {
        finalize('Error locating prv file: '+tmp.error);
        return;
      }
      if (!tmp.success) {
        finalize('Error locating prv file (*): '+tmp.error);
        return;
      }
      
      var txt=tmp.content;
      if (format=='text') {
        finalize(null,txt);
        return;
      }
      else if (format=='json') {
        var obj=try_parse_json(txt);
        if (!obj) {
          finalize('Error parsing JSON in prv file.');
          return;
        }
        finalize(null,obj);
        return;
      }
    });

    function try_parse_json(str) {
      try {
        return JSON.parse(str);
      }
      catch(err) {
        return null;
      }
    }
  }

  function stop() {
    if (m_is_finished) return;
    m_is_finished=true;
    m_error='Stopped.';
  }

  function finalize(err,study0) {
    if (m_is_finished) return;
    for (var i=0; i<m_finished_handlers.length; i++) {
      m_finished_handlers[i](err,study0);
    }
    m_error=err;
    m_is_finished=true;
  }
}

function ProcessorJob(O,lari_client) {
  O=O||this;
  JSQObject(O);

  this.setProcessorName=function(name) {m_processor_name=name;};
  this.setInputFiles=function(input_files) {m_input_files=JSQ.clone(input_files);};
  this.setOutputsToReturn=function(outputs_to_return) {m_outputs_to_return=JSQ.clone(outputs_to_return);};
  this.setParameters=function(parameters) {m_parameters=JSQ.clone(parameters);};
  this.setOptions=function(options) {m_options=JSQ.clone(options);};
  this.outputFiles=function() {return JSQ.clone(m_output_files);};
  this.id=function() {return m_id;};
  this.start=function() {start();};
  this.stop=function() {stop();};
  this.isCompleted=function() {return m_is_completed;};
  this.error=function() {return m_error;};
  this.consoleOutput=function() {return m_console_output;};
  this.setRunMode=function(mode) {m_options.run_mode=mode;};

  var m_id=JSQ.makeRandomId(6);
  var m_processor_name='';
  var m_input_files={};
  var m_outputs_to_return={};
  var m_parameters={};
  var m_options={run_mode:'run'};
  var m_is_completed=false;
  var m_error='';
  var m_job_id=''; //returned from lari
  var m_console_output='';

  var m_output_files={};

  function start() {
    mlpLog({text:'Starting <a href=#>'+m_processor_name+'</a>',color:'lightgreen',labels:{script:1}});
    var LC=lari_client;
    var query={processor_name:m_processor_name};
    if (m_options.package_uri) {
      query.package_uri=m_options.package_uri;
    }
    LC.getSpec(query,{},function(err,spec) {
      if (err) {
        report_error('Unable to get spec for processor: '+m_processor_name+': '+err);
        return;
      }
      var inputs={};
      for (var i in spec.inputs) {
        var spec_input=spec.inputs[i];
        if (m_input_files[spec_input.name]) {
          var tmp=m_input_files[spec_input.name];
          if (tmp.prv)
            inputs[spec_input.name]=tmp.prv;
          else {
            var tmp2=[];
            for (var i in tmp) tmp2.push(tmp[i].prv);
            inputs[spec_input.name]=tmp2;
          }
        }
        else {
          if (spec_input.optional!=true) {
            report_error('Missing required input: '+spec_input.name);
            return;
          }
        }
      }

      var outputs_to_return={};
      
      for (var i in spec.outputs) {
        var spec_output=spec.outputs[i];
        if (m_outputs_to_return[spec_output.name]) {
          outputs_to_return[spec_output.name]=true;
        }
        else {
          if (spec_output.optional!=true) {
            report_error('Missing required output: '+spec_output.name);
            return;
          }
        }
      }

      outputs_to_return.console_out=true;
      plog('----------------------------------------------------------------------------');
      var str0='';
      if (m_options.run_mode=='exec') str0='Executing job';
      else if (m_options.run_mode=='run') str0='Running job';
      else if (m_options.run_mode=='queue') str0='Queueing job';
      plog(`${str0}: ${m_processor_name}`);
      {
        var inputs_str='INPUTS: ';
        for (var iname in inputs) {
          inputs_str+=iname+'='+inputs[iname]+'  ';
        }
        plog('  '+inputs_str);
      }
      {
        var params_str='PARAMS: ';
        for (var pname in m_parameters) {
          params_str+=pname+'='+m_parameters[pname]+'  ';
        }
        plog('  '+params_str);
      }
      plog('----------------------------------------------------------------------------');
      var qq={
        processor_name:m_processor_name,
        inputs:inputs,
        outputs:outputs_to_return,
        parameters:m_parameters,
        opts:m_options
      };
      LC.queueProcess(qq,{},function(err2,resp) {
        if (err2) {
          report_error('Error in queueJob: '+err2);
          return;
        }
        m_job_id=resp.job_id;
        handle_process_probe_response(resp,0);
      });
    });
  }
  function handle_process_probe_response(resp,num) {
    if (!resp.success) {
      report_error('Error in process probe response: '+resp.error);
      return;
    }
    if (m_job_id!=resp.job_id) {
      report_error('Unexpected: job_id does not match response: '+m_job_id+'<>'+resp.job_id);
      return;
    }
    if (resp.latest_console_output) {
      m_console_output+=resp.latest_console_output+'\n';
      var lines=resp.latest_console_output.split('\n');
      for (var i in lines) {
        if (lines[i].trim()) {
          var str0='  |'+m_processor_name+'| ';
          while (str0.length<35) str0+=' ';
          plog(str0+lines[i],{side:'server'});
        }
      }
    }
    if (resp.complete) {
      var err0='';
      if (!resp.result) {
        report_error('Unexpected: result not found in process response.');
        return;
      }
      var result=resp.result;
      if (!result.success) {
        if (!err0)
          err0=result.error||'Unknown error';
      }
      if (result.outputs) {
        for (var okey in m_outputs_to_return) {
          if (!result.outputs[okey]) {
            if (!err0)
              err0='Output not found in process response: '+okey;
          }
          else {
            var prv0=result.outputs[okey];
            m_output_files[okey]={prv:prv0};
          }
        }
        if (result.outputs['console_out']) {
          var prv0=result.outputs['console_out'];
          m_output_files['console_out']={prv:prv0};
        }
      }
      else {
        if (!err0)
          err0='Unexpected: result.outputs not found in process response';
      }
      if (err0) {
        report_error(err0);
        return;
      }
      report_finished();
    }
    else { 
      //decide how long to wait based on the number of this probe
      var msec;
      if (num==0) msec=100;
      else if (num==1) msec=1000;
      else if (num==2) msec=3000;
      else if (num<=10) msec=5000;
      else msec=5000;
      setTimeout(function() {
        var LC=lari_client;
        LC.probeProcess(m_job_id,{},function(err,resp) {
          if (err) return;
          handle_process_probe_response(resp,num+1);
        });
      },msec);
    }
  }
  function stop() {
    plog('Canceling job');
    var LC=lari_client;
    LC.cancelProcess(m_job_id,{},function(err,resp) {
      if (err) {
        plog('Error canceling job: '+err,{error:true});
        return;
      }
    });
  }
  function plog(str,obj) {
    obj=obj||{};
    obj.text=m_processor_name+'::::: '+str;
    mlpLog(obj);
  }
  function report_error(err) {
    console.log ('Error in process '+m_processor_name+': '+err);
    mlpLog({text:'Error in process '+m_processor_name+': '+err,color:'white',labels:{script:1}});
    m_is_completed=true;
    m_error=err;
  }
  function report_finished() {
    mlpLog({text:'Finished '+m_processor_name,color:'white',labels:{script:1}});
    m_is_completed=true;
  }
}

function using_nodejs() {
  if (typeof window == 'undefined') {
    return true;
  }
  if (!window.Date) {
    return true;
  }
  return false;
}

function run_some_code(func) {
  var Module=require('module');
  if (using_nodejs()) {
    var original_require = Module.prototype.require;
    Module.prototype.require=function(str) {
      throw new Error(`Trying to require ${str}: require function not allowed. Instead, use _MLS.require.`);
    }
  }

  var original_console={};
  for (var key in console)
    original_console[key]=console[key];
  try {
    if (using_nodejs()) {
      // Using nodejs
    }
    else {
      console.log=function(a) {
        original_console.log (a);
        mlpLog({text:'CONSOLE: '+a,color:'yellow',labels:{script:1}});
      }
    }
    var ret=func();
    restore();
  }
  catch(err) {
    restore();
    throw err;
  }
  return ret;

  function restore() {
    for (var key in original_console)
      console[key]=original_console[key];

    if (using_nodejs()) {
      Module.prototype.require=original_require;
    }
  }
}
