#!/bin/bash

set -e

ml-list-processors

cd /working/mountainlab-js/examples/spike_sorting/001_ms4_bash_example
./synthesize_dataset.sh
./ms4_sort_bash.sh

ml-lari-start &
sleep 1

cd /working/mountainlab-js/examples/spike_sorting/002_ms4_script_example
./synthesize_dataset.sh
./ms4_sort.sh