exports.AltMLSOverviewWindow=AltMLSOverviewWindow;
exports.AdvancedConfigurationWidget=AdvancedConfigurationWidget;

var JSQWidget=require('../mlscore/jsqcore/jsqwidget.js').JSQWidget;
var MLTableWidget=require('./mltablewidget.js').MLTableWidget;
var ProcessingServerWidget=require('./processingserverwidget.js').ProcessingServerWidget;
var FileUploader=require('../mlscore/jsutils/fileuploader.js').FileUploader;
var mlutils=require('../mlscore/mlutils.js');
var jsutils=require('../mlscore/jsutils/jsutils.js');

require('./altmlsoverviewwindow.css');

function AltMLSOverviewWindow(O) {
	O=O||this;

	var html=require('./altmlsoverviewwindow.html');
	JSQWidget(O,$(html).find(".AltMLSOverviewWindow").clone());

	this.setMLSManager=function(manager) {setMLSManager(manager);};
	this.setDocStorClient=function(DSC) {m_study_list_widget.setDocStorClient(DSC);};
	this.refresh=function() {refresh_study_list_widget();};
	this.setLoginInfo=function(info) {m_study_list_widget.setLoginInfo(info);};

	var m_study_list_widget=new StudyListWidget();
	var m_processing_server_widget=new ProcessingServerWidget();
	var m_advanced_configuration_widget=new AdvancedConfigurationWidget();
	var m_mls_manager=null;

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

	O.div().find('#study_list').append(m_study_list_widget.div());
	O.div().find('#processing_server').append(m_processing_server_widget.div());
	O.div().find('#advanced_configuration').append(m_advanced_configuration_widget.div());

	O.div().find('.action_sign_in').click(sign_in);
	O.div().find('.action_sign_out').click(sign_out);

	function setMLSManager(manager) {
		m_mls_manager=manager; 
		m_processing_server_widget.setMLSManager(manager);
		m_advanced_configuration_widget.setMLSManager(manager);
	}

	function current_content_id() {
		var active_item=O.div().find('.bd-toc-item ul > li.active').first();
		var content_id=active_item.attr('data-content-id');
		return content_id;
	}

	function current_study_list_mode() {
		var active_item=O.div().find('.bd-toc-item ul > li.active').first();
		var study_list_mode=active_item.attr('data-study-list-mode');
		return study_list_mode;
	}

	function update_visible_content() {
		var content_id=current_content_id();
		O.div().find('#content .tab-pane').removeClass('show active');
		O.div().find('#content .tab-pane#'+content_id).addClass('show active');
		//todo: only do the following line when necessary
		refresh_study_list_widget();
	}

	JSQ.connect(m_study_list_widget,'open_study',O,'open_study');
	JSQ.connect(m_study_list_widget,'open_workspace',O,'open_workspace');

	function refresh_study_list_widget() {
		var study_list_mode=current_study_list_mode();
		if (study_list_mode) {
			m_study_list_widget.setMode(study_list_mode);	
		}
	}

	function sign_in() {
		O.emit('log_in');
	}

	function sign_out() {
		mlutils.mlinfo('Not yet implemented','Sign out - not yet implemented');
	}
}

function StudyListWidget(O) {
	O=O||this;
	
	var html=require('./altmlsoverviewwindow.html');
	JSQWidget(O,$(html).find('.StudyListWidget').clone());

	this.setDocStorClient=function(DSC) {m_docstor_client=DSC;};
	this.clear=function() {clear();};
	this.setMode=function(mode) {setMode(mode);};
	this.setLoginInfo=function(info) {m_login_info=JSQ.clone(info); refresh();};

	var m_docstor_client=null;
	var m_studies=[];
	var m_table=new MLTableWidget();
	m_table.setSelectionMode('multiple');
	var m_login_info={};
	var m_mode='';
	m_table.setParent(O);
	
	/*
	var m_menu_bar=new MLMenuBar();
	var menu=m_menu_bar.addMenu('...');
	var menu_item_add_label=menu.addItem('Add label...',add_label);
	var menu_item_remove_label=menu.addItem('Remove label...',remove_label);
	menu.addDivider();
	var menu_item_share_with=menu.addItem('Share with...',share_with);
	var menu_item_unshare_with=menu.addItem('Unshare with...',unshare_with);
	menu.addDivider();
	var menu_item_delete=menu.addItem('Delete selected studies...',delete_selected_studies);
	//m_menu_bar.setParent(O);
	*/

	O.div().find('#add_label').click(add_label);
	O.div().find('#remove_label').click(remove_label);
	O.div().find('#share_with').click(share_with);
	O.div().find('#unshare_with').click(unshare_with);
	O.div().find('#delete_selected_studies').click(delete_selected_studies);
	update_menus();

	O.div().find('#create_new_study').click(create_new_study);
	O.div().find('#upload_study').click(upload_study);
	O.div().find('#create_new_workspace').click(create_new_workspace);
	O.div().find('#upload_workspace').click(upload_workspace);

	O.div().append(m_table.div());

	JSQ.connect(m_table,'selected_rows_changed',O,update_menus);

	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var W=O.width();
		var H=O.height();
		var H1=80;
		var Hmenu=60;
		xmarg=20;
		//m_menu_bar.setGeometry(xmarg,H1,W-xmarg*2,Hmenu)
		//m_table.setGeometry(xmarg,H1+Hmenu,W-xmarg*2,H-H1-Hmenu);
	}

	function clear() {
		m_studies=[];
		set_alert(null);
		refresh();
	}

	function set_heading(heading) {
		O.div().find('#heading').html(heading);
	}

	function set_alert(alert_type,message) {
		var elmt=O.div().find('#alert');
		elmt.empty();
		if (alert_type) {
			elmt.append(`
				<div class="alert alert-${alert_type}">
  					${message}
				</div>
			`);
		}
	}

	function get_selected_document_ids_list() {
		var rows=m_table.selectedRows();
		var ret=[];
		for (var i=0; i<rows.length; i++) {
			ret.push(rows[i].study.document_id);
		}
		return ret;
	}

	function remove_label() {
		add_label2(true);
	}

	function add_label() {
		add_label2(false);
	}

	function add_label2(do_remove) {
	    var DC=m_docstor_client;
	    var ids=get_selected_document_ids_list();
	    if (ids.length==0) {
	      alert('No studies selected.');
	      return;
	    }
	    var str='Add label:';
	    if (do_remove) str='Remove label:';
	    var label0=prompt(str);
	    if (!label0) return;
	    foreach_async(ids,function(id,cb) {
	      DC.getDocument(id,{include_content:false},function(err,doc0) {
	        if (err) {
	          refresh();
	          set_alert('warning',err);
	          return;
	        }
	        var attr0=doc0.attributes||{};
	        var labels0=attr0.labels||{};
	        var new_labels0={};
	        var already_contains=false;
	        for (var label1 in labels0) {
	          if (label1==label0) {
	            already_contains=true;
	            if (!do_remove)
	              new_labels0[label1]=1;
	          }
	          else {
	            new_labels0[label1]=1;
	          }
	        }
	        labels0=new_labels0;
	        if (already_contains) {
	          if (!do_remove) {
	            cb();
	            return;
	          }
	        }
	        if (!do_remove) {
	          labels0[label0]=1;
	        }
	        attr0.labels=labels0; 
	        m_docstor_client.setDocument(doc0._id,{attributes:attr0},function(err) {
	          if (err) {
	            refresh();
	            set_alert('warning',err);
	          }
	          else cb();
	        });  
	      });
	    },function() {
	      refresh();
	    });
	}

	function share_with() {
		share_with2(false);
	}

	function unshare_with() {
		share_with2(true);
	}

	function share_with2(do_unshare) {
	    var DC=m_docstor_client;
	    var ids=get_selected_document_ids_list();
	    if (ids.length==0) {
	      alert('No studies selected.');
	      return;
	    }
	    var str='Share with user:';
	    if (do_unshare) str='Unshare with user:';
	    var user_id0=prompt(str);
	    if (!user_id0) return;
	    foreach_async(ids,function(id,cb) {
	      DC.getDocument(id,{include_content:false},function(err,doc0) {
	        if (err) {
	          refresh();
	          set_alert('warning',err);
	          return;
	        }
	        var per0=doc0.permissions||{};
	        var users0=per0.users||[];
	        var new_users0=[];
	        var already_sharing=false;
	        for (var i in users0) {
	          if (users0[i].id==user_id0) {
	            already_sharing=true;
	            if (!do_unshare)
	              new_users0.push(users0[i]);
	          }
	          else {
	            new_users0.push(users0[i]);
	          }
	        }
	        users0=new_users0;
	        if (already_sharing) {
	          if (!do_unshare) {
	            cb();
	            return;
	          }
	        }
	        if (!do_unshare) {
	          users0.push({id:user_id0,read:true,write:true});
	        }
	        per0.users=users0; 
	        m_docstor_client.setDocument(doc0._id,{permissions:per0},function(err) {
	          if (err) {
	            refresh();
	            set_alert('warning',err);
	          }
	          else cb();
	        });  
	      });
	    },function() {
	      refresh();
	    });
	}

	function foreach_async(list,func,callback) {
		var index=0;
		do_next();
		function do_next() {
			if (index>=list.length) {
			  callback(null);
			  return;
			}
			func(list[index],function() {
			  index++;
			  do_next();
			});
		}
	}

	function delete_selected_studies() {
		var rows=m_table.selectedRows();
		if (rows.length==0) {
			alert('No studies selected');
			return;
		}
		if (!confirm('Delete these '+rows.length+' studies?'))
			return;
		var ids=[];
		for (var i=0; i<rows.length; i++) {
			ids.push(rows[i].study.document_id);
		}
		m_docstor_client.removeDocuments(ids,function(err) {
			if (err) {
				set_alert('warning','Error removing documents: '+err);
				refresh();upload_study
				return;
			}
			refresh();
		});
	}

	function upload_workspace() {
		upload_study('workspace');
	}

	function try_parse_json(txt) {
		try {
			return JSON.parse(txt);
		}
		catch(err) {
			return null;
		}
	}

	function upload_study(mode) {
		mode=mode||'study';
		var ext='.mls';
		if (mode=='workspace') ext='.mlw';
		var UP=new FileUploader();
		UP.uploadTextFile({},function(tmp) {
			if (!tmp.success) {
				set_alert('warning',tmp.error);
				return;
			}
			var obj=try_parse_json(tmp.text);
			if (!obj) {
				set_alert('warning','Error parsing json');
				return;
			}
			var fname=tmp.file_name;
			if (!jsutils.ends_with(fname,ext))
				fname+=ext;
			var opts={
				owner:m_login_info.user_id,
				content:JSON.stringify(obj),
				attributes:{title:fname}
			}
			m_docstor_client.createDocument(opts,function(err) {
				if (err) {
					set_alert('warning',err);
					return;
				}
				//O.emit('open_study',{study:{owner:opts.owner,title:opts.attributes.title}});
				refresh();
			});
		});
	}

	function create_new_workspace() {
		create_new_study('workspace');
	}

	function create_new_study(mode) {
		mode=mode||'study';
		var ext='.mls';
		if (mode=='workspace') ext='.mlw';
		mlutils.mlprompt('Create new '+mode,'Enter title of new '+mode+':','untitled'+ext,function(title0) {
			if (!jsutils.ends_with(title0,ext)) {
				title0+=ext;
			}
			if ((m_mode=='my_studies')||(m_mode=='my_workspaces')) {
				var opts={
					owner:m_login_info.user_id,
					content:'{}',
					attributes:{title:title0}
				}
				m_docstor_client.createDocument(opts,function(err) {
					if (err) {
						set_alert('warning',err);
						return;
					}
					//O.emit('open_study',{study:{owner:opts.owner,title:opts.attributes.title}});
					refresh();
				});
			}
			else {
				alert('Not yet implemented.');
			}
		});
	}

	function setMode(mode) {
		if (m_mode==mode) return;
		m_mode=mode;
		refresh();
	}

	function refresh() {
		var mode=m_mode;
		set_heading('');
		if (mode=='public_studies')
			set_alert('info','Loading public studies...');
		else if (mode=='my_studies')
			set_alert('info','Loading studies...');
		else if (mode=='studies_shared_with_me')
			set_alert('info','Loading studies...');
		else if (mode=='public_workspaces')
			set_alert('info','Loading public workspaces...');
		else if (mode=='my_workspaces')
			set_alert('info','Loading workspaces...');
		else if (mode=='workspaces_shared_with_me')
			set_alert('info','Loading workspaces...');

		O.div().find('#create_new_study').css({visibility:'hidden'});
		O.div().find('#upload_study').css({visibility:'hidden'});
		O.div().find('#create_new_workspace').css({visibility:'hidden'});
		O.div().find('#upload_workspace').css({visibility:'hidden'});

		if ((mode=='my_studies')||(mode=='on_this_browser')) {
			O.div().find('#create_new_study').css({visibility:''});
			O.div().find('#upload_study').css({visibility:''});
		}
		else if (mode=='my_workspaces') {
			O.div().find('#create_new_workspace').css({visibility:''});
			O.div().find('#upload_workspace').css({visibility:''});
		}
		else {
			
		}

		m_studies=[];
		update_table();

		var client=m_docstor_client;

		var obj={};
		if (mode=='') {
			update_table();
			return;
		}
		else if (mode=='public_studies') {
			obj={
				shared_with:'[public]',
				filter:'*.mls label:public'
			};
		}
		else if (mode=='my_studies') {
			obj={
				owned_by:m_login_info.user_id,
				filter:'*.mls'
			};
		}
		else if (mode=='studies_shared_with_me') {
			obj={
				shared_with:m_login_info.user_id,
				filter:'*.mls'
			};	
		}
		else if (mode=='public_workspaces') {
			obj={
				shared_with:'[public]',
				filter:'*.mlw label:public'
			};
		}
		else if (mode=='my_workspaces') {
			obj={
				owned_by:m_login_info.user_id,
				filter:'*.mlw'
			};
		}
		else if (mode=='workspaces_shared_with_me') {
			obj={
				shared_with:m_login_info.user_id,
				filter:'*.mlw'
			};	
		}
		else {
			set_alert('Unexpected mode: '+mode);
			return;
		}
		client.findDocuments(obj,function(err,docs) {
			if (mode!=m_mode) return;
			if (err) {
				set_alert('warning','Error loading documents from cloud: '+err);
				return;
			}
			var docs0=[];
			for (var i in docs) {
				var doc0=docs[i];
				var shared_with=[];
				var users=(doc0.permissions||{}).users||[];
				var labels=Object.keys((doc0.attributes||{}).labels||{});
				for (var i=0; i<users.length; i++) {
					shared_with.push(users[i].id);
				}
				var study0={
					owner:(doc0.permissions||{}).owner||'',
					title:(doc0.attributes||{}).title||'',
					document_id:doc0._id,
					shared_with:shared_with,
					labels:labels
				};
				m_studies.push(study0);
			}
			if (mode=='public_studies')
				set_heading('Public studies');
			else if (mode=='my_studies')
				set_heading('My studies');
			else if (mode=='studies_shared_with_me')
				set_heading('Studies shared with me');
			else if (mode=='public_workspaces')
				set_heading('Public workspaces');
			else if (mode=='my_workspaces')
				set_heading('My workspaces');
			else if (mode=='workspaces_shared_with_me')
				set_heading('Workspaces shared with me');
			set_alert(null);
			update_table();
		});
	}

	function update_table() {
		m_table.clearRows();

		m_table.setColumnCount(4);
		m_table.headerRow().cell(0).html('Study');
		m_table.headerRow().cell(1).html('Owner');
		m_table.headerRow().cell(2).html('Shared with');
		m_table.headerRow().cell(3).html('Labels');
		for (var i=0; i<m_studies.length; i++) {
			var study0=m_studies[i];
			var row=create_study_row(study0)
			m_table.addRow(row);
		}
		update_menus();
	}

	function update_menus() {
		var list=[
			'add_label','remove_label',
			'share_with','unshare_with',
			'delete_selected_studies'
		];
		for (var i in list) {
			O.div().find('#'+list[i]).addClass('disabled');
			O.div().find('#'+list[i]).removeAttr('href');
		}
		if (m_mode=='my_studies') {
			if (m_table.selectedRows().length>0) {
				for (var i in list) {
					O.div().find('#'+list[i]).removeClass('disabled');
					O.div().find('#'+list[i]).attr('href','#');
				}
			}
		}	
	}

	function create_study_row(study0) {
		var row=m_table.createRow();
		row.study=study0;

		var elmt=$('<a href=#>'+(study0.title||'[untitled]')+'</a>');
		elmt.click(function() {
			if (jsutils.ends_with(study0.title,'.mls'))
				open_study(study0);
			else if (jsutils.ends_with(study0.title,'.mlw'))
				open_workspace(study0);
			else
				console.error('Unexpected file name extension: '+study0.title);
		});
		row.cell(0).append(elmt);
		row.cell(1).html(study0.owner);

		var share_elmt=$('<span><span class="edit_button octicon octicon-pencil"></span> <span id=users></span></span>');
		share_elmt.find('#users').html(study0.shared_with.join(', '));
		share_elmt.find('.edit_button').click(function() {
			edit_sharing(study0);
		});
		if (m_mode=='my_studies') {
			//keep it
		}
		else {
			share_elmt.find('.edit_button').remove();
		}
		row.cell(2).append(share_elmt);

		var labels_elmt=$('<span></span>');
		labels_elmt.html(study0.labels.join(', '));
		row.cell(3).append(labels_elmt);

		return row;
	}

	function edit_sharing(study0) {
		alert('not implemented');
	}

	function open_study(study0) {
		O.emit('open_study',{study:study0});
	}

	function open_workspace(workspace0) {
		O.emit('open_workspace',{workspace:workspace0});
	}

	update_layout();
	refresh();
}

function AdvancedConfigurationWidget(O) {
	O=O||this;
	
	var html=require('./altmlsoverviewwindow.html');
	JSQWidget(O,$(html).find('.AdvancedConfigurationWidget').clone());

	this.setMLSManager=function(manager) {setMLSManager(manager);};
	this.refresh=function() {refresh();};
	
	O.div().find('#update_configuration').click(update_configuration);
	O.div().find('#generate_kbucket_upload_token').click(generate_kbucket_upload_token);

	function refresh() {
		var config=m_mls_manager.mlsConfig();
		for (var key in config) {
			var elmt=O.div().find('#'+key);
			if (elmt.length==1)
				elmt.val(config[key]);
		}
	}

	function setMLSManager(manager) {
		m_mls_manager=manager;
		manager.onConfigChanged(refresh);
		refresh();
	}
	
	function update_configuration() {
		var config=m_mls_manager.mlsConfig();
		for (var key in config) {
			var elmt=O.div().find('#'+key);
			if (elmt.length==1)
				config[key]=elmt.val();
		}
		m_mls_manager.setMLSConfig(config);	
		refresh();
		mlutils.mlinfo('Configuration saved.','Configuration saved. You should now reload the page.',function() {

		});
	}

	function generate_kbucket_upload_token() {
		mlutils.mlinfo('Not yet implemented.','Not yet implemented');
	}
}