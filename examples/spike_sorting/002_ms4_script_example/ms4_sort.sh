#!/bin/bash

set -e

mkdir -p output

PACKAGES=${ML_PACKAGE_SEARCH_DIRECTORY:-~/.mountainlab/packages}

ml-run-script $PACKAGES/ml_ms4alg/mlscripts/ms4_v1.ml \
	--inputs \
		timeseries:dataset/raw.mda.prv \
		geom:dataset/geom.csv \
	--outputs \
		firings_out:output/firings.mda.prv \
		filt_out:output/filt.mda.prv \
	--parameters \
		samplerate:30000 \
		detect_sign:1 \
		adjacency_radius:-1 \
		detect_threshold:3 \
		filter:true whiten:true

ml-run-process ephys.compute_templates \
	--inputs timeseries:output/filt.mda.prv firings:output/firings.mda.prv \
	--outputs templates_out:output/templates.mda.prv \
	--parameters \
		clip_size:150

ml-run-process ephys.compute_cluster_metrics \
	--inputs timeseries:dataset/raw.mda.prv firings:output/firings.mda.prv \
	--outputs metrics_out:output/basic_metrics.json \
	--parameters samplerate:30000

