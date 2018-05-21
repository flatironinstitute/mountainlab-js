
exports.main=main;
exports.spec=spec;

function spec() {
  return {
    inputs:[],
    outputs:[
      {
        name:'firings_out',
        optional:false
      },
      {
        name:'filt_out',
        optional:true
      },
      {
        name:'pre_out',
        optional:true
      }
    ],
    parameters:[
      {
        name:'study_owner',
        optional:false
      },
      {
        name:'study_name',
        optional:false
      },
      {
        name:'dataset',
        optional:false
      },
      {
        name:'detect_threshold',
        optional:true,
        default_value:3
      },
      {
        name:'adjacency_radius',
        optional:true,
        default_value:-1
      },
      {
        name:'filter',
        optional:true,
        default_value:'true'
      },
      {
        name:'whiten',
        optional:true,
        default_value:'true'
      },
      {
        name:'freq_min',
        optional:true,
        default_value:300
      },
      {
        name:'freq_max',
        optional:true,
        default_value:6000
      },
    ]
  };
}

function main(inputs,outputs,pp,opts) {
  var study0=_MLS.loadStudy({owner:pp.study_owner,title:pp.study_name});
  _MLS.wait(function() {
    var ds=study0.datasets[pp.dataset];
    if (!ds) {
      console.error('Unable to find dataset: '+pp.dataset);
      return;
    }
    inputs={};
    var parameters={};
    
    //raw.mda
    if (('raw.mda' in ds.files)) {
      inputs.timeseries=ds.files['raw.mda'];
    }
    else if (('raw.dat' in ds.files)) {
      var num_channels=ds.parameters['num_channels']
      var dtype=ds.parameters['dtype']
      if (!num_channels) {
        console.error('Missing dataset parameter: num_channels');
        return;
      }
      if (!dtype) {
        console.error('Missing dataset parameter: dtype');
        return;
      }
      inputs.timeseries=convert_to_mda(ds.files['raw.dat'],num_channels,dtype);
    }
    else {
      console.error('Missing file in dataset: raw.mda or raw.dat');
      return;
    }
    

    //geom.csv
    if ('geom.csv' in ds.files) {
      inputs.geom=ds.files['geom.csv'];
    }
    
    //params from dataset
    parameters.samplerate=ds.parameters['samplerate'];
    parameters.detect_sign=ds.parameters['spike_sign']||ds.parameters['detect_sign'];

    //other parameters
    parameters.detect_threshold=pp.detect_threshold;
    parameters.adjacency_radius=pp.adjacency_radius;
    parameters.filter=pp.filter;
    parameters.whiten=pp.whiten;
    parameters.freq_min=pp.freq_min;
    parameters.freq_max=pp.freq_max;
    parameters.num_channels=0;
    
    //run the sort
    sort(inputs,outputs,parameters,opts);
  });
}

function sort(inputs,outputs,parameters,opts) {
  var pp=parameters;
  pp.clip_size=pp.clip_size||50;
  pp.num_workers=pp.num_workers||0;
  pp.detect_interval=pp.detect_interval||10;

  var results={};
  results.raw=inputs.timeseries;
  results.filt=results.raw;
  if (pp.filter=='true') {
    results.filt=bandpass_filter(results.filt,{samplerate:pp.samplerate,freq_min:pp.freq_min,freq_max:pp.freq_max});
  }
  results.pre=results.filt;
  if (pp.whiten=='true') {
    results.pre=whiten(results.pre,{samplerate:pp.samplerate,freq_min:pp.freq_min,freq_max:pp.freq_max});
  }

  var sort_params={
    adjacency_radius:pp.adjacency_radius,
    detect_sign:pp.detect_sign,
    detect_threshold:pp.detect_threshold,
    detect_interval:pp.detect_interval,
    clip_size:pp.clip_size,
    num_workers:pp.num_workers
  };
  results.firings=ms4alg_sort(results.pre,inputs.geom||'',sort_params);

  _MLS.setResult(outputs.firings_out,results.firings);
  if (outputs.filt_out)
    _MLS.setResult(outputs.filt_out,results.filt);
  if (outputs.pre_out)
    _MLS.setResult(outputs.pre_out,results.pre);

  return results;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
function convert_to_mda(A,num_channels,dtype) {
  var params={
    format_out:'mda',
    dimensions:`${num_channels},-1`,
    dtype:dtype
  };
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
function ms4alg_sort(timeseries,geom,params) {
  var B=_MLS.runProcess(
    'ms4alg.sort',
    {
      timeseries:timeseries,
      geom:geom||''
    },
    {
      firings_out:true
    },
    params,
    {}
  );
  return B.firings_out;
}