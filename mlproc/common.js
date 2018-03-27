exports.find_candidate_mp_files=find_candidate_mp_files;
exports.get_spec_from_mp_file=get_spec_from_mp_file;
exports.get_processor_specs=get_processor_specs;
exports.ends_with=ends_with;
exports.foreach_async=foreach_async;
exports.mkdir_if_needed=mkdir_if_needed;
exports.stat_file=stat_file;
exports.parse_json=parse_json;
exports.read_json_file=read_json_file;
exports.read_dir_safe=read_dir_safe;

var sha1 = require('node-sha1');

function get_processor_specs(opts) {
	var mp_file_names=find_candidate_mp_files(opts);
	var list=[];
	for (var i in mp_file_names) {
		var fname=mp_file_names[i];
		var spec0=get_spec_from_mp_file(fname);
		if (spec0) {
			var processors=spec0.processors||[];
			for (var j in processors) {
				list.push(processors[j]);
			}
		}
		else {
			if (opts.show_warnings) {
				console.warn(`Problem getting spec from file: ${fname}`);
			}
		}
	}
	return list;
}

function find_candidate_mp_files(opts) {
	var list=[];
	var paths=get_mp_search_paths(opts);
	for (var i in paths) {
		var path0=paths[i];
		var list0=find_candidate_mp_files_in_directory(path0);
		for (var i in list0) {
			list.push(list0[i]);
		}
	}
	return list;
}

function find_candidate_mp_files_in_directory(path) {
	var list=[];
	var files=read_dir_safe(path);
	for (var ii in files) {
		var file=files[ii];
		var fname=path+'/'+file;
		var stat0=stat_file(fname);
		if (stat0) {
			if (stat0.isFile()) {
				if (ends_with(fname,'.mp')) {
					if (is_executable(fname)) {
						list.push(fname);
					}
				}
			}
			else if (stat0.isDirectory()) {
				var list0=find_candidate_mp_files_in_directory(fname);
				for (var j in list0) {
					list.push(list0[j]);
				}
			}
		}
	}
	return list;
}

function get_spec_from_mp_file(fname) {
	if (is_executable(fname)) {
		var output=run_program_and_read_output(fname+' spec');
		return parse_json(output);
	}
	else {
		return null;
	}
}

function get_mp_search_paths(opts) {
	var list=[];
	list.push(process.env.HOME+'/.mountainlab/packages');
	return list;
}

function parse_json(str) {
	try {
		return JSON.parse(str);
	}
	catch(err) {
		return null;
	}
}

function run_program_and_read_output(cmd) {
	var r = require('child_process').execSync(cmd);
	var str=r.toString();
	return str;
}

function ends_with(str,str2) {
    return (str.slice(str.length-str2.length)==str2);
}

function read_dir_safe(path) {
	try {
		return require('fs').readdirSync(path);
	}
	catch(err) {
		return [];
	}
}

function stat_file(fname) {
	try {
		return require('fs').statSync(fname);
	}
	catch(err) {
		return null;
	}
}

function is_executable(fname) {
	var stat0=stat_file(fname);
	var mask=1; //use 1 for executable, 2 for write, 4 for read
	return !!(mask & parseInt ((stat0.mode & parseInt ("777", 8)).toString (8)[0]));
}

function foreach_async(list,step,callback) {
	var ii=0;
	next_step();
	function next_step() {
		if (ii>=list.length) {
			callback();
			return;
		}
		step(ii,list[ii],function() {
			ii++;
			next_step();
		});
	}
}

function mkdir_if_needed(path) {
  try {
    require('fs').mkdirSync(path);
  }
  catch(err) {
  }
}

function read_json_file(fname) {
	try {
		var txt=require('fs').readFileSync(fname,'utf8')
		return parse_json(txt);
	}
	catch(err) {
		return null;
	}
}