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
function MLSBatchScriptWidget(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLSBatchScriptWidget');

	this.setBatchScript=function(X) {setBatchScript(X);};
	this.setProcessorManager=function(PM) {m_processor_manager=PM;};
	this.setJobManager=function(JM) {m_job_manager=JM;};
	this.batchScript=function() {return m_batch_script;};
	this.setScriptIsRunning=function(val) {setScriptIsRunning(val);};

	var m_batch_script=null;
	var m_processor_manager=null;
	var m_job_manager=null;

	var m_button_bar=$('<div class="MLSBatchScriptWidget-buttonbar"><span class=start_button></span><span class=stop_button></span></div>')
	m_button_bar.find('.start_button').attr('title','Run batch script');
	m_button_bar.find('.start_button').click(run_script);
	m_button_bar.find('.stop_button').attr('title','Stop batch script');
	m_button_bar.find('.stop_button').click(stop_script);
	O.div().append(m_button_bar);

	setScriptIsRunning(false);

	var m_script_editor_div=$('<div><textarea /></div>');
	var m_script_editor=CodeMirror.fromTextArea(m_script_editor_div.find('textarea')[0], {
    	lineNumbers: true,
    	mode: "javascript",
    	lint:true,
    	gutters: ["CodeMirror-lint-markers"]
  	});
  	m_script_editor.on('change',on_script_editor_changed);
  	O.div().append(m_script_editor_div);

  	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var W=O.width();
		var H=O.height();
		var H1=30;
		var xmarg=10;

		m_script_editor_div.css({left:xmarg,top:H1,width:W-xmarg*2,height:H-H1-20,position:'absolute'});
		m_script_editor.setSize(W-xmarg*2,H-H1-20);
		m_button_bar.css({left:xmarg+30,top:0,width:W-xmarg*2,height:H1,position:'absolute'});

		if (m_batch_script) {
			m_button_bar.css({visibility:''});
			m_script_editor_div.css({visibility:''});

			m_script_editor.refresh();
		}
		else {
			m_button_bar.css({visibility:'hidden'});
			m_script_editor_div.css({visibility:'hidden'});
		}
	}

	function setScriptIsRunning(val) {
		if (val) {
			m_button_bar.find('.start_button').css({visibility:'hidden'});
			m_button_bar.find('.stop_button').css({visibility:''});
		}
		else {
			m_button_bar.find('.start_button').css({visibility:''});
			m_button_bar.find('.stop_button').css({visibility:'hidden'});	
		}
	}

  	function setBatchScript(X) {
  		do_update_script_from_editor();
  		m_batch_script=X;
  		if (m_batch_script) {
  			m_script_editor.setValue(m_batch_script.script());
  		}
  		else {
  			m_script_editor.setValue('');
  		}
  		update_layout();
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
		if (m_batch_script) {
			m_batch_script.setScript(str);	
		}
	}
	function run_script() {
		/*
		if (m_processor_manager) {
			if (!m_processor_manager.specHasBeenSet()) {
				alert('The processor specification has not yet been downloaded from the server. Please try again in a few seconds.');
				return;
			}
		}
		*/	
		O.emit('run_script');
	}

	function stop_script() {
		O.emit('stop_script');
	}

	update_layout();
}