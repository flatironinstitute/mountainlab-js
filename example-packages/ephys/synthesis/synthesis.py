import os
import sys

from mltools import processormanager as pm

import p_synthesize_timeseries
import p_synthesize_random_waveforms
import p_synthesize_random_firings

#import p_synthesize_drifting_timeseries

PM=pm.ProcessorManager()

PM.registerProcessor(p_synthesize_timeseries.synthesize_timeseries)
PM.registerProcessor(p_synthesize_random_waveforms.synthesize_random_waveforms)
PM.registerProcessor(p_synthesize_random_firings.synthesize_random_firings)

#PM.registerProcessor(p_synthesize_drifting_timeseries.synthesize_drifting_timeseries)

if not PM.run(sys.argv):
    exit(-1)
