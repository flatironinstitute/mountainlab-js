#!/usr/bin/env python3

import ephysviz as viz
import numpy as np
from matplotlib import pyplot as plt
from mltools import mlstudy as mls

templates=mls.loadMdaFile('output/jfm_synth_K15/templates.mda.prv')
viz.view_templates(templates)

templates=mls.loadMdaFile('output/jfm_synth_K30/templates.mda.prv')
viz.view_templates(templates)

templates=mls.loadMdaFile('output/jfm_synth_K60/templates.mda.prv')
viz.view_templates(templates)


plt.show()

