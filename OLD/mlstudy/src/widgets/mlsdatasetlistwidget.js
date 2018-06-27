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

exports.MLSDatasetListWidget=MLSDatasetListWidget;

var JSQWidget=require('../mlscore/jsqcore/jsqwidget.js').JSQWidget;
var MLTableWidget=require('./mltablewidget.js').MLTableWidget;

function MLSDatasetListWidget(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLSDatasetListWidget');

	this.setMLSManager=function(M) {m_manager=M; m_study=M.study();};
	this.refresh=function() {refresh();};
	this.onCurrentDatasetChanged=function(handler) {JSQ.connect(m_table,'current_row_changed',O,handler);};
	this.setCurrentDatasetId=function(id) {setCurrentDatasetId(id);};
	this.currentDatasetId=function() {return currentDatasetId();};
	this.selectedDatasetIds=function() {return selectedDatasetIds();};

	var m_manager=null;
	var m_study=null;
	var m_table=new MLTableWidget();
	m_table.setParent(O);
	m_table.setSelectionMode('multiple');
	m_table.setRowsMoveable(false);

	//var m_button_bar=$('<div><button style="font-size:20px" id=add_dataset>Add dataset</button></div>');
	//O.div().append(m_button_bar);

	//m_button_bar.find('#add_dataset').click(add_dataset);

	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var W=O.width();
		var H=O.height();
		//var button_height=40;
		var button_height=0;

		//m_button_bar.css({position:'absolute',left:0,top:H-button_height,width:W,height:button_height})

		m_table.setGeometry(0,0,W,H-button_height);
	}

	function currentDatasetId() {
		var row=m_table.currentRow();
		if (!row) return null;
		return row.dataset_id;
	}

	function setCurrentDatasetId(id) {
		set_current_row_by_dataset_id(id);
	}

	function refresh() {
		var current_dataset_id=currentDatasetId();

		m_table.clearRows();
		m_table.setColumnCount(1);

		m_table.headerRow().cell(0).html('Dataset');
		var ids=m_study.datasetIds();
		for (var i=0; i<ids.length; i++) {
			var row=m_table.createRow();
			row.dataset_id=ids[i];
			setup_row(row);
			m_table.addRow(row);
		}

		if (current_dataset_id) {
			set_current_row_by_dataset_id(current_dataset_id);
		}

		if (!m_table.currentRow()) {
			if (m_table.rowCount()>0) {
				m_table.setCurrentRow(m_table.row(0));	
			}
		}
	}

	function setup_row(row) {
		//var close_link=$('<span class="remove_button octicon octicon-trashcan" title="Delete dataset"></span>');
		//close_link.click(function() {remove_dataset(row.dataset_id);});
		//row.cell(0).append(close_link);
		//var checkbox=$('<input type=checkbox class="mls_checkbox" data-dataset-id="'+row.dataset_id+'" />');
      	//row.cell(0).append(checkbox);
      	//checkbox.click(update_row_highlighting);

		var edit_name_link=$('<span class="edit_button octicon octicon-pencil" title="Edit dataset ID"></span>');
		edit_name_link.click(function(evt) {
			edit_dataset_id(row.dataset_id);
			return false; //so that we don't get a click on the row
		});
		row.cell(0).append(edit_name_link);
		row.cell(0).append($('<span>'+row.dataset_id+'</span>'));
	}

	function get_selected_dataset_ids() {
		var rows=m_table.selectedRows();
		var ret={};
		for (var i in rows) {
			ret[rows[i].dataset_id]=1;
		}
	    return ret;
	}

	function selectedDatasetIds() {
		return get_selected_dataset_ids_list();
	}

	function get_selected_dataset_ids_list() {
		var ids=get_selected_dataset_ids();
		var list=[];
		for (var id in ids) {
		  list.push(id);
		}
		return list;
	}
	/*
	function set_selected_dataset_ids(ids) {
		for (var i=0; i<m_table.rowCount(); i++) {
			var row=m_table.row(i);
			if (row.dataset_id in ids) {
				row.setSelected(true);
			}
			else {
				row.setSelected(false);
			}
		}
	}
	*/

	function set_current_row_by_dataset_id(did) {
		for (var i=0; i<m_table.rowCount(); i++) {
			var row=m_table.row(i);
			if (row.dataset_id==did) {
				m_table.setCurrentRow(row);
				return;
			}
		}
	}

	function edit_dataset_id(ds_id) {
		var name=ds_id;
		var name2=prompt('New id for dataset:',name);
		if (!name2) return;
		if (name2==name) return;
		if (m_study.dataset(name2)) {
			alert('Cannot rename dataset. A dataset with this name already exists.');
			return;
		}
		m_study.changeDatasetId(name,name2);
		refresh();
	}

	function remove_dataset(ds_id) {
		if (confirm('Remove dataset ('+ds_id+')?')) {
			m_study.removeDataset(ds_id);
			m_table.setCurrentRow(0);
			refresh();	
		}
	}

	update_layout();
}

