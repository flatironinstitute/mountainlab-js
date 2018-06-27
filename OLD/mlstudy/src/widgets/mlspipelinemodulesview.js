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
function MLSPipelineModulesView(O,options) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLSPipelineModulesView');

	if (!options) options={};

	this.setProcessorManager=function(PM) {m_pipeline_module_widget.setProcessorManager(PM);};
	this.setMLSManager=function(M) {setMLSManager(M);};
	this.refresh=function() {refresh();};

	var m_manager=null;


	var m_list_widget=new MLSPipelineModuleListWidget();
	var m_pipeline_module_widget=new MLSPipelineModuleWidget();

	var m_menu_bar=new MLMenuBar();
	var menu=m_menu_bar.addMenu('...');
	menu.addItem('Add new pipeline module...',add_new_pipeline_module);
	menu.addDivider();
	menu.addItem('Remove selected pipeline modules...',remove_selected_pipeline_modules);
	menu.addDivider();
	menu.addItem('Export selected pipeline modules...',export_selected_pipeline_modules);
	menu.addItem('Import pipeline module(s)...',import_pipeline_modules);

	m_list_widget.setParent(O);
	m_pipeline_module_widget.setParent(O);
	m_menu_bar.setParent(O);

	m_list_widget.onCurrentPipelineModuleChanged(refresh_pipeline_module);

	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var W=O.width();
		var H=O.height();
		var Hmenu=50;

		var W1=Math.max(200,Math.floor(W/10));
		var W2=W-W1;

		hmarg=5;
		m_menu_bar.setGeometry(hmarg,0,W1-hmarg*2,Hmenu);
		m_list_widget.setGeometry(hmarg,Hmenu,W1-hmarg*2,H-Hmenu);
		m_pipeline_module_widget.setGeometry(W1+hmarg,0,W2-hmarg*2,H);
	}

	function refresh() {
		m_list_widget.refresh();
		refresh_pipeline_module();
	}
	function refresh_pipeline_module() {
		var module_name=m_list_widget.currentPipelineModuleName();
		if (!module_name) {
			m_pipeline_module_widget.setPipelineModule(null);
			return;
		}
		var P=m_manager.study().pipelineModule(module_name);
		m_pipeline_module_widget.setPipelineModule(P);

		if (P) {
			P.onChanged(function() {
				if (module_name) {
					m_manager.study().setPipelineModule(module_name,P);
				}
			});
		}
	}

	function add_new_pipeline_module() {
		var pipeline_module_name=prompt('Pipeline module name:');
		if (!pipeline_module_name) return;
		m_manager.study().setPipelineModule(pipeline_module_name,new MLSPipelineModule());
		refresh();
		m_list_widget.setCurrentPipelineModuleName(pipeline_module_name);
	}

	function remove_selected_pipeline_modules() {
		var names=m_list_widget.selectedPipelineModuleNames();
		if (names.length==0) {
			alert('No pipeline modules selected.');
			return;
		}
		if (confirm('Remove '+names.length+' pipeline modules?')) {
			for (var i in names) {
				var name=names[i];
				m_manager.study().removePipelineModule(name);
			}
			refresh();
		}
	}

	function import_pipeline_modules() {
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
			if (!('pipeline_modules' in obj)) {
				if ('pipelines' in obj) {
					var imported_name=remove_file_extension(tmp.file_name);
					var obj2={pipeline_modules:{}};
					obj2.pipeline_modules[imported_name]=obj;
					obj=obj2;
				}
				else {
					alert('Missing json field: pipeline_modules');
					return;
				}
			}
			var last_name='';
			var count=0;
			for (var name in obj.pipeline_modules) {
				var X=new MLSPipelineModule();
				X.setObject(obj.pipeline_modules[name]);
				m_manager.study().setPipelineModule(name,X);
				last_name=name;
				count++;
			}
			refresh();
			if (last_name) {
				m_list_widget.setCurrentPipelineModuleName(last_name);
			}
			alert('Imported '+count+' pipeline modules.');
		});
	}

	function remove_file_extension(str) {
		var list=str.split('.');
		if (list.length>1)
			list=list.slice(0,list.length-1);
		return list.join('.');
	}

	function export_selected_pipeline_modules() {
		var names=m_list_widget.selectedPipelineModuleNames();
		if (names.length==0) {
			alert('No pipeline modules selected.');
			return;
		}
		var obj={pipeline_modules:{}};
		for (var i in names) {
			var name=names[i];
			var PM=m_manager.study().pipelineModule(name);
			if (!PM) {
				alert('Unable to find pipeline module: '+name);
				return;
			}
			obj.pipeline_modules[name]=PM.object();
		}

		var fname0='';
		if (names.length==1) {
			fname0=names[0]+'.json';
		}
		else {
			fname0='pipeline_modules.json';
		}
		fname0=prompt('Download '+names.length+' pipeline modules to file:',fname0);
		if (!fname0) return;
		
		download(JSON.stringify(obj,null,4),fname0);
	}

	function setMLSManager(M) {
		m_manager=M;
		m_pipeline_module_widget.setJobManager(M.jobManager());
		m_list_widget.setMLSManager(M);
		refresh();
		//m_pipeline_module_widget.setMLSManager(M);
	}

	update_layout();
}

