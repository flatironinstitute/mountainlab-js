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
function MLSHomeView(O,options) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLSHomeView');

	if (!options) options={};

	this.setMLSManager=function(M) {setMLSManager(M); refresh();};
	this.setFileInfo=function(source,info) {m_top_widget.setFileInfo(source,info);};
	this.refresh=function() {refresh();};

	var m_manager=null;

	var m_top_widget=new MLSHomeViewTopWidget();
	var m_description_widget=new DescriptionWidget();
	m_description_widget.setLabel('Study description: ');

	JSQ.connect(m_top_widget,'goto_view',O,function(sender,args) {O.emit('goto_view',args);});

	m_top_widget.setParent(O);
	m_description_widget.setParent(O);

	m_description_widget.onDescriptionEdited(function() {;
		m_manager.study().setDescription(m_description_widget.description());
	});

	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var W=O.width();
		var H=O.height();

		var xmarg=50;
		var ymarg=10;
		var yspace=20;

		var H1=Math.min(300,Math.floor((H-ymarg*2-yspace)/2));
		var H2=H-ymarg*2-yspace-H1;

		m_top_widget.setGeometry(xmarg,ymarg,W-xmarg*2,H1);
		m_description_widget.setGeometry(xmarg,ymarg+H1+yspace,W-xmarg*2,H2);
	}

	function refresh() {
		var SS=m_manager.study();
		m_description_widget.setDescription(SS.description());
	}

	function setMLSManager(M) {
		m_manager=M;
		m_top_widget.setMLSManager(M);
	}

	update_layout();
}

function MLSHomeViewTopWidget(O,options) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLSHomeViewTopWidget');

	O.div().append('<h1><span id=study_info></span></h1>')
	O.div().append('<ul><li id=datasets /><li id=batch_scripts /></ul>');
	O.div().find('#datasets').append('<a href=# id=datasets_link></a>');
	//O.div().find('#pipeline_modules').append('<a href=# id=pipeline_modules_link></a>');
	O.div().find('#batch_scripts').append('<a href=# id=batch_scripts_link></a>');

	O.div().find('#datasets_link').click(function() {O.emit('goto_view',{name:'datasets'})});
	//O.div().find('#pipeline_modules_link').click(function() {O.emit('goto_view',{name:'pipeline_modules'})});
	O.div().find('#batch_scripts_link').click(function() {O.emit('goto_view',{name:'batch_scripts'})});

	if (!options) options={};

	var m_file_source='';
	var m_file_info={};

	this.setMLSManager=function(M) {setMLSManager(M); refresh();};
	this.setFileInfo=function(source,info) {m_file_source=source; m_file_info=JSQ.clone(info); refresh();};
	this.refresh=function() {refresh();};

	var m_manager=null;

	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var W=O.width();
		var H=O.height();
	}

	function refresh() {
		var str='';
		if (m_file_source=='browser_storage')
			str='Browser document: '+(m_file_info.title||'');
		else if (m_file_source=='docstor')
			str='Cloud document: '+m_file_info.title+' ('+m_file_info.owner+')';
		O.div().find('#study_info').html(str);

		var num_datasets=m_manager.study().datasetIds().length;
		str=num_datasets+' dataset';
		if (num_datasets!=1) str+='s';
		O.div().find('#datasets_link').html(str);

		/*
		var num_pipeline_modules=m_manager.study().pipelineModuleNames().length;
		str=num_pipeline_modules+' pipeline module';
		if (num_pipeline_modules!=1) str+='s';
		O.div().find('#pipeline_modules_link').html(str);
		*/

		var num_batch_scripts=m_manager.study().batchScriptNames().length;
		str=num_batch_scripts+' batch script';
		if (num_batch_scripts!=1) str+='s';
		O.div().find('#batch_scripts_link').html(str);
	}

	function setMLSManager(M) {
		m_manager=M;
	}

	update_layout();
}

