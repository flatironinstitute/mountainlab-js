// Load environment variables
require('dotenv').config({
    path: __dirname + '/.env'
});

/*
Environment variables (you can put a .env file in this directory):
  PORT -- the http/https port to listen on. For now, if port number ends in 443 (PORT%1000==443), then we use https
  KBUCKET_DATA_DIRECTORY -- the directory where all the local kbucket data resides
  MAX_UPLOAD_SIZE_MB -- the maximum file size for individual uploads
  KBUCKET_HUB_URL -- the url needed to reach this kbucket-hub
  DEBUG -- set to 'true' for getting some debugging output
*/

// Encapsulate some functionality in a manager
const manager = new KBucketHubManager();

// Set environment variable DEBUG=true to get some debugging console output
const debugging=(process.env.DEBUG=='true');

// Import various nodejs modules
const async = require('async');
const request = require('request');
const sanitize = require('sanitize-filename');
const fs = require('fs');
const crypto = require('crypto');
const assert = require('assert');
const WebSocket = require('ws');
const express = require('express');

// Define the app (http/https web server)
const app = express();
app.set('json spaces', 4); // when we respond with json, this is how it will be formatted

// Use an environment variable for the listen port
const PORT = process.env.PORT || 3240;

// The directory where the local kbucket data will be stored
const DATA_DIRECTORY = process.env.KBUCKET_DATA_DIRECTORY;
if (!DATA_DIRECTORY) {
	// This is mandatory
    console.error(`KBUCKET_DATA_DIRECTORY environment variable not set. You can use a .env file placed in ${__dirname}.`);
    return;
}

// The raw local data files will be stored in RAW_DIRECTORY
const RAW_DIRECTORY = require('path').join(DATA_DIRECTORY, 'raw');

// Temporary location for files being uploaded
const UPLOADS_IN_PROGRESS_DIRECTORY = require('path').join(DATA_DIRECTORY, 'uploads_in_progress');

// The maximum size for individual uploads
const MAX_UPLOAD_SIZE_MB=Number(process.env.MAX_UPLOAD_SIZE_MB||1024);

// The url used to reach this kbucket-hub
const KBUCKET_HUB_URL=process.env.KBUCKET_HUB_URL||'https://kbucket.flatironinstitute.org';

console.log (`
Using the following:
  PORT=${PORT}
  DATA_DIRECTORY=${DATA_DIRECTORY}
  MAX_UPLOAD_SIZE_MB=${MAX_UPLOAD_SIZE_MB}
  KBUCKET_HUB_URL=${KBUCKET_HUB_URL}

`);

// Information about how to compute the prv files
const PRV_HASH = 'sha1';
const PRV_HEAD_LEN = 1000;

// Make the local data directories if they don't yet exist
mkdir_if_needed(RAW_DIRECTORY);
mkdir_if_needed(UPLOADS_IN_PROGRESS_DIRECTORY);

// API find -- find a file on the kbucket network (or on the local kbucket-hub disk)
app.use('/find/:sha1/:filename(*)', function(req, res) {
	// Note: filename is just for convenience, only used in forming download urls
	var params = req.params;
	handle_find(params.sha1,params.filename,req,res);
});
app.use('/find/:sha1', function(req, res) {
	var params = req.params;
	handle_find(params.sha1,'',req,res);
});
// Provide "stat" synonym to "find" for backward-compatibility
app.use('/stat/:sha1', function(req, res) {
	var params = req.params;
	handle_find(params.sha1,'',req,res);
});

// API download (direct from kbucket hub)
// Used internally -- will be obfuscated in the future -- do not use directly
app.use('/download/:sha1/:filename(*)', function(req, res) {
	// Note: filename is just for convenience, not actually used
	var params = req.params;
	handle_download(params.sha1,params.filename,req,res);
});
app.use('/download/:sha1', function(req, res) {
	var params = req.params;
	handle_download(params.sha1,params.sha1,req,res);
});

// API Forward http request to a kbucket share
// Used internally -- will be obfuscated in the future -- do not use directly
app.use('/share/:share_key/:path(*)', function(req, res) {
	var params = req.params;
	handle_forward_to_share(params.share_key,req.method,params.path,req,res);
});

// API proxy download
// Used internally -- will be obfuscated in the future -- do not use directly
app.use('/proxy-download/:sha1/:filename(*)', function(req, res) {
	// Note: filename is just for convenience, not actually used
	var params = req.params;
	handle_proxy_download(params.sha1,params.filename,req,res);
});
app.use('/proxy-download/:sha1',function(req,res) {
	var params = req.params;
	handle_proxy_download(params.sha1,params.sha1,req,res);
});

// API upload -- upload a file to the kbucket-hub disk
// TODO: think about what restrictions to place on this operation (aside from the per-upload limit)
app.use('/upload', handle_upload);

// API web
// A web interface that will expand over time
app.use('/web', express.static(__dirname + '/web'))

/*
Handle API /find/:sha1/filename(*)
What it does:
	1. Checks on local disk for the file with the specified sha1
	2. Also checks the connected shares for the file with the specified sha1
	3. Returns whether it was found
	4. If it was found, returns the direct urls and the proxy url for retrieving the file
*/
function handle_find(sha1,filename,req,res) {
	allow_cross_domain_requests(req,res);
	// Note: In future we should only allow method=GET
    if ((req.method == 'GET')||(req.method == 'POST')) {
    	// find the file
        manager.findFile({
            sha1: sha1,
            filename: filename //only used for convenience in appending the url, not for finding the file
        }, function(err, resp) {
            if (err) {
            	// There was an error in trying to find the file
            	res.status(500).send({error:err});
            } else {
            	if (resp.found) {
            		// The file was found!
            		res.json({
	                    success: true,
	                    found: true,
	                    size: resp.size,
	                    direct_urls: resp.direct_urls||undefined,
	                    proxy_url: resp.proxy_url||undefined
	                });
            	}
            	else {
            		// The file was not found
            		res.json({
            			success:true,
            			found:false
            		});
                }
            }
        });
    } else {
    	// Other request methods are not allowed
        res.status(405).send('Method not allowed');
    }
}

/*
Handle API /download/:sha1/filename(*)
What it does:
	Downloads the file (if present) from the local kbucket-hub disk
	Used internally and should not be called directly
	First use /find/:sha1/filename(*) to get the urls
*/
function handle_download(sha1,filename,req,res) {
	allow_cross_domain_requests(req,res);
    if ((req.method == 'GET')||(req.method == 'HEAD')) {
        console.log (`download: sha1=${sha1}`)

        // check whether it is a valid sha1
        if (!is_valid_sha1(sha1)) {
        	const errstr = `Invalid sha1 for download: ${sha1}`;
            console.error(errstr);
        	res.status(500).send({error:errstr});
            return;
        }

        // The file name will always be equal to the sha1 hash
        var path_to_file = RAW_DIRECTORY + '/' + sha1;
        res.sendFile(path_to_file); // stream the file back to the client
    } else {
    	// Other request methods are not allowed
        res.status(405).send('Method not allowed');
    }
}

/*
Handle API /download/:sha1/filename(*)
What it does:
	Provide a proxy (pass-through) for a file located on a connected share, via websocket
	Used internally and should not be called directly
	First use /find/:sha1/filename(*) to get the proxy_url
*/
function handle_proxy_download(sha1,filename,req,res) {
    allow_cross_domain_requests(req,res);
    if ((req.method == 'GET')||(req.method=='HEAD')) {
        console.log (`proxy-download: sha1=${sha1}`)

        // First check whether it is a valid sha1
        if (!is_valid_sha1(sha1)) {
            const errstr = `Invalid sha1 for download: ${filename}`;
            console.error(errstr);
            res.end(errstr);
            return;
        }

        // If we have it on our own disk, it is best to send it that way
        // (this is the same as the /download API call)
        var path_to_file = RAW_DIRECTORY + '/' + sha1;
        if (require('fs').existsSync(path_to_file)) {
        	res.sendFile(path_to_file);
        }
        else {
        	var opts={
        		sha1:sha1,
        		filename:filename // filename is only used for constructing the urls -- not used for finding the file
        	};
        	// Search for the file on all the connected shares
        	manager.shareManager().findFileOnShares(opts,function(err,resp) {
        		if (err) {
        			// There was an unanticipated error
        			res.status(500).send({ error: 'Error in findFileOnShares' });
        			return;
        		}
        		if ((!resp.internal_finds)||(resp.internal_finds.length==0)) {
        			// Unable to find file on any of the connected shares
        			res.status(500).send({ error: 'Unable to find file on hub or on shares.' });
        			return;
        		}
        		var internal_find=resp.internal_finds[0];
        		var SS=manager.shareManager().getShare(internal_find.share_key);
        		if (!SS) {
        			// We just found it... it really should still exist.
        			// Note: we may want to handle this differently... I suppose it could be that the share disappeared... then we don't want to cancel the whole thing... maybe a different share has the file
        			res.status(500).send({ error: 'Unexpected problem (1) in handle_proxy_download' });
        			return;	
        		}
        		// Forward the http request to the share through the websocket in order to handle the download
        		SS.processHttpRequest(req.method,`download/${internal_find.path}`,req,res);
        	});
        }
    } else {
        // Other request methods are not allowed
        res.status(405).send('Method not allowed');
    }
}

/*
Handle API /share/:share_key/:path(*)
What it does:
	Forward arbitrary http/https requests through the websocket to the share computer (computer running kbucket-share)
	Note that the share_key must be known to access the computer in this way
*/
function handle_forward_to_share(share_key,method,path,req,res) {
	allow_cross_domain_requests(req,res);
	// find the share by share_key
	var SS=manager.shareManager().getShare(share_key);
	if (!SS) {
		var errstr=`Unable to find share with key=${share_key}`;
		console.error(errstr);
		res.status(500).send({error:errstr})
		return;
	}
	// Forward the request to the share through the websocket
	SS.processHttpRequest(method,path,req,res);
}

function allow_cross_domain_requests(req,res) {
	// Allow browsers to access this server
	if (req.method == 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
	    res.set("Access-Control-Allow-Methods", "POST, GET, HEAD, OPTIONS");
	    res.set("Access-Control-Allow-Credentials", true);
	    res.set("Access-Control-Max-Age", '86400'); // 24 hours
	    res.set("Access-Control-Allow-Headers", "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization, Range");
	    res.status(200).send();
        return;
    }
    else {
    	res.header("Access-Control-Allow-Origin", "*");
	 	res.set("Access-Control-Allow-Headers", "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization, Range");	
    }
}

// Start the server after a bit of a delay (not strictly necessary to delay, I suppose)
setTimeout(function() {
	start_server();
},500);

var USING_HTTPS=false; // Will be set to true below if we are using https

function start_server() {
	app.set('port',PORT);
	if (process.env.SSL != null ? process.env.SSL : PORT%1000==443) {
		// The port number ends with 443, so we are using https
		USING_HTTPS=true;
		// Look for the credentials inside the encryption directory
		// You can generate these for free using the tools of letsencrypt.org
		const options = {
			key:fs.readFileSync(__dirname+'/encryption/privkey.pem'),
			cert:fs.readFileSync(__dirname+'/encryption/fullchain.pem'),
			ca:fs.readFileSync(__dirname+'/encryption/chain.pem')
		};

		// Create the https server and start listening
		app.server=require('https').createServer(options,app);
		app.server.listen(PORT,function() {
			console.info('kbucket-hub is running https on port', PORT);
			start_websocket_server(); // once that is running, start up the websocket server
		});
	}
	else {
		// Create the http server and start listening
	  	app.server=require('http').createServer(app);
	    app.server.listen(PORT, function() {
	        console.log ('kbucket-hub is running http on port', PORT);
	        start_websocket_server(); // once that is running, start up the websocket server
	    });
	}
}

function start_websocket_server() {
	//initialize the WebSocket server instance
	const wss = new WebSocket.Server({server:app.server});

	wss.on('connection', (ws) => {
		// A new share has connected (a computer running kbucket-share)
		var share_key=''; // will be filled in below
		ws.on('message', (message_str) => {
			// The share has sent us a message
			var msg=parse_json(message_str);
			if (debugging) {
				// If DEBUG=true, let's print the message
				if (msg.command!='set_file_info') {
					console.log ('====================================== received message');
					console.log (JSON.stringify(msg,null,4).slice(0,500));
				}
			}
			if (!msg) {
				// The message is invalid. Let's close the connection.
				console.log ('Invalid message. Closing websocket connection.');
				ws.close();
				return;
			}
			if ((share_key)&&(msg.share_key!=share_key)) {
				// The share_key was set, but this message did not match. Close the connection.
				console.log ('Share key does not match. Closing websocket connection.');
				ws.close();
				return;
			}
			if (msg.command=='register_kbucket_share') {
				// This is the first message we should get from the share
				if (!is_valid_share_key(msg.share_key||'')) {
					// Not a valid share key. Close the connection.
					console.log ('Invalid share key. Closing websocket connection');
					ws.close();
					return;
				}
				share_key=msg.share_key;
				// check to see if we already have a share with this key
				if (manager.shareManager().getShare(share_key)) {
					// We already have a share with this share_key. Close connection.
					console.log ('A share with this key already exists. Closing websocket connection.');
					ws.close();
					return;
				}
				// Everything looks okay, let's add this share to our share manager
				console.log (`Registering share: ${share_key}`);
				// msg.info has information about the share
				// send_message_to_share (defined below) is a function that allows the share object to send messages back to the share
				manager.shareManager().addShare(share_key,msg.info,send_message_to_share);
			}
			else {
				// Handle all other messages
				var SS=manager.shareManager().getShare(share_key);
				if (!SS) {
					// Somehow we can't find the share anymore. Close connection.
					console.log (`Unable to find share with key=${share_key}. Closing websocket connect.`);
					ws.close();
					return;
				}
				// Forward the message on to the share object
				SS.processMessageFromShare(msg,function(err,response) {
					if (err) {
						// We got some kind of error from the share object. So we'll close the connection.
						console.log (`${err}. Closing websocket connection.`);
						ws.close();
						return;
					}
					if (response) {
						// If we got a response, let's send it through the websocket back to the share.
						send_message_to_share(response);
					}
				});
			}
		});

		ws.on('close',function() {
			// The web socket has closed
			if (debugging) {
				console.log (`Websocket closed: share_key=${share_key}`);
			}
			// So we should remove the share from the manager
			manager.shareManager().removeShare(share_key);
		});

		function send_message_to_share(obj) {
			// send a json message back to the share
			send_json_message(obj);
		}

		function send_json_message(obj) {
			// send a json message back to the share
			if (debugging) {
				// If DEBUG=true, print the message
				console.log ('------------------------------- sending message');
				console.log (JSON.stringify(obj,null,4).slice(0,400));
			}
			// actually send it
			// Q. should we check for error here?
			ws.send(JSON.stringify(obj));
	    }
  	});
}

function KBucketHubManager() {
	// Encapsulates some functionality of kbucket-hub
	this.findFile=function(opts,callback) {findFile(opts,callback);};
	this.shareManager=function() {return m_share_manager;};

	// The share manager (see KBucketShareManager)
	var m_share_manager=new KBShareManager();

	function findFile(opts,callback) {
		// Find a file, either on the local kbucket-hub disk, or on one of the connected shares
		if (!is_valid_sha1(opts.sha1)) {
			// Not a valid sha1 hash
			callback(`Invalid sha1: ${opts.sha1}`);
			return;
		}

		// We will fill in the following data and then use it below
		var hub_err=null,hub_resp=null;
		var shares_err=null,shares_resp=null;

		async.series([
			function(cb) {
				// Check on the local kbucket-hub disk
				find_file_on_hub(opts,function(err,resp) {
					hub_err=err; // the error
					hub_resp=resp||{}; // the response
					cb();
				});
			},
			function(cb) {
				// Check on the connected shares
				find_file_on_shares(opts,function(err,resp) {
					shares_err=err; // the error
					shares_resp=resp||{}; // the response
					cb();
				});
			}
		],finalize_find_file);

		function finalize_find_file() {
			// If there was just one error, it's just a warning
			if (hub_err) {
				console.warn('Problem in find_file_on_hub: '+hub_err);
			}
			if (shares_err) {
				console.warn('Problem in find_file_on_shares: '+hub_err);
			}

			// If there were two errors, it's an actual error in the callback.
			if ((hub_err)&&(shares_err)) {
				callback(`hub error and shares error: ${hub_err}:${shares_err}`);
				return;
			}

			// This is the info we are going to return
			var resp={
				success:true,
				found:false,
				direct_urls:undefined,
				proxy_url:undefined
			};
			if ((shares_resp.found)||(hub_resp.found)) {
				// Found with at least one of the methods
				resp.found=true; // report found
				if (shares_resp.found) {
					// found on at least one of the shares
					resp.direct_urls=shares_resp.direct_urls; // so we have direct urls
					resp.size=shares_resp.size; // we can report the size
				}
				else if (hub_resp.found) {
					// found on the local kbucket-hub disk
					// TODO: check for size inconsistency and report a warning or something
					resp.size=hub_resp.size;
				}
				// We also provide a proxy url in case the direct urls are not reachable
				// for example, if the share computers are behind firewalls
				resp.proxy_url=`${KBUCKET_HUB_URL}/proxy-download/${opts.sha1}`;
				if (opts.filename) {
					// append the filename to the url so that the downloaded file has the desired name
					resp.proxy_url+=`/${opts.filename}`;
				}
			}
			// return the results
			callback(null,resp);
		}
	}

	function find_file_on_hub(opts,callback) {
		// try to find the file on the local kbucket-hub disk
		if (!KBUCKET_HUB_URL) {
			// We don't have a url, so we can't use this method
			callback('KBUCKET_HUB_URL not set.');
			return;
		}

		// path to the file, if it were to exist
		var path_on_hub=require('path').join(RAW_DIRECTORY,opts.sha1);
		if (!fs.existsSync(path_on_hub)) {
			// Not found
			callback(null,{found:false,message:`File not found on hub: ${opts.sha1}`});
			return;
		}
		// Get the file info
		var stat=stat_file(path_on_hub);
		if (!stat) {
			// it's a problem if we can't stat the file
			callback(`Unable to stat file: ${opts.sha1}`);
			return;
		}
		// Form the download url
		var url0=`${KBUCKET_HUB_URL}/download/${opts.sha1}`;
		if (opts.filename) {
			// append the filename if present, so that the downloaded file with be correctly named on the client computer
			url0+='/'+opts.filename;
		}
		// Return the result
		callback(null,{
			size:stat.size, // size of the file
			url:url0, // download url formed above
			found:true // yep, we found it
		});
	}
	function find_file_on_shares(opts,callback) {
		// find the file on the connected share computers
		m_share_manager.findFileOnShares(opts,callback);
	}
}

function KBShareManager() {
	// Manage a collection of KBShare objects, each representing a connected share (or computer running kbucket-share)
	this.addShare=function(share_key,info,on_message_handler) {addShare(share_key,info,on_message_handler);};
	this.getShare=function(share_key) {return m_shares[share_key]||null;};
	this.removeShare=function(share_key) {removeShare(share_key);};
	this.findFileOnShares=function(opts,callback) {findFileOnShares(opts,callback);};

	var m_shares={};

	function addShare(share_key,info,on_message_handler) {
		// Add a new share
		if (share_key in m_shares) {
			// we already have that share
			return;
		}
		// create a new KBShare object, and pass in the info
		// on_message_handler is a callback functino that allows the share to send websocket messages back to the share
		m_shares[share_key]=new KBShare(share_key,info,on_message_handler);
	}

	function removeShare(share_key) {
		// remove the share from the manager
		if (!(share_key in m_shares)) {
			// we don't have it anyway
			return;
		}
		// actually remove it
		delete m_shares[share_key];
	}

	function findFileOnShares(opts,callback) {
		// Find a file by checking all of the connected shares
		var share_keys=Object.keys(m_shares); // all the share keys in this manager

		// this is the stuff we will return in the callback
		var resp={
			found:false, // whether the file was found
			size:undefined, // size of the file if found
			direct_urls:[], // a list of direct urls (direct to the share computers)
			internal_finds:[] // a list of objects for each find (described elsewhere)
		};

		// Loop sequentially through each share key
		// TODO: shall we allow this to be parallel / asynchronous?
		async.eachSeries(share_keys,function(share_key,cb) {
			var SS=m_shares[share_key];
			if (!SS) { //maybe it disappeared
				cb(); // go to the next one
				return;
			}
			if (resp.internal_finds.length>=10) {
				//don't return more than 10
				cb(); // go to the next one
				return;
			}
			// Find the file on this particular share
			SS.findFile(opts,function(err0,resp0) {
				if ((!err0)&&(resp0.found)) {
					// We found the file
					resp.found=true;
					// TODO: we should check for consistency with size, and do something if there is an inconsistency
					resp.size=resp0.size; // record the size
					if (resp0.direct_url) {
						// add the direct url (direct connection to the share computer)
						resp.direct_urls.push(resp0.direct_url);
					}
					// keep track of the info for this find
					// used when serving the file with the kbucket-hub acting as a proxy
					resp.internal_finds.push({
						share_key:share_key, // the share key
						path:resp0.path // the path of the file within the share
					});
				}
				cb(); // go to the next one
			});
		},function() {
			// we checked all the shares, now return the response.
			callback(null,resp);
		});
	}
}

function KBShare(share_key,info,on_message_handler) {
	// Encapsulate a single share -- a connection to a computer running kbucket-share
	this.processMessageFromShare=function(msg,callback) {processMessageFromShare(msg,callback);};
	this.processHttpRequest=function(method,path,req,res) {processHttpRequest(method,path,req,res);};
	this.findFile=function(opts,callback) {findFile(opts,callback);};

	var m_response_handlers={}; // handlers corresponding to requests we have sent to the share

	// TODO: the following information needs to be moved to a database (not memory)
	var m_indexed_files_by_sha1={}; // the files on the share indexed by sha1
	var m_indexed_files_by_path={}; // the files on the share indexed by path

	function processMessageFromShare(msg,callback) {
		// We got a message msg from the share computer
		if (((msg.command||'').startsWith('http_'))&&(!(msg.request_id in m_response_handlers))) {
			// If msg.command starts with http_, then it is a response to a request.
			// It should therefore have a request_id that matches something in our response handlers
			// If it doesn't, that's a problem,
			callback(`Request id not found (in ${msg.command}): ${msg.request_id}`);
			return;
		}
		if (msg.command=='http_set_response_headers') {
			// Set the headers for the response to the forwarded http request
			m_response_handlers[msg.request_id].setResponseHeaders(msg.status,msg.status_message,msg.headers);
		}
		else if (msg.command=='http_write_response_data') {
			// Write response data for forwarded http request
			var data=Buffer.from(msg.data_base64, 'base64');
			m_response_handlers[msg.request_id].writeResponseData(data);
		}
		else if (msg.command=='http_end_response') {
			// End response for forwarded http request
			m_response_handlers[msg.request_id].endResponse();
		}
		else if (msg.command=='http_report_error') {
			// Report response error for forwarded http request (other than those reported in setResponseHeaders above)
			m_response_handlers[msg.request_id].reportError(msg.error);
		}
		else if (msg.command=='set_file_info') {
			// The share is sending the information for a particular file in the share

			//first remove the old record from our index, if it exists
			if (msg.path in m_indexed_files_by_path) {
				var FF=m_indexed_files_by_path[msg.path];
				delete m_indexed_files_by_sha1[FF.prv.original_checksum];
				delete m_indexed_files_by_path[msg.path];
			}

			// now add the new one to our index if the prv is specified
			// (if the prv is not defined, then we are effectively removing this record)
			if (msg.prv) {
				var FF={
					path:msg.path, // the path of the file within the share
					prv:msg.prv, // the prv object of the file
					size:msg.prv.original_size // the size (for convenience)
				};

				// add the file to our index
				m_indexed_files_by_path[msg.path]=FF;
				m_indexed_files_by_sha1[FF.prv.original_checksum]=FF;
			}
		}
		else {
			// Unrecognized command.
			callback(`Unrecognized command: ${msg.command}`);
		}
	}

	function processHttpRequest(method,path,req,res) {
		// Forward a http request through the websocket to the share computer (computer running kbucket-share)

		// make a unique id for the request (will be included in all correspondence)
		var req_id=make_random_id(8); 

		// Various handler functions (callbacks) associated with the request
		m_response_handlers[req_id]={
			setResponseHeaders:set_response_headers,
			writeResponseData:write_response_data,
			endResponse:end_response,
			reportError:report_error
		};

		// Initiate the request
		send_message_to_share({
			command:'http_initiate_request',
			method:req.method, // http request method
			path:share_key+'/'+path, // path of the url in the request
			headers:req.headers, // request headers
			request_id:req_id // the unique id used in all correspondence
		});

		req.on('data',function(data) {
			// We received some data from the client, so we'll pass it on to the share
			// TODO: do not base64 encode, and do not json encode -- handle this differently
			send_message_to_share({
				command:'http_write_request_data',
				data_base64:data.toString('base64'),
				request_id:req_id
			});
		});

		req.on('end',function() {
			// Request from the client has ended. pass on this info to the share
			send_message_to_share({
				command:'http_end_request',
				request_id:req_id
			});
		});
		function set_response_headers(status,status_message,headers) {
			// Set the response headers and status info -- this is info coming from the share
			res.status(status,status_message);
			if ((headers.location)&&(headers.location.startsWith('/'))) {
				// Redirects are tricky when we are manipulating the path
				// Need to handle this as a special case
				// TODO: handle this better... rather than hard-coding... on the other hand, this only affects serving web pages
				headers.location='/share'+headers.location; 
			}
			for (var hkey in headers) {
				// Set each header individually
				res.set(hkey,headers[hkey]);
			}
		}
		function write_response_data(data) {
			// Write response data (this data comes from the share)
			res.write(data);
		}
		function end_response() {
			// End the response -- we are done writing -- this was triggered by a message from the share
			res.end();
		}
		function report_error(err) {
			// Report an error for the response -- this was triggered by a message from the share
			var errstr='Error in response: '+err;
			console.error(errstr);
			res.status(500).send({error:errstr});
		}
	}

	function findFile(opts,callback) {
		// Find a file on the share by looking into the index
		if (!(opts.sha1 in m_indexed_files_by_sha1)) {
			// Nope we don't have a file with this sha1
			callback(null,{found:false});
			return;
		}
		var FF=m_indexed_files_by_sha1[opts.sha1];
		if (!FF) {
			// Not sure why this would happen
			callback(null,{found:false});
			return;
		}
		// We found the file
		var ret={
			found:true,
			size:FF.size, // file size
			path:FF.path // file path on the share
		};
		if (info.share_host) {
			// The share computer has reported it's ip address, etc. So we'll use that as the direct url
			ret.direct_url=`${info.share_protocol}://${info.share_host}:${info.share_port}/${share_key}/download/${FF.path}`;
		}
		// return the results
		callback(null,ret);
	}

	function send_message_to_share(msg) {
		// The on_message_handler callback allows us to send messages to the share
		on_message_handler(msg);
	}
}

function parse_json(str) {
	// parse json string and return null on failure, rather than throwing an exception
	try {
		return JSON.parse(str);
	}
	catch(err) {
		return null;
	}
}

function is_valid_share_key(key) {
	// check if a share_key is valid
	// TODO: add detail and use regexp
	return ((8<=key.length)&&(key.length<=64));
}

function is_valid_sha1(sha1) {
	// check if this is a valid SHA-1 hash
    if (sha1.match(/\b([a-f0-9]{40})\b/))
        return true;
    return false;
}

function handle_upload(req, res) {
	allow_cross_domain_requests(req,res);
	// TODO: document this
    const send_response = function(obj) {
        if (res.headersSent)
            return;
        if (!obj)
            obj = {};
        obj.success = true;
        res.status(200).json(obj);
    };
    const send_error = function(err) {
        console.error('ERROR uploading' + (res.headersSent ? ' (too late)' : '') + ':', err);
        if (res.headersSent)
            return;
        res.status(400).send({
            status: 'error',
            message: err
        });
    };

    if (MAX_UPLOAD_SIZE_MB<=0) {
    	return send_error(`Uploads not allowed (MAX_UPLOAD_SIZE_MB=${MAX_UPLOAD_SIZE_MB})`);
    }

    const query = req.query;
    if (!(query.resumableIdentifier && query.resumableTotalSize >= 0)) {
        return send_error('Missing upload parameters');
    }

    const name = sanitize((query.identity ? query.identity + '-' : '') + query.resumableIdentifier);
    const size = +query.resumableTotalSize;

    if (query.max_size_bytes && size > +query.max_size_bytes)
        return send_error('File too large');

    if (size/(1024*1024)>MAX_UPLOAD_SIZE_MB) {
    	return send_error(`File too large for upload: ${size/(1024*1024)}>${MAX_UPLOAD_SIZE_MB}`);
    }

    const file = require('path').join(UPLOADS_IN_PROGRESS_DIRECTORY, name);
    const stat = stat_file(file);

    if (query.resumableDone) {
        if (!stat) {
            return send_error('Unable to stat file: ' + file);
        }
        /* resumable upload complete */
        if (stat.size != size)
            return send_error('File size mismatch: upload may be incomplete -- ' + stat.size + ' <> ' + size);
        const input = fs.createReadStream(file);
        input.pipe(crypto.createHash(PRV_HASH).setEncoding('hex'))
            .on('finish', function() {
                assert.equal(input.bytesRead, stat.size, 'File changed size while reading: ' + file);
                commit_file(file, query.resumableFileName, input.bytesRead, this.read(), (err, prv) => {
                    if (err)
                        return send_error('Error committing file: ' + err.message);
                    send_response({
                        prv: prv
                    });
                });
            });
        return;
    }

    if (query.resumableChunkSize >= 1 && query.resumableChunkNumber >= 1) {
        /* resumable chunk upload */
        console.log (`Handling upload for ${name} (chunk ${query.resumableChunkNumber})`);
        const offset = query.resumableChunkSize * (query.resumableChunkNumber - 1);
        const output = new fs.WriteStream(file, {
            flags: fs.constants.O_WRONLY | fs.constants.O_CREAT,
            start: offset
        });
        req.on('readable', () => {
            if (output.pos > size)
                send_error('File too large on upload');
        });
        req.pipe(output).on('finish', () => {
            send_response();
        });
        req.on('error', send_error);
        req.on('aborted', send_error);
    } else {
        return send_error('Missing resumable parameters');
    }
}

function mkdir_if_needed(path) {
	// If directory does not exist, create it
	if (!fs.existsSync(path)) {
		fs.mkdirSync(path);
	}
}

function stat_file(path) {
	// A wrapper for fs.statSync
    try {
        return fs.statSync(path);
    } catch (err) {
        if (err.code != 'ENOENT')
            throw err;
    }
}

function commit_file(file, name, size, hash, prv_callback) {
	// used during upload
	const dst=require('path').join(RAW_DIRECTORY,hash);
	const next = (err) => {
		if (err)
		  return prv_callback(err);
		generate_prv(dst, name, size, hash, prv_callback);
	};
	const curstat = stat_file(dst);
	if (!curstat) {
		console.info('Moving uploaded file to: '+dst);
		fs.rename(file, dst, next);
	} else {
		/* really should compare whole file but just size for now */
		assert.equal(curstat.size, size, 'MISMATCH! File already exists and is wrong size: '+dst);
		console.info('File already exists: '+dst);
		fs.unlink(file, next);
	}
}

function generate_prv(file, name, size, hash, callback) {
	// used during upload
  fs.open(file, 'r', (err, fd) => {
    if (err)
      return callback(err);
    fs.read(fd, new Buffer(PRV_HEAD_LEN), 0, PRV_HEAD_LEN, 0, (err, len, buf) => {
      fs.close(fd);
      if (err)
        return callback(err);
      const fcs = crypto.createHash(PRV_HASH);
      fcs.update(buf.slice(0, len));
      return callback(null, {
        "prv_version": "0.11",
        "original_path": name,
        "original_size": size,
        "original_checksum": hash,
        "original_fcs": "head"+len+"-"+fcs.digest('hex')
      });
    });
  });
}



function make_random_id(len) {
	// return a random string of characters
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < len; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}
