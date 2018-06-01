exports.cmd_prv_locate=cmd_prv_locate;
exports.cmd_prv_create=cmd_prv_create;
exports.cmd_prv_create_index=cmd_prv_create_index;
exports.prv_locate=prv_locate;
exports.prv_create=prv_create;
exports.compute_file_sha1=compute_file_sha1;

var common=require(__dirname+'/common.js');
var db_utils=require(__dirname+'/db_utils.js');
var sha1=require('node-sha1');
var url_exists=require('url-exists');
var async=require('async');

function cmd_prv_locate(prv_fname,opts,callback) {
	prv_locate(prv_fname,opts,function(err,path) {
		if (err) {
			callback(err);
			return;
		}
		if (path) {
			console.log (path);
			callback('',path);
			return;
		}
		else {
			console.error('Unable to locate file.');
			callback(null,path);
			return;
		}
	});
}

function cmd_prv_create(fname,prv_fname_out,opts,callback) {
	if (!prv_fname_out) prv_fname_out=fname+'.prv';
	if ((!opts.stat)&&(!opts.sha1))
		console.log ('Creating prv record for file ... : '+fname);
	prv_create(fname,function(err,obj) {
		if (err) {
			console.error(err);
			callback(err);
			return;
		}
		if (obj) {
			if (opts.stat) {
				console.log (JSON.stringify(obj,null,4));
				callback('',obj);
				return;
			}
			if (opts.sha1) {
				console.log (obj.original_checksum);
				callback('',obj.original_checksum);
				return;
			}
			console.log ('Writing prv file ... : '+prv_fname_out);
			if (common.write_text_file(prv_fname_out, JSON.stringify(obj,null,4))) {
				console.log ('Done.')	
			}
			else {
				var err='Unable to write output file.';
				console.error(err);
				callback(err);
				return;
			}
			callback('',obj);
			return;
		}
		else {
			var err='Unable to create prv object.';
			console.err (err);
			callback(err);
			return;
		}
	});
}

function get_all_fnames_in_directory(dirname,recursive) {
	var ret=[];
	var files=common.read_dir_safe(dirname);
	for (var i in files) {
		var fname=dirname+'/'+files[i];
		var stat0=common.stat_file(fname);
		if (stat0.isFile()) {
			ret.push(files[i]);
		}
	}
	if (recursive) {
		for (var i in files) {
			var fname=dirname+'/'+files[i];
			var stat0=common.stat_file(fname);
			if (stat0.isDirectory()) {
				var tmp=get_all_fnames_in_directory(fname,recursive);
				for (var j in tmp) {
					ret.push(files[i]+'/'+tmp[j]);
				}
			}
		}
	}
	return ret;
}

function cmd_prv_create_index(dirname,index_fname_out,opts,callback) {
	process.on('SIGINT', function() {
	    process.exit(-1);
	});
	process.on('SIGTERM', function() {
	    process.exit(-1);
	});

	if (!index_fname_out) index_fname_out=dirname+'/.prvindex';
	var fnames=get_all_fnames_in_directory(dirname,true);
	var index={
		files:[]
	};
	common.foreach_async(fnames,function(ii,fname,cb) {
		var fname2=dirname+'/'+fname;
		console.log (fname);
		prv_create(fname2,function(err,obj) {
			if (err) {
				console.error(err);
				callback(err);
				return;
			}
			if (obj) {
				index.files.push({
					path:fname,
					prv:obj
				});
				setTimeout(function() {
					cb();
				},0);
				return;
			}
			else {
				var err='Unable to create prv object for file: '+fname;
				console.err (err);
				callback(err);
				return;
			}
		});
	},function() {
		common.write_text_file(index_fname_out,JSON.stringify(index,null,4));
		callback(null);
	});
}

function prv_locate(prv_fname,opts,callback) {
	// Locate file corresponding to prv file or object
	opts=opts||{};

	if (('local' in opts)&&('remote' in opts)) {
		// if both local and remote options are specified, then let's search local first, then remote
		delete opts['remote'];
		prv_locate(prv_fname,opts,function(err,path_or_url) {
			if (err) {
				callback(err);
				return;
			}
			if (path_or_url) {
				callback(null,path_or_url);
				return;
			}
			delete opts['local'];
			opts['remote']=true;
			prv_locate(prv_fname,opts,callback);
			return;
		});
		return;
	}


	opts.verbose=Number(opts.verbose||0);
	var obj=null;
	if (prv_fname) {
		// read the prv file and store the object
		obj=common.read_json_file(prv_fname);
		if (!obj) {
			callback('Cannot read json file: '+prv_fname);
			return;
		}
	}
	else {
		// construct the prv object from the opts
		obj={
			original_checksum:opts.sha1,
			original_size:opts.size,
			original_fcs:opts.fcs,
			original_path:opts.original_path||'',
			prv_version:'0.11'
		}
	}

	if (opts.verbose>=1) {
		console.log ('Searching for prv object:');
		console.log (JSON.stringify(obj,null,4));
	}

	if ('remote' in opts) {
		// search remotely
		var kbucket_url=process.env.KBUCKET_URL;
		var url=kbucket_url+'/find/'+obj.original_checksum;
		//var url2=kbucket_url+'/download/'+obj.original_checksum;
		if (opts.verbose>=1) {
			console.log ('Getting: '+url);
		}
		nodejs_http_get_json(url,{},function(obj) {
			if (!obj.success) {
				callback('Error checking on kbucket: '+obj.error);
				return;
			}
			obj=obj.object;
			if (!obj.success) {
				callback('Error checking on kbucket (*): '+obj.error);
				return;
			}
			if (!obj.found) {
				callback('File not found on kbucket.');
				return;
			}
			var candidate_urls=obj.direct_urls||[];
			if (obj.proxy_url) {
				candidate_urls.push(obj.proxy_url);
			}
			find_existing_url(candidate_urls,function(url2) {
				if (!url2) {
					callback('Found file, but none of the urls seem to work.');
					return;
				}
				callback(null, url2);
			});
		});
		return;
	}

	if ((obj.original_path)&&(require('fs').existsSync(obj.original_path))) {
		// try the original path
		if (opts.verbose>=1) {
			console.log ('Trying original path: '+obj.original_path);
		}
		sumit.compute_file_sha1(obj.original_path,function(err,sha1) {
			if ((!err)&&(sha1==obj.original_checksum)) {
				callback(null,obj.original_path);
				return;
			}
			proceed();
		});
	}
	else {
		proceed();
	}

	function proceed() {

		var prv_search_paths=common.prv_search_directories();

		var sha1=obj.original_checksum||'';
		var fcs=obj.original_fcs||'';
		var size=obj.original_size||'';
		if (!sha1) {
			callback('original_checksum field not found in prv file: '+prv_fname);
			return;
		}
		if (opts.verbose>=1) {
			console.log ('sumit.find_doc_by_sha1 '+sha1+' '+prv_search_paths.join(':'));
		}
		sumit.find_doc_by_sha1(sha1,prv_search_paths,opts,function(err,doc0) {
			if (err) {
				callback(err);
				return;
			}
			if (doc0) {
				callback('',doc0.path);
				return;
			}
			if ((!sha1)||(!size)||(!fcs)) {
				callback('Missing fields in prv file: '+prv_fname);
				return;
			}

			if (opts.verbose>=1) {
				console.log (`Document not found in database, searching on disk...`);
			}
			common.foreach_async(prv_search_paths,function(ii,path0,cb) {
				prv_locate_in_path(path0,sha1,fcs,size,function(err,fname) {
					if (err) {
						callback(err);
						return;
					}
					if (fname) {
						callback('',fname);
						return;
					}
					cb();
				});
			},function() {
				if (opts.verbose>=1) {
					console.log ('Not found.');
				}
				callback('',''); //not found
			});
		});
	}
}

function find_existing_url(candidate_urls,callback) {
	async.eachSeries(candidate_urls,function(candidate_url,cb) {
		url_exists(candidate_url,function(err,exists) {
			if ((!err)&&(exists)) {
				callback(candidate_url);
				return;
			}
			cb();
		})
	},function() {
		callback('');
	});
}

function prv_create(fname,callback) {
	var stat0=common.stat_file(fname);
	if (!stat0) {
		callback('Unable to stat file in prv_create: '+fname);
		return;
	}
	compute_file_sha1(fname,function(err,sha1) {
		if (err) {
			callback(err);
			return;
		}
		var sha1_head=compute_sha1_of_head(fname,1000);
		var fcs='head1000-'+sha1_head;
		var obj={
			original_checksum:sha1,
			original_size:stat0.size,
			original_fcs:fcs,
			original_path:require('path').resolve(fname),
			prv_version:'0.11'
		};
		callback('',obj);
	});
}


var sumit={}
sumit.file_matches_doc=function(path,doc0) {
	var stat0=common.stat_file(path);
	if (stat0) {
		if ((stat0.size==doc0.size)&&(stat0.mtime.toISOString()==doc0.mtime)&&(stat0.ctime.toISOString()==doc0.ctime)&&(stat0.ino==doc0.ino)) {
			return true;
		}
	}
	return false;
}
sumit.find_doc_by_sha1=function(sha1,valid_prv_search_paths,opts,callback) {
	if (opts.verbose>=1) {
		console.log (`Finding documents for sha1=${sha1}`);
	}
	db_utils.findDocuments('sumit',{sha1:sha1},function(err,docs) {
		if (err) {
			callback(err);
			return;
		}
		if (docs.length===0) {
			callback(null,null);
			return;
		}
		if (opts.verbose>=1) {
			console.log (`Found ${docs.length} documents.`);
		}
		for (var i in docs) {
			var doc0=docs[i];
			if (sumit.file_matches_doc(doc0.path,doc0)) {
				for (var i in valid_prv_search_paths) {
					if (doc0.path.indexOf(valid_prv_search_paths[i])==0) {
						callback(null,doc0);
						return;
					}
				}
			}
		}
		callback(null,null);
	});
	
}
sumit.find_doc_by_path=function(path,callback) {
	db_utils.findDocuments('sumit',{path:path},function(err,docs) {
		if (err) {
			callback(err);
			return;
		}
		if (docs.length===0) {
			callback(null,null);
			return;
		}
		for (var i in docs) {
			var doc0=docs[i];
			if (sumit.file_matches_doc(doc0.path,doc0)) {
				callback(null,doc0);
				return;
			}
		}
		callback(null,null);
	});
}
sumit.compute_file_sha1=function(path,callback) {
	var stat0=common.stat_file(path);
	if (!stat0) {
		callback('Unable to stat file: '+path,'');
		return;
	}
	if (!stat0.isFile()) {
		callback('Not file type: '+path,'');
		return;
	}
	sumit.find_doc_by_path(path,function(err,doc0) {
		if (err) {
			callback(err);
			return;
		}
		if (doc0) {
			callback(null,doc0.sha1);
			return;
		}
		var stream = require('fs').createReadStream(path);
		sha1(stream,function(err,hash) {
			if (err) {
				callback('Error: '+err);
				return;
			}
			var doc0={
				_id:path,
				path:path,
				sha1:hash,
				size:stat0.size,
				ctime:stat0.ctime.toISOString(),
				mtime:stat0.mtime.toISOString(),
				ino:stat0.ino
			};
			db_utils.saveDocument('sumit',doc0,function(err) {
				if (err) {
					callback(err);
					return;
				}
				callback('',doc0.sha1);
			});
		});
	});
	
}
function compute_file_sha1(path,callback) {
	sumit.compute_file_sha1(path,callback);
}

function compute_sha1_of_head(fname,num_bytes) {
	var buf=read_part_of_file(fname,0,num_bytes);
	if (!buf) return null;
	return sha1(buf);
}

function file_matches_fcs_section(path,fcs_section) {
	var tmp=fcs_section.split('-');
	if (tmp.length!=2) {
		console.warn('Invalid fcs section: '+fcs_section);
		return false;
	}
	if (tmp[0]=='head1000') {
		var fcs0=compute_sha1_of_head(path,1000);
		if (!fcs0) return false;
		return (fcs0==tmp[1]);
	}
	else {
		console.warn('Unexpected head section: '+fcs_section);
		return false;
	}
}

function read_part_of_file(path, start, num_bytes) {
	var stat0=common.stat_file(path);
	if (!stat0) return null;
	if (stat0.size<start+num_bytes)
		num_bytes=stat0.size-start;
	if (num_bytes<0) return null;
	if (num_bytes==0) return new Buffer(0);
	var buf=new Buffer(num_bytes);
	var fd=require('fs').openSync(path,'r');
	require('fs').readSync(fd,buf,0,num_bytes,start);
	require('fs').closeSync(fd);
	return buf;
}

function file_matches_fcs(path,fcs) {
	var list=fcs.split(';');
	for (var i in list) {
		if (list[i]) {
			if (!file_matches_fcs_section(path,list[i]))
				return false;
		}
	}
	return true;
}

function prv_locate_in_path(path,sha1,fcs,size,callback) {
	var files=common.read_dir_safe(path);
	common.foreach_async(files,function(ii,file,cb) {
		var fname=path+'/'+file;
		var stat0=common.stat_file(fname);
		if (stat0) {
			if (stat0.isFile()) {
				if (stat0.size==size) { //candidate
					sumit.find_doc_by_path(fname,function(err,doc0) {
						if (err) {
							callback(err);
							return;
						}
						if (doc0) {
							if (doc0.sha1==sha1) {
								callback('',fname)
								return;
							}
							else {
								cb();
							}
						}
						else {
							if (file_matches_fcs(fname,fcs)) {
								sumit.compute_file_sha1(fname,function(err,sha1_of_fname) {
									if (sha1_of_fname==sha1) {
										callback('',fname);
										return;
									}
									else {
										cb();
									}
								});
							}
							else {
								cb();
							}
						}
					});
				}
				else {
					cb();
				}
			}
			else if (stat0.isDirectory()) {
				if (common.starts_with(file,'.')) { //hidden directory
					cb();
					return;
				}
				prv_locate_in_path(fname,sha1,fcs,size,function(err,fname0) {
					if (fname0) {
						callback('',fname0);
						return;
					}
					cb();
				});
			}
			else {
				cb();
			}
		}
	},function() {
		callback('',''); //not found
	});
}

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