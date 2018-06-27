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
function MLSBatchScriptsView(O,options) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLSBatchScriptsView');

	if (!options) options={};

	this.setProcessorManager=function(PM) {m_batch_script_widget.setProcessorManager(PM);};
	this.setMLSManager=function(M) {setMLSManager(M);};
	this.refresh=function() {refresh();};
	this.getResultsByScript=function() {return getResultsByScript();};
	this.setResultsByScript=function(X) {setResultsByScript(X);};

	var m_manager=null;
	var m_batch_jobs_by_batch_script_name={};

	var m_list_widget=new MLSBatchScriptListWidget();
	var m_batch_script_widget=new MLSBatchScriptWidget();
	JSQ.connect(m_batch_script_widget,'run_script',O,run_script);
	JSQ.connect(m_batch_script_widget,'stop_script',O,stop_script);

	var m_menu_bar=new MLMenuBar();
	var menu=m_menu_bar.addMenu('...');
	menu.addItem('Add new batch script...',add_new_batch_script);
	menu.addDivider();
	menu.addItem('Export selected batch scripts...',export_selected_batch_scripts);
	menu.addItem('Import batch script(s)...',import_batch_scripts);
	menu.addDivider();
	menu.addItem('Remove selected batch scripts...',remove_selected_batch_scripts);

	var m_tab_widget=new JSQTabWidget();
	var m_log_widget=new MLPLogWidget();
	var m_results_container=new ResultsContainer();
	var m_results_widget=new MLSBatchScriptResultsWidget();
	m_results_container.setResultsWidget(m_results_widget);
	var m_jobs_widget=new MLSBatchScriptJobsWidget();

	//var m_processors_widget=new MLSProcessorsWidget();
	m_tab_widget.addTab(m_results_container,'Results');
	m_tab_widget.addTab(m_log_widget,'Console');
	m_tab_widget.addTab(m_jobs_widget,'Jobs');
	//m_tab_widget.addTab(m_processors_widget,'Processors');
	m_tab_widget.setCurrentTabIndex(0);

	m_list_widget.setParent(O);
	m_batch_script_widget.setParent(O);
	m_menu_bar.setParent(O);
	m_tab_widget.setParent(O);

	m_list_widget.onCurrentBatchScriptChanged(refresh_batch_script);

	JSQ.connect(m_results_widget,'download_kbucket_file_from_prv',O,function(sender,args) {
		O.emit('download_kbucket_file_from_prv',args);
	});

	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var W=O.width();
		var H=O.height();
		var Hmenu=50;

		var W1=Math.max(300,Math.floor(W/5));
		var W3=Math.min(700,Math.max(200,(W-W1)/2));
		if (W3==500) W3=Math.max(700,(W-W1)/3);
		var W2=W-W1-W3;

		var xmarg=5;
		m_menu_bar.setGeometry(xmarg,0,W1-hmarg*2,Hmenu);
		m_list_widget.setGeometry(hmarg,Hmenu,W1-hmarg*2,H-Hmenu);
		m_batch_script_widget.setGeometry(W1,0,W2,H);
		m_tab_widget.setGeometry(W1+W2,0,W3,H);
	}

	function refresh() {
		m_list_widget.refresh();
		refresh_batch_script();
		update_results_widget();
	}
	function refresh_batch_script() {
		var batch_script_name=m_list_widget.currentBatchScriptName();
		if (!batch_script_name) {
			m_batch_script_widget.setBatchScript(null);
			update_results_widget();
			return;
		}
		var P=m_manager.study().batchScript(batch_script_name);
		m_batch_script_widget.setBatchScript(P);

		if (P) {
			P.onChanged(function() {
				if (batch_script_name) {
					m_manager.study().setBatchScript(batch_script_name,P);
				}
			});
		}
		update_results_widget();
	}

	function getResultsByScript() {
		var ret={};
		for (var script_name in m_batch_jobs_by_batch_script_name) {
			var batch_job0=m_batch_jobs_by_batch_script_name[script_name];
			if (batch_job0) {
				var results0=batch_job0.results();
				ret[script_name]=results0;
			}
		}
		return ret;
	}

	function setResultsByScript(X) {
		for (var script_name in X) {
			var dummy_job0=new BatchJob(null,m_manager.lariClient());
			dummy_job0.setResults(X[script_name]);
			m_batch_jobs_by_batch_script_name[script_name]=dummy_job0;
		}
	}

	function update_results_widget() {
		var batch_script_name=m_list_widget.currentBatchScriptName();
  		if (!batch_script_name) {
  			m_results_widget.setBatchJob(null);
  			m_jobs_widget.setBatchJob(null);
  			return;
  		}
  		var job=m_batch_jobs_by_batch_script_name[batch_script_name]||null;
  		m_results_widget.setBatchJob(job);
  		m_jobs_widget.setBatchJob(job);
	}

	function add_new_batch_script() {
		var batch_script_name=prompt('Batch script name:');
		if (!batch_script_name) return;
		m_manager.study().setBatchScript(batch_script_name,new MLSBatchScript());
		refresh();
		m_list_widget.setCurrentBatchScriptName(batch_script_name);
	}

	function remove_selected_batch_scripts() {
		var names=m_list_widget.selectedBatchScriptNames();
		if (names.length==0) {
			alert('No batch scripts selected.');
			return;
		}
		if (confirm('Remove '+names.length+' batch scripts?')) {
			for (var i in names) {
				var name=names[i];
				m_manager.study().removeBatchScript(name);
			}
			refresh();
		}
	}

	function import_batch_scripts() {
		var UP=new FileUploader();
		UP.uploadTextFile({},function(tmp) {
			if (!tmp.success) {
				alert(tmp.error);
				return;
			}
			var obj=try_parse_json(tmp.text);
			if (!obj) {
				alert('Error parsing json');
				return;
			}
			if (!('batch_scripts' in obj)) {
				alert('Missing json field: batch_scripts');
				return;
			}
			var last_name='';
			var count=0;
			for (var name in obj.batch_scripts) {
				var X=new MLSBatchScript();
				X.setObject(obj.batch_scripts[name]);
				m_manager.study().setBatchScript(name,X);
				last_name=name;
				count++;
			}
			refresh();
			if (last_name) {
				m_list_widget.setCurrentBatchScriptName(last_name);
			}
			alert('Imported '+count+' batch scripts.');
		});
	}

	function remove_file_extension(str) {
		var list=str.split('.');
		if (list.length>1)
			list=list.slice(0,list.length-1);
		return list.join('.');
	}

	function export_selected_batch_scripts() {
		var names=m_list_widget.selectedBatchScriptNames();
		if (names.length==0) {
			alert('No batch scripts selected.');
			return;
		}
		var obj={batch_scripts:{}};
		for (var i in names) {
			var name=names[i];
			var PM=m_manager.study().batchScript(name);
			if (!PM) {
				alert('Unable to find batch script: '+name);
				return;
			}
			obj.batch_scripts[name]=PM.object();
		}

		var fname0='';
		if (names.length==1) {
			fname0=names[0]+'.json';
		}
		else {
			fname0='batch_scripts.json';
		}
		fname0=prompt('Download '+names.length+' batch scripts to file:',fname0);
		if (!fname0) return;
		
		download(JSON.stringify(obj,null,4),fname0);
	}

	function run_script() {
		var BJM=m_manager.batchJobManager();
		if (BJM.runningJobCount()>0) {
			alert('Cannot start job. A job is already running.');
			return;
		}
		var module_scripts={};
		var names0=m_manager.study().batchScriptNames();
		for (var i in names0) {
			module_scripts[names0[i]]=m_manager.study().batchScript(names0[i]);
		}
		var job=BJM.startBatchJob(m_batch_script_widget.batchScript(),module_scripts,m_manager.study().object());
		JSQ.connect(job,'results_changed',O,function() {O.emit('results_changed');});
		JSQ.connect(job,'completed',O,function() {
			m_batch_script_widget.setScriptIsRunning(false);
		});
		var batch_script_name=m_list_widget.currentBatchScriptName();
		m_batch_jobs_by_batch_script_name[batch_script_name]=job;
		update_results_widget();
		m_batch_script_widget.setScriptIsRunning(true);
	}

	function stop_script() {
		var BJM=m_manager.batchJobManager();
		var batch_script_name=m_list_widget.currentBatchScriptName();
		var job=m_batch_jobs_by_batch_script_name[batch_script_name];
		job.stop();
	}

	function setMLSManager(M) {
		m_manager=M;
		m_batch_script_widget.setJobManager(M.jobManager());
		m_list_widget.setMLSManager(M);
		m_results_widget.setMLSManager(M);
		m_jobs_widget.setMLSManager(M);
		//m_processors_widget.setMLSManager(M);
		refresh();
		//m_batch_script_widget.setMLSManager(M);
	}

	update_layout();
}

function ResultsContainer(O) {
	O=O||this;
	JSQWidget(O);

	this.setResultsWidget=function(W) {setResultsWidget(W);};

	var m_results_widget=null;
	var m_log_widget=new MLPLogWidget();
	m_log_widget.setParent(O);

	O.div().addClass('ResultsContainer');

	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var W=O.width();
		var H=O.height();

		yspace=20;
		var H2=Math.min(H/2,Math.max(100,H/6));
		var H1=H-H2-yspace;
		
		if (m_results_widget) 
			m_results_widget.setGeometry(0,0,W,H1);
		m_log_widget.setGeometry(0,H1+yspace,W,H2);
	}

	function setResultsWidget(W) {
		m_results_widget=W;
		W.setParent(O);
		update_layout();
	}
}