function KBucketAuthClient() {
	this.setKBucketAuthUrl=function(url) {m_url=url;};
	this.getAuth=function(task,login_info,callback) {getAuth(task,login_info,callback);};

	var m_url='';
	function getAuth(task,login_info,callback) {
		var url=m_url+'/api/getauth?task='+task;
		var headers={};
		if (login_info.google_id_token) {
			url+='&google_id_token='+login_info.google_id_token;
		}
		else if (login_info.passcode) {
			url+='&passcode='+login_info.passcode;
		}
		jsu_http_get_json(url,headers,function(tmp) {
			if (!tmp.success) {
				callback(tmp.error);
				return;
			}
			tmp=tmp.object;
			if (!tmp.success) {
				callback(tmp.error);
				return;
			}
			callback('',tmp.token,tmp.token_decoded);
		});
	}
}