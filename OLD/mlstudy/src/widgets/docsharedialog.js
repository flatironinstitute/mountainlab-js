exports.DocShareDialog=DocShareDialog;

var JSQWidget=require('../mlscore/jsqcore/jsqwidget.js').JSQWidget;
var MLTableWidget=require('./mltablewidget.js').MLTableWidget;

function DocShareDialog(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('DocShareDialog');

	this.setDocStorClient=function(DSC) {m_docstor_client=DSC;};
	this.setDocumentInfo=function(info) {m_document_info=JSQ.clone(info);};
	this.show=function() {show();};

	var m_docstor_client=null;
	var m_document_info={owner:'',title:''};
	var m_dialog=$('<div id="dialog"></div>');
	var m_label='Share document';
	var m_user_list=new MLTableWidget();
	var m_permissions={};
	var m_original_permissions={};
	var m_button_div=$('<div><button id=save disabled=disabled>Save</button><button id=cancel>Cancel</button></div>');
	var m_save_button=m_button_div.find('#save');

	m_save_button.click(save_permissions);
	m_button_div.find('#cancel').click(cancel);

	O.div().append('<h3>Share document: '+m_document_info.title+'</h3>');
	O.div().append(m_user_list.div());
	O.div().append(m_button_div);

	function show() {
		O.setSize(450,450);

		var bottom_height=30;

		var W=O.width();
		var H=O.height();
		m_dialog.css('overflow','hidden');
		m_dialog.append(O.div());
		$('body').append(m_dialog);
		m_dialog.dialog({width:W+20,
		              height:H+60,
		              resizable:false,
		              modal:true,
		              title:m_label});

		m_user_list.setGeometry(20,60,W-40,H-60-bottom_height);
		m_button_div.css({position:'absolute',left:20,top:H-bottom_height,width:W-40,height:bottom_height});

		load_permissions(function() {
			m_original_permissions=JSQ.clone(m_permissions);
			refresh();
		});
	}

	function refresh() {
		var permissions=m_permissions;
		m_user_list.clearRows();
		m_user_list.setColumnCount(3);
		m_user_list.headerRow().cell(1).html('User');
		m_user_list.headerRow().cell(2).html('Permissions');

		var users=permissions.users||[];
		for (var i in users) {
			var row=create_user_row(users[i]);
			m_user_list.addRow(row);
		}

		{
			var add_link=$('<a href=#>Add</a>');
			add_link.click(add_user);
			var rr=m_user_list.createRow();
			rr.cell(1).append(add_link);
			m_user_list.addRow(rr);
		}

		if (JSON.stringify(m_permissions)==JSON.stringify(m_original_permissions))
			m_save_button.attr('disabled','disabled');
		else
			m_save_button.removeAttr('disabled');
	}

	function add_user() {
		m_permissions.users=m_permissions.users||[];
		var user_id=prompt('User id:');
		if (!user_id) return;
		var user={
			id:user_id,read:true,write:true
		};
		m_permissions.users.push(user);
		refresh();
	}

	function create_user_row(user) {
		var row=m_user_list.createRow();
		var remove_button=$('<div class="remove_button octicon octicon-trashcan"></div>');
		remove_button.click(function() {remove_user(user);});
		row.cell(0).append(remove_button);
		row.cell(1).html(user.id||'');
		row.cell(2).append(create_user_permissions_element(user));
		return row;
	}

	function create_user_permissions_element(user) {
		var str;
		if ((user.read)&&(user.write)) {
			str='Read and write';
		}
		else if (user.read) {
			str='Read only';
		}
		else if (user.write) {
			str='Write only';
		}
		else {
			str='None';
		}
		var ret=$('<a href=#>'+str+'</a>');
		ret.click(function() {edit_user_permissions(user);});
		return ret;
	}

	function edit_user_permissions(user) {
		alert('This functionality has not yet been implemented.');
	}

	function remove_user(user) {
		m_permissions.users=m_permissions.users||[];
		for (var i=0; i<m_permissions.users.length; i++) {
			if (m_permissions.users[i].id==user.id) {
				m_permissions.users.splice(i,1);
				refresh();
				return;
			}
		}
	}

	function save_permissions() {
		var DSC=m_docstor_client;
		find_document(m_docstor_client,m_document_info.owner,m_document_info.title,function(err,doc) {
			if (err) {
				alert(err);
				return;
			}
			DSC.setDocument(doc._id,{permissions:m_permissions},function(err2) {
				if (err2) {
					alert(err2);
					return;
				}
				m_dialog.dialog('close');
			})
		});
	}

	function cancel() {
		m_dialog.dialog('close');
	}

	function load_permissions(callback) {
		find_document(m_docstor_client,m_document_info.owner,m_document_info.title,function(err,doc) {
			if (err) {
				alert(err);
				return;
			}
			m_permissions=JSQ.clone(doc.permissions);
			callback();
		});
	}

	function find_document(DSC,owner,title,callback) {
	    var query={owned_by:owner,filter:{"attributes.title":title}};
	    if (DSC.user()!=owner)
	    	query.and_shared_with=DSC.user();
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
	        DSC.getDocument(docs[0]._id,{include_content:false},function(err,doc0) {
	            if (err) {
	                callback('Problem getting document content: '+err);
	                return;
	            }
	            var doc0=docs[0];
	            callback(null,doc0);
	        });
	    });
	}
}

