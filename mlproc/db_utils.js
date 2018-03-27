exports.open_collection=open_collection;

var common=require(__dirname+"/common.js");
var db = require('diskdb');
var dirname=get_db_directory()
db.connect(dirname);
db.loadCollections(['process_cache','sumit']);

function open_collection(collection_name) {
	
	return db[collection_name];
}

function get_db_directory() {
	var basedir=process.env.HOME;
	common.mkdir_if_needed(basedir+'/.mountainlab');
	common.mkdir_if_needed(basedir+'/.mountainlab/db');
	return basedir+'/.mountainlab/db';
}