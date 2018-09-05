exports.main=main;
exports.spec=spec;

var study0=_MLS.loadStudy({owner:'jmagland@flatironinstitute.org',title:'jfm_synth.mls'});

function spec() {
  return {
    inputs:[],
    outputs:[],
    parameters:[
      {
        name:'upload_results',
        optional:'true',
        default_value:'false'
      }
    ]
  };
}

function main(inputs,outputs,parameters,opts) {
  var study=study0;
  var datasets=study.datasets;
  
  var all_runs=[];
  for (var ds_id in datasets) {
    all_runs.push({
      dataset_id:ds_id,
      dataset:datasets[ds_id],
      spike_sorter_name:'MS4',
      spike_sorter:MS4
    });
  }
  
  foreach_async(all_runs,{},function(run,cb) {
    console.log (`Running ${run.spike_sorter_name} on ${run.dataset_id}`);
    var timeseries_files=collect_timeseries_files(run.dataset);
    if (timeseries_files.length===0) {
      console.error('No timeseries files found');
      return false;
    }
    if (timeseries_files.length>1) {
      console.error('More than one timeseries files not supported yet.');
      return false;
    }
    console.log ('Using timeseries files:');
    for (var i in timeseries_files) {
      console.log (timeseries_files[i].fname);
    }
    var results=run.spike_sorter.sort(timeseries_files,run.dataset.parameters);
    _MLS.setResult(run.dataset_id+'/raw.mda',results.raw);
    _MLS.setResult(run.dataset_id+'/firings.mda',results.firings);
    if (parameters.upload_results=='true') {
      _MLS.upload(results.firings);
    }
    var summary_results=compute_summary_results(results);
    for (var key in summary_results) {
      _MLS.setResult(run.dataset_id+'/'+key,summary_results[key]);
      if (parameters.upload_results=='true') {
        _MLS.upload(summary_results[key]);
      }
    }
    
    _MLS.wait(function() {
      cb();
    });
  },function() {
    console.log ('done');
  });
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
var MS4={
  sort:ms4_sort
};
function ms4_sort(timeseries_files,ds_params) {
  var results={};
  var dims=[ds_params.num_channels,32198704]; // hard-coded for now -- we need to allow -1, which will determine from the file size
  results.raw=convert_to_mda(timeseries_files[0].file,{dimensions:dims.join(','),dtype:ds_params.dtype});
  results.filt=bandpass_filter(results.raw,{samplerate:ds_params.samplerate,freq_min:300,freq_max:6000});
  results.pre=whiten(results.filt);
  var sort_params={
    detect_sign:ds_params.spike_sign,
    adjacency_radius:-1
  };
  results.firings=ms4alg_sort(results.pre,sort_params);
  return results;
}
function convert_to_mda(A,params) {
  params.format_out='mda';
  var B=_MLS.runProcess(
    'ephys.convert_array',
    {
      input:A
    },
    {
      output:true
    },
    params,
    {}
  );
  return B.output;
}

function compute_summary_results(results) {
  var ret={};
  ret['templates.mda']=compute_templates(results.raw,results.firings,150);
  return ret;
}

function compute_templates(timeseries,firings,clip_size) {
  var B=_MLS.runProcess(
    'ephys.compute_templates',
    {
      timeseries:timeseries,
      firings:firings
    },
    {
      templates_out:true
    },
    {
      clip_size:clip_size
    },
    {}
  );
  return B.templates_out; //same as B['timeseries_out']
}

function bandpass_filter(A,params) {
  var B=_MLS.runProcess(
    'ephys.bandpass_filter',
    {
      timeseries:A
    },
    {
      timeseries_out:true
    },
    params,
    {}
  );
  return B.timeseries_out; //same as B['timeseries_out']
}
function whiten(A) {
  var B=_MLS.runProcess(
    'ephys.whiten',
    {
      timeseries:A
    },
    {
      timeseries_out:true
    },
    {}
  );
  return B.timeseries_out;
}
function ms4alg_sort(timeseries,params) {
  var B=_MLS.runProcess(
    'ms4alg.sort',
    {
      timeseries:timeseries
    },
    {
      firings_out:true
    },
    params,
    {}
  );
  return B.firings_out;
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

function collect_timeseries_files(dataset) {
  var ret=[];
  for (var fname in dataset.files) {
    if (ends_with(fname,'.dat')) {
      ret.push({fname:fname,file:dataset.files[fname]});
    }
  }
  return ret;
}

function ends_with(str,ending) {
  return (str.slice(str.length-ending.length)==ending);
}

function foreach_async(list,opts,step,callback) {
  var statuses=[];
  for (var i in list) {
    statuses.push('pending');
  }
  
  do_check();
  function do_check() {
    var num_running=0;
    var next_to_run=-1;
    for (var i in statuses) {
      if (statuses[i]=='running')
        num_running++;
      if (statuses[i]=='pending') {
        if (next_to_run<0)
          next_to_run=i;
      }
    }
    if (next_to_run>=0) {
      if (num_running<(opts.max_simultaneous||1)) {
        statuses[next_to_run]='running';
        step(list[next_to_run],function() {
          statuses[next_to_run]='finished';
          do_check();
        });
        do_check();
        return;
      }
    }
    else {
      if (num_running===0) {
        if (callback) callback();
        callback=null;
      }
    }
  }
}