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
function MLSDatasetsView(O,options) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLSDatasetsView');

	if (!options) options={};

	this.setMLSManager=function(M) {setMLSManager(M); refresh();};
	this.refresh=function() {refresh();};

	var m_manager=null;

	var m_list_widget=new MLSDatasetListWidget();
	var m_dataset_widget=new MLSDatasetWidget();
	m_list_widget.onCurrentDatasetChanged(refresh_dataset);

	var m_menu_bar=new MLMenuBar();
	var menu=m_menu_bar.addMenu('...');
	menu.addItem('Add new dataset...',add_dataset);
	menu.addDivider();
	menu.addItem('Remove selected datasets...',remove_selected_datasets);
	menu.addDivider();
	menu.addItem('Import dataset(s) from JSON file...',import_datasets);
	menu.addItem('Export selected dataset(s) to JSON file...',export_datasets);

	m_list_widget.setParent(O);
	m_dataset_widget.setParent(O);
	m_menu_bar.setParent(O);

	JSQ.connect(m_dataset_widget,'download_kbucket_file_from_prv',O,function(sender,args) {
		O.emit('download_kbucket_file_from_prv',args);
	});

	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var W=O.width();
		var H=O.height();

		var W1=Math.max(200,Math.floor(W/10));
		var W2=W-W1;

		var H1=40;

		hmarg=5;
		m_menu_bar.setGeometry(hmarg,0,W1-hmarg*2,H1);
		m_list_widget.setGeometry(hmarg,H1,W1-hmarg*2,H-H1);
		m_dataset_widget.setGeometry(W1+hmarg,0,W2-hmarg*2,H);
	}

	function refresh() {
		m_list_widget.refresh();
		refresh_dataset();
	}
	function refresh_dataset() {
		var ds_id=m_list_widget.currentDatasetId();
		if (!ds_id) {
			m_dataset_widget.refresh();
			return;
		}
		/*
		var ds=m_manager.study().dataset(ds_id);
		if (!ds) {
			m_dataset_widget.refresh();
			return;	
		}
		*/
		m_dataset_widget.setDatasetId(ds_id);
		m_dataset_widget.refresh();
	}

	function add_dataset() {
		var dataset_id=prompt('Dataset ID:');
		if (!dataset_id) return;
		if (m_manager.study().dataset(dataset_id)) {
			alert('Error: Dataset with this id already exists.');
			return;
		}
		m_manager.study().setDataset(dataset_id,new MLSDataset());
		refresh();
		m_list_widget.setCurrentDatasetId(dataset_id);
	}

	function remove_selected_datasets() {
		var ids=m_list_widget.selectedDatasetIds();
		if (ids.length==0) {
			alert('No datasets selected.');
			return;
		}
		if (!confirm('Remove '+ids.length+' datasets?'))
			return;
		for (var i in ids) {
			var id=ids[i];
			m_manager.study().removeDataset(id);
		}
		refresh();
	}

	function export_datasets() {
		var ids=m_list_widget.selectedDatasetIds();
		if (ids.length==0) {
			alert('No datasets selected.');
			return;
		}
		var obj={datasets:{}};
		for (var i in ids) {
			var id=ids[i];
			var DS=obj.datasets[id]=m_manager.study().dataset(id);
			if (!DS) {
				alert('Unable to find dataset: '+id);
				return;
			}
			obj.datasets[id]=DS.object();
		}

		var fname0='';
		if (ids.length==1) {
			fname0=ids[0]+'.json';
		}
		else {
			fname0='datasets.json';
		}
		fname0=prompt('Download '+ids.length+' datasets into file:',fname0);
		if (!fname0) return;
		
		download(JSON.stringify(obj,null,4),fname0);
	}

	function import_datasets() {
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
			if (!('datasets' in obj)) {
				alert('Missing json field: datasets');
				return;
			}
			var last_id='';
			var count=0;
			for (var id in obj.datasets) {
				var DD=new MLSDataset();
				DD.setObject(obj.datasets[id]);
				m_manager.study().setDataset(id,DD);
				last_id=id;
				count++;
			}
			refresh();
			if (last_id) {
				m_list_widget.setCurrentDatasetId(last_id);
			}
			alert('Imported '+count+' datasets.');
		});
	}

	function setMLSManager(M) {
		m_manager=M;
		m_list_widget.setMLSManager(M);
		m_dataset_widget.setMLSManager(M);
	}

	update_layout();
}

