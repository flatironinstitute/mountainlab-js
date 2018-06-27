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

function MLSProcessorsWidget(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLSProcessorsWidget');

	this.setMLSManager=function(MM) {setMLSManager(MM);};
	
	var m_table=new MLTableWidget();
	var m_mls_manager=null;

	m_table.setParent(O);

	JSQ.connect(O,'sizeChanged',O,update_layout);
  	function update_layout() {
		var W=O.width();
		var H=O.height();
		
		m_table.setGeometry(0,0,W,H);
	}

	var s_refresh_scheduled=false;
	function schedule_refresh() {
		if (s_refresh_scheduled) return;
		s_refresh_scheduled=true;
		setTimeout(function() {
			s_refresh_scheduled=false;
			do_refresh();
		},100);
	}

	function do_refresh() {
		m_table.setColumnCount(4);
		m_table.headerRow().cell(0).html('Processor');
		m_table.headerRow().cell(1).html('Inputs');
		m_table.headerRow().cell(2).html('Outputs');
		m_table.headerRow().cell(3).html('Parameters');
		m_table.clearRows();

		if (!m_mls_manager) return;

		/*
		var KC=m_mls_manager.kuleleClient();
		if (!KC) return;

		var spec=KC.processorSpec(null);
		var processors=spec.processors||[];
		for (var i in processors) {
			var P=processors[i];
			var row0=create_processor_row(P);
			m_table.addRow(row0);
		}
		*/
	}

	function create_processor_row(P) {
		var row=m_table.createRow();
		row.P=JSQ.clone(P);
		
		var elmt0=$('<span>'+P.name+'</span>');
		elmt1=get_inputs_element(P.inputs||[]);
		elmt2=get_outputs_element(P.outputs||[]);
		elmt3=get_parameters_element(P.parameters||[]);
		
		row.cell(0).append(elmt0);
		row.cell(1).append(elmt1);
		row.cell(2).append(elmt2);
		row.cell(3).append(elmt3);
		return row;

		function get_inputs_element(inputs) {
			var ret=$('<span></span>');
			for (var i=0; i<inputs.length; i++) {
				if (i>0) {
					ret.append(',&nbsp;');
				}
				var aa=$('<span>'+inputs[i].name+'</span>');
				if (inputs[i].optional) {
					aa.css({color:'gray'});
					aa.html('['+inputs[i].name+']');
					if (inputs[i].default_value) {
						aa.attr('title','default = '+inputs[i].default_value);
					}
				}
				ret.append(aa);
				ret.append('<sp')
			}
			return ret;
		}
		function get_outputs_element(outputs) {
			return get_inputs_element(outputs);
		}
		function get_parameters_element(parameters) {
			return get_inputs_element(parameters);
		}
	}

	function setMLSManager(MM) {
		m_mls_manager=MM;
		/*
		if (MM.kuleleClient()) {
			JSQ.connect(MM.kuleleClient(),'processor_spec_changed',O,schedule_refresh);
		}
		*/
		schedule_refresh();
	}

	update_layout();
	schedule_refresh();
}
