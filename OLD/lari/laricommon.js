exports.config_file_path=config_file_path;
exports.make_random_id=make_random_id;
exports.http_post_json=http_post_json;
exports.temporary_directory=temporary_directory;

function config_file_path() {
	return process.env.ML_CONFIG_FILE||(process.env.HOME+'/.mountainlab/mountainlab.env');
}

function make_random_id(len) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < len; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function http_post_json(url,data,headers,callback) {
	var post_data=JSON.stringify(data);

	var url_parts=require('url').parse(url);

	var options={
		method: "POST",
		//url: url
		hostname: url_parts.hostname,
		port:url_parts.port,
		path:url_parts.path
	};

	var http_module;
	if (url_parts.protocol=='https:')
		http_module=require('https');
	else if (url_parts.protocol=='http:')
		http_module=require('http');
	else {
		if (callback) callback('invalid protocol for url: '+url);
		callback=null;
		return;
	}

	if (headers) {
		options.headers=headers;
	}

	var req=http_module.request(options,function(res) {
		var txt='';
		res.on('data', function(d) {
			txt+=d
		});
		res.on('error', function(e) {
		  if (callback) callback('Error in post response: '+e);
		  callback=null;
		});
		res.on('end', function() {
			var obj;
			try {
				obj=JSON.parse(txt);
			}
			catch(err) {
				if (callback) callback('Error parsing json response');
				callback=null;
				return;
			}
			if (callback) callback(null,obj);
			callback=null;
		});
	});
	req.on('error', function(e) {
	  if (callback) callback('Error in post request: '+e);
	  callback=null;
	});

	req.write(post_data);
	req.end();
}

function temporary_directory() {
	var ml_temporary_directory=process.env.ML_TEMPORARY_DIRECTORY||('/tmp/mountainlab-tmp');
	mkdir_if_needed(ml_temporary_directory);
	return ml_temporary_directory;
}

function mkdir_if_needed(path) {
  try {
    require('fs').mkdirSync(path);
  }
  catch(err) {
  }
}