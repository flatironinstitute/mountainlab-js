exports.ProcessingServerWidget=ProcessingServerWidget;
var JSQWidget=require('../mlscore/jsqcore/jsqwidget.js').JSQWidget;
var MLTableWidget=require('./mltablewidget.js').MLTableWidget;

function ProcessingServerWidget(O) {
	O=O||this;
	
	var html=require('./processingserverwidget.html');
	JSQWidget(O,$(html).find('.ProcessingServerWidget').clone());

	this.setMLSManager=function(manager) {setMLSManager(manager);};
	this.refresh=function() {refresh();};

	var m_stats={};
	var m_containers={};
	var m_select_table=new MLTableWidget();
	m_select_table.setSelectionMode('single');
	m_select_table.onCurrentRowChangedByUser(on_current_row_changed);

	//O.div().find('#set_processing_server').click(set_processing_server);
	O.div().find('#refresh_list').click(function() {refresh_available_containers(); refresh_stats()});

	O.div().find('#table_holder').append(m_select_table.div());

	function refresh() {
		refresh_stats();
		refresh_available_containers();
	}

	function refresh_stats() {
		var config=m_mls_manager.mlsConfig();
		var server=config.processing_server;
		O.div().find('#processing_server_name').html(server);
		set_info('Loading...');
		m_stats={};
		update_stats_display();
		var lari_client=m_mls_manager.lariClient();
		lari_client.getStats({},function(err,resp) {
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
		});
	}
	function refresh_available_containers() {
		m_select_table.setColumnCount(1);
		m_select_table.headerRow().cell(0).html('Container ID');
		m_select_table.clearRows();
		set_info2('Retrieving available containers...');
		var lari_client=m_mls_manager.lariClient();
		lari_client.getAvailableContainers({},function(err,containers) {
			if (err) {
				set_info2('Error retrieving available containers: '+err);
				return;
			}
			set_info2('');
			m_containers=containers;
			update_select_table();
		});
	}

	function update_stats_display() {
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
		for (var id in m_containers) {
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
