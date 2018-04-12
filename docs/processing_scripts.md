# MountainLab processing scripts (.ml files)


Since processors can be run individually using system calls, processing pipelines may be formed in many different ways, including bash scripts. However, the preferred way is to use the JavaScript system built in to MountainLab. This allows scripts to be portable and more secure. MountainLab processing scripts can either be run from the command-line or from within a web browser, and can execute jobs on the local machine or on a remote server.

**Note:** The examples we will look at require the [MountainSort](https://github.com/flatironinstitute/mountainsort) processor package to be installed. This can either be done by cloning and compiling MountainSort within ~/.mountainlab/packages, or by installing the Ubuntu package (via ppa) and updating the ML_PACKAGE_SEARCH_DIRECTORY to include /opt/mountainlab/packages (see ml-config).

## First example -- synthesize a timeseries dataset

Let's go to the first example included with MountainLab:

```
cd examples/processing_script_examples/001_create_synthetic_timeseries
```

You will notice a single processing script named ```create_synthetic_timeseries.ml```. To run this script, simply run

```
mls-run create_synthetic_timeseries.ml --parameters M:8 K:20 duration:120 --results=output
```

This will generate a synthetic timeseries with 8 channels, 20 synthetic units and a duration of 120 seconds (the default sample rate of 30000 Hz is used). The output can be seen in the newly created output/ directory:

```
> ls output/
firings.mda.prv  geom.csv.prv  ML_ALLOW_RM  raw.mda.prv  waveforms.mda.prv
```

Note that the actual data files are not in this directory, only pointers to those files (.prv files) have been created. To locate the actual files, use the ```ml-prv-locate``` command:

```
> ml-prv-locate output/raw.mda.prv
/tmp/mountainlab-tmp/output_5b93d60d8c3820846bffb819c9cef3361a8a5356_timeseries_out
```

If we don't want to use an output directory (or .prv files), but instead want to specify a target location for the actual file, we can instead run:

```
mls-run create_synthetic_timeseries.ml --parameters M:8 K:20 duration:120 --timeseries_out=raw_synth.mda --firings_out=firings_synth.mda
```

and this will create the actual output files (not .prv files) as prescribed.

Now, let's take a look at the processing script: ```create_synthetic_timeseries.ml```

[[TODO: finish]]

