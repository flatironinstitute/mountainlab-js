exports.SafeDatabase=SafeDatabase;

const fs=require('fs');
const lockfile=require('lockfile');

const timeout = ms => new Promise(res => setTimeout(res, ms));

function SafeDatabase(db_directory) {
	this.findDocuments=async function(collection_name,query) {
		return await findDocuments(collection_name,query);
	}
	this.saveDocument=async function(collection_name,doc) {
		return await saveDocument(collection_name,doc);
	}
	this.removeDocuments=async function(collection,query,callback) {
		await removeDocuments(collection,query,callback);
	}

	async function findDocuments(collection_name,query) {
		let timer=new Date();

		let lock;
		try {
			lock=await lock_collection_file(collection_name);
		}
		catch(err) {
			throw new Error(`Error locking collection ${collection_name}: `+err.message);
		}
		let CC;
		try { 
			CC=await load_collection_from_file(collection_name);
		}
		catch(err) {
			await lock.release();
			throw new Error(`Error loading collection ${collection_name}: `+err.message);	
		}
		await lock.release();
		
		let docs = await CC.findDocuments(query);
		return docs;
	}

	async function saveDocument(collection_name,doc) {
		let lock;
		try {
			lock=await lock_collection_file(collection_name);
		}
		catch(err) {
			throw new Error(`Error locking collection ${collection_name}: `+err.message);
		}
		let CC;
		try {
			CC=await load_collection_from_file(collection_name);
			await CC.saveDocument(doc);
			await save_collection_to_file(collection_name,CC);
		}
		catch(err) {
			await lock.release();
			throw new Error(`Error saving document to ${collection_name}: `+err.message);	
		}

		await lock.release();
	}

	async function removeDocuments(collection_name,query) {
		let lock;
		try {
			lock=await lock_collection_file(collection_name);
		}
		catch(err) {
			throw new Error(`Error locking collection ${collection_name}: `+err.message);
		}
		let CC;
		try {
			CC=await load_collection_from_file(collection_name);
			await CC.removeDocuments(query);
			await save_collection_to_file(collection_name,CC);
		}
		catch(err) {
			await lock.release();
			throw new Error(`Error removing documents from ${collection_name}: `+err.message);	
		}

		await lock.release();
	}

	function get_collection_fname(collection_name) {
		return db_directory+'/'+collection_name+'.json';
	}

	async function lock_collection_file(collection_name) {
		let fname=get_collection_fname(collection_name);
		let timer=new Date();
		if (!fs.existsSync(fname)) {
			fs.writeFileSync(fname,'[]');
			await timeout(100);
		}
		let lock_fname=fname+'.lock';
		let opts={
			wait:5000,
			pollPeriod:100,
			stale:5000,
			retries:2,
			retryWait:50
		};
		return new Promise(function(resolve,reject) {
			lockfile.lock(lock_fname,opts,function(err) {
				if (err) {
					reject(err);
					return;
				}
				let ret={
					release:async function() {
						return new Promise(function(resolve2,reject2) {
							lockfile.unlock(lock_fname,function(err) {
								if (err) {
									reject2(err);
									return;
								}
								resolve2();
							});
						});
					}
				}
				resolve(ret);
			});
		});
	}

	async function load_collection_from_file(collection_name) {
		let CC=new SafeCollection();
		let fname=get_collection_fname(collection_name);
		if (fs.existsSync(fname)) {
			await CC.loadFromFile(fname);
		}
		return CC;
	}

	async function save_collection_to_file(collection_name,CC) {
		let fname=get_collection_fname(collection_name);
		await CC.saveToFile(fname);
	}
}

function SafeCollection() {
	this.loadFromFile=async function(fname) {
		return await loadFromFile(fname);
	}
	this.saveToFile=async function(fname) {
		return await saveToFile(fname);
	}
	this.findDocuments=async function(query) {
		return await findDocuments(query);
	}
	this.saveDocument=async function(doc) {
		return await saveDocument(doc);
	}
	this.removeDocuments=async function(query) {
		return await removeDocuments(query);
	}

	let m_documents=[];
	let m_documents_by_id={};

	async function loadFromFile(fname) {
		return new Promise(function(resolve,reject) {
			fs.readFile(fname,'utf8',function(err,txt) {
				if (err) {
					reject(err);
					return;
				}
				let docs;
				try {
					docs=JSON.parse(txt);
				}
				catch(err) {
					reject(new Error('Error parsing json in file: '+fname));
					return;
				}
				try {
					set_documents(docs);
				}
				catch(err) {
					reject('Error setting documents: '+err.message);
					return;
				}
				resolve(true);
			});
		});
	}
	function set_documents(docs) {
		m_documents=[];
		m_documents_by_id={};
		for (let i in docs) {
			let doc0=JSON.parse(JSON.stringify(docs[i]));
			m_documents.push(doc0);
			if ('_id' in doc0) {
				m_documents_by_id[doc0._id]=doc0;
			}
		}
	}
	async function saveToFile(fname) {
		return new Promise(function(resolve,reject) {
			let txt=JSON.stringify(m_documents,null,4);
			fs.writeFile(fname,txt,function(err) {
				if (err) {
					reject(err);
					return;
				}
				resolve(true);
			});
		});	
	}
	async function findDocuments(query) {
		let ret=[];
		if ('_id' in query) {
			let doc0=m_documents_by_id[query._id]||undefined;
			if (doc0) {
				if (document_matches_query(doc0,query)) {
					ret.push(doc0);
				}
			}
		}
		else {
			for (let i in m_documents) {
				let doc0=m_documents[i];
				if (document_matches_query(doc0,query)) {
					ret.push(doc0);
				}
			}
		}
		return ret;
	}
	async function saveDocument(doc_in) {
		let doc=JSON.parse(JSON.stringify(doc_in));
		if ('_id' in doc) {
			if (doc._id in m_documents_by_id) {
				let doc0=m_documents_by_id[doc._id];
				for (let key in doc0) {
					delete doc0[key];
				}
				for (let key in doc) {
					doc0[key]=doc[key];
				}
				return;
			}
			m_documents.push(doc);
			m_documents_by_id[doc._id]=doc;
		}
		else {
			m_documents.push(doc);
		}
	}
	async function removeDocuments(query) {
		let new_docs=[];
		for (let i in m_documents) {
			if (!document_matches_query(m_documents[i],query)) {
				new_docs.push(m_documents[i]);
			}
		}
		set_documents(new_docs);
	}
	function document_matches_query(doc,query) {
		for (let key in query) {
			if (!(key in doc)) {
				return false;
			}
			if (doc[key]!=query[key]) {
				return false;
			}
		}
		return true;
	}
}

function make_random_id(len) {
  let text = '';
  let possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < len; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}
