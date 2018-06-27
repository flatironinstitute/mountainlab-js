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
function AltMLSWebModuleWidget(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('AltMLSWebModuleWidget');

	this.setWebModule=function(X,web_module_name) {setWebModule(X,web_module_name);};
	this.setProcessorManager=function(PM) {m_processor_manager=PM;};
	this.webModule=function() {return m_web_module;};
	this.setMLSManager=function(manager) {m_mls_manager=manager;};

	var m_web_module=null;
	var m_web_module_name='';
	var m_processor_manager=null;
	var m_mls_manager=null;
	var m_log_widget=new MLPLogWidget(null,true);
	var m_content_mode_for_editor='JavaScript';

	O.div().append($('#template-AltMLSWebModuleWidget').children().clone());

	O.div().css({display:'flex',"flex-flow":"row"});

	O.div().find('#log_widget').append(m_log_widget.div());

	O.div().find('#show_popup').click(show_popup);

	//var m_script_editor_div=$('<div><textarea /></div>');
	var m_content_editor=CodeMirror.fromTextArea(O.div().find('textarea.code_editor')[0], {
    	lineNumbers: true,
    	mode: "javascript",
    	lint:true,
    	gutters: ["CodeMirror-lint-markers"],
    	extraKeys: {"Alt-F": "findPersistent","F3":"findNext"}
  	});
  	m_content_editor.on('change',on_content_editor_changed);
  	//O.div().append(m_script_editor_div);

  	var buttons=O.div().find('.content_mode');
  	for (var i=0; i<buttons.length; i++) {
  		$(buttons[i]).find('input[type=radio]').change(function() {
  			do_update_content_from_editor();
  			do_update_content_to_editor();
  		});
  	}

  	O.div().find('.CodeMirror').addClass('h-100');
  	O.div().find('.CodeMirror').css({width:'98%'});

  	update_buttons();
  	update_editor_visible();

  	function update_buttons() {
  	}

  	function update_editor_visible() {
  		if (m_web_module) {
  			$(m_content_editor.getWrapperElement()).show();
  			//m_script_editor.setOption("readOnly", false)
  		}
  		else {
  			$(m_content_editor.getWrapperElement()).hide();
  			//m_script_editor.setOption("readOnly", true)	
  		}
  	}

  	function get_content_mode() {
  		var checked_elmt=O.div().find('.content_mode input[type=radio]:checked');
  		return checked_elmt.attr('data-content-mode')||'';
  	}

  	function setWebModule(X,web_module_name) {
  		do_update_content_from_editor();
  		m_web_module=X;
  		m_web_module_name=web_module_name;
  		do_update_content_to_editor();
  		update_buttons();
  		update_editor_visible();
  		m_content_editor.refresh();
  	}

  	function on_content_editor_changed() {
		schedule_update_content_from_editor();
	}
	var m_update_content_from_editor_scheduled=false;
	function schedule_update_content_from_editor() {
		if (m_update_content_from_editor_scheduled) return;
		m_update_content_from_editor_scheduled=true;
		setTimeout(function() {
			m_update_content_from_editor_scheduled=false;
			do_update_content_from_editor();
		},1000);
	}
	function do_update_content_to_editor() {
  		var content_mode=get_content_mode();
  		if (m_web_module) {
  			m_content_editor.setValue(m_web_module.content()[content_mode]||'');
  			m_content_editor.refresh();
  		}
  		else {
  			m_content_editor.setValue('');
  			m_content_editor.refresh();
  		}
  		var cm_mode=content_mode.toLowerCase();
  		if (cm_mode=='html') cm_mode='htmlmixed';
  		m_content_editor.setOption('mode',cm_mode);
  		m_content_mode_for_editor=content_mode;
  		m_content_editor.refresh();
  	}
	function do_update_content_from_editor() {
		var str=m_content_editor.getValue();
		if (m_web_module) {
			var content=m_web_module.content();
			content[m_content_mode_for_editor]=str;
			m_web_module.setContent(content);	
		}
	}
	function show_popup() {
		if (!m_web_module) return;
		var content=m_web_module.content();
		var X=new PopupDialog();
		X.popup();
		X.contentDiv().html('<h3>Running...</h3>');
		//var id0=X.div().find('.modal-body').attr('id');
		var script0=`(function(_HTML,_DIV) { var exports={}; ${content.JavaScript||''} return exports; })`;
		var func=eval(script0);
		var A=func(content.HTML);
		X.contentDiv().empty();
		var div=X.contentDiv();
		div.onresize=function(handler) {
			X.onResize(handler);
		}
		A.popup(div);
	}
}

