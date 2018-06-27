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

exports.EditTextDlg=EditTextDlg;

var JSQWidget=require('../mlscore/jsqcore/jsqwidget.js').JSQWidget;

function EditTextDlg(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('EditStepDialog');

	this.setLabel=function(label) {m_label=label;};
	this.show=function() {show();};
	this.setText=function(text) {m_textarea.val(text);};
	this.text=function() {return m_textarea.val();};
	this.setReadOnly=function(val) {setReadOnly(val);};
	this.onAccepted=function(callback) {JSQ.connect(O,'accepted',O,callback);};

	var m_label='Edit text';
	var m_text='';
	var m_dialog=null;

	var m_textarea=$('<textarea />');
	var m_container_div=$('<div />');
	//m_container_div.css({'overflow':'auto'});
	m_container_div.append(m_textarea);

	O.div().append(m_container_div);

	O.div().append('<div id=buttons><button id=cancel_button>Cancel</button><button id=ok_button>OK</button></div>');
	O.div().find('#cancel_button').click(on_cancel);
	O.div().find('#ok_button').click(on_ok);
	O.div().find('#buttons').css({position:'absolute',bottom:0,left:0});

	//make_editable(O.div().find('#processor_name'));

	function show() {
		var H0=Math.max($(document).height()-100,400);
		O.setSize(600,H0);
		var W=O.width();
		var H=O.height();
		m_container_div.css({position:'absolute',left:20,top:20,width:W-40,height:H-30-40});
		m_textarea.css({position:'absolute',left:0,top:0,width:m_container_div.width(),height:m_container_div.height()});
		m_dialog=$('<div id="dialog"></div>');
		
		m_dialog.css('overflow','hidden');
		m_dialog.append(O.div());
		$('body').append(m_dialog);
		m_dialog.dialog({width:W+20,
		              height:H+60,
		              resizable:false,
		              modal:true,
		              title:m_label});
	}

	function setReadOnly(val) {
		if (val) {
			m_textarea.attr('readonly','readonly');
		}
		else {
			m_textarea.attr('readonly','');	
		}
	}

	function on_cancel() {
		O.emit('rejected');
		m_dialog.dialog('close');

	}
	function on_ok() {
		O.emit('accepted');
		m_dialog.dialog('close');
	}
}