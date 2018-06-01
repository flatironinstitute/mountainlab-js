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

exports.AltMLSBatchScriptResultsWidget=AltMLSBatchScriptResultsWidget;

var JSQWidget=require('../mlscore/jsqcore/jsqwidget.js').JSQWidget;
var JSQObject=require('../mlscore/jsqcore/jsqobject.js').JSQObject;
var MLTableWidget=require('./mltablewidget.js').MLTableWidget;
var KBucketClient=require('../mlscore/kbucketclient2.js').KBucketClient;
var MLSBatchScript=require('../mlscore/mlsmanager.js').MLSBatchScript;
var mlutils=require('../mlscore/mlutils.js');
var jsutils=require('../mlscore/jsutils/jsutils.js');

function AltMLSBatchScriptResultsWidget(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('AltMLSBatchScriptResultsWidget');

	this.setBatchJob=function(BJ) {setBatchJob(BJ);};
	this.setMLSManager=function(MM) {m_mls_manager=MM;};
	this.refresh=function() {schedule_refresh();};
	
	var m_table=new MLTableWidget();
	var m_batch_job=null;
	var m_mls_manager=null;

	O.div().append(m_table.div());
	O.div().css({height:'100%',width:'100%',overflow:'auto'});

	function setBatchJob(BJ) {
		if (BJ==m_batch_job) return;
		m_batch_job=BJ;
		if (BJ) {
			JSQ.connect(BJ,'results_changed',O,function() {
				if (BJ==m_batch_job) { //still the same
					schedule_refresh();
				}
			});
			JSQ.connect(BJ,'completed',O,function() {
				if (BJ==m_batch_job) { //still the same
					schedule_refresh();
				}
			});
		}
		schedule_refresh();
	}

	var s_refresh_scheduled=false;
	var s_last_schedule_refresh=new Date();
	function schedule_refresh() {
		if (s_refresh_scheduled) return;
		s_refresh_scheduled=true;
		var elapsed=(new Date())-s_last_schedule_refresh;
		s_last_schedule_refresh=new Date();
		var msec=1000;
		if (elapsed>100) msec=100;
		setTimeout(function() {
			s_refresh_scheduled=false;
			do_refresh();
		},msec);
	}

	function do_refresh() {
		m_table.setColumnCount(4);
		m_table.headerRow().cell(0).html('Result');
		m_table.headerRow().cell(1).html('Status');
		m_table.headerRow().cell(2).html('Info');
		m_table.headerRow().cell(3).html('KBucket');
		m_table.clearRows();
		if (!m_batch_job) return;
		var names=m_batch_job.resultNames();
		for (var i in names) {
			var rname=names[i];
			var row=create_result_row(rname,m_batch_job.result(rname));
			m_table.addRow(row);
		}
		check_on_kbucket();
	}

	function create_result_row(rname,result) {
		var row=m_table.createRow();
		row.rname=rname;
		
		var elmt0=$('<span>'+rname+'</span>');;
		var elmt1=$('<span>'+result.status+'</span>');
		var elmt2=$('<span></span>');
		var elmt3=$('<span></span>');
		if (result.status=='error') {
			elmt3=$('<span>'+result.error+'</span>');
		}
		else if (result.status=='finished') {
			if (typeof(result.value)=='string') {
				elmt0=$('<a href=# title="'+result.value+'">'+rname+'</a>');
			}
			else if (result.value.prv) {
				row.prv=result.value.prv;
				elmt2.html(format_file_size(row.prv.original_size));
			}
			else {
				elmt0=$('<span><span id=open_view></span> <span>'+rname+'</span> <span class="download2_button octicon octicon-desktop-download" title="download result object"></span></span>');
				elmt0.find('.download2_button').click(function() {
					download_result_object(rname,result);
				});
				row.result_object=result.value;
				if (row.result_object.type=='tidbits') {
					row.result_object.url=m_mls_manager.mlsConfig().tidbits_url;
					//if (row.result_object.localhost)
					//	row.result_object.url='http://localhost:5092';
				}
				if (row.result_object.url) {
					var link0=$('<span class="view_button octicon octicon-search"></span>');
					link0.click(function() {
						open_result_object(row.result_object);
					});
					elmt0.find('#open_view').append(link0);					
				}
				else if (row.result_object.type=='widget') {
					var link0=$('<span class="view_button octicon octicon-search"></span>');
					link0.click(function() {
						popup_widget(m_mls_manager,row.result_object);
					});
					elmt0.find('#open_view').append(link0);
				}
			}
		}
		row.cell(0).append(elmt0);
		row.cell(1).append(elmt1);
		row.cell(2).append(elmt2);
		row.cell(3).append(elmt3);
		return row;
	}

	function download_result_object(rname,result) {
		download(JSON.stringify(result.value,null,4),rname);
	}

	function open_result_object(obj) {
		jsutils.http_post_json(obj.url+'/api/setConfig',{config:JSON.stringify(obj.data)},{},function(err,tmp) {
			if (err) {
				alert('Error posting data to '+obj.url+': '+err);
			}
			if (!tmp.success) {
				alert('Error posting data to '+obj.url+': '+tmp.error);
				return;
			}
			if (!tmp.id) {
				alert('Unexpected: Did not receive configuration id.');
				return;
			}
			window.open(obj.url+'?config_id='+tmp.id,'_blank');
		});
	}

	var check_on_kbucket_global_code=0;
	function check_on_kbucket() {
		check_on_kbucket_global_code++;
		var check_on_kbucket_local_code=check_on_kbucket_global_code;

		//todo: in kbucketclient, don't serve all the requests at once
		var rows0=[];
		for (var i=0; i<m_table.rowCount(); i++) {
			rows0.push(m_table.row(i));
			rows0[i].index=i;
		}
		foreach_async_aa(rows0,function(row0,cb0) {
			if (check_on_kbucket_global_code!=check_on_kbucket_local_code)
				return;
			if (row0.prv) {
				check_on_kbucket_2(row0,function() {
					cb0();
				});
			}
			else if (row0.result_object) {
				var prvs=get_prvs_from_result_object(row0.result_object);
				var total_size=0;
				for (var aa in prvs) {
					total_size+=prvs[aa].original_size;
				}
				row0.cell(2).html(prvs.length+' files, '+format_file_size(total_size));
				if (prvs.length>0) {
					check_multiple_on_kbucket_2(row0,prvs,function() {
						cb0();
					});
				}
				else {
					row0.cell(3).html('');
					cb0();
				}
			}
		},function() {
			//done
		});
	}

	function get_prvs_from_result_object(obj) {
		if (!obj) return [];
		if (typeof(obj)!='object') return [];
		if (obj.prv) {
			return [obj.prv];
		}
		var ret=[];
		for (var field in obj) {
			var tmp=get_prvs_from_result_object(obj[field]);
			for (var j in tmp) {
				ret.push(tmp[j]);
			}
		}
		return ret;
	}

	function foreach_async_aa(list,step,callback) {
		var ii=0;
		next_step();
		function next_step() {
			if (ii>=list.length) {
				callback();
				return;
			}
			setTimeout(function() {
				step(list[ii],function() {
					ii++;
					next_step();
				});
			},10);
		}
	}

	function check_multiple_on_kbucket_2(row,prvs,callback) {
		row.cell(3).html('checking');
		var rname=row.rname;
		var num_found=0;
		var num_not_found=0;
		var prvs_not_found=[];
		foreach_async_aa(prvs,function(prv0,cb) {
			check_on_kbucket_3(prv0,function(err,tmp) {
				if (err) {
					row.cell(3).html('Error checking: '+err);
					return;
				}
				if (tmp.found) {
					num_found++;
				}
				else {
					num_not_found++;
					prvs_not_found.push(prv0);
				}
				cb();
			});
		},function() {
			var txt;
			if (num_found>0) {
				txt='Found '+num_found+'/'+(num_found+num_not_found)+' files';
			}
			else {
				txt='';
			}
			var elmt0;
			if (num_not_found>0) {
				elmt1=$('<a href=# title="Click to transfer from processing server to kbucket">Transfer to kbucket</a>');
				elmt1.click(function() {
					row.cell(3).html('<span class=no>Uploading...</span>');
					row.upload_error='';
					upload_multiple_to_kbucket(prvs_not_found,function(err0) {
						if (err0) {
							if (err0) console.error(err0);
							row.upload_error=err0;
						}
						check_multiple_on_kbucket_2(row,prvs,null);
					});
				});
				elmt0=$('<span>'+txt+' </span>');
				elmt0.append(elmt1);
			}
			else {
				elmt0=$('<span>'+txt+'</span>');
			}
			row.cell(3).children().detach();
			row.cell(3).empty();
			row.cell(3).append(elmt0);
			if (callback) callback();
		});
	}

	function check_on_kbucket_2(row,callback) {
		row.cell(3).html('checking');
		var rname=row.rname;
		check_on_kbucket_3(row.prv,function(err,tmp) {
			if (err) {
				console.error('Error checking kbucket: '+err);
				row.cell(3).html('<span class=unknown>Error checking kbucket</span>');
				return;
			}
			if (tmp.found) {
				row.cell(3).html('<span class="download_button octicon octicon-cloud-download" title="download result file"></span> <span class=yes>On kbucket</span>');
				row.cell(3).find('.download_button').click(download_result_file);
			}
			else {
				var elmt;
				if ((m_batch_job)&&(m_batch_job.isCompleted())) {
					elmt=$('<span><a href=#><span class=no>Transfer to kbucket</span></a></span>');
					elmt.find('a').click(function() {
						row.cell(3).html('<span class=no>Uploading...</span>');
						row.upload_error='';
						transfer_to_kbucket(row.prv,function(err) {
							if (err) console.error(err);
							row.upload_error=err;
							check_on_kbucket_2(row,null);
						});
					});
				}
				else {
					elmt=$('<span><span class=no>Not found</span></span>');	
				}
				if (row.upload_error) {
					elmt.append(' Error uploading: '+row.upload_error);
				}
				row.cell(3).children().detach();
				row.cell(3).empty();
				row.cell(3).append(elmt);
			}
			if (callback) callback();
		});
		function download_result_file() {
			var prv=row.prv;
			prv.original_path=rname;
			mlutils.download_kbucket_file_from_prv(prv);
		}
	}

	function check_on_kbucket_3(prv,callback) {
		var KC=new KBucketClient();
		KC.setKBucketUrl(m_mls_manager.kBucketUrl());
		KC.findFile(prv.original_checksum,'',function(err,res) {
			callback(err,res);
		});
	}

	function upload_multiple_to_kbucket(prvs0,callback) {
		foreach_async_aa(prvs0,function(prv0,cb) {
			transfer_to_kbucket(prv0,function(err0) {
				if (err0) {
					callback(err0);
					return;
				}
				cb();
			})
		},function() {
			callback(null);
		});
	}

	function transfer_to_kbucket(prv,callback) {
		if (!m_mls_manager) {
			callback('MLS manager has not been set');
			return;
		}
		/*
		if (!m_mls_manager.kuleleClient()) {
			callback('KuleleClient has not been set');
			return;
		}
		*/
		var LC=m_mls_manager.lariClient();
		var job_id='';
		var qq={
			processor_name:'kbucket.upload',
			inputs:{file:prv},
			outputs:{},
			parameters:{},
			opts:{}
		};
		LC.queueProcess(qq,{},
			function(err,resp) {
				if (err) {
					console.error('Error queuing process: '+err);
					return;
				}
			    job_id=resp.job_id||'';
      			handle_process_probe_response(resp);
			}
		);
		function handle_process_probe_response(resp) {
			if (!resp.success) {
		      callback('Error uploading: '+resp.error);
			  return;
		    }
		    if (job_id!=resp.job_id) {
		      callback('Unexpected: job_id does not match response: '+job_id+'<>'+resp.job_id);
		      return;
		    }
		    if (resp.latest_console_output) {
		      var lines=resp.latest_console_output.split('\n');
		      for (var i in lines) {
		        if (lines[i].trim()) {
		          var str0='  |kbucket.upload| ';
		          while (str0.length<35) str0+=' ';
		          mlpLog({text:str0+lines[i]});
		        }
		      }
		    }
		    if (resp.complete) {
		      var err0='';
		      if (!resp.result) {
		        callback('Unexpected: result not found in process response.');
		        return;
		      }
		      var result=resp.result;
		      if (!result.success) {
		        if (!err0)
		          err0=result.error||'Unknown error';
		      }
		      if (err0) {
		        callback(err0);
		        return;
		      }
		      var KC=new KBucketClient();
		      KC.setKBucketUrl(m_mls_manager.kBucketUrl());
		      KC.clearCacheForFile(prv.original_checksum);
		      callback('');
		    }
		    else {
		      setTimeout(send_process_probe,5000);
		    }
		}
		function send_process_probe() {
		    var LC=m_mls_manager.lariClient();
		    LC.probeProcess(job_id,{},function(err,resp) {
				if (err) {
					console.error('Error probing processing: '+err);
					return;
				}
				handle_process_probe_response(resp);
		    });
		}
	}

	function format_file_size(size_bytes) {
	    var a=1024;
	    var aa=a*a;
	    var aaa=a*a*a;
	    if (size_bytes>aaa) {
	      return Math.floor(size_bytes/aaa)+' GB';
	    }
	    else if (size_bytes>aaa) {
	      return Math.floor(size_bytes/(aaa/10))/10+' GB';  
	    }
	    else if (size_bytes>aa) {
	      return Math.floor(size_bytes/aa)+' MB';
	    }
	    else if (size_bytes>aa) {
	      return Math.floor(size_bytes/(aa/10))/10+' MB';  
	    }
	    else if (size_bytes>10*a) {
	      return Math.floor(size_bytes/a)+' KB';
	    }
	    else if (size_bytes>a) {
	      return Math.floor(size_bytes/(a/10))/10+' KB';  
	    }
	    else {
	      return size_bytes+' bytes';
	    }
	}

	do_refresh();
}

function PopupDialog(O) {
	O=O||this;
	JSQObject(O);

	this.popup=function() {popup();};
	this.contentDiv=function() {return m_div.find('.modal-body')};
	this.onResize=function(handler) {JSQ.connect(O,'resized',O,handler);};

	var html=require('./altmlsbatchscriptresultswidget.html');
	var m_div=$(html).find('.PopupDialog').clone();

	var m_is_closed=false;

	m_div.find('.modal-content').resizable({
	    //alsoResize: ".modal-dialog",
	    resize: function() {O.emit('resized');}
	});
	m_div.find('.modal-content').draggable({
		handle: ".modal-header"
	});
	m_div.on('show.bs.modal', function () {
	    $(this).find('.modal-body').css({
	        'max-height':'100%'
	    });
	});
	m_div.on('hidden.bs.modal', function (e) {
	  m_is_closed=true;
	});
	m_div.find('.modal-body').attr('id',O.objectId());
	m_div.find('.modal-body').css({padding:0,overflow:'hidden'}); //important
	m_div.find('.modal-body').css({'min-width':300,'min-height':300});

	var timer=new Date();
	function check_size() {
		var new_size=[O.contentDiv().width(),O.contentDiv().height()];
		if ((new_size[0]!=0)&&(new_size[1]!=0)) {
			O.emit('resized'); //initial resize event
		}
		else {
			var elapsed=(new Date())-timer;
			var msec=1000;
			if (elapsed<5000) msec=100;
			if (!m_is_closed) {
				setTimeout(check_size,msec);
			}
		}
	}
	check_size();

	function popup() {
		$('body').append(m_div);
		m_div.modal({
			show:true,
			focus:true
		});
	}
}

function popup_widget(mls_manager,result_object) {

	get_study_object(function(study_object) {
		var X=new PopupDialog();
		X.popup();
		X.contentDiv().html('Running script...');

		window.popup_widget_show_args={div:X.contentDiv(),on_resize:X.onResize,data:result_object.data}; //the biggest hack!!
		var script='';
		if (result_object.show.study) {
			script+=`var A=require('${result_object.show.script}',${JSON.stringify(result_object.show.study)}); `;
		}
		else {
			script+=`var A=require('${result_object.show.script}'); `;	
		}
		script+=`exports.main=function() {A['${result_object.show.method}'](window.popup_widget_show_args);};`; //the biggest hack!

		var module_scripts={};
		var names0=mls_manager.study().batchScriptNames();
		for (var i in names0) {
			module_scripts[names0[i]]=mls_manager.study().batchScript(names0[i]);
		}
		window.popup_widget_show=null; //the biggest hack
		var script0=new MLSBatchScript({script:script});
		var J=mls_manager.batchJobManager().startBatchJob(script0,module_scripts,mls_manager.study().object());

		/*
		JSQ.connect(J,'completed',null,check_completed);
		-function check_completed() {
			if (J.isCompleted()) {
				if (window.popup_widget_show) {
					var tmp=window.popup_widget_show;
					window.popup_widget_show=null;
					tmp({div:X.contentDiv(),on_resize:X.onResize,data:result_object.data});
				}
				else {
					X.contentDiv().html('Error. popup_widget_show is null.');
				}
			}
		}
		*/

		//var js=study_object.scripts[result_object.show.script].script;
		//var scr=`(function() {var exports={}; ${js}; return exports;})()`;
		//var A=eval(scr);
		//A[result_object.show.method]({div:X.contentDiv(),on_resize:X.onResize,data:result_object.data});

		/*
		function require(str) {
	      var script_text='';
	      if (typeof(str)=='object') {
	        script_text=str.script||'';
	      }
	      else {
	        if (!(str in study_object.scripts)) {
	          throw new Error('Error in require, script not found: '+str);
	        }
	        script_text=study_object.scripts[str].script;
	      }
	      var script0='(function() {var exports={};'+script_text+'\n return exports;})()';
	      try {
	        var ret=eval(script0);
	        return ret;
	      }
	      catch(err) {
	        console.error('Error in module '+str+': '+err.message);
	        return;
	      }
	    }
	    */
	});

	function get_study_object(callback) {
		if (result_object.show.study) {
			var docstor_client=mls_manager.docStorClient();
			var owner=result_object.show.study.owner;
			var title=result_object.show.study.title;
			mlutils.download_document_content_from_docstor(docstor_client,owner,title,function(err,content) {
				if (err) {
					console.error('Error getting study: '+err);
					return;
				}
				var obj=try_parse_json(content);
				if (!obj) {
					console.error('Error parsing study JSON.');
					return;
				}
				callback(obj);
			});
		}
		else {
			callback(mls_manager.study().object());
		}
	}

    function try_parse_json(str) {
	    try {
	        return JSON.parse(str);
	    }
	    catch(err) {
	        return null;
	    }
	}
}