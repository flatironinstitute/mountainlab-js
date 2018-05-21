---
layout: page
title: MountainLab processing script
tagline: .ml files
---

Since processors can be run individually using system calls, processing pipelines may be formed in many different ways, including bash scripts. However, the preferred way is to use the JavaScript system built in to MountainLab. This allows scripts to be portable and more secure. MountainLab processing scripts can either be run from the command-line or from within a web browser, and can execute jobs on the local machine or on a remote server.

**Note:** The examples we will look at require the [MountainSort](https://github.com/flatironinstitute/mountainsort) processor package to be installed. This can either be done by cloning and compiling MountainSort within ~/.mountainlab/packages, or by installing the Ubuntu package (via ppa) and updating the ML_PACKAGE_SEARCH_DIRECTORY to include /opt/mountainlab/packages (see ml-config).

## First example -- synthesize a timeseries dataset

Let's go to the first example included with MountainLab:

```
cd examples/processing_script_examples/001_create_synthetic_timeseries
```

You will notice a single processing script named ```create_synthetic_timeseries.ml```. To run this script, simply run

```
ml-run-script create_synthetic_timeseries.ml --parameters M:8 K:20 duration:120 --results=output
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
ml-run-script create_synthetic_timeseries.ml --parameters M:8 K:20 duration:120 --outputs timeseries_out:raw_synth.mda firings_out:firings_synth.mda
```

and this will create the actual output files (not .prv files) as prescribed. If you have MountainView installed, you can view visualize this output by running:

```
mountainview --samplerate=30000 --raw=raw_synth.mda
```

Now, let's take a look at the processing script: ```create_synthetic_timeseries.ml```

The first lines are

```
exports.spec=spec;
exports.main=main;
```

This can just be included at the top of all driver scripts (the spec is optional), and tells the system which functions in the script to look at. The spec function (optional) returns the spec for this processing script, similar to the spec for individual processors.

```
function spec() {
	// Description
	var description='Create a simple synthetic raw timeseries dataset for testing of spike sorting.';

	// Inputs
	var inputs=[];

	// Outputs
	var outputs=[
		{
			name:"timeseries_out",
			description:"The synthesized timeseries (MxN)",
			optional:true
		},
		{
			name:"firings_out",
			description:"The true firings file (3xL)",
			optional:true
		},
		{
			name:"waveforms_out",
			description:"The true waveforms file (MxTxK)",
			optional:true
		},
		{
			name:"geom_out",
			description:"The electrode geometry file corresponding to the synthesized timeseries",
			optional:true
		}
	];

	// Parameters
	var parameters=[
		{
			name:"samplerate",
			description:"The sampling rate for the synthesized timeseries (Hz)",
			optional:true,
			default_value:30000
		},
		{
			name:"duration",
			description:"The duration of the synthesized timeseries (sec)",
			optional:true,
			default_value:30000
		},
		{
			name:"noise_level",
			description:"The noise level for the synthesized timeseries",
			optional:true,
			default_value:1
		},
		{
			name:"M",
			description:"The number of channels for the synthesized timeseries",
			optional:true,
			default_value:1
		},
		{
			name:"K",
			description:"The number of synthetic units to generate",
			optional:true,
			default_value:1
		}
	];

	return {
		description:description,
		inputs:inputs,
		outputs:outputs,
		parameters:parameters
	};
}
```

Just as with individual MountainLab processors, this spec defines the inputs, outputs, and parameters corresponding to command line calls (ml-run-script). In this case, we require no input files (we are synthesizing data from scratch). There are four optional output files -- the synthesized timeseries, the true firings file, the true waveforms, and the electrode geometry file. Finally, there are several parameters for controlling the synthesis operation.

Next, we have the main function:

```
function main(inputs,outputs,params) {
	// Synthesize the random waveforms (oversampled)
	var A=synthesize_random_waveforms({
		M:params.M,
		K:params.K
	});
	var waveforms=A.waveforms_out;
	var geom=A.geometry_out;

	// Synthesize the random firing events
	var firings=synthesize_random_firings({
		K:params.K,
		samplerate:params.samplerate,
		duration:params.duration
	}).firings_out;

	// Synthesize the timeseries
	var timeseries=synthesize_timeseries({
		firings:firings,
		waveforms:waveforms,
		noise_level:params.noise_level,
		samplerate:params.samplerate,
		duration:params.duration
	}).timeseries_out;

	// Set the output results
	_MLS.setResult(outputs.waveforms_out||'waveforms.mda',waveforms);
	_MLS.setResult(outputs.geom_out||'geom.csv',geom);
	_MLS.setResult(outputs.firings_out||'firings.mda',firings);
	_MLS.setResult(outputs.timeseries_out||'raw.mda',timeseries);
}
```

This function creates three processor jobs: synthesize waveforms, synthesize firings, and synthesize timeseries. The outputs of the first two are needed as inputs for the third. All calls to MountainLab processors from within processing scripts are asynchronous, meaning that they are just initiated (or queued), and the code execution continues immediately, before the processing completes. However, output objects (e.g., waveforms, geom, and firings) are available immediately as placeholders, allowing those files to be passed as inputs to subsequent stages of processing (e.g., synthesize_timeseries). Thus we can think of the script as setting up a pipeline of queued processes.

The ```_MLS.setResult``` commands at the bottom of the function set the outputs. Since the four outputs in this case are optional, there are fallback values (waveforms.mda, etc), which will appear on the file system in the results directory specified by --results=[dirname] in the call to ```ml-run-script```, if it was provided.

Finally, we have the low-level wrappers corresponding to the three processors we are calling. I'll just show the third and final wrapper here:

```
function synthesize_timeseries(opts) {
	var A=_MLS.runProcess(
        'pyms.synthesize_timeseries', //name of processor
		{   // the inputs
			firings:opts.firings,
			waveforms:opts.waveforms
		},
		{   // which outputs to return
			timeseries_out:true
		},
		{   // the parameters
			noise_level:opts.noise_level,
			samplerate:opts.samplerate,
			duration:opts.duration
		},
		{}  // additional opts
	);
	return A; // returns an object containing placeholders to the requested outputs, e.g., A.timeseries_out
}
```

The _MLS.runProcess function queues the processor job and returns an object containing placeholders for each of the requested outputs. Note that the output timeseries_out is specified using a boolean ```true```. This indicates that we are requesting that the processor outputs that particular file.
