exports.MLWorkspaceMainWindow=MLWorkspaceMainWindow;
exports.MLWFilesView=MLWFilesView;

var JSQWidget=require('../mlscore/jsqcore/jsqwidget.js').JSQWidget;
var ProcessingServerWidget=require('./processingserverwidget.js').ProcessingServerWidget;
var AdvancedConfigurationWidget=require('./altmlsoverviewwindow.js').AdvancedConfigurationWidget;
var DocShareDialog=require('./docsharedialog.js').DocShareDialog;
var MLTableWidget=require('./mltablewidget.js').MLTableWidget;
var mlutils=require('../mlscore/mlutils.js');
var jsutils=require('../mlscore/jsutils/jsutils.js');

require('./mlworkspacemainwindow.css');
require('./bootstrap_docs.css');

function MLWorkspaceMainWindow(O) {
	O=O||this;

	var html=require('./mlworkspacemainwindow.html');
	JSQWidget(O,$(html).find('.MLWorkspaceMainWindow').clone());

	this.setMLSManager=function(manager) {setMLSManager(manager);};
	this.mlsManager=function() {return m_mls_manager;};
	this.loadFromDocStor=function(owner,title,callback) {loadFromDocStor(owner,title,callback);};
	this.loadFromFileContent=function(path,content,callback) {loadFromFileContent(path,content,callback);};
	this.isDirty=function() {return is_dirty();};
	
	var m_mls_manager=null;
	var m_processing_server_widget=new ProcessingServerWidget();
	var m_advanced_configuration_widget=new AdvancedConfigurationWidget();
	var m_home_view=new MLWHomeView();
	var m_files_view=new MLWFilesView();
	var m_file_source=''; //e.g., docstor
	var m_file_path=''; //when m_file_source=='file_content'
	var m_file_info={};
	var m_document_id='';
	var m_original_workspace_object={};

	JSQ.connect(m_home_view,'open-files',O,function() {open_content('files_view');});

	O.div().find('#processing_server').append(m_processing_server_widget.div());
	O.div().find('#advanced_configuration').append(m_advanced_configuration_widget.div());
	O.div().find('#home_view').append(m_home_view.div());
	O.div().find('#files_view').append(m_files_view.div());

	O.div().find('#save_changes').click(function() {on_save_workspace();});
	O.div().find('#spawn_jupyter_container').click(function() {on_spawn_jupyter_container();});

	O.div().find('#home_button').click(function() {check_can_close(function() {O.emit('goto_overview');});});
	O.div().find('#return_to_main_page').click(function() {check_can_close(function() {O.emit('goto_overview');});});

	O.div().find('#new_workspace').click(on_new_workspace);
	O.div().find('#open_workspace').click(on_open_workspace);
	O.div().find('#save_workspace').click(function() {on_save_workspace();});
	O.div().find('#save_workspace_as').click(on_save_workspace_as);
	O.div().find('#download_workspace').click(on_download_workspace);
	O.div().find('#share_workspace').click(on_share_workspace);

	O.div().find('.action_sign_in').click(sign_in);
	O.div().find('.action_sign_out').click(sign_out);

	////////////////////////////////////////////////////////////////////////////////////
	O.div().find('.bd-toc-item').addClass('active');
	O.div().find('.bd-toc-item ul > li > a').click(function() {
		//O.div().find('.bd-toc-item').removeClass('active');
		O.div().find('.bd-toc-item ul > li > a').parent().removeClass('active bd-sidenav-active');
		$(this).parent().addClass('active bd-sidenav-active');
		$(this).parent().parent().parent().addClass('active');
		update_visible_content();
	});
	O.div().find('.bd-toc-link').click(function() {
		//O.div().find('.bd-toc-link').parent().removeClass('active');
		$(this).parent().addClass('active');
		O.div().find('.bd-toc-item ul > li > a').parent().removeClass('active bd-sidenav-active');
		$(this).parent().find('ul > li').first().addClass('active bd-sidenav-active');
		update_visible_content();
	});
	function current_content_id() {
		var active_item=O.div().find('.bd-toc-item ul > li.active').first();
		var content_id=active_item.attr('data-content-id');
		return content_id;
	}
	function update_visible_content() {
		var content_id=current_content_id();
		O.div().find('#content .tab-pane').removeClass('show active');
		O.div().find('#content .tab-pane#'+content_id).addClass('show active');
		m_home_view.refresh(); //todo: only when necessary
		m_files_view.refresh(); //todo: only when necessary
	}

	function open_content(content_id) {
		var items=O.div().find('.bd-toc-item ul > li').first();
		items.removeClass('active bd-sidenav-active');
		O.div().find(`.bd-toc-item ul > li[data-content-id='${content_id}']`).addClass('active bd-sidenav-active');
		update_visible_content();
	}


	function loadFromDocStor(owner,title,callback) {
		mlutils.download_document_content_from_docstor(m_mls_manager.docStorClient(),owner,title,function(err,content,doc_id) {
			if (err) {
				callback(err);
				return;
			}
			var obj=try_parse_json(content);
	        if (!obj) {
	        	console.log (content);
	            callback('Unable to parse mlw file content');
	            return;
	        }
	        set_mlw_object(obj);
	        refresh_views();
	        set_file_info('docstor',{owner:owner,title:title});
	        m_document_id=doc_id;
	        set_original_workspace_object(get_mlw_object());
	        update_document_info();
	        callback(null);
		});
	}
	function loadFromFileContent(path,content,callback) {
		callback(); //todo
	}

	function set_original_workspace_object(obj) {
		m_original_workspace_object=JSQ.clone(obj);
		update_document_info();
		//todo:
		//update_menus();
	}

	function is_dirty() {
		if (!m_file_info.title) return true;
		return (JSON.stringify(get_mlw_object())!=JSON.stringify(m_original_workspace_object));
	}

	function update_document_info() {
		var info=`${m_file_info.title||'[untitled]'} (${m_file_info.owner||'anonymous'})`;
		O.div().find('#document_info').html(info);

		if (is_dirty()) {
			O.div().find('#save_changes').removeAttr('disabled');
			O.div().find('#spawn_jupyter_container').attr('disabled','disabled');
			O.div().find('#save_workspace').attr('href','#');
			O.div().find('#save_workspace').removeClass('disabled');
		}
		else {
			O.div().find('#save_changes').attr('disabled','disabled');
			O.div().find('#spawn_jupyter_container').removeAttr('disabled');
			O.div().find('#save_workspace').removeAttr('href');
			O.div().find('#save_workspace').addClass('disabled');
		}
		update_url();
	}

	function save_changes(callback) {
		if ((m_file_source||'docstor')=='docstor') {
			save_changes_docstor({},callback);
		}
		else {
			alert('Unexpected file source: '+m_file_source);
			if (callback) callback('Unexpected file source');
		}
	}

	function save_changes_docstor(opts,callback) {
		if (!opts) opts={}; //todo: not used
		var owner=m_file_info.owner||m_mls_manager.user();
		var title=m_file_info.title||'workspace.mls';
		var obj=get_mlw_object();
		var content=JSON.stringify(obj,null,4);
		mlutils.set_document_content_to_docstor(m_mls_manager.docStorClient(),owner,title,content,function(err) {
			if (err) {
				alert('Unable to save document: '+err);
				if (callback) callback('Unable to save document: '+err);
				return;
			}
			set_file_info('docstor',{owner:owner,title:title});
			set_original_workspace_object(obj);
			alert('Changes saved to cloud document: '+m_file_info.title+' ('+owner+')');
			if (callback) callback(null);
		});
	}

	function get_mlw_object() {
		var obj=m_mls_manager.workspace().object();
		//obj.results_by_script=m_scripts_view.getResultsByScript();
		return obj;
	}

	function set_mlw_object(obj) {
		m_mls_manager.setMLWObject(obj);
		//m_scripts_view.setResultsByScript(obj.results_by_script||{});
	}

	function refresh_views() {
		m_home_view.refresh();
	}

	function try_parse_json(str) {
      try {
        return JSON.parse(str);
      }
      catch(err) {
        return null;
      }
    }

	function set_file_info(source,info) {
		m_file_source=source;
		m_file_info=JSQ.clone(info);
		m_home_view.setFileInfo(m_file_info);
		m_home_view.refresh();
		update_url();
	}

	function update_url() {
		var query=parse_url_params0();
		var querystr='';
		if (m_file_source=='docstor') {
			querystr='source=docstor&owner='+m_file_info.owner+'&title='+m_file_info.title;
		}
		else if (m_file_source=='browser_storage') {
			querystr='source=browser_storage&title='+m_file_info.title;	
		}
		if ('passcode' in query) {
			querystr+='&passcode='+query.passcode;
		}
		if ('login' in query) {
			querystr+='&login='+query.login;
		}
		if ('mode' in query) {
            querystr+='&mode='+query.mode;
        }
		if ('alt' in query) {
			querystr+='&alt='+query.alt;
		}
		try {
			history.pushState(null, null, '?'+querystr);
		}
		catch(err) {
			console.log ('Unable to update url');
		}
	}

	function parse_url_params0() {
		var match,
		pl     = /\+/g,  // Regex for replacing addition symbol with a space
		search = /([^&=]+)=?([^&]*)/g,
		decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
		query  = window.location.search.substring(1);
		url_params = {};
		while (match = search.exec(query))
			url_params[decode(match[1])] = decode(match[2]);
		return url_params;
	}

	function setMLSManager(manager) {
		m_mls_manager=manager; 
		m_home_view.setMLSManager(manager);
		m_files_view.setMLSManager(manager);
		m_processing_server_widget.setMLSManager(manager);
		m_advanced_configuration_widget.setMLSManager(manager);
		JSQ.connect(manager.workspace(),'changed',O,update_document_info);
		refresh_views();
		update_document_info();
	}

	function on_new_workspace() {
		check_can_close(function() {
			O.emit('new_workspace',{});
		});
	}

	function on_open_workspace() {
		check_can_close(function() {
			O.emit('goto_overview');
		});
	}

	function on_save_workspace(callback) {
		if (!m_file_info.title) {
			on_save_workspace_as(callback);
			return;
		}
		save_changes(callback);
	}

	function on_save_workspace_as(callback) {
		var user=m_mls_manager.user()||m_file_info.owner;
		mlutils.mlprompt('Save workspace as',`Enter title of workspace (owner will be ${user}):`,m_file_info.title,function(title) {
			if (!title) return;
			if (!jsutils.ends_with(title,'.mlw')) {
				title+='.mlw';
			}
			var m_old_file_info=m_file_info;
			m_file_info={title:title,owner:user,source:'docstor'};
			save_changes(function(err) {
				if (err) {
					m_file_info=m_old_file_info;
				}
				update_document_info();
				if (callback) callback(err);
			});
		});
	}

	function on_download_workspace() {
		var obj=get_mlw_object();
		download(JSON.stringify(obj,null,4),m_file_info.title);
	}

	function on_share_workspace() {
		var dlg=new DocShareDialog();
		dlg.setDocStorClient(m_mls_manager.docStorClient());
		dlg.setDocumentInfo(m_file_info);
		dlg.show();
	}

	function on_spawn_jupyter_container() {
		var document_id=m_document_id;
		if (!document_id) {
			alert('Unexpected: document_id is null.');
			return;
		}
		m_mls_manager.docStorClient().getAccessToken(document_id,{},function(err,resp) {
			if (err) {
				mlutils.mlalert('Unable to spawn jupyter container','Error getting access token for document: '+err);
				return;
			}
			var docstor_url=m_mls_manager.docStorClient().docStorUrl();
			//var url=`${docstor_url}/api/getDocument?id=${document_id}&access_token=${resp.access_token}&include_content=true`;
			//console.log (url);
			var obj={
				docstor_url:docstor_url,
				mlw_document_id:document_id,
				mlw_access_token:resp.access_token
			};
			download(JSON.stringify(obj,null,4),(m_file_info.title||'untitled')+'.mlwc');
		});
	}

	function check_can_close(callback) {
		if (is_dirty()) {
			mlutils.mlyesnocancel('Save changes?','Do you want to save changes before closing this workspace?',function(tmp) {
				if (tmp=='yes') {
					on_save_workspace(function(err) {
						if (!err) {
							callback();
						}
					});
				}
				else if (tmp=='no') {
					callback();
				}
				else if (tmp=='cancel') {
					//
				}
			});
		}
		else {
			callback();
		}
	}

	function sign_in() {
		O.emit('log_in');
	}

	function sign_out() {
		mlutils.mlinfo('Not yet implemented','Sign out - not yet implemented');
	}

}

function MLWHomeView(O) {
	O=O||this;
	
	var html=require('./mlworkspacemainwindow.html');
	JSQWidget(O,$(html).find('.MLWHomeView').clone());

	this.setMLSManager=function(manager) {setMLSManager(manager);};
	this.setFileInfo=function(info) {m_file_info=JSQ.clone(info);};
	this.refresh=function() {refresh();};

	var m_mls_manager=null;
	var m_file_info={owner:'',title:'',source:''};

	O.div().find('#edit_description').click(edit_description);

	O.div().find('#open_files').click(function() {O.emit('open-files');});

	function refresh() {
		O.div().find('#workspace_title').html(m_file_info.title);
		O.div().find('#description_content').html(m_mls_manager.workspace().description());
		O.div().find('#num_files').html(m_mls_manager.workspace().fileNames().length);
	}

	function setMLSManager(manager) {
		m_mls_manager=manager;
		JSQ.connect(m_mls_manager.workspace(),'changed',O,refresh);
		refresh();
	}

	function edit_description() {
		var html=require('./altmlsdatasetwidget.html');
		var elmt=$(html).find('.EditDescriptionDlg').clone();
		$('body').append(elmt);
		elmt.find('textarea').val(m_mls_manager.workspace().description());
		elmt.find('#save_button').click(function() {
			var descr=elmt.find('textarea').val();
			m_mls_manager.workspace().setDescription(descr);
			elmt.modal('hide');
		});
		elmt.modal({show:true,focus:true});
	}
}

function MLWFilesView(O) {
	O=O||this;
	
	var html=require('./mlworkspacemainwindow.html');
	JSQWidget(O,$(html).find('.MLWFilesView').clone());

	this.setMLSManager=function(manager) {setMLSManager(manager);};
	this.refresh=function() {refresh();};

	var m_file_list=new MLWFileListWidget();
	var m_file_widget=new MLWFileWidget();
	var m_mls_manager=null;

	O.div().find('#file_list').append(m_file_list.div());
	O.div().find('#file_widget').append(m_file_widget.div());

	O.div().find("#add_file").click(add_file);
	O.div().find('#delete_selected').click(delete_selected);

	m_file_list.onCurrentFileChanged(update_current_file);
	JSQ.connect(m_file_widget,'content_changed',O,on_editor_content_changed);

	function refresh() {
		m_file_list.refresh();
		m_file_widget.refresh();
		update_current_file();
	}

	function update_current_file() {
		var name=m_file_list.currentFileName();
		var F=m_mls_manager.workspace().file(name);
		m_file_widget.setFileName(name);
		m_file_widget.setFile(F);
		//m_dataset_widget.setDatasetId(m_dataset_list.currentDatasetId());
		//m_dataset_widget.refresh();
	}

	function on_editor_content_changed() {
		var name=m_file_widget.fileName();
		m_mls_manager.workspace().setFile(name,m_file_widget.file());
	}

	function setMLSManager(manager) {
		m_mls_manager=manager;
		m_file_list.setWorkspace(manager.workspace());
		m_file_list.refresh();
		//m_file_widget.setMLSManager(manager);
		m_file_widget.refresh();
		refresh();
	}

	function delete_selected() {
		var names=m_file_list.selectedFileNames();
		if (names.length===0) {
			mlutils.mlinfo('Cannot delete files','No files selected',null);
			return;
		}
		var msg='Are you sure you want to delete these '+names.length+' files?';
		if (names.length==1) {
			msg='Are you sure you want to delete this file?';
		}
		mlutils.mlconfirm('Delete files?',msg,function(ok) {
			if (ok) {
				for (var i in names) {
					m_mls_manager.workspace().removeFile(names[i]);
				}
				refresh();
			}
		});
	}

	function add_file() {
		var file_name=prompt('File name:');
		if (!file_name) return;
		if (m_mls_manager.workspace().file(file_name)) {
			alert('Error: File with this name already exists.');
			return;
		}
		m_mls_manager.workspace().setFile(file_name,m_mls_manager.workspace().createFile());
		refresh();
		m_file_list.setCurrentFileName(file_name);
	}
}

function MLWFileListWidget(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLWFileListWidget');

	this.setWorkspace=function(workspace) {setWorkspace(workspace);};
	this.refresh=function() {refresh();};
	this.selectedFileNames=function() {return selectedFileNames();};
	this.currentFileName=function() {return currentFileName();};
	this.setCurrentFileName=function(name) {setCurrentFileName(name);};
	this.onCurrentFileChanged=function(handler) {onCurrentFileChanged(handler);};

	var m_workspace=null;
	var m_table=new MLTableWidget();
	m_table.setParent(O);
	m_table.setSelectionMode('multiple');
	m_table.setRowsMoveable(false);

	function refresh() {
		var current_file_name=currentFileName();

		m_table.clearRows();
		m_table.setColumnCount(1);
		m_table.headerRow().cell(0).html('File');
		if (!m_workspace) return;

		var names=m_workspace.fileNames();
		for (var i=0; i<names.length; i++) {
			var row=m_table.createRow();
			row.file_name=names[i];
			setup_row(row);
			m_table.addRow(row);
		}

		if (current_file_name) {
			set_current_row_by_file_name(current_file_name);
		}

		if (!m_table.currentRow()) {
			if (m_table.rowCount()>0) {
				m_table.setCurrentRow(m_table.row(0));	
			}
		}

	}
	function setup_row(row) {
		var edit_name_link=$('<span class="edit_button octicon octicon-pencil" title="Edit file name"></span>');
		edit_name_link.click(function(evt) {
			edit_file_name(row.file_name);
			return false; //so that we don't get a click on the row
		});
		row.cell(0).append(edit_name_link);
		row.cell(0).append($('<span>'+row.file_name+'</span>'));
	}
	function selectedFileNames() {
		return get_selected_file_names_list();
	}

	function setWorkspace(workspace) {
		m_workspace=workspace;
		JSQ.connect(workspace,'changed',O,refresh);
		refresh();
	}
	function get_selected_file_names_list() {
		var rows=m_table.selectedRows();
		var ret={};
		for (var i in rows) {
			ret[rows[i].file_name]=1;
		}
	    return Object.keys(ret);
	}
	function setCurrentFileName(name) {
		set_current_row_by_file_name(name);
	}
	function currentFileName() {
		var row=m_table.currentRow();
		if (!row) return null;
		return row.file_name;
	}

	function onCurrentFileChanged(handler) {
		JSQ.connect(m_table,'current_row_changed',O,handler);
	}

	function set_current_row_by_file_name(name) {
		for (var i=0; i<m_table.rowCount(); i++) {
			var row=m_table.row(i);
			if (row.file_name==name) {
				m_table.setCurrentRow(row);
				return;
			}
		}
	}

	function edit_file_name(name) {
		var name2=prompt('New name for file:',name);
		if (!name2) return;
		if (name2==name) return;
		if (m_workspace.file(name2)) {
			alert('Cannot rename file. A file with this name already exists.');
			return;
		}
		m_workspace.changeFileName(name,name2);
		refresh();
	}
}

function MLWFileWidget(O) {
	O=O||this;

	var html=require('./mlworkspacemainwindow.html');
	JSQWidget(O,$(html).find('.MLWFileWidget').clone());

	this.refresh=function() {refresh();};
	this.setFile=function(F) {m_file=F; refresh();};
	this.file=function() {return m_file;};
	this.setFileName=function(name) {setFileName(name);};
	this.fileName=function() {return m_file_name;};

	var m_file=null;
	var m_file_name='';
	var m_code_editor=CodeMirror.fromTextArea(O.div().find('textarea.code_editor')[0], {
    	lineNumbers: true,
    	mode: "javascript",
    	lint:true,
    	gutters: ["CodeMirror-lint-markers"],
    	extraKeys: {"Alt-F": "findPersistent","F3":"findNext"}
  	});
  	m_code_editor.on('change',on_code_editor_changed);
  	//O.div().append(m_code_editor_div);

  	O.div().find('.CodeMirror').addClass('h-100');
  	O.div().find('.CodeMirror').css({width:'98%'});

  	function on_code_editor_changed() {
  		if (m_file) {
  			m_file.setContent(m_code_editor.getValue());
  			O.emit('content_changed');
  		}
  	}

	function refresh() {
		if (!m_file) {
			if (m_code_editor.getValue()!='') { //important
				m_code_editor.setValue('');
			}
			m_code_editor.refresh();
			$(m_code_editor.getWrapperElement()).hide();
			return;
		}
		$(m_code_editor.getWrapperElement()).show();
		if (m_code_editor.getValue()!=m_file.content()) { //important
			m_code_editor.setValue(m_file.content());
		}
		m_code_editor.refresh();
	}
	function setFileName(name) {
		m_file_name=name;
		var mode='javascript';
		if (jsutils.ends_with(name||'','.py')) {
			mode='python';
		}
		m_code_editor.setOption('mode',mode);
	}
}