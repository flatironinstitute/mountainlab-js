#!/bin/bash

output=${1:-output_franklab_tetrode}

ev-view-timeseries $output/filt.mda.prv --firings $output/firings.mda.prv
