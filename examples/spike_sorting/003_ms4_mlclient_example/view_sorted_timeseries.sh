#!/bin/bash

set -e

ev-view-timeseries --timeseries output/filt.mda.prv --firings output/firings.mda --samplerate 30000
