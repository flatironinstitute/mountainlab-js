exports.KBucketClient=KBucketClient;

var jsutils=require('./jsutils/jsutils.js');
var async=require('async');

var s_kbucket_client_data={
	infos_by_sha1:{}
}

function KBucketClient() {
	this.setKBucketUrl=function(url) {m_kbucket_url=url;};
	this.findFile=function(sha1,file_name,callback) {findFile(sha1,file_name,callback);}
	this.clearCacheForFile=function(sha1) {clearCacheForFile(sha1);};
	this.clearCache=function() {s_kbucket_client_data.infos_by_sha1={};};
	
	var m_kbucket_url='';

	function clearCacheForFile(sha1) {
		if (sha1 in s_kbucket_client_data.infos_by_sha1) {
			delete s_kbucket_client_data.infos_by_sha1[sha1];
		}
	}
	function findFile(sha1,filename,callback) {
		if (s_kbucket_client_data.infos_by_sha1[sha1]) {
			callback(null,s_kbucket_client_data.infos_by_sha1[sha1]);
			return;
		}
		if (!m_kbucket_url) {
			callback('KBucketClient: kbucket url not set.');
			return;
		}
		var url0=m_kbucket_url;
		var url1=url0+'/find/'+sha1;
		if (filename) {
			url1+='/'+filename;
		}
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
				callback(null,{found:false});
				return;
			}
			var url='';
			var candidate_urls=obj.urls||[];
			async.eachSeries(candidate_urls,function(candidate_url,cb) {
				urlExists(candidate_url,function(exists) {
					if (exists) {
						url=candidate_url;
						finalize();
						return;
					}
					cb();
				})
			},function() {
				finalize();
			});
			function finalize() {
				if (!url) {
					console.warn('Found file, but none of the urls actually work.',candidate_urls);
					callback(null,{found:false});
					return;
				}
				var info0={
					found:true,
					url:url,
					size:obj.size
				};
				s_kbucket_client_data.infos_by_sha1[sha1]=info0;
				callback(null,info0);
			}
		});
	}
}

function urlExists(url, callback){
  $.ajax({
    type: 'HEAD',
    url: url,
    success: function(){
      callback(true);
    },
    error: function() {
      callback(false);
    }
  });
}