This example shows how to run the MountainSort v4 spike sorting algorithm using the .ml script included in ml_ms4alg

First you must install the latest version of mountainlab-js, and the following mountainlab packages:
* ml_ephys
* ml_ms4alg

(Be sure to update those packages regularly as new processors may be added, or existing processors may be udpated)

Create a synthetic dataset by running:

```
./synthesize_dataset.sh
```

This will create some files in dataset/

Next, run the spike sorting:

```
./ms4_sort.sh
```

This should create output in output/

Now, view the results:

```
./view_templates.sh
./view_timeseries.sh
```

Compare with ground truth:

```
./compare.sh
```

This will create `output/comparison.json`