// Works for both nodejs and jquery

if (typeof module !== 'undefined' && module.exports) {
	//using nodejs
	exports.LariClient=LariClient;
	exports.lari_http_post_json=lari_http_post_json_nodejs;
}

function LariClient() {
	var that=this;
	this.setLariServerUrl=function(url) {m_lari_server_url=url;};
	this.setContainerId=function(id) {m_container_id=id; that.clearSpecCache();};
	this.getSpec=function(query,opts,callback) {getSpec(query,opts,callback);};
	this.queueProcess=function(query,opts,callback) {queueProcess(query,opts,callback);};
	this.probeProcess=function(job_id,opts,callback) {probeProcess(job_id,opts,callback);};
	this.cancelProcess=function(job_id,opts,callback) {cancelProcess(job_id,opts,callback);};
	this.findFile=function(prv,opts,callback) {findFile(prv,opts,callback);};
	this.getFileContent=function(prv,opts,callback) {getFileContent(prv,opts,callback);};
	this.getStats=function(opts,callback) {getStats(opts, callback);};
    this.clearSpecCache=function() {m_spec_cache={};};
	this.setDirectLariCall=function(func) {m_direct_lari_call=func;};

	var m_lari_server_url='';
	var m_container_id='';
	var m_spec_cache={};
	var m_direct_lari_call=null;

	function getSpec(query,opts,callback) {
		var spec_code=get_spec_code(query);
		if (spec_code in m_spec_cache) {
			callback(null,m_spec_cache[spec_code]);
			return;
		}
		api_call('spec',query,opts,function(err,resp) {
			if (err) {
				callback(err);
				return;
			}
			if (!resp.success) {
				callback(resp.error);
				return;
			}
			m_spec_cache[spec_code]=resp.spec;
			callback(null,resp.spec);
		});
	}
	function queueProcess(query,opts,callback) {
		var processor_name=query.processor_name||'';
		var package_uri=(query.opts||{}).package_uri||'';
		getSpec({processor_name:processor_name,opts:{package_uri:package_uri}},{},function(err,spec) {
			if (err) {
				callback('Error getting spec: '+err);
				return;
			}
			var spec_opts=spec.opts||{};
			if (spec_opts.force_run) {
				if (!query.opts) query.opts={};
				query.opts.force_run=true;
			}
			if (query.processor_version) {
				if (query.processor_version!=spec.version) {
					callback('Incompatible processor version: '+query.processor_version+' <> '+spec.version);
					return;
				}
			}
			else {
				query.processor_version=spec.version;
			}
			api_call('queue-process',query,opts,callback);
		});
	}
	function probeProcess(job_id,opts,callback) {
		api_call('probe-process',{job_id:job_id},opts,callback);
	}
	function cancelProcess(job_id,opts,callback) {
		api_call('cancel-process',{job_id:job_id},opts,callback);
	}

	function findFile(prv,opts,callback) {
		api_call('find-file',{checksum:prv.original_checksum,fcs:prv.original_fcs,size:prv.original_size},{},function(err,resp) {
			if (err) {
				callback(err);
				return;
			}
			callback(null,resp);
		});
	}

	function getFileContent(prv,opts,callback) {
		api_call('get-file-content',{checksum:prv.original_checksum,fcs:prv.original_fcs,size:prv.original_size},{},function(err,resp) {
			if (err) {
				callback(err);
				return;
			}
			callback(null,resp);
		});
	}

    function getStats(opts,callback) {
        api_call('get-stats',{},function(err,resp) {
            if (err) {
                callback(err);
                return;
            }
            callback(null,resp)
        });
    }

	function api_call(cmd,query,opts,callback) {
		if (!m_lari_server_url) {
			if (!m_direct_lari_call) {
				callback('LariClient: Lari server url not set, and no direct lari call found.');
				return;
			}
			m_direct_lari_call(cmd,query,null,function(resp) {
				if (!resp.success) {
					callback(resp.error);
					return;
				}
				callback(null,resp);
			});
			return;
		}
		if (!m_container_id) {
			callback('LariClient: Container id not set.');
			return;
		}
		query.container_id=m_container_id;
		lari_http_post_json(m_lari_server_url+'/api/'+cmd,query,{},function(err,obj) {
			if (err) {
				callback('Error posting json: '+err);
				return;
			}
			if (!obj.success) {
				callback(obj.error);
				return;
			}
			callback(null,obj);
		});
	}

	function get_spec_code(query) {
		return query.processor_name+':'+(query.package_uri||'');
	}
}


var lari_http_post_json;
if (typeof module !== 'undefined' && module.exports) {
	//using nodejs
	lari_http_post_json=lari_http_post_json_nodejs;
}
else {
	//using jquery
	lari_http_post_json=lari_http_post_json_jquery;
}

function lari_http_post_json_jquery(url,data,headers,callback) {
	var XX={
		type: "POST",
		url: url,
		data: JSON.stringify(data),
		success: success,
		error: on_failure,
		dataType: 'json'
	};
	
	if (headers) {
		XX.headers=headers;
	}

	try {
		$.ajax(XX);
	}
	catch(err) {
		console.error(err.stack);
		if (callback) callback('Unable to post json to '+url+': '+err.message);
		callback=0;
	}

	function success(tmp) {
		if (callback) callback(null,tmp);	
		callback=0;
	}

	function on_failure(a,txt) {
		if (callback) callback('Failed to post json to '+url+': '+txt);	
		callback=0;	
	}
}

function lari_http_post_json_nodejs(url,data,headers,callback) {
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
