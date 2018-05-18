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

function MLSBatchScriptResultsWidget(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLSBatchScriptResultsWidget');

	this.setBatchJob=function(BJ) {setBatchJob(BJ);};
	this.setMLSManager=function(MM) {m_mls_manager=MM;};
	
	var m_table=new MLTableWidget();
	var m_batch_job=null;
	var m_mls_manager=null;

	m_table.setParent(O);

	JSQ.connect(O,'sizeChanged',O,update_layout);
  	function update_layout() {
		var W=O.width();
		var H=O.height();
		
		m_table.setGeometry(0,0,W,H);
	}

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
		if (elapsed>2000) msec=100;
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
				elmt0=$('<span><span id=open_view></span> <span>'+rname+'</span> <span class=download2_button title="download result object"></span></span>');
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
					var link0=$('<span class=view_button></span>');
					link0.click(function() {
						open_result_object(row.result_object);
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
		jsu_http_post_json(obj.url+'/api/setConfig',{config:JSON.stringify(obj.data)},{},function(tmp) {
			if (!tmp.success) {
				alert('Error posting data to '+obj.url+': '+tmp.error);
				return;
			}
			if (!tmp.object.success) {
				alert('Error in request to '+obj.url+': '+tmp.object.error);
				return;
			}
			if (!tmp.object.id) {
				alert('Unexpected: Did not receive configuration id.');
				return;
			}
			window.open(obj.url+'?config_id='+tmp.object.id,'_blank');
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
				row.cell(3).html('<span class=download_button title="download result file"></span> <span class=yes>On kbucket</span>');
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
			O.emit('download_kbucket_file_from_prv',{prv:prv});
		}
	}

	function check_on_kbucket_3(prv,callback) {
		var KC=new KBucketClient();
		KC.setKBucketUrl(m_mls_manager.kBucketUrl());
		KC.stat(prv.original_checksum,prv.original_size,function(err,res) {
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


	update_layout();
	do_refresh();
}
