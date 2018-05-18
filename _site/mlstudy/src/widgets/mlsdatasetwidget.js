/*
 * Copyright 2016-2017 Flatiron Institute, Simons Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function MLSDatasetWidget(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLSDatasetWidget');

	this.setMLSManager=function(M) {m_manager=M;};
	this.setDatasetId=function(ds_id) {m_dataset_id=ds_id;};
	this.refresh=function() {refresh();};

	var m_manager=null;
	var m_dataset_id='';
	O.div().css({'overflow-y':'auto'});
	var m_files_table=new MLTableWidget();
	var m_params_table=new MLTableWidget();
	var m_description_widget=new DescriptionWidget();
	m_description_widget.setLabel('Dataset description: ');
	//var m_top_widget=new KDDTopWidget();
	
	//var m_bottom_widget=new KDDBottomWidget();
	m_files_table.setParent(O);
	m_params_table.setParent(O);
	m_description_widget.setParent(O);
	//m_top_widget.setParent(O);
	//m_bottom_widget.setParent(O);

	var m_menu_bar=new MLMenuBar();
	var menu=m_menu_bar.addMenu('...');
	menu.addItem('Export dataset to JSON file...',export_dataset);
	menu.addItem('Export parameters to JSON file...',download_params_file);
	menu.addItem('Import parameters from JSON file...',upload_params);
	menu.addDivider();
	menu.addItem('Refresh dataset',refresh);
	m_menu_bar.setParent(O);

	//JSQ.connect(m_top_widget,'refresh',O,refresh);
	//JSQ.connect(m_bottom_widget,'refresh',O,refresh);

	m_description_widget.onDescriptionEdited(function() {;
		var ds=get_dataset();
		if (!ds) return;
		var prop=ds.properties();
		prop.description=m_description_widget.description();
		ds.setProperties(prop);
		set_dataset(ds);
		refresh();
	});

	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var widgets=[m_files_table,m_params_table,m_description_widget,m_menu_bar];
		if (m_dataset_id) {
			for (var i in widgets) {
				widgets[i].show();
			}
		}
		else {
			for (var i in widgets) {
				widgets[i].hide();
			}
		}

		var W=O.width();
		var H=O.height();
		var W1=Math.min(1000,2*W/3);
		var Htop=50;
		var Hbottom=0;
		var H1=Math.max(400,(H-Htop-Hbottom)*2/3);
		var menu_bar_width=50;

		m_menu_bar.setGeometry(0,5,menu_bar_width,Htop);
		//m_top_widget.setGeometry(menu_bar_width,5,W-menu_bar_width,Htop);
		m_files_table.setGeometry(0,Htop,W1,H1-Htop);
		m_params_table.setGeometry(W1,Htop,W-W1,H1-Htop);
		m_description_widget.setGeometry(0,Htop+H1,W,H-Hbottom-H1-Htop);
		//m_bottom_widget.setGeometry(0,H-Hbottom,W,Hbottom);
	}

	function refresh() {
		update_tables();
		m_description_widget.setDescription('');
		var ds=get_dataset();
		if (!ds) return;
		m_description_widget.setDescription('Loading...');
		m_description_widget.setDescription(ds.properties().description||'');
		update_tables();
		setTimeout(function() {
			refresh_kb_elements();
			refresh_ps_elements();
		},100);
		update_layout();
	}

	function get_dataset() {
		return m_manager.study().dataset(m_dataset_id);
	}
	function set_dataset(ds) {
		m_manager.study().setDataset(m_dataset_id,ds);
	}

	function update_tables() {
		m_files_table.setColumnCount(6);
		m_files_table.headerRow().cell(1).html('File');
		m_files_table.headerRow().cell(2).html('Size');
		m_files_table.headerRow().cell(3).html('Orig. Path');
		m_files_table.headerRow().cell(4).html('KBucket');
		m_files_table.headerRow().cell(5).html('Server');
		
		m_files_table.clearRows();
		var ds=get_dataset();
		if (ds) {
			var keys=ds.fileNames();
			keys.sort();
			for (var i in keys) {
				var key=keys[i];
				var row=m_files_table.createRow();
				update_file_row(row,key,ds.file(key));
				m_files_table.addRow(row);	
			}
			var link=$('<a href=#>Upload file(s)</a>');
			link.click(upload_files);
			var row=m_files_table.createRow();
			row.cell(1).append(link);
			m_files_table.addRow(row);	
		}

		m_params_table.setColumnCount(3);
		m_params_table.headerRow().cell(1).html('Parameter');
		m_params_table.headerRow().cell(2).html('Value');
		m_params_table.clearRows();
		var ds=get_dataset();
		if (ds) {
			var params=ds.parameters();
			var keys=Object.keys(params);
			keys.sort();
			for (var i in keys) {
				var key=keys[i];
				var row=m_params_table.createRow();
				update_param_row(row,key,params[key]);
				m_params_table.addRow(row);	
			}
			
			var add_parameter_link=$('<a href=#>Add parameter</a>');
			add_parameter_link.click(add_param);

			var row=m_params_table.createRow();
			row.cell(1).append(add_parameter_link);
			m_params_table.addRow(row);	
		}
	}
	function update_param_row(row,name,val) {
		row.cell(1).append(name);

		// remove file
		var link=$('<span class=remove_button title="Remove parameter"></span>');
		link.click(function() {
			remove_parameter(name);
		});
		row.cell(0).append(link);

		var edit_link=$('<span class=edit_button></span>');
		row.cell(2).append(edit_link);
		edit_link.click(function() {
			edit_parameter(name);
		});
		row.cell(2).append('&nbsp;');
		row.cell(2).append(val);
	}
	function upload_params() {
		var UP=new FileUploader();
		UP.uploadTextFile({},function(tmp) {
			if (!tmp.success) {
				alert(tmp.error);
				return;
			}
			if (!ends_with(tmp.file_name,'.json')) {
				alert('File must have .json extension');
				return;
			}
			var obj=try_parse_json(tmp.text);
			if (!obj) {
				alert('Error parsing json');
				return;
			}
			var ds=get_dataset();
			if (!ds) {
				alert('ds is null');
				return;
			}
			ds.setParameters(obj);
			set_dataset(ds);
			refresh();
		});
	}
	function update_file_row(row,name,file) {

		var rename_file_link=$('<span class=edit_button></span>');
		rename_file_link.click(function() {
			rename_file(name);
		});
		row.cell(1).append(rename_file_link);
		row.cell(1).append(name);


		// remove file
		var link=$('<span class=remove_button title="Remove file"></span>');
		link.click(function() {
			remove_file(name);
		});
		row.cell(0).append(link);

		if (file.prv) {
			var download_link1=$('<span class=download2_button title="Download prv file"></span>')
			download_link1.click(function() {
				download_prv_file(name);
			});
			row.cell(0).append(download_link1);

			row.cell(2).append(format_file_size(file.prv.original_size));

			var elmt=$('<span>'+file.prv.original_path+'</span>')
			elmt.attr('title','sha1='+file.prv.original_checksum);
			row.cell(3).append(elmt);

			var kb_elmt=$('<span class=kb data-sha1="'+file.prv.original_checksum+'" data-size="'+file.prv.original_size+'" data-name="'+name+'"></span>');
			row.cell(4).append(kb_elmt);

			var ps_elmt=$('<span class=ps data-sha1="'+file.prv.original_checksum+'" data-size="'+file.prv.original_size+'" data-fcs="'+file.prv.fcs+'" data-name="'+name+'"></span>');
			row.cell(5).append(ps_elmt);
		}
	}
	function edit_parameter(name) {
		var ds=get_dataset();
		if (!ds) return;
		var params=ds.parameters();
		var val=params[name]||'';
		var new_val=prompt('New value for parameter '+name+':',val);
		if (new_val===null) return;
		if (new_val==val) return;
		params[name]=new_val;
		ds.setParameters(params);
		set_dataset(ds);
		refresh();
	}
	/*
	function add_file() {
		var name=prompt('Name for new file:');
		if (!name) return;
		var ds=get_dataset();
		if (!ds) return;
		ds.setFile(name,{});
		set_dataset(ds);
		refresh();
		upload_prv_file(name);
	}
	*/
	function upload_files() {
		var kbucketauth_url=m_manager.kBucketAuthUrl();
		var kbucket_url=m_manager.kBucketUrl();
		
		var CC=new KBucketAuthClient();
		CC.setKBucketAuthUrl(kbucketauth_url);
		CC.getAuth('upload',m_manager.loginInfo(),{},function(err,token,token_decoded) {
			if (err) {
				alert(err);
				return;
			}
			console.log ('Token (decoded): '+JSON.stringify(token_decoded));
			var dlg=new KBucketUploadDialog();
			dlg.setKBucketUrl(kbucket_url);
			dlg.setKBucketAuthToken(token);
			dlg.show();
			dlg.onFinished(function(tmp) {
				var ds=get_dataset();
				var files=tmp.files||[];
				for (var i=0; i<files.length; i++) {
					ds.setFile(files[i].file_name,{prv:files[i].prv});
				}
				set_dataset(ds);
				refresh();
				dlg.close();
			});
		});
	}
	function remove_file(name) {
		if (confirm('Remove this file from dataset?')) {
			var ds=get_dataset();
			if (!ds) return;
			ds.removeFile(name);
			set_dataset(ds);
			refresh();
		}
	}
	function remove_parameter(name) {
		if (confirm('Remove this parameter?')) {
			var ds=get_dataset();
			if (!ds) return;
			var pp=ds.parameters();
			if (name in pp)
				delete pp[name];
			ds.setParameters(pp);
			set_dataset(ds);
			refresh();
		}
	}
	function rename_file(name) {
		var new_name=prompt('New name for file:',name);
		if (!new_name) return;
		if (new_name==name) return;
		var ds=get_dataset();
		if (!ds) return;
		var file0=ds.file(name);
		ds.removeFile(name);
		ds.setFile(new_name,file0);
		set_dataset(ds);
		refresh();
	}
	function download_prv_file(name) {
		var ds=get_dataset();
		if (!ds) return;
		var file0=ds.file(name);
		var prv=file0.prv||{};
		var json=JSON.stringify(prv,null,4);
    	download(json,name+'.prv');
	}
	function download_kbucket_file(name) {
		var ds=get_dataset();
		if (!ds) return;
		var file0=ds.file(name);
		var prv=file0.prv||{};
		O.emit('download_kbucket_file_from_prv',{prv:prv});
	}
	function refresh_kb_elements() {
		var elmts=O.div().find('.kb');
		for (var i=0; i<elmts.length; i++) {
			refresh_kb_element($(elmts[i]));
		}
		function refresh_kb_element(elmt) {
			elmt.html('Checking...');
			elmt.attr('title','');
			elmt.attr('class','kb unknown');
			var sha1=elmt.attr('data-sha1');
			var size=elmt.attr('data-size');
			var name=elmt.attr('data-name');
			var KC=new KBucketClient();
			KC.setKBucketUrl(m_manager.kBucketUrl());
			KC.stat(sha1,size,function(err,stat0) {
				if (err) {
					elmt.html('Error checking');
					elmt.attr('title',err);
					elmt.attr('class','kb unknown');
					return;
				}
				if (!stat0.found) {
					elmt.html('Not found');
					elmt.attr('title','Not found on the kbucket server.');
					elmt.attr('class','kb no');
					return;
				}
				elmt.html('');
				elmt.attr('title','This file was found on the kbucket server.');
				elmt.attr('class','kb yes');
				var download_link2=create_original_download_file_link(name);
				elmt.append(download_link2);
				elmt.append('&nbsp;Found');
			});
		}
		//m_top_widget.refresh();
		//m_bottom_widget.refresh();
	}
	function refresh_ps_elements() {
		var elmts=O.div().find('.ps');
		for (var i=0; i<elmts.length; i++) {
			refresh_ps_element($(elmts[i]));
		}
		function refresh_ps_element(elmt) {
			elmt.html('Checking...');
			elmt.attr('title','');
			elmt.attr('class','ps unknown');
			var sha1=elmt.attr('data-sha1');
			var size=elmt.attr('data-size');
			var fcs=elmt.attr('data-fcs');
			var name=elmt.attr('data-name');
			var prv0={
				original_checksum:sha1,
				original_size:size,
				original_fcs:fcs
			};
			var LC=m_manager.lariClient();
			LC.findFile(prv0,{},function(err,tmp) {
				if (err) {
					elmt.html('Error checking');
					elmt.attr('title',err);
					elmt.attr('class','ps unknown');
					return;
				}
				if (!tmp.found) {
					var html0='Not found';
					html0='<a href=# id=transfer title="Click to transfer from kbucket">'+html0+'</a>';
					elmt.html(html0);
					elmt.attr('title','Not found on the processing server.');
					elmt.attr('class','ps no');
					elmt.find('#transfer').click(function() {
						elmt.html('Transferring from kbucket...');
						transfer_file_from_kbucket_to_processing_server(sha1,function(err) {
							if (err) {
								alert(err);
							}
							refresh_ps_elements();
						});
					});
					return;
				}
				elmt.html('Found');
				elmt.attr('title','This file was found on the processing server.');
				elmt.attr('class','kb yes');
			});
			/*
			var KC=new KBucketClient();
			KC.setKBucketUrl(m_manager.kBucketUrl());
			KC.stat(sha1,size,function(err,stat0) {
				if (err) {
					elmt.html('Error checking');
					elmt.attr('title',err);
					elmt.attr('class','kb unknown');
					return;
				}
				if (!stat0.found) {
					elmt.html('Not found');
					elmt.attr('title','Not found on the kbucket server.');
					elmt.attr('class','kb no');
					return;
				}
				elmt.html('');
				elmt.attr('title','This file was found on the kbucket server.');
				elmt.attr('class','kb yes');
				var download_link2=create_original_download_file_link(name);
				elmt.append(download_link2);
				elmt.append('&nbsp;Found');
			});
			*/
		}
		//m_top_widget.refresh();
		//m_bottom_widget.refresh();
	}
	function transfer_file_from_kbucket_to_processing_server(sha1,callback) {
		if (!m_manager) {
			callback('MLS manager has not been set');
			return;
		}
		/*
		if (!m_manager.kuleleClient()) {
			callback('KuleleClient has not been set');
			return;
		}
		*/
		var LC=m_manager.lariClient();
		var job_id='';
		var qq={
			processor_name:'kbucket.download',
			inputs:{},
			outputs:{file:true},
			parameters:{sha1:sha1},
			opts:{}
		};
		LC.queueProcess(qq,{},
			function(err,resp) {
				if (err) {
					console.error('Error queuing process: '+err);
					return;
				}
			    job_id=resp.job_id||'';
      			handle_process_probe_response(resp);
			}
		);
		function handle_process_probe_response(resp) {
			if (!resp.success) {
		      callback('Error transferring: '+resp.error);
			  return;
		    }
		    if (job_id!=resp.job_id) {
		      callback('Unexpected: job_id does not match response: '+job_id+'<>'+resp.job_id);
		      return;
		    }
		    if (resp.latest_console_output) {
		      var lines=resp.latest_console_output.split('\n');
		      for (var i in lines) {
		        if (lines[i].trim()) {
		          var str0='  |kbucket.download| ';
		          while (str0.length<35) str0+=' ';
		          mlpLog({text:str0+lines[i]});
		        }
		      }
		    }
		    if (resp.complete) {
		      var err0='';
		      if (!resp.result) {
		        callback('Unexpected: result not found in process response.');
		        return;
		      }
		      var result=resp.result;
		      if (!result.success) {
		        if (!err0)
		          err0=result.error||'Unknown error';
		      }
		      if (err0) {
		        callback(err0);
		        return;
		      }
		      callback('');
		    }
		    else {
		      setTimeout(send_process_probe,5000);
		    }
		}
		function send_process_probe() {
		    var LC=m_manager.lariClient();
		    LC.probeProcess(job_id,{},function(err,resp) {
				if (err) {
					console.error('Error probing processing: '+err);
					return;
				}
				handle_process_probe_response(resp);
		    });
		}
	}
	function create_original_download_file_link(name) {
		var ret=$('<span class=download_button title="Download original file from the kbucket server"></span>');
		ret.click(function() {
			download_kbucket_file(name);
		});
		return ret;
	}

	//JSQ.connect(m_bottom_widget,'download_params_file',O,download_params_file);
	function download_params_file() {
		var ds=get_dataset();
		if (!ds) return;
		var params=ds.parameters();
		download(JSON.stringify(params,null,4),m_dataset_id+'_params.json');
	}

	//JSQ.connect(m_bottom_widget,'download_json_file',O,download_json_file);
	function export_dataset() {
		if (!m_dataset_id) {
			alert('Dataset id is empty.');
			return;
		}
		var ds=get_dataset();
		if (!ds) return;
		var obj={
			datasets:{}
		};
		obj.datasets[m_dataset_id]=ds.object();
		download(JSON.stringify(obj,null,4),m_dataset_id+'.json');
	}

	function format_file_size(size_bytes) {
	    var a=1024;
	    var aa=a*a;
	    var aaa=a*a*a;
	    if (size_bytes>aaa) {
	      return Math.floor(size_bytes/aaa)+' GB';
	    }
	    else if (size_bytes>aaa) {
	      return Math.floor(size_bytes/(aaa/10))/10+' GB';  
	    }
	    else if (size_bytes>aa) {
	      return Math.floor(size_bytes/aa)+' MB';
	    }
	    else if (size_bytes>aa) {
	      return Math.floor(size_bytes/(aa/10))/10+' MB';  
	    }
	    else if (size_bytes>10*a) {
	      return Math.floor(size_bytes/a)+' KB';
	    }
	    else if (size_bytes>a) {
	      return Math.floor(size_bytes/(a/10))/10+' KB';  
	    }
	    else {
	      return size_bytes+' bytes';
	    }
	}
	function add_param() {
		var name=prompt('Parameter name:');
		if (!name) return;
		var ds=get_dataset();
		if (!ds) return;
		var params=ds.parameters();
		params[name]='';
		ds.setParameters(params);
		set_dataset(ds);
		refresh();
		edit_parameter(name);
	}

	function try_parse_json(str) {
		try {
			return JSON.parse(str);
		}
		catch(err) {
			return null;
		}
	}

	function ends_with(str,str2) {
		return (String(str).slice(str.length-str2.length)==str2);
	}

	update_layout();
}

/*
function KDDTopWidget(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('KDDTopWidget');

	this.setDatasetId=function(ds_id) {m_dataset_id=ds_id;};
	this.refresh=function() {refresh();};

	var m_dataset_id='';
	var m_content=$('<div>Dataset: <span id=title class=title></span>&nbsp;&nbsp;</div>');
	O.div().append(m_content);

	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var W=O.width();
		var H=O.height();
		
		m_content.css({position:'absolute',left:0,top:0,width:W,height:H});
	}

	function refresh() {
		m_content.find('#title').html(m_dataset_id);
	}

	update_layout();
}
*/

/*
function KDDBottomWidget(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('KDDBottomWidget');

	this.setDatasetId=function(ds_id) {m_dataset_id=ds_id;};
	this.refresh=function() {refresh();};

	var download_params_link=$('<a href=#><span class=dataset_id></span>_params.json</a>');
	download_params_link.attr('title','Download parameters as JSON file');
	download_params_link.click(function() {O.emit('download_params_file');});

	var download_json_link=$('<a href=#><span class=dataset_id></span>.json</a>');
	download_json_link.attr('title','Download dataset as JSON file');
	download_json_link.click(function() {O.emit('download_json_file');});

	var m_dataset_id='';
	var m_content=$('<div></div>');
	var m_manager=null;
	m_content.append(download_params_link);
	m_content.append('&nbsp;|&nbsp;');
	m_content.append(download_json_link);

	O.div().append(m_content);

	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var W=O.width();
		var H=O.height();
		
		m_content.css({position:'absolute',left:0,top:0,width:W,height:H});
	}

	function refresh() {
		m_content.find('.dataset_id').html(m_dataset_id);
	}

	update_layout();
}
*/