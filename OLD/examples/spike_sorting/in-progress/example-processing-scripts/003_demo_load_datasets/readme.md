This example shows how to load datasets from a directory on the local machine.

First, let's generate some datasets by synthesizing some timeseries data:

```
mls-run ../001_create_synthetic_timeseries/create_synthetic_timeseries.ml --results=datasets/synth_10 --parameters K:10 duration:20 M:8
mls-run ../001_create_synthetic_timeseries/create_synthetic_timeseries.ml --results=datasets/synth_20 --parameters K:20 duration:20 M:8
mls-run ../001_create_synthetic_timeseries/create_synthetic_timeseries.ml --results=datasets/synth_40 --parameters K:40 duration:20 M:8
```

Next we'll run the script, passing in the root directory for the datasets. Each subdirectory will be loaded as a dataset in the study.

```
mls-run demo_load_datasets.ml --datasets=datasets --results=output
```

The output can be found in the location we specified, i.e., output/

