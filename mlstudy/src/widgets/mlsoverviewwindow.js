function MLSOverviewWindow(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLSOverviewWindow');

	this.setDocStorClient=function(DSC) {m_right_window.setDocStorClient(DSC);};
	this.refresh=function() {refresh_right_window();};
	this.setLoginInfo=function(info) {m_right_window.setLoginInfo(info);};

	var m_left_window=new MLSOverviewLeftWindow();
	var m_right_window=new MLSOverviewRightWindow();
	m_left_window.setParent(O);
	m_right_window.setParent(O);

	JSQ.connect(m_right_window,'open_study',O,'open_study');

	JSQ.connect(m_left_window,'selection_changed',O,refresh_right_window);

	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var W=O.width();
		var H=O.height();

		var xmarg=5;
		var xspace=20;
		var ymarg=15;

		var W1=200;
		var W2=W-xmarg*2-xspace-W1;

		m_left_window.setGeometry(xmarg,0,W1,H);
		m_right_window.setGeometry(xmarg+W1+xspace,ymarg,W2,H-ymarg*2);
	}

	function refresh_right_window() {
		var sel=m_left_window.currentSelection();
		m_right_window.setMode(sel);
	}

	update_layout();
}

function MLSOverviewRightWindow(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLSOverviewRightWindow');

	this.setDocStorClient=function(DSC) {m_docstor_client=DSC;};
	this.clear=function() {clear();};
	this.setMode=function(mode) {setMode(mode);};
	this.setLoginInfo=function(info) {m_login_info=JSQ.clone(info);};

	var m_docstor_client=null;
	var m_studies=[];
	var m_table=new MLTableWidget();
	m_table.setSelectionMode('multiple');
	var m_login_info={};
	var m_mode='';
	m_table.setParent(O);
	
	var m_menu_bar=new MLMenuBar();
	var menu=m_menu_bar.addMenu('...');
	var menu_item_add_label=menu.addItem('Add label...',add_label);
	var menu_item_remove_label=menu.addItem('Remove label...',remove_label);
	menu.addDivider();
	var menu_item_share_with=menu.addItem('Share with...',share_with);
	var menu_item_unshare_with=menu.addItem('Unshare with...',unshare_with);
	menu.addDivider();
	var menu_item_delete=menu.addItem('Delete selected studies...',delete_selected_studies);
	m_menu_bar.setParent(O);
	update_menus();

	O.div().append('<h3 style="margin:10px"><span id=heading style="padding-left:20px;"></span></h3>');
	O.div().append('<span style="padding-left:30px"><button id=create_new_study>Create new study...</button></span>');
	O.div().find('#create_new_study').click(create_new_study);

	JSQ.connect(m_table,'selected_rows_changed',O,update_menus);

	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var W=O.width();
		var H=O.height();
		var H1=80;
		var Hmenu=60;
		xmarg=20;
		m_menu_bar.setGeometry(xmarg,H1,W-xmarg*2,Hmenu)
		m_table.setGeometry(xmarg,H1+Hmenu,W-xmarg*2,H-H1-Hmenu);
	}

	function clear() {
		m_studies=[];
		set_heading('');
		refresh();
	}

	function set_heading(heading) {
		O.div().find('#heading').html(heading);
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
		add_label(true);
	}

	function add_label(do_remove) {
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
	          alert(err);
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
	            alert(err);
	          }
	          else cb();
	        });  
	      });
	    },function() {
	      refresh();
	    });
	}

	function unshare_with() {
		share_with(true);
	}

	function share_with(do_unshare) {
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
	          alert(err);
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
	            alert(err);
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
				alert('Error removing documents: '+err);
				refresh();
				return;
			}
			refresh();
		});
	}

	function create_new_study() {
		var title0=prompt('Title of new study:','untitled.mls');
		if (!title0) return;
		if (!jsu_ends_with(title0,'.mls')) {
			title0+='.mls';
		}
		if ((m_mode=='my_studies')||(m_mode=='on_this_browser')) {
			var opts={
				owner:m_login_info.user_id,
				content:'{}',
				attributes:{title:title0}
			}
			m_docstor_client.createDocument(opts,function(err) {
				if (err) {
					alert(err);
					return;
				}
				//O.emit('open_study',{study:{owner:opts.owner,title:opts.attributes.title}});
				refresh();
			});
		}
		else {
			alert('Not yet implemented.');
		}
	}

	function setMode(mode) {
		m_mode=mode;
		refresh();
	}

	function refresh() {
		var mode=m_mode;
		if (mode=='public_studies')
			set_heading('Loading public studies...');
		else if (mode=='my_studies')
			set_heading('Loading studies...');
		else if (mode=='shared_with_me')
			set_heading('Loading studies...');
		else if (mode=='on_this_browser')
			set_heading('Loading studies from browser...');

		if ((mode=='my_studies')||(mode=='on_this_browser')) {
			O.div().find('#create_new_study').css({visibility:''});
		}
		else {
			O.div().find('#create_new_study').css({visibility:'hidden'});
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
		else if (mode=='shared_with_me') {
			obj={
				shared_with:m_login_info.user_id,
				filter:'*.mls'
			};	
		}
		else if (mode=='on_this_browser') {
			client=new DocStorClient();
			client.setDocStorUrl('browser');
		}
		else {
			alert('Unexpected mode: '+mode);
			return;
		}
		client.findDocuments(obj,function(err,docs) {
			if (mode!=m_mode) return;
			if (err) {
				alert('Error loading documents from cloud: '+err);
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
			else if (mode=='shared_with_me')
				set_heading('Shared with me');
			else if (mode=='on_this_browser')
				set_heading('On this browser');
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
			menu_item_add_label,menu_item_remove_label,
			menu_item_share_with,menu_item_unshare_with,
			menu_item_delete
		];
		for (var i in list) {
			list[i].setDisabled(true);
		}
		if ((m_mode=='my_studies')||(m_mode=='on_this_browser')) {
			if (m_table.selectedRows().length>0) {
				for (var i in list) {
					list[i].setDisabled(false);
				}
			}
		}	
	}

	function create_study_row(study0) {
		var row=m_table.createRow();
		row.study=study0;

		var elmt=$('<a href=#>'+(study0.title||'[untitled]')+'</a>');
		elmt.click(function() {
			open_study(study0);
		});
		row.cell(0).append(elmt);
		row.cell(1).html(study0.owner);

		var share_elmt=$('<span><span class=edit_button></span> <span id=users></span></span>');
		share_elmt.find('#users').html(study0.shared_with.join(', '));
		share_elmt.find('.edit_button').click(function() {
			edit_sharing(study0);
		});
		if ((m_mode=='my_studies')||(m_mode=='on_this_browser')) {
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

	update_layout();
	refresh();
}

function MLSOverviewLeftWindow(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLSOverviewLeftWindow');

	this.currentSelection=function() {return m_current_selection;};

	var m_current_selection='public_studies';

	var ul=$('<ul></ul>');
	ul.append('<li id=public_studies>Public studies</li>');
	ul.append('<li id=my_studies>My studies</li>');
	ul.append('<li id=shared_with_me>Shared with me</li>');
	ul.append('<li id=on_this_browser>On this browser</li>');
	O.div().append(ul);
	O.div().append('<a href=# id=set_configuration>Configuration...</a>');

	ul.find('#public_studies').click(function() {set_current_selection('public_studies')});
	ul.find('#my_studies').click(function() {set_current_selection('my_studies')});
	ul.find('#shared_with_me').click(function() {set_current_selection('shared_with_me')});
	ul.find('#on_this_browser').click(function() {set_current_selection('on_this_browser')});

	O.div().find('#set_configuration').click(set_configuration);

	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var W=O.width();
		var H=O.height();

		var list=ul.find('li');
		for (var i=0; i<list.length; i++) {
			var elmt=$(list[i]);
			if (elmt.attr('id')==m_current_selection) {
				elmt.addClass('MLSOverviewLeftWindow-selected');
			}
			else {
				elmt.removeClass('MLSOverviewLeftWindow-selected');	
			}
		}
	}

	function set_current_selection(selection) {
		if (selection==m_current_selection) return;
		m_current_selection=selection;
		update_layout();
		O.emit('selection_changed');
	}

	function set_configuration() {
		var LS=new LocalStorage();
		var obj=LS.readObject('mls_config2')||{};
		var dlg=new EditTextDlg();
		dlg.setText(JSON.stringify(obj,null,4));
		dlg.show();
		dlg.onAccepted(function() {
			var json=dlg.text();
			var obj2=jsu_try_parse_json(json);
			if (!obj2) {
				alert('Error parsing json.');
				return;
			}
			LS.writeObject('mls_config2',obj2);
			alert('Configuration saved. You should now reload the page.');
		});
	}

	update_layout();
}