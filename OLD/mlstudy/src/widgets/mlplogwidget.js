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

exports.MLPLogWidget=MLPLogWidget;

require('./mlplogwidget.css');

var JSQWidget=require('../mlscore/jsqcore/jsqwidget.js').JSQWidget;
var GLOBAL_LOG=require('../mlscore/mlplog.js').GLOBAL_LOG;

function MLPLogWidget(O,alt) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLPLogWidget');

	this.setMessageFilter=function(filter) {m_message_filter=filter;};

	var m_message_filter=function(msg) {return true;};

	O.div().css({height:'100%',width:'100%',overflow:'auto',"background-color": "black"});

	var m_message_table=$('<table></table>');
	O.div().append(m_message_table);

	if (!alt) {
		JSQ.connect(O,'sizeChanged',O,update_layout);
	  	function update_layout() {
			var W=O.width();
			var H=O.height();
			
			m_message_table.css({position:'absolute',left:0,top:0,width:W-5});
		}
	}

	GLOBAL_LOG.onMessage(function(msg) {
		if (m_message_filter(msg))
			add_message(msg);
	});

	function add_message(msg) {
		var obj=O.div()[0];
		var at_bottom = ( ( (obj.scrollHeight - obj.offsetHeight) - obj.scrollTop) <10 );

		var elmt=$('<span>'+msg.text+'<span>');
		if (msg.error) {
			elmt.addClass('error');
		}
		if (msg.bold) {
			elmt.addClass('bold');
		}
		if (msg.color) {
			elmt.css({color:msg.color});
		}

		var tr=$('<tr></tr>');
		var td=$('<td></td>'); tr.append(td);
		td.append(elmt);

		m_message_table.append(tr);

		if (at_bottom) {
			var height = O.div()[0].scrollHeight;
	    	O.div().scrollTop(height);
	    }
	}

	if (!alt) {
		update_layout();
	}
}
