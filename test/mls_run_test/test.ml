exports.main=main;
exports.spec=spec;

function spec() {
	return {
		inputs:[],
		outputs:[
			{name:"waveforms_out",optional:false}
		],
		parameters:[
			{name:"K",optional:true,default_value:30}
		],
		opts:[]
	};
}

function main(inputs,outputs,params) {
	var W=synthesize_random_waveforms({K:params.K});
	_MLS.setResult(outputs.waveforms_out,W);
}

function synthesize_random_waveforms(opts) {
	var A=_MLS.runProcess('pyms.synthesize_random_waveforms',
		{},
		{waveforms_out:true},
		{K:opts.K},
		{}
	);
	return A.waveforms_out;
}