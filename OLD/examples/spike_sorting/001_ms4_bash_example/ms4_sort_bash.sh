#!/bin/bash

set -e

mkdir -p output

# Preprocess
ml-run-process ephys.bandpass_filter \
	--inputs timeseries:dataset/raw.mda.prv \
	--outputs timeseries_out:output/filt.mda.prv \
	--parameters samplerate:30000 freq_min:300 freq_max:6000
ml-run-process ephys.whiten \
	--inputs timeseries:output/filt.mda.prv \
	--outputs timeseries_out:output/pre.mda.prv

# Spike sorting
ml-run-process ms4alg.sort \
	--inputs \
		timeseries:output/pre.mda.prv geom:dataset/geom.csv \
	--outputs \
		firings_out:output/firings.mda.prv \
	--parameters \
		detect_sign:1 \
		adjacency_radius:-1 \
		detect_threshold:3

# Compute templates
ml-run-process ephys.compute_templates \
	--inputs timeseries:dataset/raw.mda.prv firings:output/firings.mda.prv \
	--outputs templates_out:output/templates.mda.prv \
	--parameters \
		clip_size:150