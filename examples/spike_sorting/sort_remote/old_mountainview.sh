#!/bin/bash

output=${1:-output_franklab_tetrode}

mountainview --filt $output/filt.mda.prv --firings $output/firings.mda --samplerate 30000
