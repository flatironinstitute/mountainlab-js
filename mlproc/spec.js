exports.spec=spec;

var common=require(__dirname+'/common.js');

function spec(processor_name,opts) {
	if (!('show_warnings' in opts)) opts.show_warnings=false;
	var processor_specs=common.get_processor_specs(opts);
	for (var i in processor_specs) {
		var spec0=processor_specs[i];
		var pname=spec0.name||'';
		if (pname==processor_name) {
			console.log (JSON.stringify(spec0,null,4));
			return;
		}
	}
	console.log (`Processor not found: ${processor_name}`);
}

