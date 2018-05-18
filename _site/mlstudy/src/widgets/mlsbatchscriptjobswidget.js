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

exports.MLSBatchScriptJobsWidget=MLSBatchScriptJobsWidget;

var JSQWidget=require('../mlscore/jsqcore/jsqwidget.js').JSQWidget;
var MLTableWidget=require('./mltablewidget.js').MLTableWidget;
var EditTextDlg=require('./edittextdlg.js').EditTextDlg;

function MLSBatchScriptJobsWidget(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLSBatchScriptJobsWidget');

	this.setBatchJob=function(BJ) {setBatchJob(BJ);};
	this.setMLSManager=function(MM) {m_mls_manager=MM;};
	
	var m_table=new MLTableWidget();
	var m_batch_job=null;
	var m_mls_manager=null;

	m_table.setParent(O);
	O.div().css({overflow:'auto'});

	JSQ.connect(O,'sizeChanged',O,update_layout);
  	function update_layout() {
		var W=O.width();
		var H=O.height();
		
		m_table.setGeometry(0,0,W,H);
	}

	function setBatchJob(BJ) {
		if (BJ==m_batch_job) return;
		m_batch_job=BJ;
		if (BJ) {
			JSQ.connect(BJ,'jobs_changed',O,function() {
				if (BJ==m_batch_job) { //still the same
					schedule_refresh();
				}
			});
		}
		schedule_refresh();
	}

	var s_refresh_scheduled=false;
	var s_last_schedule_refresh=new Date();
	function schedule_refresh() {
		if (s_refresh_scheduled) return;
		s_refresh_scheduled=true;
		var elapsed=(new Date())-s_last_schedule_refresh;
		s_last_schedule_refresh=new Date();
		var msec=1000;
		if (elapsed>2000) msec=100;
		setTimeout(function() {
			s_refresh_scheduled=false;
			do_refresh();
		},msec);
	}

	function do_refresh() {
		m_table.setColumnCount(3);
		m_table.headerRow().cell(0).html('Processor');
		m_table.headerRow().cell(1).html('Status');
		m_table.headerRow().cell(2).html('Info');
		m_table.clearRows();
		if (!m_batch_job) return;
		for (var i=0; i<m_batch_job.queuedProcessCount(); i++) {
			var info=m_batch_job.queuedProcessInfo(i);
			var row=create_job_row(info);
			m_table.addRow(row);
		}
	}

	function create_job_row(info) {
		var row=m_table.createRow();
		row.info=info;
		
		var elmt0=$('<span>'+info.processor_name+'</span>');
		var elmt1;
		var elmt2=$('<span></span>');
		if (info.job_id) {
			elmt1=$('<span></span>');
			elmt1.append('<a href=#>'+info.status+'</a>');
			elmt1.find('a').click(function() {
				view_console_output(info.job_id);
			});

			if (info.status=='error') {
				elmt2.html(info.error.slice(0,30));
				elmt2.attr('title',info.error);
			}
		}
		else {
			elmt1=$('<span>'+info.status+'</span>');
		}
		row.cell(0).append(elmt0);
		row.cell(1).append(elmt1);
		row.cell(2).append(elmt2);
		return row;
	}

	function view_console_output(job_id) {
		var J=m_batch_job.processorJob(job_id);
		if (!J) {
			console.error('Unable to find processor job with id: '+job_id);
			return;
		}
		var output=J.consoleOutput();
		console.log ('Console output for job: '+job_id);
		console.log (output);
		var dlg=new EditTextDlg();
		dlg.setText(output);
		dlg.setReadOnly(true);
		dlg.show();
	}

	update_layout();
	do_refresh();
}
