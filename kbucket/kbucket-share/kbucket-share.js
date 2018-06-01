require('dotenv').config({
    path: __dirname + '/.env'
});

const debugging=(process.env.DEBUG=='true');

const fs=require('fs');
const express=require('express');
const request=require('request');
const async = require('async');
const WebSocket = require('ws');
const findPort = require('find-port');

const KBUCKET_HUB_URL=process.env.KBUCKET_HUB_URL||'https://kbucket.flatironinstitute.org';
const KBUCKET_SHARE_PROTOCOL='http'; //todo: support https
const KBUCKET_SHARE_HOST=process.env.KBUCKET_SHARE_HOST||'localhost';
const KBUCKET_SHARE_PORT_RANGE=process.env.KBUCKET_SHARE_PORT||process.env.KBUCKET_SHARE_PORT_RANGE||'12000-13000';
var KBUCKET_SHARE_PORT=undefined; //determined below

var CLP=new CLParams(process.argv);

var share_directory=CLP.unnamedParameters[0]||'.';
share_directory=require('path').resolve(share_directory);
if (!fs.existsSync(share_directory)) {
  console.error('Directory does not exist: '+share_directory);
  process.exit(-1);
}
if (!fs.statSync(share_directory).isDirectory()) {
  console.error('Not a directory: '+share_directory);
  process.exit(-1);
}
var KBUCKET_SHARE_KEY=process.env.KBUCKET_SHARE_KEY||make_random_id(8);

console.log (`
Using the following:
KBUCKET_HUB_URL=${KBUCKET_HUB_URL}
KBUCKET_SHARE_PROTOCOL=${KBUCKET_SHARE_PROTOCOL}
KBUCKET_SHARE_HOST=${KBUCKET_SHARE_HOST}
KBUCKET_SHARE_PORT_RANGE=${KBUCKET_SHARE_PORT_RANGE}
KBUCKET_SHARE_KEY=${KBUCKET_SHARE_KEY}
debugging=${debugging}

Sharing directory: ${share_directory}

`);

// ===================================================== //

const app = express();
app.set('json spaces', 4); // when we respond with json, this is how it will be formatted

// API readdir
app.get('/:share_key/api/readdir/:subdirectory(*)',function(req,res) {
  if (!check_share_key(req,res)) return;
  var params=req.params;
  handle_readdir(params.subdirectory,req,res);
});
app.get('/:share_key/api/readdir/',function(req,res) {
  if (!check_share_key(req,res)) return;
  var params=req.params;
  handle_readdir('',req,res);
});

// API download
app.get('/:share_key/download/:filename(*)',function(req,res) {
  if (!check_share_key(req,res)) return;
  var params=req.params;
  handle_download(params.filename,req,res);
});

// API web
// don't really need to check the share key here because we won't be able to get anything except in the web/ directory
app.use('/:share_key/web', express.static(__dirname+'/web'));

// ===================================================== //



function check_share_key(req,res) {
  var params=req.params;
  if (params.share_key!=KBUCKET_SHARE_KEY) {
    res.json({success:false,error:`Incorrect kbucket share key: ${params.share_key}`});
    return false;
  }
  return true;
}

function handle_readdir(subdirectory,req,res) {
  if (!is_safe_path(subdirectory)) {
    res.json({success:false,error:'Unsafe path: '+subdirectory});
    return;
  }
  var path0=require('path').join(share_directory,subdirectory);
  fs.readdir(path0,function(err,list) {
    if (err) {
      res.json({success:false,error:err.message});
      return;
    }
    var files=[],dirs=[];
    async.eachSeries(list,function(item,cb) {
      if ((item=='.')||(item=='..')) {
        cb();
        return;
      }
      fs.stat(require('path').join(path0,item),function(err0,stat0) {
        if (err0) {
          res.json({success:false,error:`Error in stat of file ${item}: ${err0.message}`});
          return;
        }
        if (stat0.isFile()) {
          files.push({
            name:item,
            size:stat0.size
          });
        }
        else if (stat0.isDirectory()) {
          dirs.push({
            name:item
          });
        }
        cb();
      });
    },function() {
      res.json({success:true,files:files,dirs:dirs}); 
    });
  });
}

function handle_download(filename,req,res) {
  // don't worry too much because express takes care of this below (b/c we specify a root directory)
  if (!is_safe_path(filename)) {
    res.json({success:false,error:'Unsafe path: '+filename});
    return;
  }
  var path0=require('path').join(share_directory,filename);
  if (!fs.existsSync(path0)) {
    res.json({success:false,error:'File does not exist: '+filename});
    return;
  }
  if (!fs.statSync(path0).isFile()) {
    res.json({success:false,error:'Not a file: '+filename});
    return;
  }
  res.sendFile(filename,{dotfiles:'allow',root:share_directory});
}

function is_safe_path(path) {
  var list=path.split('/');
  for (var i in list) {
    var str=list[i];
    if ((str=='~')||(str=='.')||(str=='..')) return false;
  }
  return true;
}

function start_server(callback) {
  get_free_port_in_range(KBUCKET_SHARE_PORT_RANGE.split('-'),function(err,port) {
    KBUCKET_SHARE_PORT=port;
    app.listen(KBUCKET_SHARE_PORT, function() {
      console.log (`Listening on port ${KBUCKET_SHARE_PORT}`);
      console.log (`Web interface: ${KBUCKET_SHARE_PROTOCOL}://${KBUCKET_SHARE_HOST}:${KBUCKET_SHARE_PORT}/${KBUCKET_SHARE_KEY}/web`)
      connect_to_websocket();
    });
  });
}

function get_free_port_in_range(range,callback) {
  var findPort = require('find-port');
  if (range.length>2) {
    callback('Invalid port range.');
    return;
  }
  if (range.length<1) {
    callback('Invalid port range (*).');
    return;
  }
  if (range.length==1) {
    range.push(range[0]);
  }
  range[0]=Number(range[0]);
  range[1]=Number(range[1]);
  findPort('127.0.0.1', range[0], range[1], function(ports) {
      if (ports.length==0) {
        callback(`No free ports found in range ${range[0]}-${range[1]}`);
        return;
      }
      callback(null,ports[0]);
  });
}

var HTTP_REQUESTS={};

function HttpRequest(on_message_handler) {
  this.initiateRequest=function(msg) {initiateRequest(msg);};
  this.writeRequestData=function(data) {writeRequestData(data);};
  this.endRequest=function() {endRequest();};

  var m_request=null;

  function initiateRequest(msg) {
    /*
    var opts={
      method:msg.method,
      hostname:'localhost',
      port:KBUCKET_SHARE_PORT,
      path:msg.path,
      headers:msg.headers
    };
    */
    var opts={
      method:msg.method,
      uri:`http://localhost:${KBUCKET_SHARE_PORT}/${msg.path}`,
      headers:msg.headers,
      followRedirect:false // important because we want the proxy server to handle it instead
    }
    console.log('request',opts);
    m_request=request(opts);
    m_request.on('response',function(resp) {
      on_message_handler({command:'http_set_response_headers',status:resp.statusCode,status_message:resp.statusMessage,headers:resp.headers});
      resp.on('error',on_response_error);
      resp.on('data',on_response_data);
      resp.on('end',on_response_end);
    });
    m_request.on('error',function(err) {
      on_message_handler({command:'http_report_error',error:'Error in request: '+err.message});
    });
  }

  function writeRequestData(data) {
    if (!m_request) {
      console.error('Unexpected: m_request is null in writeRequestData.');
      return;
    }
    m_request.write(data);
  }

  function endRequest() {
    if (!m_request) {
      console.error('Unexpected: m_request is null in endRequest.');
      return;
    }
    m_request.end();
  }

  function on_response_data(data) {
    on_message_handler({
      command:'http_write_response_data',
      data_base64:data.toString('base64')
    });
  }

  function on_response_end() {
    on_message_handler({
      command:'http_end_response'
    });
  }

  function on_response_error(err) {
    on_message_handler({
      command:'http_report_error',
      error:'Error in response: '+err.message
    });
  }
}

function connect_to_websocket() {
  if (KBUCKET_HUB_URL) {
    var URL=require('url').URL;
    var url=new URL(KBUCKET_HUB_URL);
    if (url.protocol=='http')
      url.protocol='ws';
    else
      url.protocol='wss';
    url=url.toString();
    const ws = new WebSocket(url, {
      perMessageDeflate: false
    });
    ws.on('open', function open() {
      send_message_to_hub({
        command:'register_kbucket_share',
        info:{
          share_protocol:KBUCKET_SHARE_PROTOCOL,
          share_host:KBUCKET_SHARE_HOST,
          share_port:KBUCKET_SHARE_PORT
        }
      });
      index_files();
    });
    ws.on('close',function() {
      if (debugging) {
        console.log (`Websocket closed. Aborting.`);
      }
      process.exit(-1);
    });
    ws.on('message', (message_str) => {
      var msg=parse_json(message_str);
      if (!msg) {
        console.log ('Unable to parse message. Closing websocket.');
        ws.close();
        return;
      }
      if (debugging) {
        console.log ('====================================== received message');
        console.log (JSON.stringify(msg,null,4).slice(0,400));
      }

      if (msg.command=='http_initiate_request') {
        if (msg.request_id in HTTP_REQUESTS) {
          console.log (`Request with id=${msg.request_id} already exists (in http_initiate_request). Closing websocket.`);
          ws.close();
          return;   
        }
        HTTP_REQUESTS[msg.request_id]=new HttpRequest(function(msg_to_hub) {
          msg_to_hub.request_id=msg.request_id;
          send_message_to_hub(msg_to_hub);
        });
        HTTP_REQUESTS[msg.request_id].initiateRequest(msg);
      }
      else if (msg.command=='http_write_request_data') {
        if (!(msg.request_id in HTTP_REQUESTS)) {
          console.log (`No request found with id=${msg.request_id} (in http_write_request_data). Closing websocket.`);
          ws.close();
          return;  
        }
        var REQ=HTTP_REQUESTS[msg.request_id];
        var data=Buffer.from(msg.data_base64, 'base64');
        REQ.writeRequestData(data);
      }
      else if (msg.command=='http_end_request') {
        if (!(msg.request_id in HTTP_REQUESTS)) {
          console.log (`No request found with id=${msg.request_id} (in http_end_request). Closing websocket.`);
          ws.close();
          return;  
        }
        var REQ=HTTP_REQUESTS[msg.request_id];
        REQ.endRequest();
      }
      else {
        console.log (`Unexpected command: ${msg.command}. Closing websocket.`);
        ws.close();
        return;  
      }
    });

    function index_files() {
      index_files_in_subdirectory('',function(err) {
        if (err) {
          console.error(`Error computing prv index: ${err}. Aborting.`);
          process.exit(-1);
        }
      });
    }

    function index_files_in_subdirectory(subdirectory,callback) {
      var path0=require('path').join(share_directory,subdirectory);
      fs.readdir(path0,function(err,list) {
        if (err) {
          callback(err.message);
          return;
        }
        var filepaths=[],dirpaths=[];
        async.eachSeries(list,function(item,cb) {
          if ((item=='.')||(item=='..')) {
            cb();
            return;
          }
          fs.stat(require('path').join(path0,item),function(err0,stat0) {
            if (err0) {
              callback(`Error in stat of file ${item}: ${err0.message}`);
              return;
            }
            if (stat0.isFile()) {
              filepaths.push(require('path').join(subdirectory,item));
            }
            else if (stat0.isDirectory()) {
              dirpaths.push(require('path').join(subdirectory,item));
            }
            cb();
          });
        },function() {
          index_files_list(filepaths,function(err) {
            if (err) {
              callback(err);
              return;
            }
            async.eachSeries(dirpaths,function(dirpath,cb) {
              index_files_in_subdirectory(dirpath,function(err) {
                if (err) {
                  callback(err);
                  return;
                }
                cb();
              });
            },function() {
              callback(null);
            });
          });
        });
      });
    }

    function index_files_list(filepaths,callback) {
      async.eachSeries(filepaths,function(filepath,cb) {
        var path0=require('path').join(share_directory,filepath);
        console.log (`Computing prv for: ${filepath}...`);
        compute_prv(path0,function(err,prv) {
          if (err) {
            callback(err);
            return;
          }
          send_message_to_hub({command:'set_file_info',path:filepath,prv:prv});
          cb();
        });
      },function() {
        callback(null);
      });
    }

    function compute_prv(path,callback) {
      var cmd=`ml-prv-stat ${path}`;
      run_command_and_read_stdout(cmd,function(err,txt) {
        if (err) {
          callback(err);
          return;
        }
        var obj=parse_json(txt.trim());
        if (!obj) {
          callback(`Error parsing json output in compute_prv for file: ${path}`);
          return;
        }
        callback(null,obj);
      });
    }


    function send_message_to_hub(obj) {
      obj.share_key=KBUCKET_SHARE_KEY;
      send_json_message(obj);
    }
    function send_json_message(obj) {
      if (debugging) {
        if (obj.command!='set_file_info') {
          console.log ('------------------------------- sending message');
          console.log (JSON.stringify(obj,null,4).slice(0,400));
        }
      }
      ws.send(JSON.stringify(obj));
    }

  }
}

start_server();


function run_command_and_read_stdout(cmd,callback) {
  var P;
  try {
    P=require('child_process').spawn(cmd,{shell:true});
  }
  catch(err) {
    callback(`Problem launching ${cmd}: ${err.message}`);
    return;
  }
  var txt='';
  P.stdout.on('data',function(chunk) {
    txt+=chunk.toString();
  });
  P.on('close',function(code) {
    callback(null,txt);
  });
  P.on('error',function(err) {
    callback(`Problem running ${cmd}: ${err.message}`);
  })
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
        this.namedParameters[arg0]='';
        if (i+1<args.length) {
          var str=args[i+1];
          if (str.indexOf('-')!=0) {
            this.namedParameters[arg0]=str;
            i++;  
          }
        }
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

function make_random_id(len) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < len; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function parse_json(str) {
  try {
    return JSON.parse(str);
  }
  catch(err) {
    return null;
  }
}