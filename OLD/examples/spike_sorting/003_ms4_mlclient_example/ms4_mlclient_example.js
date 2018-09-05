#!/usr/bin/env node

const MLClient = require('mlclient').v1;

try {
  main();
} catch (err) {
  console.error(err);
  console.error(err.message);
}

// main
async function main() {
  const MLC = new MLClient();

  mkdir_if_needed('dataset');
  mkdir_if_needed('output');

  let sort_params={
  	freq_min: 300,
    freq_max: 6000,
    samplerate: 30000,
    adjacency_radius: 4,
    detect_sign: 1,
    detect_threshold: 3
  };

  await synthesize_dataset(MLC, 'dataset', 8, 800);
  await mountainsort4(MLC, 'dataset', 'output', sort_params);
  await compare_ground_truth(MLC, 'dataset', 'output');
}

// synthesize_dataset
async function synthesize_dataset(MLC, dirname, num_channels, duration) {
  MLC.addProcess(
    'ephys.synthesize_random_firings', {}, {
      firings_out: `${dirname}/firings_true.mda.prv`
    }, {
      duration: duration
    }, {}
  );

  MLC.addProcess(
    'ephys.synthesize_random_waveforms', {}, {
      waveforms_out: `${dirname}/waveforms_true.mda.prv`,
      geometry_out: `${dirname}/geom.csv`
    }, {
      upsamplefac: 13,
      M: num_channels,
      average_peak_amplitude: 100
    }, {}
  );

  MLC.addProcess(
    'ephys.synthesize_timeseries', {
      firings: `${dirname}/firings_true.mda.prv`,
      waveforms: `${dirname}/waveforms_true.mda.prv`
    }, {
      timeseries_out: `${dirname}/raw.mda.prv`
    }, {
      duration: duration,
      waveform_upsamplefac: 13,
      noise_level: 10
    }, {});

  await MLC.run();
}

// mountainsort4
async function mountainsort4(MLC, dataset_dirname, output_dirname, params) {
  let raw = `${dataset_dirname}/raw.mda.prv`;
  let geom = `${dataset_dirname}/geom.csv`;
  let filt = `${output_dirname}/filt.mda.prv`;
  let pre = `${output_dirname}/pre.mda.prv`;
  let firings = `${output_dirname}/firings.mda`;

  let filter_params={
  	freq_min:params.freq_min,
  	freq_max:params.freq_max,
  	samplerate:params.samplerate
  };

  let sort_params={
  	adjacency_radius:params.adjacency_radius,
  	detect_threshold:params.detect_threshold,
  	detect_sign:params.detect_sign
  };

  bandpass_filter(MLC, raw, filt, filter_params);
  whiten(MLC, filt, pre, {});
  ms4alg_sort(MLC, pre, geom, firings, sort_params);

  await MLC.run();
}

// compare ground truth
async function compare_ground_truth(MLC, dataset_dirname, output_dirname) {
	MLC.addProcess({
    processor_name: 'ephys.compare_ground_truth',
    inputs: {
      firings_true: `${dataset_dirname}/firings_true.mda`,
      firings: `${output_dirname}/firings.mda`,
    },
    outputs: {
      json_out: `${output_dirname}/comparison.json`
    },
    parameters: {
    	max_dt:10
    },
    opts: {}
  });

  await MLC.run();
}

function bandpass_filter(MLC, timeseries, timeseries_out, params) {
  MLC.addProcess({
    processor_name: 'ephys.bandpass_filter',
    inputs: {
      timeseries: timeseries
    },
    outputs: {
      timeseries_out: timeseries_out
    },
    parameters: params,
    opts: {}
  });
}

function whiten(MLC, timeseries, timeseries_out, params) {
  MLC.addProcess({
    processor_name: 'ephys.whiten',
    inputs: {
      timeseries: timeseries
    },
    outputs: {
      timeseries_out: timeseries_out
    },
    parameters: params,
    opts: {}
  });
}

function ms4alg_sort(MLC, timeseries, geom, firings_out, params) {
  MLC.addProcess({
    processor_name: 'ms4alg.sort',
    inputs: {
      timeseries: timeseries,
      geom: geom
    },
    outputs: {
      firings_out: firings_out
    },
    parameters: params,
    opts: {}
  });
}

function mkdir_if_needed(dirname) {
  if (!require('fs').existsSync(dirname))
    require('fs').mkdirSync(dirname);
}