First create some synthetic data

```
mls-run ../001_create_synthetic_timeseries/create_synthetic_timeseries.ml --results=synth --parameters K:20 duration:20
```

Next, run this example to generate the templates (average spike waveforms):

```
mls-run compute_templates.ml --inputs timeseries:synth/raw.mda.prv firings:synth/firings.mda.prv --outputs templates_out:templates.mda --parameters clip_size:200
```

