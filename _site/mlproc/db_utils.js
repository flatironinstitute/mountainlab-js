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

var MongoClient = require('mongodb').MongoClient;
var mongo_url = "mongodb://localhost:27017/";

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
	MongoClient.connect(mongo_url, function(err, db) {
	  if (err) {
	  	connection_error='Error connecting to database: '+err;
	  	callback(connection_error);
	  	return;
	  }
	  DATABASE = db.db("mountainlab");
	  callback(null);
	});
}

function findDocuments(collection,query,callback) {
	connect_to_database_if_needed(function(err) {
		if (err) {
			callback(err);
			return;
		}
		DATABASE.collection(collection).find(query).toArray(function(err,result) {
			callback(err,result);
		});
	});
}

function saveDocument(collection,doc,callback) {
	connect_to_database_if_needed(function(err) {
		if (err) {
			callback(err);
			return;
		}
		DATABASE.collection(collection).save(doc,function(err) {
			callback(err);
		});
	});	
}

function removeDocuments(collection,query,callback) {
	connect_to_database_if_needed(function(err) {
		if (err) {
			callback(err);
			return;
		}
		DATABASE.collection(collection).remove(query,function(err,result) {
			callback(err);
		});
	});
}
