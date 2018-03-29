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

exports.AltMLSScriptWidget=AltMLSScriptWidget;

var JSQWidget=require('../mlscore/jsqcore/jsqwidget.js').JSQWidget;
var AltMLSBatchScriptResultsWidget=require('./altmlsbatchscriptresultswidget.js').AltMLSBatchScriptResultsWidget;
var MLPLogWidget=require('./mlplogwidget.js').MLPLogWidget;

function AltMLSScriptWidget(O) {
	O=O||this;
	
	var html=require('./altmlsscriptwidget.html');
	JSQWidget(O,$(html).find('.AltMLSScriptWidget').clone());

	this.setScript=function(X,script_name) {setScript(X,script_name);};
	this.setProcessorManager=function(PM) {m_processor_manager=PM;};
	this.setJobManager=function(JM) {m_job_manager=JM;};
	this.script=function() {return m_script;};
	this.setScriptIsRunning=function(val) {setScriptIsRunning(val);};
	this.setMLSManager=function(manager) {m_mls_manager=manager; m_results_widget.setMLSManager(manager);};
	this.setScriptJobLookup=function(lookup) {m_script_job_lookup=lookup;};
	this.refreshResults=function() {m_results_widget.refresh();};

	var m_script=null;
	var m_script_name='';
	var m_processor_manager=null;
	var m_job_manager=null;
	var m_mls_manager=null;
	var m_results_widget=new AltMLSBatchScriptResultsWidget();
	m_results_widget.div().css({"font-size":'12px'});
	var m_log_widget=new MLPLogWidget(null,true);
	var m_script_job_lookup=null;

	m_log_widget.setMessageFilter(function(msg) {
		if (msg.labels.script) return true;
		else return false;
	});

	O.div().find('#results_widget').append(m_results_widget.div());
	O.div().find('#log_widget').append(m_log_widget.div());

	/*
	var m_button_bar=$('<div class="MLSBatchScriptWidget-buttonbar"><span class=start_button></span><span class=stop_button></span></div>')
	m_button_bar.find('.start_button').attr('title','Run batch script');
	m_button_bar.find('.start_button').click(run_script);
	m_button_bar.find('.stop_button').attr('title','Stop batch script');
	m_button_bar.find('.stop_button').click(stop_script);
	O.div().append(m_button_bar);
	*/

	//var m_script_editor_div=$('<div><textarea /></div>');
	var m_script_editor=CodeMirror.fromTextArea(O.div().find('textarea.code_editor')[0], {
    	lineNumbers: true,
    	mode: "javascript",
    	lint:true,
    	gutters: ["CodeMirror-lint-markers"],
    	extraKeys: {"Alt-F": "findPersistent","F3":"findNext"}
  	});
  	m_script_editor.on('change',on_script_editor_changed);
  	//O.div().append(m_script_editor_div);

  	O.div().find('.CodeMirror').addClass('h-100');
  	O.div().find('.CodeMirror').css({width:'98%'});

  	O.div().find('#start_button').click(start_script_job);
  	O.div().find('#stop_button').click(stop_script_job);

  	O.div().find('#show_as_popup_widget').click(show_as_popup_widget);

  	update_buttons();
  	update_editor_visible();

  	function current_script_job() {
  		if (!m_script_job_lookup) return null;
  		return m_script_job_lookup.job(m_script_name);
  	}

  	function update_buttons() {
  		O.div().find('#stop_button').attr('disabled','disabled');
		O.div().find('#start_button').attr('disabled','disabled');
  		var J=current_script_job();
  		if ((!J)||(!J.isRunning())) {
  			O.div().find('#start_button').removeAttr('disabled');
  		}
  		else {
  			O.div().find('#stop_button').removeAttr('disabled');
  		}
  	}

  	function update_editor_visible() {
  		if (m_script) {
  			$(m_script_editor.getWrapperElement()).show();
  			//m_script_editor.setOption("readOnly", false)
  		}
  		else {
  			$(m_script_editor.getWrapperElement()).hide();
  			//m_script_editor.setOption("readOnly", true)	
  		}
  	}

  	function setScript(X,script_name) {
  		do_update_script_from_editor();
  		m_script=X;
  		m_script_name=script_name;
  		if (m_script) {
  			m_script_editor.setValue(m_script.script());
  			m_script_editor.refresh();
  		}
  		else {
  			m_script_editor.setValue('');
  			m_script_editor.refresh();
  		}
  		update_buttons();
  		update_editor_visible();
  		m_script_editor.refresh();

  		var J=m_script_job_lookup.job(script_name);
  		m_results_widget.setBatchJob(J);

  		O.refreshResults();
  	}

  	function on_script_editor_changed() {
		schedule_update_script_from_editor();
	}
	var m_update_script_from_editor_scheduled=false;
	function schedule_update_script_from_editor() {
		if (m_update_script_from_editor_scheduled) return;
		m_update_script_from_editor_scheduled=true;
		setTimeout(function() {
			m_update_script_from_editor_scheduled=false;
			do_update_script_from_editor();
		},1000);
	}
	function do_update_script_from_editor() {
		var str=m_script_editor.getValue();
		if (m_script) {
			m_script.setScript(str);	
		}
	}
	function start_script_job() {
		var module_scripts={};
		var names0=m_mls_manager.study().batchScriptNames();
		for (var i in names0) {
			module_scripts[names0[i]]=m_mls_manager.study().batchScript(names0[i]);
		}
		var J=m_mls_manager.batchJobManager().startBatchJob(m_script,module_scripts,m_mls_manager.study().object());
		m_script_job_lookup.setJob(m_script_name,J);
		m_results_widget.setBatchJob(J);
		update_buttons();
		JSQ.connect(J,'completed',O,function() {
			update_buttons();
		});

		O.emit('script-job-started');
	}

	function stop_script_job() {
		var J=current_script_job();
		if (!J) {
			alert('Unexpected: no script job found. Please report this issue.');
			return;
		}
		J.stop();
	}

	function show_as_popup_widget() {

		var result_object={
    		"type": "widget",
    		"show": {
        		"script": m_script_name,
        		"method": "show"
    		},
    		"data": {}
    	};

		popup_widget(m_mls_manager,result_object);

		/*

		if (!m_script) return;
		var X=new PopupDialog();
		X.popup();

		X.contentDiv().html('Running script...');

		var script='';
		script+=`var show=require('${m_script_name}').show;`;	
		script+=`window.popup_widget_show=show;`; //the biggest hack!

		var module_scripts={};
		var names0=m_mls_manager.study().batchScriptNames();
		for (var i in names0) {
			module_scripts[names0[i]]=m_mls_manager.study().batchScript(names0[i]);
		}
		window.popup_widget_show=null; //the biggest hack
		var script0=new MLSBatchScript({script:script});
		var J=m_mls_manager.batchJobManager().startBatchJob(script0,module_scripts,m_mls_manager.study().object());
		JSQ.connect(J,'completed',null,check_completed);
		function check_completed() {
			if (J.isCompleted()) {
				if (window.popup_widget_show) {
					window.popup_widget_show({div:X.contentDiv(),on_resize:X.onResize,data:null});
				}
				else {
					X.contentDiv().html('Error. popup_widget_show is null.');
				}
			}
		}
		*/

		/*
		var js=m_script.script();
		var scr=`(function() {var exports={}; ${js}; return exports;})()`;
		var A=eval(scr);
		A.show({div:X.contentDiv(),on_resize:X.onResize,data:null});
		*/
	}
}