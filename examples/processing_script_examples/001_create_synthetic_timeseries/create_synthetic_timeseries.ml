exports.spec=spec;
exports.main=main;

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
	_MLS.setResult(outputs.timeseries_out||'timeseries.mda',timeseries);
}

function synthesize_random_waveforms(opts) {
	var A=_MLS.runProcess('pyms.synthesize_random_waveforms',
		{},
		{
			waveforms_out:true,
			geometry_out:true
		},
		{
			M:opts.M,
			K:opts.K
		},
		{}
	);
	return A;
}

function synthesize_random_firings(opts) {
	var A=_MLS.runProcess('pyms.synthesize_random_firings',
		{},
		{
			firings_out:true
		},
		{
			K:opts.K,
			samplerate:opts.samplerate,
			duration:opts.duration
		},
		{}
	);
	return A;
}

function synthesize_timeseries(opts) {
	var A=_MLS.runProcess('pyms.synthesize_timeseries',
		{
			firings:opts.firings,
			waveforms:opts.waveforms
		},
		{
			timeseries_out:true
		},
		{
			noise_level:opts.noise_level,
			samplerate:opts.samplerate,
			duration:opts.duration
		},
		{}
	);
	return A;
}
