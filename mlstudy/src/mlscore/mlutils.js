exports.mlinfo=mlinfo;
exports.mlalert=mlalert;
exports.mlconfirm=mlconfirm;
exports.mlprompt=mlprompt;
exports.mlyesnocancel=mlyesnocancel;
exports.download_document_content_from_docstor=download_document_content_from_docstor;
exports.set_document_content_to_docstor=set_document_content_to_docstor;
exports.download_kbucket_file_from_prv=download_kbucket_file_from_prv;

var KBucketClient=require('./kbucketclient.js').KBucketClient;

function mlprompt(title,message,val,callback) {
	var elmt=bootbox.prompt({
		title:title,
		message:message,
		value:val,
		callback:callback
	});
    hack_adjust_broken_bootbox(elmt);
}

function mlinfo(title,message,callback) {
	var elmt=bootbox.alert({
		title:title,
		message:message,
		callback:callback
	});
    hack_adjust_broken_bootbox(elmt);
}

function mlalert(title,message,callback) {
    var elmt=bootbox.alert({
        title:title,
        message:message,
        callback:callback
    });
    hack_adjust_broken_bootbox(elmt);
}

function mlconfirm(title,message,callback) {
	var elmt=bootbox.confirm({
		title: title,
	    message: message,
	    buttons: {
	        confirm: {
	            label: 'Yes',
	            className: 'btn-success'
	        },
	        cancel: {
	            label: 'No',
	            className: 'btn-danger'
	        }
	    },
	    callback: function (result) {
	        callback(result);
	    }
	});
    hack_adjust_broken_bootbox(elmt);
}

function mlyesnocancel(title,message,callback) {
    var elmt=bootbox.dialog({
        title: title,
        message: message,
        buttons: {
            cancel: {
                label: 'Cancel',
                className: 'btn-secondary',
                callback: function() {
                    callback('cancel');
                }
            },
            no: {
                label: 'No',
                className: 'btn-danger',
                callback: function() {
                    callback('no');
                }
            },
            yes: {
                label: 'Yes',
                className: 'btn-success',
                callback: function() {
                    callback('yes');
                }
            }
        },
        callback: function (result) {
            callback(result);
        }
    });
    hack_adjust_broken_bootbox(elmt);
}

function hack_adjust_broken_bootbox(elmt) {
    var modal_header=elmt.find('.modal-header');
    modal_header.find('h4').insertBefore(modal_header.find('button'));
}

function download_document_content_from_docstor(DSC,owner,title,callback) {
    var query={owned_by:owner,filter:{"attributes.title":title}};
    var user=DSC.user();
    if (user=='[anonymous]') user='[public]';
    if (user!=owner)
    	query.and_shared_with=user;
    DSC.findDocuments(query,function(err,docs) {
        if (err) {
            callback('Problem finding document: '+err);
            return;
        }
        if (docs.length==0) {
            callback('Document not found.');
            return; 
        }
        if (docs.length>1) {
            callback('Error: more than one document with this title and owner found.');
            return; 
        }
        DSC.getDocument(docs[0]._id,{include_content:true},function(err,doc0) {
            if (err) {
                callback('Problem getting document content: '+err);
                return;
            }
            callback(null,doc0.content,docs[0]._id);
        });
    });
}

function set_document_content_to_docstor(DSC,owner,title,content,callback) {
	var query={owned_by:owner,filter:{"attributes.title":title}};
    if (DSC.user()!=owner)
    	query.and_shared_with=DSC.user();
    DSC.findDocuments(query,function(err,docs) {
        if (err) {
            callback('Problem finding document: '+err);
            return;
        }
        if (docs.length==0) {
            DSC.createDocument({owner:owner,attributes:{title:title},content:content},function(err) {
            	callback(err);
            });
            return; 
        }
        if (docs.length>1) {
            callback('Error: more than one document with this title and owner found.');
            return; 
        }
        set_document_content_to_docstor_by_doc_id(DSC,docs[0]._id,content,callback);
    });
}

function set_document_content_to_docstor_by_doc_id(DSC,doc_id,content,callback) {
	DSC.setDocument(doc_id,{content:content},function(err) {
		callback(err);
	});
}
//todo: this should not be global: put it into the manager or something
function download_kbucket_file_from_prv(prv) {
    var sha1=prv.original_checksum||'';
    var size=prv.original_size||0;

    var kbucket_client=new KBucketClient();
    kbucket_client.setKBucketUrl(m_mls_manager.kBucketUrl());
    kbucket_client.stat(sha1,size,function(err,stat0) {
        if (err) {
            alert(err);
            return;
        }
        if (!stat0.found) {
            alert('Unexpected: not found on server.');
            return;
        }
        var file_name=get_file_name_from_path(prv.original_path||'');
        var url=stat0.url;
        var aaa=url.indexOf('?');
        if (aaa>=0) {
            url=url.slice(0,aaa)+'/'+file_name+'?'+url.slice(aaa+1);
        }
        else {
            url=url+'/'+file_name;
        }
        window.open(url,'_blank');
    });

    function get_file_name_from_path(path) {
        var aaa=path.lastIndexOf('/');
        if (aaa>=0) return path.slice(aaa+1);
        else return path;
    }
}
