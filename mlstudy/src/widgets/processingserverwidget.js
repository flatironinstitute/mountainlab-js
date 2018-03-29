exports.ProcessingServerWidget=ProcessingServerWidget;
var JSQWidget=require('../mlscore/jsqcore/jsqwidget.js').JSQWidget;
var MLTableWidget=require('./mltablewidget.js').MLTableWidget;
var jsutils=require('../mlscore/jsutils/jsutils.js');
var mlutils=require('../mlscore/mlutils.js');

function ProcessingServerWidget(O) {
	O=O||this;
	
	var html=require('./processingserverwidget.html');
	JSQWidget(O,$(html).find('.ProcessingServerWidget').clone());

	this.setMLSManager=function(manager) {setMLSManager(manager);};
	this.refresh=function() {refresh();};

	var m_stats={};
	var m_all_processors=null;
	var m_containers={};
	var m_select_table=new MLTableWidget();
	var m_mls_manager=null;
	m_select_table.setSelectionMode('single');
	m_select_table.onCurrentRowChangedByUser(on_current_row_changed);

	//O.div().find('#set_processing_server').click(set_processing_server);
	O.div().find('#refresh_list').click(function() {refresh_available_containers(); refresh_stats()});

	O.div().find('#table_holder').append(m_select_table.div());

	O.div().find('label.connect_to#local_machine').click(function() {
		connect_to_local_machine();
	});
	O.div().find('label.connect_to#central_hub').click(function() {
		connect_to_central_hub();
	});
	O.div().find('label.connect_to#custom_url').click(function() {
		connect_to_custom_url();
	});

	function refresh() {
		update_buttons();
		refresh_stats();
		refresh_available_containers();
	}

	function update_buttons() {
		if (!m_mls_manager) return;
		var obj=m_mls_manager.mlsConfig();
		var lari_url=obj.lari_url||'';
		O.div().find('label.connect_to').removeClass('active');
		if (jsutils.starts_with(lari_url,'http://localhost')) {
			O.div().find('label.connect_to#local_machine').addClass('active');
		}
		else if (jsutils.starts_with(lari_url,'https://lari1.herokuapp.com')) {
			O.div().find('label.connect_to#central_hub').addClass('active');	
		}
		else {
			O.div().find('label.connect_to#custom_url').addClass('active');	
		}
	}

	var global_refresh_stats_id=0;
	function refresh_stats() {
		global_refresh_stats_id++;
		var local_refresh_stats_id=global_refresh_stats_id;

		var config=m_mls_manager.mlsConfig();
		var server=config.processing_server;
		O.div().find('#processing_server_name').html(server);
		set_info('Loading...');
		m_stats={};
		m_all_processors=null;
		update_stats_display();
		var lari_client=m_mls_manager.lariClient();
		lari_client.getStats({},function(err,resp) {
			if (global_refresh_stats_id!=local_refresh_stats_id) return;

			if (err) {
				set_info('Error connecting to processing server: '+err);
				return;
			}
			if (!resp.success) {
				set_info('Error getting processing server stats: '+resp.error);
				return;
			}
			m_stats=resp;
			set_info('<span style="color:darkgreen">Connected</span>');
			update_stats_display();

			lari_client.getProcessorNames({},{},function(err,resp) {
				if (global_refresh_stats_id!=local_refresh_stats_id) return;

				if (err) {
					console.error('Error getting processor names: '+err);
					return;
				}
				m_all_processors=resp;
				update_stats_display();
			});
		});
	}
	function refresh_available_containers() {
		m_select_table.setColumnCount(1);
		m_select_table.headerRow().cell(0).html('Available containers');
		m_select_table.clearRows();
		set_info2(`
			<div class="alert alert-info" role="alert">
			Retrieving available containers...
			</div>
		`);
		var lari_client=m_mls_manager.lariClient();
		var obj=m_mls_manager.mlsConfig();
		var lari_url=obj.lari_url||'';
		lari_client.getAvailableContainers({},function(err,containers) {
			if (err) {
				if (using_local_machine()) {
					set_info2(`
						<div class="alert alert-danger" role="alert">
						Error retrieving available containers at ${lari_url}.
						<br>
						To use your local machine for processing you
						must run a local Lari server by running the
						following command in a terminal: ml-lari-start.
						</div>
					`);
				}
				else {
					set_info2(`
						<div class="alert alert-danger" role="alert">
						Error retrieving available containers at ${lari_url}.
						${err}
						</div>
					`);
				}
				return;
			}
			set_info2(`
				<div class="alert alert-info" role="alert">
				Retrieved ${Object.keys(containers).length} available container(s) at ${lari_url}.
				</div>`
			);
			m_containers=containers;
			select_valid_processing_server_among_containers();
			update_select_table();
		});
	}

	function select_valid_processing_server_among_containers() {
		var config=m_mls_manager.mlsConfig();
		var current_container_id=config.processing_server;
		if (!(current_container_id in m_containers)) {
			var ids=Object.keys(m_containers);
			ids.sort();
			if (ids.length>0) {
				config.processing_server=ids[0];
				m_mls_manager.setMLSConfig(config);
			}
		}
	}

	function update_stats_display() {
		O.div().find('.stat').html('');
		if (m_all_processors) {
			O.div().find('#num_processors').html(`${m_all_processors.length}`);
		}
        if (m_stats.content) {
            O.div().find('#stat-mem').html(
                format_file_size(
                m_stats.content["FreeMemory"].toFixed(3)));
            O.div().find('#stat-mem-p').html(
                (100*m_stats.content["FreeMemoryPer"]).toFixed(3));
            O.div().find('#stat-mem-total').html(
                format_file_size(
                m_stats.content["TotalMemory"].toFixed(3)));
            O.div().find('#stat-cpu1').html(m_stats.content["CPU1"].toFixed(3));
            O.div().find('#stat-cpu15').html(m_stats.content["CPU15"].toFixed(3));
        };
	}

	function set_info(info) {
		O.div().find('#info').empty();
		O.div().find('#info').append(info);
	}

	function update_select_table() {
		var config=m_mls_manager.mlsConfig();
		var current_container_id=config.processing_server;

		m_select_table.clearRows();
		var ids=Object.keys(m_containers);
		ids.sort();
		for (var ii in ids) {
			var id=ids[ii];
			var row=m_select_table.createRow();
			row.container_id=id;
			update_container_row(row);
			m_select_table.addRow(row);
			if (id==current_container_id) {
				m_select_table.setCurrentRow(row);
			}
		}
	}

	function on_current_row_changed() {
		var row0=m_select_table.currentRow();
		if (!row0) return;
		var config=m_mls_manager.mlsConfig();
		config.processing_server=row0.container_id;
		m_mls_manager.setMLSConfig(config);
		update_stats_display();
	}

	function update_container_row(row) {
		row.cell(0).html(row.container_id);
	}

	function set_info2(info) {
		O.div().find('#info2').empty();
		O.div().find('#info2').append(info);
	}

	function setMLSManager(manager) {
		m_mls_manager=manager;
		manager.onConfigChanged(refresh);
		refresh();
	}

	function using_local_machine() {
		var obj=m_mls_manager.mlsConfig();
		var lari_url=obj.lari_url||'';
		return (jsutils.starts_with(lari_url,'http://localhost'));
	}

	function connect_to_local_machine() {
		var obj=m_mls_manager.mlsConfig();
		var lari_url=obj.lari_url||'';
		if (!jsutils.starts_with(lari_url,'http://localhost'))
			lari_url='http://localhost:6057';
		prompt_lari_url('Connect to local machine',lari_url);
	}

	function connect_to_central_hub() {
		var obj=m_mls_manager.mlsConfig();
		var lari_url=obj.lari_url||'';
		if (!jsutils.starts_with(lari_url,'https://lari1.herokuapp.com'))
			lari_url='https://lari1.herokuapp.com';
		prompt_lari_url('Connect to central hub',lari_url);
	}

	function connect_to_custom_url() {
		var obj=m_mls_manager.mlsConfig();
		var lari_url=obj.lari_url||'';
		prompt_lari_url('Connect to custom server or hub',lari_url);
	}

	function prompt_lari_url(title,url) {
		update_buttons();
		mlutils.mlprompt(title,'Enter URL for server or hub:',url,function(url2) {
			if (url2) {
				var obj=m_mls_manager.mlsConfig();
				obj.lari_url=url2;
				m_mls_manager.setMLSConfig(obj);
				update_buttons();
			}
			else {
				update_buttons();
			}
		});
	}
	
	/*
	function set_processing_server() {
		var config=m_mls_manager.mlsConfig();
		var server=config.processing_server;
		mlutils.mlprompt('Set processing server','Enter processing server ID:',config.processing_server||'',function(server) {
			if (server) {
				config.processing_server=server;
				m_mls_manager.setMLSConfig(config);	
			}
		});
	}
	*/
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
