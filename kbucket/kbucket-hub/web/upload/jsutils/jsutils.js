/*
 * Copyright 2016-2017 Flatiron Institute, Simons Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
if (typeof module !== 'undefined' && module.exports) {
	exports.jsu={
		starts_with:jsu_starts_with,
		ends_with:jsu_ends_with,
		file_parts:jsu_file_parts,
		http_get_text:nodejs_http_get_text,
		http_get_json:nodejs_http_get_json,
		http_post_json:nodejs_http_post_json
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
	function nodejs_http_post_json(url,data,headers,callback) {
		if (!callback) {
			callback=headers;
			headers=null;
		}

		var post_data=JSON.stringify(data);

		var url_parts=require('url').parse(url);

		var options={
			method: "POST",
			//url: url
			hostname: url_parts.host,
			path:url_parts.path
		};

		var http_module;
		if (url_parts.protocol=='https:')
			http_module=require('https');
		else if (url_parts.protocol=='http:')
			http_module=require('http');
		else {
			if (callback)
				callback({success:false,error:'invalid protocol for url: '+url});
			return;
		}


		/*
		var options = {
		  hostname: 'posttestserver.com',
		  port: 443,
		  path: '/post.php',
		  method: 'POST',
		  headers: {
		       'Content-Type': 'application/x-www-form-urlencoded',
		       'Content-Length': postData.length
		     }
		};
		*/

		if (headers) {
			options.headers=headers;
		}

		var req=http_module.request(options,function(res) {
			var txt='';
			res.on('data', function(d) {
				txt+=d
			});
			req.on('error', function(e) {
			  if (callback) callback({success:false,error:'Error in post: '+e});
			  callback=null;
			});
			res.on('end', function() {
				var obj;
				try {
					obj=JSON.parse(txt);
				}
				catch(err) {
					if (callback) callback({success:false,error:'Error parsing json response'});
					callback=null;
					return;
				}
				if (callback) callback({success:true,object:obj});
				callback=null;
			});
		});
		req.write(post_data);
		req.end();
	}
}

function jsu_parse_json(json) {
	try {return JSON.parse(json);}
	catch(err) {return 0;}
}

function jsu_starts_with(str,str2) {
	return (String(str).slice(0,str2.length)==str2);
}

function jsu_ends_with(str,str2) {
	return (String(str).slice(str.length-str2.length)==str2);
}

function jsu_file_parts(path) {
	var ret={};
	var ii=path.lastIndexOf('/');
	if (ii<0) {
		ret.file_name=path;
		ret.path='';
	}
	else {
		ret.file_name=path.slice(ii+1);
		ret.file_name.path=path.slice(0,ii);
	}
	return ret;
}

function jsu_http_get_json(url,headers,callback) {
	if (!callback) {
		callback=headers;
		headers=null;
	}
	jsu_http_get_text(url,headers,function(tmp) {
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

function jsu_http_get_text(url,headers,callback) {
	if (!callback) {
		callback=headers;
		headers=null;
	};

	
	var XX={
		url: url,
		success: success,
		dataType:'text',
		error:on_failure
	};
	
	if (headers) {
		XX.headers=headers;
	}

	$.ajax(XX);

	function success(tmp) {
		if (callback) callback({success:true,text:tmp});	
		callback=0;
	}

	function on_failure(a,txt) {
		if (callback) callback({success:false,error:'Failed to post json to '+url+': '+txt});	
		callback=0;	
	}

	
	/*
	//using jquery
	$.get(url,function(tmp) {
      callback({success:true,text:tmp});
    },'text');
    */
}

function jsu_http_post_json(url,data,headers,callback) {
	if (!callback) {
		callback=headers;
		headers=null;
	}

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
		if (callback) callback({success:false,error:'Unable to post json to '+url+': '+err.message});
		callback=0;
	}

	function success(tmp) {
		if (callback) callback({success:true,object:tmp});	
		callback=0;
	}

	function on_failure(a,txt) {
		if (callback) callback({success:false,error:'Failed to post json to '+url+': '+txt});	
		callback=0;	
	}

	/*
	//using jquery
	$.post(url,JSON.stringify(data),function(tmp) {
      callback({success:true,object:tmp});
    },'json');
    */
}

function jsu_download_text(text,fname) {
	
}