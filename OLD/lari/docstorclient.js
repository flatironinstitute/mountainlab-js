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
	//using nodejs
	exports.DocStorClient=DocStorClient;

	jsu_http_post_json=nodejs_http_post_json;
}

function DocStorClient() {

	this.login=function(info,callback) {login(info,callback);};
	this.user=function() {return m_user;};
	this.setDocStorUrl=function(url) {m_docstor_url=url;};
	this.findDocuments=function(opts,callback) {findDocuments(opts,callback);};
	this.createDocument=function(opts,callback) {createDocument(opts,callback);};
	this.getDocument=function(id,opts,callback) {getDocument(id,opts,callback);};
	this.setDocument=function(id,opts,callback) {setDocument(id,opts,callback);};
	this.getAccessRules=function(callback) {getAccessRules(callback);};
	this.setAccessRules=function(rules,callback) {setAccessRules(rules,callback);};
	this.removeDocument=function(id,callback) {removeDocument(id,callback);};
	this.removeDocuments=function(ids,callback) {removeDocuments(ids,callback);};
	this.requestPrvUploadCredentials=function(id,callback) {requestPrvUploadCredentials(id,callback);};
	this.requestPrvDownloadCredentials=function(id,callback) {requestPrvDownloadCredentials(id,callback);};
	this.findPrvContent=function(id,callback) {findPrvContent(id,callback);};
	this.reportSuccessfulUpload=function(data,callback) {reportSuccessfulUpload(data,callback);};
	this.reportSuccessfulDownload=function(data,callback) {reportSuccessfulDownload(data,callback);};

	var m_docstor_url='';
	var m_authorization_header='';
	var m_user='';

	function login(info,callback) {
		info.id_token=info.id_token||info.google_id_token; //too hacky?
		if (info.passcode) {
			m_authorization_header='Passcode '+info.passcode;
		}
		else if (info.id_token) {
			m_authorization_header='Bearer '+info.id_token;	
		}
		else {
			callback('Invalid info for login in DocStorClient');
			return;
		}
		api_call('getUser',{},function(err,resp) {
			if (err) {
				callback(err);
				return;
			}
			m_user=resp.user||'';
			callback(null);
		});
	}

	function findDocuments(opts,callback) {
		var query={};
		if ('owned_by' in opts) query.owned_by=opts.owned_by;
		if ('shared_with' in opts) query.shared_with=opts.shared_with;
		if ('and_shared_with' in opts) query.and_shared_with=opts.and_shared_with;
		if ('filter' in opts) {
			var filter0;
			if (typeof(opts.filter)=='string') {
				filter0=search_string_to_filter(opts.filter);
			}
			else {
				filter0=JSON.parse(JSON.stringify(opts.filter));
			}
			query.filter=JSON.stringify(filter0);
		}
		api_call('findDocuments',query,function(err,resp) {
			if (err) {
				callback(err);
				return;
			}
			callback(null,resp.documents);
		});
	}

	function getAccessRules(callback) {
		api_call('getAccessRules',{},function(err,resp) {
			if (err) {
				callback(err);
				return;
			}
			callback(null,resp.access_rules);
		});
	}
	function setAccessRules(rules,callback) {
		api_call('setAccessRules',{access_rules:JSON.stringify(rules)},function(err,resp) {
			if (err) {
				callback(err);
				return;
			}
			callback(null);
		});
	}
	function createDocument(opts,callback) {
		if (!opts.owner) {
			callback('Unable to create document with no owner.',null);
			return;
		}
		var owner=opts.owner;
		api_call('createDocument',{owner:owner},function(err,resp) {
			if (err) {
				callback(err);
				return;
			}
			if ((opts.content)||(opts.attributes)||(opts.permissions)) {
				setDocument(resp.id,opts,function(err) {
					if (err) {
						callback('Error setting document content, attributes or permissions: '+err);
						return;
					}
					else {
						callback(null,{id:resp.id});
					}
				});
			}
			else {
				callback(null,{id:resp.id});
			}
		});
	}
	function setDocument(id,opts,callback) {
		var opts2={id:id};
		if ('attributes' in opts)
			opts2.attributes=JSON.stringify(opts.attributes);
		if ('permissions' in opts)
			opts2.permissions=JSON.stringify(opts.permissions);
		if ('content' in opts)
			opts2.content=opts.content;
		api_call('setDocument',opts2,function(err,resp) {
			if (err) {
				callback(err);
				return;
			}
			callback(null,resp);
		});
	}
	function getDocument(id,opts,callback) {
		var opts={id:id,include_content:opts.include_content};
		api_call('getDocument',opts,function(err,resp) {
			if (err) {
				callback(err,null);
				return;
			}
			callback(null,resp);
		});
	}
	function removeDocument(id,callback) {
		api_call('removeDocument',{id:id},function(err) {
			if (err) {
				callback(err);
				return;
			}
			callback(null);
		});
	}
	function removeDocuments(ids,callback) {
		api_call('removeDocuments',{ids:ids},function(err) {
			if (err) {
				callback(err);
				return;
			}
			callback(null);
		});
	}

	function requestPrvUploadCredentials(id,callback) {
		api_call('requestPrvUploadCredentials',{id:id},function(err,resp0) {
			if (err) {
				callback(err);
				return;
			}
			callback(null,resp0.credentials);
		});
	}

	function requestPrvDownloadCredentials(id,callback) {
		api_call('requestPrvDownloadCredentials',{id:id},function(err,resp0) {
			if (err) {
				callback(err);
				return;
			}
			callback(null,resp0.credentials);
		});
	}

	function reportSuccessfulDownload(size_bytes,callback) {
		api_call('reportSuccessfulDownload',{size_bytes:size_bytes},function(err) {
			if (err) {
				callback(err);
				return;
			}
			callback(null);
		});
	}

	function reportSuccessfulUpload(size_bytes,callback) {
		api_call('reportSuccessfulUpload',{size_bytes:size_bytes},function(err) {
			if (err) {
				callback(err);
				return;
			}
			callback(null);
		});
	}

	function findPrvContent(id,callback) {
		api_call('findPrvContent',{id:id},function(err,resp0) {
			if (err) {
				callback(err);
				return;
			}
			callback(null,resp0);
		});
	}

	function api_call(name,query,callback) {
		jsu_http_post_json(m_docstor_url+'/api/'+name,query,{authorization:m_authorization_header},function(tmp) {
			if (!tmp.success) {
				callback('Error making request: '+tmp.error,null);
				return;
			}
			tmp=tmp.object;
			if (!tmp.success) {
				callback(tmp.error,null);
				return;
			}
			callback(null,tmp);
		});
	}
	function search_string_to_filter(search_string) {
		var list=search_string.split(" ");
		var globs=[];
		var filters1=[];
		var filters2=[];
		for (var i in list) {
		  var val=list[i];
		  var ii=val.indexOf(':');
		  if (ii>=0) {
		    var key0=val.slice(0,ii);
		    var val0=val.slice(ii+1);
		    if (key0.indexOf('tags.')==0) {
		      var tmp={};
		      tmp["attributes."+key0]=val0;
		      filters1.push(tmp);
		    }
		    else if (key0=='label') {
		      var tmp={};
		      tmp["attributes.labels."+val0]=1;
		      filters1.push(tmp);
		    }
		    else if (key0=='owner') {
		      var tmp={};
		      tmp["permissions."+key0]=val0;
		      filters1.push(tmp);  
		    }
		  }
		  else {
		    if (val.indexOf('*')>=0) {
		      var regexp0=globToRegExp(val);
		      var regexpstr=regexp0.toString();
		      regexpstr=regexpstr.slice(1,regexpstr.length-1);
		      filters2.push({"attributes.title":{"$regex":regexpstr}});
		    }
		    else {
		      filters2.push({"attributes.title":{"$regex":".*"+val+".*"}});  
		    }
		  }
		}
		if (filters2.length==1) {
		  filters1.push(filters2[0]);
		}
		else if (filters2.length>1) {
		  filters1.push({"$or":filters2});
		}

		if (filters1.length==0) {
		  return {};
		}
		else if (filters1.length==1) {
		  return filters1[0];
		}
		else {
		  return {"$and":filters1};
		}
	}
}

function clone(obj) {
	return JSON.parse(JSON.stringify(obj));
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
		hostname: url_parts.hostname,
		path:url_parts.path,
		port:url_parts.port
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

	req.on('error', (e) => {
		if (callback) callback({success:false,error:'problem with request: '+e.message});
		callback=null;
	});

	req.write(post_data);
	req.end();
}

/*
glob-to-reg-exp

Copyright (c) 2013, Nick Fitzgerald

All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice, this
  list of conditions and the following disclaimer in the documentation and/or
  other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

function globToRegExp(glob, opts) {
  if (typeof glob !== 'string') {
    throw new TypeError('Expected a string');
  }

  var str = String(glob);

  // The regexp we are building, as a string.
  var reStr = "";

  // Whether we are matching so called "extended" globs (like bash) and should
  // support single character matching, matching ranges of characters, group
  // matching, etc.
  var extended = opts ? !!opts.extended : false;

  // When globstar is _false_ (default), '/foo/*' is translated a regexp like
  // '^\/foo\/.*$' which will match any string beginning with '/foo/'
  // When globstar is _true_, '/foo/*' is translated to regexp like
  // '^\/foo\/[^/]*$' which will match any string beginning with '/foo/' BUT
  // which does not have a '/' to the right of it.
  // E.g. with '/foo/*' these will match: '/foo/bar', '/foo/bar.txt' but
  // these will not '/foo/bar/baz', '/foo/bar/baz.txt'
  // Lastely, when globstar is _true_, '/foo/**' is equivelant to '/foo/*' when
  // globstar is _false_
  var globstar = opts ? !!opts.globstar : false;

  // If we are doing extended matching, this boolean is true when we are inside
  // a group (eg {*.html,*.js}), and false otherwise.
  var inGroup = false;

  // RegExp flags (eg "i" ) to pass in to RegExp constructor.
  var flags = opts && typeof( opts.flags ) === "string" ? opts.flags : "";

  var c;
  for (var i = 0, len = str.length; i < len; i++) {
    c = str[i];

    switch (c) {
    case "\\":
    case "/":
    case "$":
    case "^":
    case "+":
    case ".":
    case "(":
    case ")":
    case "=":
    case "!":
    case "|":
      reStr += "\\" + c;
      break;

    case "?":
      if (extended) {
        reStr += ".";
      break;
      }

    case "[":
    case "]":
      if (extended) {
        reStr += c;
      break;
      }

    case "{":
      if (extended) {
        inGroup = true;
      reStr += "(";
      break;
      }

    case "}":
      if (extended) {
        inGroup = false;
      reStr += ")";
      break;
      }

    case ",":
      if (inGroup) {
        reStr += "|";
      break;
      }
      reStr += "\\" + c;
      break;

    case "*":
      // Move over all consecutive "*"'s.
      // Also store the previous and next characters
      var prevChar = str[i - 1];
      var starCount = 1;
      while(str[i + 1] === "*") {
        starCount++;
        i++;
      }
      var nextChar = str[i + 1];

      if (!globstar) {
        // globstar is disabled, so treat any number of "*" as one
        reStr += ".*";
      } else {
        // globstar is enabled, so determine if this is a globstar segment
        var isGlobstar = starCount > 1                      // multiple "*"'s
          && (prevChar === "/" || prevChar === undefined)   // from the start of the segment
          && (nextChar === "/" || nextChar === undefined)   // to the end of the segment

        if (isGlobstar) {
          // it's a globstar, so match zero or more path segments
          reStr += "(?:[^/]*(?:\/|$))*";
          i++; // move over the "/"
        } else {
          // it's not a globstar, so only match one path segment
          reStr += "[^/]*";
        }
      }
      break;

    default:
      reStr += c;
    }
  }

  // When regexp 'g' flag is specified don't
  // constrain the regular expression with ^ & $
  if (!flags || !~flags.indexOf('g')) {
    reStr = "^" + reStr + "$";
  }

  return new RegExp(reStr, flags);
};