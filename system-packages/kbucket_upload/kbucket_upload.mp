#!/usr/bin/env node

/* Set the following environment variables:

KBUCKET_URL
KBUCKET_UPLOAD_AUTH
KBUCKET_DOWNLOAD_AUTH

*/

require('dotenv').config({path:__dirname+'/.env'});

var fs = require('fs');
var request = require('request');

var spec={
	processors:[
		{
			name:'kbucket.upload',
			exe_command:__filename+' upload $(arguments)',
			version:0.1,
			inputs:[
				{name:'file',optional:false}
			],
			outputs:[],
			parameters:[
				{name:'sha1',optional:true}
			],
			opts:{
				force_run:true
			}
		},
		{
			name:'kbucket.download',
			exe_command:__filename+' download $(arguments)',
			version:0.1,
			inputs:[],
			outputs:[{name:'file',optional:false}],
			parameters:[
				{name:'sha1',optional:false}
			],
			opts:{
			}
		}
	]
};

function print_spec() {	
	console.log (JSON.stringify(spec,null,4));
	return;
}

var CLP=new CLParams(process.argv);
var arg1=CLP.unnamedParameters[0]||'';
if ((!arg1)||(arg1=='spec')) {
	print_spec();
}
else if (arg1=='upload') {
	handle_upload(CLP.namedParameters,function(err) {
		if (err) {
			console.error(err);
			process.exit(-1);
		}
		else {
			console.log ('Upload successful.');
		}
	});
}
else if (arg1=='download') {
	handle_download(CLP.namedParameters,function(err) {
		if (err) {
			console.error(err);
			process.exit(-1);
		}
		else {
			console.log ('Download successful.');
		}
	});
}
else {
	console.error('Unrecognized processor: '+arg1);
	process.exit(-1);
}

function handle_upload(params,callback) {
	var kbucket_upload_auth=process.env.KBUCKET_UPLOAD_AUTH||process.env.KBUCKET_AUTH;
	if (!kbucket_upload_auth) {
		callback('Environment variable KBUCKET_UPLOAD_AUTH not set.');
		return;
	}
	if (!process.env.KBUCKET_URL) {
		callback('Environment variable KBUCKET_URL not set.');
		return;
	}
	var fname=params.file;
	if (!fname) {
		callback('Missing parameter: file');
		return;
	}
	var size=get_file_size(fname);
	if (!size) {
		callback('Size of file is 0.');
		return;
	}

	if (params.sha1) {
		check_on_kbucket(params.sha1,function(found) {
			if (found) {
				console.log ('Already found on kbucket (sha1='+params.sha1+')');
				callback(null);
				return;
			}
			handle_upload_2();
		});
	}
	else {
		handle_upload_2();
	}

	function handle_upload_2() {
		var base_url=process.env.KBUCKET_URL;
		var resumable_id=make_random_id(10);
		var url=base_url+'/upload?';
		url+='auth='+kbucket_upload_auth;
		url+='&resumableChunkNumber=1';
		url+='&resumableChunkSize='+size;
		url+='&resumableCurrentChunkSize='+size;
		url+='&resumableTotalSize='+size;
		url+='&resumableType=';
		url+='&resumableIdentifier='+resumable_id;
		url+='&resumableFilename=dummy.dat';
		url+='&resumableRelativePath=dummy.dat';
		url+='&resumableTotalChunks=1';

		var url2=base_url+'/upload?';
		url2+='resumableIdentifier='+resumable_id;
		url2+='&resumableFileName=dummy.dat';
		url2+='&resumableTotalSize='+size;
		url2+='&resumableDone=true';

		console.log ('Uploading file...');
		upload_file(url,fname,function(err) {
			if (err) {
				callback('Error uploading file content: '+err);
				return;
			}
			console.log ('Finalizing upload...');
			post_data(url2,'',function(err2,response_body) {
				if (err2) {
					callback('Error finalizing upload: '+err2);
					return;
				}
				var obj=try_parse_json(response_body);
				if (!obj) {
					console.log (response_body);
					callback('Error parsing JSON response');
					return;
				}
				if (!obj.prv) {
					callback('Response does not have a prv field.');
					return;
				}
				if (obj.prv.original_size!=get_file_size(fname)) {
					callback('Incorrect size in returned prv file');
					return;
				}
				console.log ('Uploaded file with sha1='+obj.prv.original_checksum+' and size='+obj.prv.original_size);
				if (params.sha1) {
					if (params.sha1!=obj.prv.original_checksum) {
						callback('Checksum of uploaded file does not match: '+params.sha1+' <> '+obj.prv.original_checksum);
						return;
					}
				}
				callback(null);
			});
		});
	}
}

function check_on_kbucket(sha1,callback) {
	var base_url=process.env.KBUCKET_URL;
	var url=base_url+'/stat/'+sha1;
	nodejs_http_get_json(url,{},function(tmp) {
		if (!tmp.success) {
			console.log ('Problem checking for file: '+url+': '+tmp.error);
			callback(false);
			return;
		}
		callback(tmp.object.found);
	});
}

function handle_download(params,callback) {
	var kbucket_download_auth=process.env.KBUCKET_DOWNLOAD_AUTH;
	if (!kbucket_download_auth) {
		console.warn('Warning: Environment variable KBUCKET_DOWNLOAD_AUTH not set. Using no download auth.');
	}
	if (!process.env.KBUCKET_URL) {
		callback('Environment variable KBUCKET_URL not set.');
		return;
	}
	var fname=params.file;
	if (!fname) {
		callback('Missing parameter: file');
		return;
	}
	var sha1=params.sha1;
	if (!sha1) {
		callback('Missing parameter: sha1');
		return;
	}

	var base_url=process.env.KBUCKET_URL;
	var url=base_url+'/download/'+sha1+'?';
	if (kbucket_download_auth)
		url+='auth='+kbucket_download_auth;

	console.log ('Downloading file...');
	download_file(url,fname,function(err) {
		if (err) {
			callback('Error downloading file content: '+err);
			return;
		}
		console.log ('Downloaded file with sha1='+sha1);
		callback(null);
	});
}

function get_file_size(fname) {
	try {
		var stat=require('fs').statSync(fname);
		return stat.size;
	}
	catch(err) {
		return null;
	}
}

function try_parse_json(str) {
	try {
		return JSON.parse(str);
	}
	catch(err) {
		return null;
	}
}

function make_random_id(num_chars)
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < num_chars; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function download_file(url,fname,callback) {
	var r = request(url);
	r.on('response',function(res) {
		var wstream=require('fs').createWriteStream(fname);
		res.pipe(wstream);
		wstream.on('error',function(err) {
			callback('Error writing to file: '+err);
		});
		wstream.on('end',function() {
			callback(null);
		});

	});

	r.on('error', function (err) {
		callback('Error in download: '+err);
	});
}

function upload_file(url,fname,callback) {
	var rs = require('fs').createReadStream(fname);
	var ws = request.post(url,function(err,http_response,body) {
		//important: It seems like this callback is important
		if (err) {
			callback(err);
			return;
		}
		if (http_response.statusCode!=200) {
			callback('Got error status code: '+http_response.statusCode);
			return;
		}
		callback(null);
	});

	ws.on('end', function () {
		//callback(null); //we used to do the callback here
	});

	ws.on('error', function (err) {
		callback('Error in upload: '+err);
	});

	rs.pipe(ws);
}

function post_data(url,body,callback) {
	request.post({
	  headers: {},
	  url:     url,
	  body:    body
	}, function(error, response, body2){
		if (error) {
			callback(error.message);
			return;
		}
		callback(null,body2);
	});
}

function CLParams(argv) {
	this.unnamedParameters=[];
	this.namedParameters={};

	var args=argv.slice(2);
	for (var i=0; i<args.length; i++) {
		var arg0=args[i];
		if (arg0.indexOf('--')===0) {
			arg0=arg0.slice(2);
			var ind=arg0.indexOf('=');
			if (ind>=0) {
				this.namedParameters[arg0.slice(0,ind)]=arg0.slice(ind+1);
			}
			else {
				//this.namedParameters[arg0]=args[i+1]||'';
				//i++;
				this.namedParameters[arg0]='';
			}
		}
		else if (arg0.indexOf('-')===0) {
			arg0=arg0.slice(1);
			this.namedParameters[arg0]='';
		}
		else {
			this.unnamedParameters.push(arg0);
		}
	}
};


function nodejs_http_get_text(url,headers,callback) {
        if (!callback) {
                callback=headers;
                headers=null;
        }
        require('request').get({url:url,headers:headers},function(err,response,body) {
                if (err) {
                        if (callback) callback({success:false,error:err.message});
                        return;
                }
                if (callback) callback({success:true,text:body});
        });
}
function nodejs_http_get_json(url,headers,callback) {
	if (!callback) {
		callback=headers;
		headers=null;
	}
	nodejs_http_get_text(url,headers,function(tmp) {
      if (!tmp.success) {
        callback(tmp);
        return;
      }
      var obj;
      try {
        obj=JSON.parse(tmp.text);
      }
      catch(err) {
      	console.log ('Error parsing: '+tmp.text);
        callback({success:false,error:'Error parsing.'});
        return;
      }
      callback({success:true,object:obj});
    });
}