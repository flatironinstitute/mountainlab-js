#!/bin/bash

set -e

mkdir -p data

# Make synthetic ephys data
ml-run-process ephys.synthesize_random_waveforms --outputs waveforms_out:data/waveforms_true.npy.prv geometry_out:data/geom.csv --parameters upsamplefac:13 M:4 average_peak_amplitude:100
ml-run-process ephys.synthesize_random_firings --outputs firings_out:data/firings_true.npy.prv --parameters duration:600
ml-run-process ephys.synthesize_timeseries --inputs firings:data/firings_true.npy.prv waveforms:data/waveforms_true.npy.prv --outputs timeseries_out:data/raw.mda.prv --parameters duration:600 waveform_upsamplefac:13 noise_level:10

# Preprocess
ml-run-process ephys.bandpass_filter --inputs timeseries:data/raw.mda.prv --outputs timeseries_out:data/filt.mda.prv --parameters samplerate:30000 freq_min:300 freq_max:6000
ml-run-process ephys.whiten --inputs timeseries:data/filt.mda.prv --outputs timeseries_out:data/pre.mda.prv

# Spike sorting
ml-run-process ms4alg.sort --inputs timeseries:data/pre.mda.prv geom:data/geom.csv --outputs firings_out:data/firings.npy.prv --parameters adjacency_radius:-1 detect_sign:1

## TODO: curation step

## TODO: 