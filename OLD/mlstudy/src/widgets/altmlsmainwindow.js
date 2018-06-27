exports.AltMLSMainWindow=AltMLSMainWindow;

var JSQWidget=require('../mlscore/jsqcore/jsqwidget.js').JSQWidget;
var ProcessingServerWidget=require('./processingserverwidget.js').ProcessingServerWidget;
var AdvancedConfigurationWidget=require('./altmlsoverviewwindow.js').AdvancedConfigurationWidget;
var MLSDatasetListWidget=require('./mlsdatasetlistwidget.js').MLSDatasetListWidget;
var AltMLSDatasetWidget=require('./altmlsdatasetwidget.js').AltMLSDatasetWidget;
var MLSBatchScriptListWidget=require('./mlsbatchscriptlistwidget.js').MLSBatchScriptListWidget;
var AltMLSScriptWidget=require('./altmlsscriptwidget.js').AltMLSScriptWidget;
var DocShareDialog=require('./docsharedialog.js').DocShareDialog;
var BatchJob=require('../mlscore/batchjob.js').BatchJob;
var MLSBatchScript=require('../mlscore/mlsmanager.js').MLSBatchScript;
var MLSDataset=require('../mlscore/mlsmanager.js').MLSDataset;
var AltMLSBatchScriptResultsWidget=require('./altmlsbatchscriptresultswidget.js').AltMLSBatchScriptResultsWidget;
var MLSBatchScriptJobsWidget=require('./mlsbatchscriptjobswidget.js').MLSBatchScriptJobsWidget;
var MLPLogWidget=require('./mlplogwidget.js').MLPLogWidget;
var MLWFilesView=require('./mlworkspacemainwindow.js').MLWFilesView;
var mlutils=require('../mlscore/mlutils.js');
var jsutils=require('../mlscore/jsutils/jsutils.js');

require('./altmlsmainwindow.css');
require('./bootstrap_docs.css');

function AltMLSMainWindow(O) {
	O=O||this;

	var html=require('./altmlsmainwindow.html');
	JSQWidget(O,$(html).find('.AltMLSMainWindow').clone());

	this.setMLSManager=function(manager) {setMLSManager(manager);};
	this.mlsManager=function() {return m_mls_manager;};
	this.loadFromDocStor=function(owner,title,callback) {loadFromDocStor(owner,title,callback);};
	this.loadFromFileContent=function(path,content,callback) {loadFromFileContent(path,content,callback);};
	this.isDirty=function() {return is_dirty();};
	
	var m_mls_manager=null;
	var m_processing_server_widget=new ProcessingServerWidget();
	var m_advanced_configuration_widget=new AdvancedConfigurationWidget();
	var m_home_view=new AltMLSHomeView();
	var m_datasets_view=new AltMLSDatasetsView();
	var m_scripts_view=new AltMLSScriptsView();
	//var m_web_modules_view=new AltMLSWebModulesView();
	var m_output_view=new MLSOutputView();
	var m_files_view=new MLWFilesView();
	var m_file_source=''; //e.g., docstor
	var m_file_path=''; //when m_file_source=='file_content'
	var m_file_info={};
	var m_document_id='';
	var m_original_study_object={};

	JSQ.connect(m_scripts_view,'current-batch-job-changed',O,on_batch_job_changed);

	JSQ.connect(m_home_view,'open-datasets',O,function() {open_content('datasets');});
	JSQ.connect(m_home_view,'open-scripts',O,function() {open_content('scripts');});
	//JSQ.connect(m_home_view,'open-web-modules',O,function() {open_content('web_modules');});

	var html=require('./altmlsmainwindow.html');
	O.div().append($(html).find('#template-AltMLSMainWindow').children().clone());
	//O.div().append($('#template-AltMLSMainWindow').children().clone());

	O.div().find('#processing_server').append(m_processing_server_widget.div());
	O.div().find('#advanced_configuration').append(m_advanced_configuration_widget.div());
	O.div().find('#home').append(m_home_view.div());
	O.div().find('#datasets').append(m_datasets_view.div());
	//m_scripts_view.div().addClass('h-100');
	O.div().find('#scripts').append(m_scripts_view.div());
	//m_web_modules_view.div().addClass('h-100');
	//O.div().find('#web_modules').append(m_web_modules_view.div());
	//m_output_view.div().addClass('h-100');
	O.div().find('#output').append(m_output_view.div());
	O.div().find('#workspace').append(m_files_view.div());

	O.div().find('#save_changes').click(function() {on_save_study();});
	O.div().find('#open_workspace_in_jupyter_container').click(function() {on_open_workspace_in_jupyter_container();});

	O.div().find('#home_button').click(function() {check_can_close(function() {O.emit('goto_overview');});});
	O.div().find('#return_to_main_page').click(function() {check_can_close(function() {O.emit('goto_overview');});});

	O.div().find('#new_study').click(on_new_study);
	O.div().find('#open_study').click(on_open_study);
	O.div().find('#save_study').click(function() {on_save_study();});
	O.div().find('#save_study_as').click(on_save_study_as);
	O.div().find('#download_study').click(on_download_study);
	O.div().find('#share_study').click(on_share_study);

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
		m_datasets_view.refresh(); //todo: only when necessary
		m_scripts_view.refresh(); //todo: only when necessary
		//m_web_modules_view.refresh(); //todo: only when necessary
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
	            callback('Unable to parse mls file content');
	            return;
	        }
	        set_mls_object(obj);
	        refresh_views();
	        set_file_info('docstor',{owner:owner,title:title})
	        m_document_id=doc_id;
	        set_original_study_object(get_mls_object());
	        update_document_info();
	        callback(null);
		});
	}
	function loadFromFileContent(path,content,callback) {
		callback(); //todo
	}

	function set_original_study_object(obj) {
		m_original_study_object=JSQ.clone(obj);
		update_document_info();
		//todo:
		//update_menus();
	}

	function is_dirty() {
		if (!m_file_info.title) return true;
		return (JSON.stringify(get_mls_object())!=JSON.stringify(m_original_study_object));
	}

	function update_document_info() {
		var info=`${m_file_info.title||'[untitled]'} (${m_file_info.owner||'anonymous'})`;
		O.div().find('#document_info').html(info);

		if (is_dirty()) {
			O.div().find('#save_changes').removeAttr('disabled');
			O.div().find('#save_study').attr('href','#');
			O.div().find('#save_study').removeClass('disabled');
		}
		else {
			O.div().find('#save_changes').attr('disabled','disabled');	
			O.div().find('#save_study').removeAttr('href');
			O.div().find('#save_study').addClass('disabled');
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
		var title=m_file_info.title||'study.mls';
		var obj=get_mls_object();
		var content=JSON.stringify(obj,null,4);
		mlutils.set_document_content_to_docstor(m_mls_manager.docStorClient(),owner,title,content,function(err) {
			if (err) {
				alert('Unable to save document: '+err);
				if (callback) callback('Unable to save document: '+err);
				return;
			}
			set_file_info('docstor',{owner:owner,title:title});
			set_original_study_object(obj);
			alert('Changes saved to cloud document: '+m_file_info.title+' ('+owner+')');
			if (callback) callback(null);
		});
	}

	function get_mls_object() {
		var obj=m_mls_manager.study().object();
		obj.results_by_script=m_scripts_view.getResultsByScript();
		return obj;
	}

	function set_mls_object(obj) {
		m_mls_manager.setMLSObject(obj);
		m_scripts_view.setResultsByScript(obj.results_by_script||{});
	}

	function refresh_views() {
		m_home_view.refresh();
		m_datasets_view.refresh();
		m_scripts_view.refresh();
		//m_web_modules_view.refresh();
		// m_output_view.refresh(); todo: figure out what to do about this
		m_files_view.refresh();
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

	function on_batch_job_changed() {
		m_output_view.setBatchJob(m_scripts_view.currentBatchJob());
	}

	function setMLSManager(manager) {
		m_mls_manager=manager; 
		m_home_view.setMLSManager(manager);
		m_datasets_view.setMLSManager(manager);
		m_scripts_view.setMLSManager(manager);
		//m_web_modules_view.setMLSManager(manager);
		m_output_view.setMLSManager(manager);
		m_files_view.setMLSManager(manager);
		m_processing_server_widget.setMLSManager(manager);
		m_advanced_configuration_widget.setMLSManager(manager);
		JSQ.connect(manager.study(),'changed',O,update_document_info);
		refresh_views();
		update_document_info();
	}

	function on_new_study() {
		check_can_close(function() {
			O.emit('new_study',{});
		});
	}

	function on_open_study() {
		check_can_close(function() {
			O.emit('goto_overview');
		});
	}

	function on_save_study(callback) {
		if (!m_file_info.title) {
			on_save_study_as(callback);
			return;
		}
		save_changes(callback);
	}

	function on_save_study_as(callback) {
		var user=m_mls_manager.user()||m_file_info.owner;
		mlutils.mlprompt('Save study as',`Enter title of study (owner will be ${user}):`,m_file_info.title,function(title) {
			if (!title) return;
			if (!jsutils.ends_with(title,'.mls')) {
				title+='.mls';
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

	function on_download_study() {
		var obj=get_mls_object();
		download(JSON.stringify(obj,null,4),m_file_info.title);
	}

	function on_share_study() {
		var dlg=new DocShareDialog();
		dlg.setDocStorClient(m_mls_manager.docStorClient());
		dlg.setDocumentInfo(m_file_info);
		dlg.show();
	}

	function on_open_workspace_in_jupyter_container() {
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
			//var url0='http://localhost:7044';
			var url0='https://kbucket.org';
			jsutils.http_get_json(url0+'/attachToContainer',{},function(tmp) {
				if (tmp.success) tmp=tmp.object;
				if (!tmp.success) {
					//download(JSON.stringify(obj,null,4),(m_file_info.title||'untitled')+'.mlwc');
					//console.error(tmp.error);
					//mlutils.mlalert('Unable to attach to container','Unable to attach to container. You may be able to use the downloaded .mlwc file on your local computer.');
					console.error(tmp.error);
					mlutils.mlalert('Unable to attach to container','Unable to attach to container: '+tmp.error);
					return;
				}
				//var url1=`http://localhost:${tmp.port}/lab`;
				var url1='http://kbucket.org'+`:${tmp.port}/lab`;
				url1+=`?docstor_url=${obj.docstor_url}&mlw_document_id=${obj.mlw_document_id}&mlw_access_token=${obj.mlw_access_token}`;
				window.open(url1,'_blank');
				mlutils.mlinfo('Attached to container','A new tab should have opened with JupyterLab access to the workspaces associated with this study. If you make changes and save them back to the workspace, then you should reload this study on this page before saving further changes. Otherwise, you will overwrite your workspace changes.');
			});
		});
	}

	function check_can_close(callback) {
		if (is_dirty()) {
			mlutils.mlyesnocancel('Save changes?','Do you want to save changes before closing this study?',function(tmp) {
				if (tmp=='yes') {
					on_save_study(function(err) {
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

function AltMLSHomeView(O) {
	O=O||this;
	
	var html=require('./altmlsmainwindow.html');
	JSQWidget(O,$(html).find('.AltMLSHomeView').clone());

	this.setMLSManager=function(manager) {setMLSManager(manager);};
	this.setFileInfo=function(info) {m_file_info=JSQ.clone(info);};
	this.refresh=function() {refresh();};

	var m_mls_manager=null;
	var m_file_info={owner:'',title:'',source:''};

	O.div().find('#open_datasets').click(function() {O.emit('open-datasets');});
	O.div().find('#open_scripts').click(function() {O.emit('open-scripts');});
	//O.div().find('#open_web_modules').click(function() {O.emit('open-web-modules');});

	O.div().find('#edit_description').click(edit_description);

	function refresh() {
		O.div().find('#study_title').html(m_file_info.title);
		O.div().find('#description_content').html(m_mls_manager.study().description());
		O.div().find('#num_datasets').html(m_mls_manager.study().datasetIds().length);
		O.div().find('#num_scripts').html(m_mls_manager.study().batchScriptNames().length);
		//O.div().find('#num_web_modules').html(m_mls_manager.study().webModuleNames().length);
	}

	function setMLSManager(manager) {
		m_mls_manager=manager;
		JSQ.connect(m_mls_manager.study(),'changed',O,refresh);
		refresh();
	}

	function edit_description_old() {
		var html=require('./altmlsmainwindow.html');
		var elmt=$(html).find('#template-EditDescriptionDlg').children().clone();
		//var elmt=$('#template-EditDescriptionDlg').children().first().clone();
		$('body').append(elmt);
		elmt.find('textarea').val(m_mls_manager.study().description());
		elmt.find('#save_button').click(function() {
			var descr=elmt.find('textarea').val();
			m_mls_manager.study().setDescription(descr);
			elmt.modal('hide');
		});
		elmt.modal({show:true,focus:true});
	}

	function edit_description() {
		var html=require('./altmlsdatasetwidget.html');
		var elmt=$(html).find('.EditDescriptionDlg').clone();
		$('body').append(elmt);
		elmt.find('textarea').val(m_mls_manager.study().description());
		elmt.find('#save_button').click(function() {
			var descr=elmt.find('textarea').val();
			m_mls_manager.study().setDescription(descr);
			elmt.modal('hide');
		});
		elmt.modal({show:true,focus:true});
	}
}

function AltMLSDatasetsView(O) {
	O=O||this;
	
	var html=require('./altmlsmainwindow.html');
	JSQWidget(O,$(html).find('.AltMLSDatasetsView').clone());

	this.setMLSManager=function(manager) {setMLSManager(manager);};
	this.refresh=function() {refresh();};

	var m_dataset_list=new MLSDatasetListWidget();
	var m_dataset_widget=new AltMLSDatasetWidget();
	var m_mls_manager=null;

	O.div().css({display:'flex',"flex-flow":"row"});

	O.div().find('#dataset_list').append(m_dataset_list.div());
	O.div().find('#dataset_widget').append(m_dataset_widget.div());

	O.div().find("#add_dataset").click(add_dataset);
	O.div().find('#delete_selected').click(delete_selected);

	m_dataset_list.onCurrentDatasetChanged(update_current_dataset);
	JSQ.connect(m_dataset_widget,'download_kbucket_file_from_prv',O,function(sender,args) {
		mlutils.download_kbucket_file_from_prv(args.prv);
	});

	function refresh() {
		m_dataset_list.refresh();
		update_current_dataset();
		/*
		m_dataset_list.setColumnCount(2);
		m_dataset_list.headerCell(0).html('test');
		m_dataset_list.header()Cell(1).html('test2');
		*/
	}

	function update_current_dataset() {
		m_dataset_widget.setDatasetId(m_dataset_list.currentDatasetId());
		m_dataset_widget.refresh();
	}

	function setMLSManager(manager) {
		m_mls_manager=manager;
		m_dataset_list.setMLSManager(manager);
		m_dataset_list.refresh();
		m_dataset_widget.setMLSManager(manager);
		m_dataset_widget.refresh();
		refresh();
	}

	function delete_selected() {
		var ids=m_dataset_list.selectedDatasetIds();
		if (ids.length===0) {
			mlutils.mlinfo('No datasets selected','',null);
			return;
		}
		var msg='Are you sure you want to delete these '+ids.length+' datasets?';
		if (ids.length==1) {
			msg='Are you sure you want to delete this dataset?';
		}
		mlutils.mlconfirm('Delete datasets?',msg,function(ok) {
			if (ok) {
				for (var i in ids) {
					m_mls_manager.study().removeDataset(ids[i]);
				}
				refresh();
			}
		});
	}

	function add_dataset() {
		var dataset_id=prompt('Dataset ID:');
		if (!dataset_id) return;
		if (m_mls_manager.study().dataset(dataset_id)) {
			alert('Error: Dataset with this id already exists.');
			return;
		}
		m_mls_manager.study().setDataset(dataset_id,new MLSDataset());
		refresh();
		m_dataset_list.setCurrentDatasetId(dataset_id);
	}
}

function AltMLSScriptsView(O) {
	O=O||this;
	
	var html=require('./altmlsmainwindow.html');
	JSQWidget(O,$(html).find('.AltMLSScriptsView').clone());

	this.setMLSManager=function(manager) {setMLSManager(manager);};
	this.refresh=function() {refresh();};
	this.currentBatchJob=function() {return currentBatchJob();};
	this.getResultsByScript=function() {return getResultsByScript();};
	this.setResultsByScript=function(obj) {setResultsByScript(obj);};

	var m_script_list=new MLSBatchScriptListWidget();
	var m_script_widget=new AltMLSScriptWidget();
	var m_mls_manager=null;
	var m_script_job_lookup=new ScriptJobLookup();
	var m_current_script_name='';
	m_script_widget.setScriptJobLookup(m_script_job_lookup);

	JSQ.connect(m_script_widget,'script-job-started',O,'current-batch-job-changed');

	O.div().find('#script_list').append(m_script_list.div());
	//m_script_widget.div().addClass('h-100');
	O.div().find('#script_widget').append(m_script_widget.div());

	O.div().find("#add_script").click(add_script);
	O.div().find('#delete_selected').click(delete_selected);

	m_script_list.onCurrentBatchScriptChanged(update_current_script);

	function refresh() {
		m_script_list.refresh();
		update_current_script();
	}

	function update_current_script() {
		var batch_script_name=m_script_list.currentBatchScriptName();
		var P=m_mls_manager.study().batchScript(batch_script_name);
		m_script_widget.setScript(P,batch_script_name);
		m_current_script_name=batch_script_name;

		if (P) {
			P.onChanged(function() {
				if (batch_script_name) {
					m_mls_manager.study().setBatchScript(batch_script_name,P);
				}
			});
		}

		O.emit('current-batch-job-changed');
	}

	function currentBatchJob() {
		if (!m_current_script_name) return null;
		return m_script_job_lookup.job(m_current_script_name);
	}

	function setMLSManager(manager) {
		m_mls_manager=manager;
		m_script_list.setMLSManager(manager);
		m_script_list.refresh();
		m_script_widget.setMLSManager(manager);
		//m_script_widget.refresh();
		refresh();
	}

	function add_script() {
		var script_name=prompt('New script name:');
		if (!script_name) return;
		m_mls_manager.study().setBatchScript(script_name,new MLSBatchScript());
		refresh();
		m_script_list.setCurrentBatchScriptName(script_name);
	}

	function delete_selected() {
		var names=m_script_list.selectedBatchScriptNames();
		if (names.length===0) {
			mlutils.mlinfo('No scripts selected','',null);
			return;
		}
		var msg='Are you sure you want to delete these '+names.length+' scripts?';
		if (names.length==1) {
			msg='Are you sure you want to delete this script?';
		}
		mlutils.mlconfirm('Delete scripts?',msg,function(ok) {
			if (ok) {
				for (var i in names) {
					m_mls_manager.study().removeBatchScript(names[i]);
				}
				refresh();
			}
		});
	}

	function getResultsByScript() {
		var ret={};
		var script_names=m_mls_manager.study().batchScriptNames();
		for (var i in script_names) {
			var script_name=script_names[i];
			var J=m_script_job_lookup.job(script_name);
			if (J) {
				ret[script_name]=J.results();
			}
		}
		return ret;
	}

	function setResultsByScript(obj) {
		var ret={};
		var script_names=m_mls_manager.study().batchScriptNames();
		for (var i in script_names) {
			var script_name=script_names[i];
			if (obj[script_name]) {
				var dummy_job0=new BatchJob(null,m_mls_manager.lariClient());
				dummy_job0.setResults(obj[script_name]);
				dummy_job0.setIsCompleted(true);
				m_script_job_lookup.setJob(script_name,dummy_job0);
			}
		}
		m_script_widget.refreshResults();
	}
}

/*
function AltMLSWebModulesView(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('AltMLSWebModulesView');

	this.setMLSManager=function(manager) {setMLSManager(manager);};
	this.refresh=function() {refresh();};

	var m_web_module_list=new MLSWebModuleListWidget();
	var m_web_module_widget=new AltMLSWebModuleWidget();
	var m_mls_manager=null;
	var m_current_web_module_name='';

	var html=require('./altmlsmainwindow.html');
	O.div().append($(html).find('#template-AltMLSWebModulesView').children().clone());
	//O.div().append($('#template-AltMLSWebModulesView').children().clone());

	O.div().css({display:'flex',"flex-flow":"row"});

	O.div().find('#web_module_list').append(m_web_module_list.div());
	m_web_module_widget.div().addClass('h-100');
	O.div().find('#web_module_widget').append(m_web_module_widget.div());

	O.div().find("#add_web_module").click(add_web_module);

	m_web_module_list.onCurrentWebModuleChanged(update_current_web_module);

	function refresh() {
		m_web_module_list.refresh();
		update_current_web_module();
	}

	function update_current_web_module() {
		var web_module_name=m_web_module_list.currentWebModuleName();
		var P=m_mls_manager.study().webModule(web_module_name);
		m_web_module_widget.setWebModule(P,web_module_name);
		m_current_web_module_name=web_module_name;

		if (P) {
			P.onChanged(function() {
				if (web_module_name) {
					m_mls_manager.study().setWebModule(web_module_name,P);
				}
			});
		}
	}

	function setMLSManager(manager) {
		m_mls_manager=manager;
		m_web_module_list.setMLSManager(manager);
		m_web_module_list.refresh();
		m_web_module_widget.setMLSManager(manager);
		refresh();
	}

	function add_web_module() {
		var web_module_name=prompt('New web module name:');
		if (!web_module_name) return;
		m_mls_manager.study().setWebModule(web_module_name,new MLSWebModule());
		refresh();
		m_web_module_list.setCurrentWebModuleName(web_module_name);
	}
}
*/

function MLSOutputView(O) {
	O=O||this;
	
	var html=require('./altmlsmainwindow.html');
	JSQWidget(O,$(html).find('.MLSOutputView').clone());

	this.setMLSManager=function(manager) {setMLSManager(manager);};
	this.setBatchJob=function(job) {setBatchJob(job);};

	var m_mls_manager=null;
	var m_results_widget=new AltMLSBatchScriptResultsWidget();
	var m_jobs_widget=new MLSBatchScriptJobsWidget();
	var m_log_widget=new MLPLogWidget(null,true);

	m_log_widget.setMessageFilter(function(msg) {
		return true;
	});
	
	O.div().find('#results_widget').append(m_results_widget.div());
	O.div().find('#jobs_widget').append(m_jobs_widget.div());
	O.div().find('#log_widget').append(m_log_widget.div());
	
	m_results_widget.div().css({"font-size":"12px",height:"100%"});
	m_jobs_widget.div().css({"font-size":"12px",height:"100%"});

	function setMLSManager(manager) {
		m_mls_manager=manager;
		m_results_widget.setMLSManager(manager);
		m_jobs_widget.setMLSManager(manager);
	}

	function setBatchJob(job) {
		m_results_widget.setBatchJob(job);
		m_jobs_widget.setBatchJob(job);
	}
}

function ScriptJobLookup() {
	this.setJob=function(script_name,job) {setJob(script_name,job);};
	this.job=function(script_name) {return job(script_name);};

	var m_script_jobs={};

	function setJob(script_name,job) {
		m_script_jobs[script_name]=job;
	}

	function job(script_name) {
		return m_script_jobs[script_name]||null;
	}
}

