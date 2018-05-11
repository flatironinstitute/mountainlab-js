#!/bin/bash

ml-run-process ephys.compare_ground_truth \
	--inputs firings_true:dataset/firings_true.mda.prv firings:output/firings.mda.prv \
	--outputs json_out:output/comparison.json \
	--parameters max_dt:10
