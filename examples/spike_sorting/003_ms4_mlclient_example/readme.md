This example shows how to run the MountainSort v4 spike sorting algorithm using the mlclient JavaScript client

First you must install the latest version of mountainlab-js, and the following mountainlab packages:
* ml_ephys
* ml_ms4alg

(Be sure to update those packages regularly as new processors may be added, or existing processors may be updated)

Next install the mlcient package:

```
npm install
```

Now run the script that will generate synthetic data in dataset/ and the sorting output in output/

```
./ms4_mlclient_example.js
```

Now, view the results (you will need to install ephys-viz):

```
./view_sorted_timeseries.sh
```

and the result of comparison with ground truth:


```
./view_sort_comparison.sh
```

