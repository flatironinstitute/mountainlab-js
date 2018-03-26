exports.list_processors=list_processors;

var common=require(__dirname+'/common.js');

function list_processors(opts) {
	if (!('show_warnings' in opts)) opts.show_warnings=true;
	var processor_specs=common.get_processor_specs(opts);
	var list=[];
	for (var i in processor_specs) {
		var spec0=processor_specs[i];
		var pname=spec0.name||'';
		if (pname) {
			list.push(pname);
		}
	}
	console.log(list.join('\n'));
}

