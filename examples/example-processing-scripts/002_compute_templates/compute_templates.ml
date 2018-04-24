exports.spec=spec;
exports.main=main;

function spec() {
	// Description
	var description='Compute spike waveform templates from timeseries and firings files.';

	// Inputs
	var inputs=[
		{
			name:"timeseries",
			description:"The raw or preprocessed timeseries (MxN)",
			optional:false
		},
		{
			name:"firings",
			description:"The firings file (3xL)",
			optional:false
		}
	];

	// Outputs
	var outputs=[
		{
			name:"templates_out",
			description:"The average spike waveforms (MxTxK), T=clip_size",
			optional:false
		}
	];

	// Parameters
	var parameters=[
		{
			name:"clip_size",
			description:"The clip size or snippet size for the templates",
			optional:true,
			default_value:200
		}
	];

	return {
		description:description,
		inputs:inputs,
		outputs:outputs,
		parameters:parameters
	};
}

function main(inputs,outputs,params) {
	// Synthesize the random waveforms (oversampled)
	var A=compute_templates({
		timeseries:inputs.timeseries,
		firings:inputs.firings,
		clip_size:params.clip_size
	});
	var templates=A.templates_out;

	// Set the output results
	_MLS.setResult(outputs.templates_out||'templates.mda',templates);
}

function compute_templates(opts) {
	var A=_MLS.runProcess('pyms.compute_templates',
		{
			timeseries:opts.timeseries,
			firings:opts.firings
		},
		{
			templates_out:true
		},
		{
			clip_size:opts.clip_size
		},
		{}
	);
	return A;
}
