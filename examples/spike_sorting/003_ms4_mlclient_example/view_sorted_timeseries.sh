#!/bin/bash

set -e

ev-timeseries --timeseries output/filt.mda.prv --firings output/firings.mda --samplerate 30000
