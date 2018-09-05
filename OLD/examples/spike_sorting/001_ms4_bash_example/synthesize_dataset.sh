#!/bin/bash

set -e

mkdir -p dataset

# Make synthetic ephys data
ml-run-process ephys.synthesize_random_waveforms --outputs waveforms_out:dataset/waveforms_true.mda.prv geometry_out:dataset/geom.csv --parameters upsamplefac:13 M:4 average_peak_amplitude:100
ml-run-process ephys.synthesize_random_firings --outputs firings_out:dataset/firings_true.mda.prv --parameters duration:600
ml-run-process ephys.synthesize_timeseries --inputs firings:dataset/firings_true.mda.prv waveforms:dataset/waveforms_true.mda.prv --outputs timeseries_out:dataset/raw.mda.prv --parameters duration:600 waveform_upsamplefac:13 noise_level:10

