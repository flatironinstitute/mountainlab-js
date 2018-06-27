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

exports.MLSBatchScriptListWidget=MLSBatchScriptListWidget;

var JSQWidget=require('../mlscore/jsqcore/jsqwidget.js').JSQWidget;
var MLTableWidget=require('./mltablewidget.js').MLTableWidget;

function MLSBatchScriptListWidget(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLSBatchScriptListWidget');

	this.setMLSManager=function(M) {m_manager=M;};
	this.refresh=function() {refresh();};
	this.onCurrentBatchScriptChanged=function(handler) {JSQ.connect(m_table,'current_row_changed',O,handler);};
	this.currentBatchScriptName=function() {return currentBatchScriptName();};
	this.setCurrentBatchScriptName=function(name) {setCurrentBatchScriptName(name);};
	this.selectedBatchScriptNames=function() {return selectedBatchScriptNames();};

	var m_manager=null;
	var m_table=new MLTableWidget();
	m_table.setParent(O);
	m_table.setSelectionMode('multiple');
	m_table.setRowsMoveable(false);

	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var W=O.width();
		var H=O.height();

		m_table.setGeometry(0,0,W,H);
	}

	function currentBatchScriptName() {
		var row=m_table.currentRow();
		if (!row) return null;
		return row.batch_script_name;
	}

	function setCurrentBatchScriptName(name) {
		for (var i=0; i<m_table.rowCount(); i++) {
			if (m_table.row(i).batch_script_name==name) {
				m_table.setCurrentRow(m_table.row(i));
				return;
			}
		}
	}

	function selectedBatchScriptNames() {
		var rows=m_table.selectedRows();
		var ret=[];
		for (var i in rows) {
			ret.push(rows[i].batch_script_name);
		}
		return ret;
	}

	function refresh() {
		var current_batch_script_name=currentBatchScriptName();

		m_table.clearRows();
		m_table.setColumnCount(1);
		m_table.headerRow().cell(0).html('Scripts');
		var names=m_manager.study().batchScriptNames();
		for (var i=0; i<names.length; i++) {
			var row=m_table.createRow();
			row.batch_script_name=names[i];
			setup_row(row);
			m_table.addRow(row);
		}

		if (current_batch_script_name) {
			set_current_row_by_batch_script_name(current_batch_script_name);
		}

		if (!m_table.currentRow()) {
			if (m_table.rowCount()>0) {
				m_table.setCurrentRow(m_table.row(0));	
			}
		}
	}

	function setup_row(row) {
		var edit_name_link=$('<span class="edit_button octicon octicon-pencil" title="Edit script module name"></span>');
		edit_name_link.click(function(evt) {
			edit_batch_script_name(row.batch_script_name);
			return false; //so that we don't get a click on the row
		});
		row.cell(0).append(edit_name_link);
		row.cell(0).append($('<span>'+row.batch_script_name+'</span>'));
	}

	function set_current_row_by_batch_script_name(pname) {
		for (var i=0; i<m_table.rowCount(); i++) {
			var row=m_table.row(i);
			if (row.batch_script_name==pname) {
				m_table.setCurrentRow(row);
				return;
			}
		}
	}

	function edit_batch_script_name(pname) {
		var name=pname;
		var name2=prompt('New name for script module:',name);
		if (!name2) return;
		if (name2==name) return;
		if (m_manager.study().batchScript(name2)) {
			alert('Unable to rename script. A script with this name already exists.');
			return;
		}
		m_manager.study().changeBatchScriptName(name,name2);
		refresh();
	}

	update_layout();
}

