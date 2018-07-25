const SafeDatabase=require(__dirname+'/safedatabase.js').SafeDatabase;

let TheSafeDatabase=null;
function load_database() {
	if (!TheSafeDatabase) {
		var dirpath=process.env.ML_DATABASE_DIRECTORY;
		if (!dirpath) {
			mkdir_if_needed(config_directory());
			dirpath=config_directory()+'/database';
		}
		mkdir_if_needed(dirpath);

		TheSafeDatabase=new SafeDatabase(dirpath);
	}
	return TheSafeDatabase;
}

exports.findDocuments=function(collection,query,callback) {
	let DB=load_database();
	if (!DB) {
		callback('Unable to load database');
		return;
	}
	DB.findDocuments(collection,query)
		.then(function(docs) {
			callback(null,docs);
		})
		.catch(function(err) {
			callback(err.message);
		})
}
exports.saveDocument=function(collection,doc,callback) {
	let DB=load_database();
	if (!DB) {
		callback('Unable to load database');
		return;
	}
	DB.saveDocument(collection,doc)
		.then(function(docs) {
			callback(null,docs);
		})
		.catch(function(err) {
			callback(err.message);
		})
}
exports.removeDocuments=function(collection,query,callback) {
	let DB=load_database();
	if (!DB) {
		callback('Unable to load database');
		return;
	}
	DB.removeDocuments(collection,query)
		.then(function(docs) {
			callback(null,docs);
		})
		.catch(function(err) {
			callback(err.message);
		})
}



//exports.open_collection=open_collection;
exports.findDocuments_old=function(collection,query,callback) {
	findDocuments_old(collection,query,callback);
}
exports.saveDocument_old=function(collection,doc,callback) {
	saveDocument(collection,doc,callback);
}
exports.removeDocuments_old=function(collection,query,callback) {
	removeDocuments_old(collection,query,callback);
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
		DATABASE=Client.connect(dirpath,['sumit']);
	}
	catch(err) {
		console.log=hold_console_log;
		callback('Error connecting to disk database: '+err.message);
		return;
	}
	console.log=hold_console_log;
	callback(null);
}

function findDocuments_old(collection,query,callback) {
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

function saveDocument_old(collection,doc,callback) {
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

function removeDocuments_old(collection,query,callback) {
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