#!/bin/bash

set -e

study_owner=${1:-jmagland@flatironinstitute.org}
study_name=${2:-franklab_tetrode.mls}
dataset=${3:-franklab_tetrode}
output=output_$dataset

mkdir -p $output

mls-run sort_remote.ml \
	--parameters \
		study_owner:$study_owner \
		study_name:$study_name \
		dataset:$dataset \
	--outputs \
		firings_out:$output/firings.mda.prv \
		filt_out:$output/filt.mda.prv \
	--auto_download

ml-run-process ephys.compute_templates \
        --inputs timeseries:$output/filt.mda.prv firings:$output/firings.mda.prv \
        --outputs templates_out:$output/templates.mda.prv \
        --parameters \
                clip_size:150

ml-run-process ephys.compute_cluster_metrics \
        --inputs timeseries:$output/filt.mda.prv firings:$output/firings.mda.prv \
        --outputs metrics_out:$output/basic_metrics.json \
        --parameters samplerate:30000