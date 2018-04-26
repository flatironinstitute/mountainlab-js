#!/usr/bin/env python3

import ephysviz as viz
import numpy as np
from mltools import mlstudy as mls
from mltools import mlproc as mlp
import imp

mlp.runProcess(
    'ephys.compute_templates', # processor name
    {"timeseries":'data/pre.mda.prv',"firings":'data/firings.mda.prv'}, # inputs
    {"templates_out":'data/templates.mda'}, # outputs
    {"clip_size":100} # parameters
)

templates=mls.loadMdaFile('data/templates.mda')
viz.view_templates(templates)