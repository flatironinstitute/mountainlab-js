exports.KBucketClient=KBucketClient;

var jsutils=require('./jsutils/jsutils.js');

var s_kbucket_client_data={
	stats_by_sha1:{}
}

function KBucketClient() {
	this.setKBucketUrl=function(url) {m_kbucket_url=url;};
	this.clearCacheForFile=function(sha1) {clearCacheForFile(sha1);};
	this.clear=function() {s_kbucket_client_data.stats_by_sha1={};};
	this.stat=function(sha1,size_bytes,callback) {stat(sha1,size_bytes,callback);}

	var m_kbucket_url='';

	function clearCacheForFile(sha1) {
		if (sha1 in s_kbucket_client_data.stats_by_sha1) {
			delete s_kbucket_client_data.stats_by_sha1[sha1];
		}
	}
	function stat(sha1,size_bytes,callback) {
		if (s_kbucket_client_data.stats_by_sha1[sha1]) {
			callback(null,s_kbucket_client_data.stats_by_sha1[sha1]);
			return;
		}
		if (!m_kbucket_url) {
			callback('KBucketClient: kbucket url not set.');
			return;
		}
		var url0=m_kbucket_url;
		var url1=url0+'/stat/'+sha1;
		jsutils.http_get_json(url1,function(tmp) {
			if (!tmp.success) {
				callback('Error in http_get_json: '+tmp.error,null);
				return;
			}
			var obj=tmp.object;
			if (!obj.success) {
				callback(obj.error);
				return;	
			}
			if (!obj.found) {
				var stat0={found:false};
				//s_kbucket_client_data.stats_by_sha1[sha1]=stat0;
				callback(null,stat0);
				return;
			}
			if (size_bytes!=obj.size) {
				callback('Found file has incorrect size: '+obj.size+' <> '+size_bytes,null);
				return;
			}
			var stat0={found:true,url:url0+'/download/'+sha1,size:obj.size};
			s_kbucket_client_data.stats_by_sha1[sha1]=stat0;
			callback(null,stat0);
		});
	}
}