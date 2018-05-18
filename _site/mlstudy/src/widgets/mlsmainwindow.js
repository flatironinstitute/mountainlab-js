function MLSMainWindow(O,mls_manager) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLSMainWindow');

	this.setDocStorClient=function(DSC) {m_docstor_client=DSC; m_mls_manager.setDocStorClient(DSC);};
	this.loadFromDocStor=function(owner,title,callback) {loadFromDocStor(owner,title,callback);};
	this.loadFromFileContent=function(path,content,callback) {loadFromFileContent(path,content,callback);};
	this.loadFromBrowserStorage=function(title,callback) {loadFromBrowserStorage(title,callback);};
	this.setLoginInfo=function(info) {setLoginInfo(info);};
	this.mlsManager=function() {return m_mls_manager;};

	var m_mls_manager=mls_manager;
	var m_job_manager=new JobManager();
	//var m_processor_manager=new ProcessorManager();
	//var m_kulele_client=new KuleleClient();
	//m_kulele_client.setKuleleUrl(m_mls_manager.mlsConfig().kulele_url);
	m_mls_manager.setJobManager(m_job_manager);
	//m_mls_manager.setKuleleClient(m_kulele_client);
	var m_docstor_client=null;
	var m_file_source=''; //e.g., docstor
	var m_file_path=''; //when m_file_source=='file_content'
	var m_file_info={};

	//var server=m_mls_manager.mlsConfig().processing_server;
	//m_kulele_client.setProcessingServer(server);

	var m_datasets_view=new MLSDatasetsView();
	m_datasets_view.setParent(O);
	m_datasets_view.setMLSManager(m_mls_manager);

	/*
	var m_pipeline_modules_view=new MLSPipelineModulesView();
	m_pipeline_modules_view.setProcessorManager(m_processor_manager);
	m_pipeline_modules_view.setParent(O);
	m_pipeline_modules_view.setMLSManager(m_mls_manager);
	*/

	var m_batch_scripts_view=new MLSBatchScriptsView();
	//m_batch_scripts_view.setProcessorManager(m_processor_manager);
	m_batch_scripts_view.setParent(O);
	m_batch_scripts_view.setMLSManager(m_mls_manager);
	JSQ.connect(m_batch_scripts_view,'results_changed',O,update_menus);

	var m_home_view=new MLSHomeView();
	m_home_view.setParent(O);
	m_home_view.setMLSManager(m_mls_manager);
	JSQ.connect(m_home_view,'goto_view',O,function(sender,args) {
		goto_view(args.name);
	});

	var m_original_study_object={};
	var m_menu_bar=new MLMenuBar();
	var m_status_bar=new MLSStatusBar();
	//m_status_bar.setKuleleClient(m_kulele_client);
	//m_status_bar.setProcessorManager(m_processor_manager);
	m_status_bar.setMLSManager(m_mls_manager);
	m_menu_bar.setParent(O);
	m_status_bar.setParent(O);
	var m_current_view='study_home';

	var m_views={};
	m_views['study_home']=m_home_view;
	m_views['datasets']=m_datasets_view;
	//m_views['pipeline_modules']=m_pipeline_modules_view;
	m_views['batch_scripts']=m_batch_scripts_view;

	JSQ.connect(m_mls_manager.study(),'changed',O,update_menus);

	var home_button=create_home_button_element();
	home_button.attr('title','Return to overview');
	m_menu_bar.addButton(home_button,goto_overview);
	m_menu_bar.addSpacer();
	var goto_buttons={};
	goto_buttons['study_home']=m_menu_bar.addButton('Study home',function() {goto_view('study_home');});
	goto_buttons['datasets']=m_menu_bar.addButton('Datasets',function() {goto_view('datasets');});
	//goto_buttons['pipeline_modules']=m_menu_bar.addButton('Pipeline Modules',function() {goto_view('pipeline_modules');});
	goto_buttons['batch_scripts']=m_menu_bar.addButton('Scripts',function() {goto_view('batch_scripts');});

	m_menu_bar.addSpacer();
	m_menu_bar.addSpacer();

	// File menu //////////////////////////////////////
	var menu=m_menu_bar.addMenu('File',{downarrow:true});
	menu.addItem('New study',create_new_study);
	menu.addDivider();
	menu.addItem('Open study from browser...',open_study_browser);
	menu.addItem('Open study from cloud...',open_study_docstor);
	menu.addItem('Upload study from computer...',upload_study);
	menu.addDivider();
	var menu_item_save=menu.addItem('Save changes',save_changes);
	var menu_item_save_browser=menu.addItem('Save changes to browser as...',save_changes_browser);
	var menu_item_save_docstor=menu.addItem('Save changes to cloud as...',save_changes_docstor);
	var menu_item_download_study=menu.addItem('Download study to computer...',download_study);
	menu.addDivider();
	var menu_item_share_study=menu.addItem('Share study...',share_study);
	///////////////////////////////////////////////////

	m_menu_bar.addSpacer();
	m_menu_bar.addSpacer();

	// Tools menu //////////////////////////////////////
	var menu=m_menu_bar.addMenu('Tools',{downarrow:true});
	menu.addItem('Set processing server...',set_processing_server);
	menu.addDivider();
	menu.addItem('Log in...',log_in);
	menu.addDivider();
	menu.addItem('Generate kbucket upload token',generate_kbucket_upload_token);
	///////////////////////////////////////////////////

	JSQ.connect(m_batch_scripts_view,'download_kbucket_file_from_prv',O,function(sender,args) {
		download_kbucket_file_from_prv(args.prv);
	});

	JSQ.connect(m_datasets_view,'download_kbucket_file_from_prv',O,function(sender,args) {
		download_kbucket_file_from_prv(args.prv);
	});

	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var W=O.width();
		var H=O.height();

		var top_height=50;
		var bottom_height=33;
		var marg=10;

		m_menu_bar.setGeometry(marg,0,W-marg*2,top_height);
		for (var name in m_views) {
			m_views[name].setGeometry(0,top_height,W,H-top_height-bottom_height);
			if (name==m_current_view)
				m_views[name].show();
			else
				m_views[name].hide();
		}
		m_status_bar.setGeometry(marg,H-bottom_height,W-marg*2,bottom_height);
	}

	function loadFromDocStor(owner,title,callback) {
		download_document_content_from_docstor(m_docstor_client,owner,title,function(err,content,doc_id) {
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
	        set_original_study_object(get_mls_object());
	        callback(null);
		});
	}

	function refresh_views() {
		for (var name in m_views) {
			if (m_views[name].refresh)
				m_views[name].refresh();
		}
	}

	function loadFromFileContent(path,content,callback) {
		var obj=try_parse_json(window.mls_file_content);
        if (!obj) {
        	console.log (window.mls_file_content);
            callback('Unable to parse mls file content');
            return;
        }
        set_mls_object(obj);
        refresh_views();
        m_file_source='file_content';
        m_file_path=path;
        set_original_study_object(get_mls_object());
        callback(null);
	}

	function loadFromBrowserStorage(title,callback) {
		var LS=new LocalStorage();
		var obj=LS.readObject('mlstudy--'+title);
		if (!obj) {
			obj={};
		}
		set_mls_object(obj);
		refresh_views();
		set_file_info('browser_storage',{title:title});
        set_original_study_object(get_mls_object());
        callback(null);
	}

	function save_changes() {
		if (m_file_source=='docstor') {
			save_changes_docstor({prompt:false});
		}
		else if (m_file_source=='browser_storage') {
			save_changes_browser({prompt:false});
		}
		else if (m_file_source=='file_content') {
			save_changes_file_content({prompt:false});
		}
		else if (m_file_source==='') {
			if (m_mls_manager.user())
				save_changes_docstor({prompt:true});
			else
				save_changes_browser({prompt:true});
		}
		else {
			alert('Unexpected file source: '+m_file_source);
		}
	}

	function get_mls_object() {
		var obj=m_mls_manager.study().object();
		obj.results_by_script=m_batch_scripts_view.getResultsByScript();
		return obj;
	}

	function set_mls_object(obj) {
		m_mls_manager.setMLSObject(obj);
		m_batch_scripts_view.setResultsByScript(obj.results_by_script||{});
	}

	function save_changes_browser(opts) {
		if (!opts) opts={};
		if (!('prompt' in opts)) opts.prompt=true;
		var title=m_file_info.title||'default.mls';
		if (opts.prompt) {
			title=prompt('Saving to browser. Title of document:',title);
			if (!title) return;
		}
		var obj=get_mls_object();
		var content=JSON.stringify(obj,null,4);
		var LS=new LocalStorage();
		LS.writeObject('mlstudy--'+title,obj);
		set_file_info('browser_storage',{title:title});
		set_original_study_object(obj);
		alert('Changes saved to browser document: '+m_file_info.title);
	}
	function save_changes_docstor(opts) {
		if (!opts) opts={};
		if (!('prompt' in opts)) opts.prompt=true;
		var owner=m_file_info.owner||m_mls_manager.user();
		var title=m_file_info.title||'study.mls';
		if (opts.prompt) {
			owner=prompt('Saving to cloud. Owner of document:',owner);
			if (!owner) return;
			title=prompt('Saving to cloud. Title of document:',title);
			if (!title) return;
		}
		var obj=get_mls_object();
		var content=JSON.stringify(obj,null,4);
		set_document_content_to_docstor(m_docstor_client,owner,title,content,function(err) {
			if (err) {
				alert('Unable to save document: '+err);
				return;
			}
			set_file_info('docstor',{owner:owner,title:title});
			set_original_study_object(obj);
			alert('Changes saved to cloud document: '+m_file_info.title+' ('+owner+')');
		});
	}
	function save_changes_file_content() {
		var obj=get_mls_object();
		var content=JSON.stringify(obj,null,4);
		download(content,'',m_file_path);
		set_original_study_object(obj);
		alert('Changes save to '+m_file_path);
	}

	function create_new_study() {
		check_proceed_without_saving_changes(create_new_study_2);
		function create_new_study_2() {
			set_mls_object({});
			refresh_views();
			set_file_info('',{});
		}
	}

	function select_document_from_browser_storage(callback) {
		var dlg=new DocSelectDialog();
		dlg.setOptions({source:'browser_storage'});
		dlg.show();
		dlg.onSelected(function() {
			var doc0=dlg.selection();
			callback(doc0);
		});
	}

	function select_document_from_docstor(callback) {
		var dlg=new DocSelectDialog();
		dlg.setDocStorClient(m_docstor_client);
		dlg.setOptions({source:'docstor',owner:m_mls_manager.user(),user:m_mls_manager.user(),filter:'*.mls'});
		dlg.show();
		dlg.onSelected(function() {
			var doc0=dlg.selection();
			callback(doc0);
		});
	}

	function goto_overview() {
		check_proceed_without_saving_changes(function() {
			O.emit('goto_overview');
			reset_url();
		});
	}

	function goto_view(name) {
		if (name==m_current_view) return;
		m_current_view=name;
		update_menus();
		update_layout();
	}

	function set_processing_server() {
		var config=m_mls_manager.mlsConfig();
		var server=config.processing_server;
		server=prompt('Processing server:',server);
		if (!server) return;
		config.processing_server=server;
		m_mls_manager.setMLSConfig(config);
		//m_kulele_client.setProcessingServer(server);
		update_processor_spec();
		refresh_views();
	}

	function log_in() {
		O.emit('log_in');
	}

	function generate_kbucket_upload_token() {
		var duration=prompt('Duration (sec):');
		if (!duration) return;
		duration=Number(duration);
		var kbucketauth_url=m_mls_manager.kBucketAuthUrl();
		
		var CC=new KBucketAuthClient();
		CC.setKBucketAuthUrl(kbucketauth_url);
		CC.getAuth('upload',m_mls_manager.loginInfo(),{duration_sec:duration},function(err,token) {
			if (err) {
				alert(err);
				return;
			}
			console.log (token);
			alert('The token has been written to the developer console.');
		});
	}

	function create_home_button_element() {
		return $('<a class="back-icon" href="#">'
  					+'<div class="back-icon__row">'
    				+'<div class="back-icon__elem"></div>'
    				+'<div class="back-icon__elem"></div>'
    				+'<div class="back-icon__elem"></div>'
  				+'</div>'
   				+'<div class="back-icon__row">'
    				+'<div class="back-icon__elem"></div>'
    				+'<div class="back-icon__elem"></div>'
    				+'<div class="back-icon__elem"></div>'
  				+'</div>'
  				+'<div class="back-icon__row">'
    				+'<div class="back-icon__elem"></div>'
    				+'<div class="back-icon__elem"></div>'
    				+'<div class="back-icon__elem"></div>'
  				+'</div>'
				+'</a>');
	}

	function open_study_browser() {
		check_proceed_without_saving_changes(open_study_browser_2);
		function open_study_browser_2() {

			/*
			var title='';
			if (m_file_source=='browser_storage')
				title=m_file_info.title;
			title=prompt('Title of document:',title);
			if (!title) return;
			*/

			select_document_from_browser_storage(function(doc0) {
				var title=doc0.title;
				var LS=new LocalStorage();
				var obj=LS.readObject('mlstudy--'+title);
				if (!obj) {
					alert('Unable to read study from browser storage: '+title);
					return;
				}
				loadFromBrowserStorage(title,function(err) {
					if (err) alert(err);
				});
			});
		}
	}

	function upload_study() {
		check_proceed_without_saving_changes(upload_study_2);
		function upload_study_2() {
			var UP=new FileUploader();
			UP.uploadTextFile({},function(tmp) {
				if (!tmp.success) {
					alert('Unexpected problem: '+tmp.error);
					return;
				}
				var obj=jsu_parse_json(tmp.text);
				if (!obj) {
					alert('Error parsing json content');
					return;
				}
				set_mls_object(obj);
				refresh_views();
				set_file_info('',{});
		        set_original_study_object(get_mls_object());
			});
		}
	}

	function open_study_docstor() {
		check_proceed_without_saving_changes(open_study_docstor_2);
		function open_study_docstor_2() {

			/*
			var owner=m_mls_manager.user();
			var title='';
			if (m_file_source=='docstor') {
				owner=m_file_info.owner||m_mls_manager.user();
				title=m_file_info.title;
			}
			owner=prompt('Owner of document:',owner);
			if (!owner) return;
			title=prompt('Title of document:',title);
			if (!title) return;
			*/

			select_document_from_docstor(function(doc0) {
				loadFromDocStor(doc0.owner,doc0.title,function(err) {
					if (err) alert(err);
				});
			});
		}
	}

	function check_proceed_without_saving_changes(callback) {
		if (!is_modified()) {
			callback();
			return;
		}
		var resp=confirm('Proceed without saving changes?');
		if (!resp) {
			return;
		}
		callback();
	}

	//JSQ.connect(m_top_widget,'download_study',O,download_study);
	function download_study() {
		var obj=get_mls_object();
		var content=JSON.stringify(obj,null,4);
		if (m_file_source=='docstor') {
			fname=m_file_info.title;
		}
		else if (m_file_source=='browser_storage') {
			fname=m_file_info.title;
		}
		else {
			fname=m_file_path;
		}
		download(content,fname);
	}

	function share_study() {
		var dlg=new DocShareDialog();
		dlg.setDocStorClient(m_docstor_client);
		dlg.setDocumentInfo(m_file_info);
		dlg.show();
	}

	function setLoginInfo(info) {
		m_mls_manager.setLoginInfo(info);
		/*
		var opts=JSQ.clone(info);
		opts.processing_server=m_kulele_client.processingServer();
		m_kulele_client.login(opts,function(tmp) {
			if (!tmp.success) {
				console.error('Error logging in to kulele: '+tmp.error);
				return;
			}
			update_processor_spec();
		});
		*/
	}

	function update_processor_spec() {
		/*
		m_processor_manager.setSpec({});
		m_processor_manager.setSpecHasBeenSet(false);
		var server_before=m_kulele_client.processingServer();
		m_kulele_client.getProcessorSpec(function(tmp1) {
			if (!tmp1.success) {
				console.error('Error getting processor spec: '+tmp1.error);
				return;
			}
			if (m_kulele_client.processingServer()!=server_before) {
				//the processing server has changed, so do don't update.
				return;
			}
			m_processor_manager.setSpec(tmp1.spec);
		});
		*/
		//m_processor_manager.setSpec({});
		//m_processor_manager.setSpecHasBeenSet(true);
	}


	function set_original_study_object(obj) {
		m_original_study_object=JSQ.clone(obj);
		update_menus();
	}

	function is_modified() {
		return (JSON.stringify(m_original_study_object)!=JSON.stringify(get_mls_object()));
	}

	function update_menus() {
		menu_item_save.setDisabled(false);
		menu_item_save_browser.setDisabled(false);
		menu_item_save_docstor.setDisabled(false);
		if (!is_modified()) {
			menu_item_save.setDisabled(true);
			if (m_file_source=='browser_storage')
				menu_item_save_browser.setDisabled(false);
			if (m_file_source=='docstor')
				menu_item_save_docstor.setDisabled(false);
		}

		menu_item_share_study.setDisabled(false);
		if (m_file_source!='docstor') {
			menu_item_share_study.setDisabled(true);
		}

		for (var name in goto_buttons) {
			goto_buttons[name].removeClass('current_view_button');
			goto_buttons[name].removeClass('noncurrent_view_button');
			if (name==m_current_view) {
				goto_buttons[name].addClass('current_view_button');
			}
			else {
				goto_buttons[name].addClass('noncurrent_view_button');	
			}
		}
	}

	function set_file_info(source,info) {
		m_file_source=source;
		m_file_info=JSQ.clone(info);
		m_status_bar.setFileInfo(source,info);
		m_home_view.setFileInfo(source,info);
		update_url();
	}

	function reset_url() {
		var query=parse_url_params0();
		var querystr='';
		if ('passcode' in query) {
			querystr+='&passcode='+query.passcode;
		}
		if ('login' in query) {
			querystr+='&login='+query.login;
		}
		try {
			history.pushState(null, null, '?'+querystr);
		}
		catch(err) {
			console.log ('Unable to update url');
		}
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

	//todo: this is probably no longer used. remove references and signals that are associated
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
	}

	function get_file_name_from_path(path) {
		var aaa=path.lastIndexOf('/');
		if (aaa>=0) return path.slice(aaa+1);
		else return path;
	}

	update_layout();
}

function MLSStatusBar(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLSStatusBar');

	this.setFileInfo=function(source,info) {setFileInfo(source,info);};
	//this.setKuleleClient=function(KC) {m_kulele_client=KC;};
	//this.setProcessorManager=function(PM) {m_processor_manager=PM;};
	this.setMLSManager=function(manager) {setMLSManager(manager);};

	var m_file_source='';
	var m_file_info={};
	var m_processor_manager=null;
	var m_mls_manager=null;
	//var m_kulele_client=null;

	O.div().append('<span id=file_info></span> | Processing server: <span id=processing_server_info></span>');

	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var W=O.width();
		var H=O.height();
		
		//m_content.css({position:'absolute',left:0,top:0,width:W,height:H});
	}

	function setMLSManager(manager) {
		m_mls_manager=manager;
		manager.onConfigChanged(refresh);
	}

	function setFileInfo(source,info) {
		m_file_source=source;
		m_file_info=JSQ.clone(info);
		refresh();
	}

	function refresh() {
		var str='';
		if (m_file_source=='browser_storage')
			str='Browser document: '+(m_file_info.title||'');
		else if (m_file_source=='docstor')
			str='Cloud document: '+m_file_info.title+' ('+m_file_info.owner+')';
		O.div().find('#file_info').html(str);

		if (m_mls_manager) {
			var config=m_mls_manager.mlsConfig();
			var processing_server=config.processing_server||'<none>';	
			O.div().find('#processing_server_info').html(processing_server);
		}

		/*
		if ((m_kulele_client)&&(m_processor_manager)) {
			var server=m_kulele_client.processingServer();
			var num_processors=m_processor_manager.numProcessors();
			var str=`Processing server: ${server} (${num_processors} processors)`;
			O.div().find('#processing_server_info').html(str);
		}
		*/
	}

	function periodic_refresh() {
		refresh();
		setTimeout(periodic_refresh,1000);
	}
	periodic_refresh();

	update_layout();
}

/*
function MLSTopWidget(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLSTopWidget');

	this.setOriginalStudyObject=function(obj) {m_original_study_object=JSQ.clone(obj); refresh();};
	this.setMLSManager=function(M) {setMLSManager(M);};
	this.refresh=function() {refresh();};

	var m_original_study_object={};
	var m_mls_manager=null;
	var m_content=$('<div><button id=save_changes>Save changes</button></div>');
	if (window.mlpipeline_mode!='local') {
		var link0=$('<button>Download study</button>');
		m_content.append(link0);
		link0.click(function() {O.emit('download_study');});
	}
	O.div().append(m_content);

	m_content.find('#save_changes').click(function() {
		O.emit('save_changes');
	});

	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var W=O.width();
		var H=O.height();
		
		m_content.css({position:'absolute',left:0,top:0,width:W,height:H});
	}

	function setMLSManager(M) {
		m_mls_manager=M; 
		JSQ.connect(M.study(),'changed',O,refresh);
		refresh();
	}

	function refresh() {
		//m_content.find('#title').html(m_dataset_id);
		if (is_modified()) {
			m_content.find('#save_changes').removeAttr('disabled');
		}
		else {
			m_content.find('#save_changes').attr('disabled','disabled');	
		}
	}

	function is_modified() {
		var obj1=m_original_study_object;
		var obj2=m_mls_manager.study().object();
		return (JSON.stringify(obj1)!=JSON.stringify(obj2));
	}

	update_layout();
}
*/