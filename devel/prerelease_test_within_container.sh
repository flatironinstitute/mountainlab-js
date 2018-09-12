#!/bin/bash

export PATH=$PWD/bin:$PATH

ml-config
ml-list-processors

pip install ml_ephys
ml-link-python-module ml_ephys `ml-config package_directory`/ml_ephys
ml-list-processors

ml-run-process ephys.synthesize_random_waveforms -o waveforms_out:waveforms.mda
mda-info waveforms.mda

