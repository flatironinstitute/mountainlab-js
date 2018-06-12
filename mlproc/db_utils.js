//exports.open_collection=open_collection;
exports.findDocuments=function(collection,query,callback) {
	findDocuments(collection,query,callback);
}
exports.saveDocument=function(collection,doc,callback) {
	saveDocument(collection,doc,callback);
}
exports.removeDocuments=function(collection,query,callback) {
	removeDocuments(collection,query,callback);
}

var DATABASE=null;
var trying_to_connect=false;
var connection_error='';

//var Client = require('mongodb').MongoClient;
//var mongo_url = "mongodb://localhost:27017/";

var Client = require('diskdb');

function connect_to_database_if_needed(callback) {
	if (DATABASE) {
		callback();
		return;
	}
	if (connection_error) {
		callback(connection_error);
		return;
	}
	if (trying_to_connect) {
		setTimeout(function() {
			connect_to_database_if_needed(callback);
		},100);
		return;
	}
	trying_to_connect=true;
	/*
	Client.connect(mongo_url, function(err, db) {
	  if (err) {
	  	connection_error='Error connecting to database: '+err;
	  	callback(connection_error);
	  	return;
	  }
	  DATABASE = db.db("mountainlab");
	  callback(null);
	});
	*/
	//suppress output from diskdb
	var hold_console_log=console.log;
	console.log=function() {};
	try {
		var dirpath=process.env.ML_DATABASE_DIRECTORY;
		if (!dirpath) {
			mkdir_if_needed(config_directory());
			dirpath=config_directory()+'/database';
		}
		mkdir_if_needed(dirpath);
		DATABASE=Client.connect(dirpath,['processor_specs','sumit','processor_jobs','process_cache']);
	}
	catch(err) {
		console.log=hold_console_log;
		callback('Error connecting to disk database: '+err.message);
		return;
	}
	console.log=hold_console_log;
	callback(null);
}

function findDocuments(collection,query,callback) {
	connect_to_database_if_needed(function(err) {
		if (err) {
			callback(err);
			return;
		}
		try {
			var result=DATABASE[collection].find(query);
		}
		catch(err) {
			callback('Error in find: '+err.message);
			return;
		}
		callback(null,result);
		/*
		DATABASE.collection(collection).find(query).toArray(function(err,result) {
			callback(err,result);
		});
		*/
	});
}

function saveDocument(collection,doc,callback) {
	connect_to_database_if_needed(function(err) {
		if (err) {
			callback(err);
			return;
		}
		try {
			DATABASE[collection].save(doc);
		}
		catch(err) {
			callback('Error in save: '+err.message);
			return;
		}
		callback(null);
		/*
		DATABASE.collection(collection).save(doc,function(err) {
			callback(err);
		});
		*/
	});	
}

function removeDocuments(collection,query,callback) {
	connect_to_database_if_needed(function(err) {
		if (err) {
			callback(err);
			return;
		}
		try {
			DATABASE[collection].remove(query);
		}
		catch(err) {
			callback('Error in remove: '+err.message);
			return;
		}
		callback(null);
		/*
		DATABASE.collection(collection).remove(query,function(err,result) {
			callback(err);
		});
		*/
	});
}

function mkdir_if_needed(path) {
  try {
    require('fs').mkdirSync(path);
  }
  catch(err) {
  }
}

function config_directory() {
	return process.env.ML_CONFIG_DIRECTORY||process.env.HOME+'/.mountainlab';
}