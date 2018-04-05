exports.cmd_config=cmd_config;

var common=require(__dirname+'/common.js');

function cmd_config(opts,callback) {
	var txt=common.read_text_file(__dirname+'/display_config.template');
	txt=txt.split('$configuration_file$').join(common.config_file_path());

	var env_names=[
		'ML_TEMPORARY_DIRECTORY',
		'ML_PACKAGE_SEARCH_DIRECTORY',
		'ML_ADDITIONAL_PACKAGE_SEARCH_DIRECTORIES',
		'ML_ADDITIONAL_PRV_SEARCH_DIRECTORIES'
	];
	for (var i in env_names) {
		txt=txt.split(`$${env_names[i]}$`).join((process.env[env_names[i]]||'[default]'));
	}
	
	txt=txt.split('$temporary_directory$').join(common.temporary_directory());
	txt=txt.split('$package_search_directories$').join(common.package_search_directories().join(':'));
	txt=txt.split('$prv_search_directories$').join(common.prv_search_directories().join(':'));

	if (opts['format']=='json') {
		var obj={
			temporary_directory:common.temporary_directory(),
			package_search_directories:common.package_search_directories(),
			prv_search_directories:common.prv_search_directories()
		};
		console.log (JSON.stringify(obj,null,4));
	}
	else {
		console.log (txt);
	}
	callback(null);
}