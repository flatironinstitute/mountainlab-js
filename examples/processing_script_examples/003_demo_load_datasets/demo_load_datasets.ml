exports.main=main;

// This example shows how to load datasets from the local machine and run processing on them
// In this case, we simply compute the ground-truth templates for each dataset

// This is the study object that will contain the loaded datasets
var study=_MLS.study;

function main() {
	// Loop through each of the loaded datasets
	for (var ds_id in study.datasets) {
		console.log('Dataset: '+ds_id);
		var dataset=study.datasets[ds_id]; // this is the dataset object
		var raw=dataset.files['raw.mda']; // The raw timeseries
		var firings=dataset.files['firings_true.mda']||dataset.files['firings.mda']; // The true firings
		var templates=compute_templates(raw,firings); // Compute the templates
		_MLS.setResult(ds_id+'-templates.mda',templates); // The result will go to the output file
	}
}

function compute_templates(timeseries,firings) {
    var clip_size=250;
	var A=_MLS.runProcess('pyms.compute_templates',
		{
			timeseries:timeseries,
			firings:firings
		},
		{
			templates_out:true
		},
		{
			clip_size:clip_size
		},
		{}
	);
	return A.templates_out;
}