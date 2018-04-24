To generate a synthetic timeseries, run the following command from within this directory:

```
mls-run create_synthetic_timeseries.ml --outputs timeseries_out:raw.mda firings_out:firings_true.mda --parameters K:20 duration:20
```

To see the full set of options for this processing script (the spec), run:

```
mls-spec create_synthetic_timeseries.ml -p
```

To write all available outputs to a new output directory (called output), use the following:

```
mls-run create_synthetic_timeseries.ml --parameters K:20 duration:20 --results=output
```

