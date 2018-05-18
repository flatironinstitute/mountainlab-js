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
function MLSPipelineModuleWidget(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLSPipelineModulesView');

	this.setPipelineModule=function(X) {setPipelineModule(X);};
	this.setProcessorManager=function(PM) {m_pipeline_widget.setProcessorManager(PM);};
	this.setJobManager=function(JM) {m_pipeline_widget.setJobManager(JM);};

	var m_pipeline_module=null;
	var m_list_widget=new MLPipelineListWidget(0);
	var m_pipeline_widget=new EditMLPipelineWidget();
	m_list_widget.setParent(O);
	m_pipeline_widget.setParent(O);

	m_list_widget.onCurrentPipelineChanged(refresh_pipeline);

	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var widgets=[m_list_widget,m_pipeline_widget];
		if (m_pipeline_module) {
			for (var i in widgets) {
				widgets[i].show();
			}
		}
		else {
			for (var i in widgets) {
				widgets[i].hide();
			}
		}
		
		var W=O.width();
		var H=O.height();

		var W1=Math.max(350,Math.floor(W/5));
		var W2=W-W1;

		hmarg=5;
		m_list_widget.setGeometry(hmarg,0,W1-hmarg*2,H);
		m_pipeline_widget.setGeometry(W1+hmarg,0,W2-hmarg*2,H);
	}

	function setPipelineModule(X) {
		m_pipeline_module=X;
		m_list_widget.setPipelineModule(X);
		m_list_widget.setCurrentPipelineName('');
		update_layout();
	}

	function refresh_pipeline() {
		if (!m_pipeline_module) {
			m_pipeline_widget.setPipeline(null);
			return;
		}
		var pname=m_list_widget.currentPipelineName();
		var MLP=m_pipeline_module.pipelineByName(pname);
		if (MLP) {
			MLP.onChanged(function() {
				m_pipeline_module.setPipelineByName(MLP);
			});
		}

		m_pipeline_widget.setPipeline(MLP);

		/*
		var pname=m_list_widget.currentPipelineModuleName();
		if (!pname) {
			m_pipeline_widget.setPipeline(new MLPipeline());
			return;
		}
		var P0=new MLPipeline();
		var P=m_manager.study().pipelineModule(pname);
		if (P) {
			P0.setObject(P.object());
		}
		m_pipeline_widget.setPipeline(P0);
		P0.onChanged(function() {
			if (pname) {
				var PP=new MLSPipelineModule();
				PP.setObject(P0.object());
				m_manager.study().setPipelineModule(pname,PP);
			}
		});
		*/
	}

	update_layout();
}

