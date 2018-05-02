#!/usr/bin/env python3

import ephysviz as viz
import numpy as np
from mltools import mlstudy as mls
from mltools import mlproc as mlp
import deepdish as dd
from matplotlib import pyplot as plt
import imp

mlp.runProcess(
    'ephys.compute_templates', # processor name
    {"timeseries":'data/pre.mda.prv',"firings":'data/firings.npy.prv'}, # inputs
    {"templates_out":'data/templates.npy'}, # outputs
    {"clip_size":100} # parameters
)

templates=mls.loadMdaFile('data/templates.npy')
viz.view_templates(templates)

mlp.runProcess(
    'ephys.compute_cross_correlograms',
    {"firings":'data/firings.npy.prv'},
    {"correlograms_out":'data/autocorrelograms.hdf5'},
    {"samplerate":30000,"max_dt_msec":50,"bin_size_msec":2,"mode":'autocorrelograms'}
)

X=dd.io.load('data/autocorrelograms.hdf5')
viz.view_cross_correlograms(X['correlograms'])

plt.show()
