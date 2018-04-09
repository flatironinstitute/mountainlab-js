exports.LariClient=LariClient;

var jsutils=require('./jsutils/jsutils.js');

function LariClient() {
	var that=this;
	this.setLariServerUrl=function(url) {m_lari_server_url=url;};
	this.setContainerId=function(id) {m_container_id=id; that.clearSpecCache();};
    this.setPoolID=function(id) {m_pool_id=id;}; //do we need to clear cache?
	this.getSpec=function(query,opts,callback) {getSpec(query,opts,callback);};
	this.getProcessorNames=function(query,opts,callback) {getProcessorNames(query,opts,callback);};
	this.queueProcess=function(query,opts,callback) {queueProcess(query,opts,callback);};
	this.probeProcess=function(job_id,opts,callback) {probeProcess(job_id,opts,callback);};
	this.cancelProcess=function(job_id,opts,callback) {cancelProcess(job_id,opts,callback);};
	this.findFile=function(prv,opts,callback) {findFile(prv,opts,callback);};
	this.getStats=function(opts,callback) {getStats(opts,callback);};
	this.getFileContent=function(prv,opts,callback) {getFileContent(prv,opts,callback);};
	this.getAvailableContainers=function(opts,callback) {getAvailableContainers(opts,callback);};
	this.clearSpecCache=function() {m_spec_cache={};};
	this.setDirectLariCall=function(func) {m_direct_lari_call=func;};


	var m_lari_server_url='';
	var m_container_id='';
	var m_spec_cache={};
	var m_processor_names_cache={};
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
	function getProcessorNames(query,opts,callback) {
		var processor_names_code=get_processor_names_code(query);
		if (processor_names_code in m_processor_names_cache) {
			callback(null,m_processor_names_cache[processor_names_code]);
			return;
		}
		api_call('list-processors',query,opts,function(err,resp) {
			if (err) {
				callback(err);
				return;
			}
			if (!resp.success) {
				callback(resp.error);
				return;
			}
			m_processor_names_cache[processor_names_code]=resp.processors;
			callback(null,resp.processors);
		});
	}
	function queueProcess(query,opts,callback) {
		var processor_name=query.processor_name||'';
		var package_uri=(query.opts||{}).package_uri||'';
		getSpec({processor_name:processor_name,package_uri:package_uri},{},function(err,spec) {
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
			callback(null,resp.found);
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
		api_call('get-stats',{},{},function(err,resp) {
			if (err) {
				callback(err);
				return;
			}
			callback(null,resp);
		});
	}


	function getAvailableContainers(opts,callback) {
		api_call('get-available-containers',{},{},function(err,resp) {
			if (err) {
				callback(err);
				return;
			}
			callback(null,resp.containers);
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
		jsutils.http_post_json(m_lari_server_url+'/api/'+cmd,query,{},function(err,obj) {
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
		return m_container_id+':'+query.processor_name+':'+(query.package_uri||'');
	}

	function get_processor_names_code(query) {
		return m_container_id+':'+(query.package_uri||'');
	}
}
