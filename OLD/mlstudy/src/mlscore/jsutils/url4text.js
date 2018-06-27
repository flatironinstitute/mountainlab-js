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
function url4text(txt,callback) {
  http_post_json('https://url4text.herokuapp.com/api/text/',{text:txt},{},cb);
  function cb(tmp) {
    if (!tmp.success) {
      callback(tmp);
      return;
    }
    var url0=tmp.object.raw||0;
    callback({success:true,url:url0});
  }
}

function http_post_json(url,data,headers,callback) {
  if (!callback) {
    callback=headers;
    headers=null;
  }

  var XX={
    type: "POST",
    url: url,
    data: data,
    success: success,
    dataType: 'json'
  };
  
  if (headers) {
    XX.headers=headers;
  }

  $.ajax(XX);

  function success(tmp) {
    callback({success:true,object:tmp});  
  }
}
