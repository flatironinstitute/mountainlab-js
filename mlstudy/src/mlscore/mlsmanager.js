exports.MLSManager=MLSManager;
exports.MLSBatchScript=MLSBatchScript;
exports.MLSDataset=MLSDataset;

var JSQObject=require('./jsqcore/jsqobject.js').JSQObject;
var LocalStorage=require('./jsutils/localstorage.js').LocalStorage;
var LariClient=require('./lariclient.js').LariClient;
var mlpLog=require('./mlplog.js').mlpLog;
var BatchJob=require('./batchjob.js').BatchJob;

function MLSManager(O) {
  O=O||this;
  JSQObject(O);

	this.setMLSObject=function(X) {m_study.setObject(X);};
  this.setMLWObject=function(X) {m_workspace.setObject(X);};
  this.study=function() {return m_study;};
  this.workspace=function() {/*return m_workspace;*/ return m_study;};
  this.setLoginInfo=function(info) {m_login_info=JSQ.clone(info); O.emit('login-info-changed');};
  this.loginInfo=function() {return JSQ.clone(m_login_info);};
  this.kBucketAuthUrl=function() {return kBucketAuthUrl();};
  this.kBucketUrl=function() {return kBucketUrl();};
  this.user=function() {return user();};
  this.setJobManager=function(JM) {m_job_manager=JM;};
  this.jobManager=function() {return m_job_manager;};
  this.batchJobManager=function() {return m_batch_job_manager;};
  //this.setKuleleClient=function(KC) {m_batch_job_manager.setKuleleClient(KC);};
  //this.kuleleClient=function() {return m_batch_job_manager.kuleleClient();};
  this.setDocStorClient=function(DSC) {m_docstor_client=DSC; m_batch_job_manager.setDocStorClient(DSC);};
  this.docStorClient=function() {return m_docstor_client;};
  this.mlsConfig=function() {return mlsConfig();};
  this.setMLSConfig=function(config) {setMLSConfig(config);};
  this.onConfigChanged=function(handler) {m_config_changed_handlers.push(handler);};
  this.defaultMLSConfig=function() {return JSQ.clone(default_config);};
  this.lariClient=function() {return m_lari_client;};
  this.clear=function() {clear();};

  var m_lari_client=new LariClient();
  m_lari_client.setContainerId('child');
  clear(); //creates m_study, m_workspace and m_batch_job_manager

  var m_login_info={};
  var m_job_manager=null;
  var m_config_changed_handlers=[];
  var m_docstor_client=null;

  JSQ.connect(m_batch_job_manager,'results_changed',O,'results_changed');

  var default_config={
    //kulele_url:'https://kulele.herokuapp.com',
    lari_url:'https://lari1.herokuapp.com',
    kbucket_url:'https://kbucket.flatironinstitute.org',
    //kbucket_url:'https://river.simonsfoundation.org',
    kbucketauth_url:'https://kbucketauth.herokuapp.com',
    docstor_url:'https://docstor1.herokuapp.com',
    tidbits_url:'https://tidbits1.herokuapp.com',
    processing_server:'default',
    pool_id:'default',
  };

  var obj=mlsConfig();  
  setMLSConfig(obj);
  
  function mlsConfig() {
    var LS=new LocalStorage();
    var obj=LS.readObject('mls_config2')||{};
    var obj2={};
    for (var key in default_config) {
      obj2[key]=obj[key]||default_config[key];
    }
    return obj2;
  }

  function setMLSConfig(obj) {
    for (var key in default_config) {
      if (obj[key]) {
        if (obj[key]==default_config[key])
          obj[key]='';
      }
      else {
        obj[key]='';
      }
    }

    var LS=new LocalStorage();
    LS.writeObject('mls_config2',obj);
    m_batch_job_manager.setKBucketUrl(mlsConfig().kbucket_url);
    m_lari_client.setLariServerUrl(mlsConfig().lari_url);
    m_lari_client.setContainerId(mlsConfig().processing_server);
    m_lari_client.setPoolID(mlsConfig().pool_id);

    for (var i in m_config_changed_handlers) {
      m_config_changed_handlers[i]();
    }
  }

  function kBucketAuthUrl() {
    return mlsConfig().kbucketauth_url;
  }

  function kBucketUrl() {
    return mlsConfig().kbucket_url;
  }
  function user() {
    if (m_login_info.google_profile) {
      return m_login_info.google_profile.U3||'';
    }
    else return '';
  }
  function clear() {
    m_study=new MLStudy(null);
    m_batch_job_manager=new BatchJobManager();
    m_batch_job_manager.setLariClient(m_lari_client);
    m_batch_job_manager.setDocStorClient(m_docstor_client);
    m_batch_job_manager.setKBucketUrl(mlsConfig().kbucket_url);

    m_workspace=new MLWorkspace(null);
  }
}

function MLWorkspace(O) {
  O=O||this;
  JSQObject(O);

  var that=this;

  this.object=function() {return JSQ.clone(m_object);};
  this.setObject=function(obj) {setObject(obj);};

  this.description=function() {return description();};
  this.setDescription=function(str) {setDescription(str);};

  this.fileNames=function() {return fileNames();};
  this.file=function(name) {return file(name);};
  this.setFile=function(name,F) {return setFile(name,F);};
  this.createFile=function() {return new MLWFile();};
  this.changeFileName=function(name,new_name) {changeFileName(name,new_name);};
  this.removeFile=function(name) {removeFile(name);};

  var m_object={
    description:'',
    files:{}
  };

  function setObject(obj) {
    if (JSON.stringify(m_object)==JSON.stringify(obj)) return;
    m_object=JSQ.clone(obj);

    m_object.files=m_object.files||{};
    O.emit('changed');
  }

  function description() {
    return m_object.description||'';
  }

  function setDescription(str) {
    if (m_object.description==str) return;
    m_object.description=str;
    O.emit('changed');
  }

  function fileNames() {
    var files=m_object.files||{};
    return Object.keys(files);
  }

  function file(name) {
    var files=m_object.files||{};
    if (!(name in files))
      return null;
    var F=new MLWFile();
    F.setObject(files[name]);
    return F;
  }
  function setFile(name,F) {
    m_object.files=m_object.files||{};
    m_object.files[name]=F.object();
    O.emit('changed');
  }
  function changeFileName(name,name_new) {
    if (name==name_new) return;
    var X=file(name);
    if (!X) return;
    removeFile(name);
    setFile(name_new,X); 
  }
  function removeFile(name) {
    if (name in (m_object.files||{})) {
      delete m_object.files[name];
      O.emit('changed');
    }
  }
}

function MLWFile() {
  var that=this;
  this.setObject=function(obj) {m_object=JSQ.clone(obj); m_object.content=m_object.content||'';};
  this.object=function() {return JSQ.clone(m_object);};
  this.content=function() {return m_object.content||'';};
  this.setContent=function(content) {m_object.content=content;};

  var m_object={content:''};
}



function MLStudy(O) {
  O=O||this;
  JSQObject(O);

  var that=this;
  
  this.object=function() {return JSQ.clone(m_object);};
  this.setObject=function(obj) {setObject(obj);};

  this.description=function() {return description();};
  this.setDescription=function(str) {setDescription(str);};

  this.datasetIds=function() {return datasetIds();};
  this.dataset=function(id) {return dataset(id);};
  this.setDataset=function(id,X) {setDataset(id,X);};
  this.removeDataset=function(id) {removeDataset(id);};
  this.changeDatasetId=function(id,id_new) {changeDatasetId(id,id_new);};

  this.batchScriptNames=function() {return batchScriptNames();};
  this.batchScript=function(name) {return batchScript(name);};
  this.setBatchScript=function(name,X) {setBatchScript(name,X);};
  this.removeBatchScript=function(name) {removeBatchScript(name);};
  this.changeBatchScriptName=function(name,new_name) {changeBatchScriptName(name,new_name);};

  this.webModuleNames=function() {return webModuleNames();};
  this.webModule=function(name) {return webModule(name);};
  this.setWebModule=function(name,X) {setWebModule(name,X);};
  this.removeWebModule=function(name) {removeWebModule(name);};
  this.changeWebModuleName=function(name,new_name) {changeWebModuleName(name,new_name);};

  this.fileNames=function() {return fileNames();};
  this.file=function(name) {return file(name);};
  this.setFile=function(name,F) {return setFile(name,F);};
  this.createFile=function() {return new MLWFile();};
  this.changeFileName=function(name,new_name) {changeFileName(name,new_name);};
  this.removeFile=function(name) {removeFile(name);};

  var m_object={
    datasets:{},
    scripts:{},
    files:{}
  };

  function setObject(obj) {
    if (JSON.stringify(m_object)==JSON.stringify(obj)) return;
    m_object=JSQ.clone(obj);

    m_object.datasets=m_object.datasets||{};
    m_object.scripts=m_object.scripts||m_object.batch_scripts||{};
    m_object.web_modules=m_object.web_modules||{};
    if (m_object.batch_scripts) delete m_object.batch_scripts;
    O.emit('changed');
  }

  function datasetIds() {
    var ret=Object.keys(m_object.datasets);
    ret.sort();
    return ret;
  }
  function dataset(id) {
    if (!(id in m_object.datasets)) return null;
    var obj=m_object.datasets[id];
    var ret=new MLSDataset(obj);
    return ret;
  }
  function batchScriptNames() {
    var ret=Object.keys(m_object.scripts);
    ret.sort();
    return ret;
  }
  function batchScript(name) {
    if (!(name in m_object.scripts)) return null;
    var obj=m_object.scripts[name];
    var ret=new MLSBatchScript(obj);
    return ret;
  }
  function webModuleNames() {
    var ret=Object.keys(m_object.web_modules);
    ret.sort();
    return ret;
  }
  function webModule(name) {
    if (!(name in m_object.web_modules)) return null;
    var obj=m_object.web_modules[name];
    var ret=new MLSWebModule(obj);
    return ret;
  }
  function setDataset(id,X) {
    m_object.datasets[id]=X.object();
    O.emit('changed');
  }
  function removeDataset(id) {
    if (id in m_object.datasets) {
      delete m_object.datasets[id];
      O.emit('changed');
    }
  }
  function changeDatasetId(id,id_new) {
    if (id==id_new) return;
    var X=dataset(id);
    if (!X) return;
    removeDataset(id);
    setDataset(id_new,X); 
  }
  function setBatchScript(name,X) {
    m_object.scripts[name]=X.object();
    O.emit('changed');
  }
  function removeBatchScript(name) {
    if (name in m_object.scripts) {
      delete m_object.scripts[name];
      O.emit('changed');
    }
  }
  function changeBatchScriptName(name,new_name) {
    if (name==new_name) return;
    var X=batchScript(name);
    if (!X) return;
    removeBatchScript(name);
    setBatchScript(new_name,X); 
  }
  function setWebModule(name,X) {
    m_object.web_modules[name]=X.object();
    O.emit('changed');
  }
  function removeWebModule(name) {
    if (name in m_object.web_modules) {
      delete m_object.web_modules[name];
      O.emit('changed');
    }
  }
  function changeWebModuleName(name,new_name) {
    if (name==new_name) return;
    var X=webModule(name);
    if (!X) return;
    removeWebModule(name);
    setWebModule(new_name,X); 
  }
  function description() {
    return m_object.description||'';
  }
  function setDescription(str) {
    if (m_object.description==str) return;
    m_object.description=str;
    O.emit('changed');
  }

  function fileNames() {
    var files=m_object.files||{};
    return Object.keys(files);
  }

  function file(name) {
    var files=m_object.files||{};
    if (!(name in files))
      return null;
    var F=new MLWFile();
    F.setObject(files[name]);
    return F;
  }
  function setFile(name,F) {
    m_object.files=m_object.files||{};
    m_object.files[name]=F.object();
    O.emit('changed');
  }
  function changeFileName(name,name_new) {
    if (name==name_new) return;
    var X=file(name);
    if (!X) return;
    removeFile(name);
    setFile(name_new,X); 
  }
  function removeFile(name) {
    if (name in (m_object.files||{})) {
      delete m_object.files[name];
      O.emit('changed');
    }
  }

}

function MLSDataset(obj) {
  var that=this;
  this.setObject=function(obj) {m_object=JSQ.clone(obj);};
  this.object=function() {return JSQ.clone(m_object);};

  this.id=function() {return m_object.id||'';};
  this.fileNames=function() {return fileNames();};
  this.file=function(name) {return file(name);};
  this.setFile=function(name,file0) {setFile(name,file0);};
  this.removeFile=function(name) {removeFile(name);};
  this.parameters=function() {return JSQ.clone(m_object.parameters||{});};
  this.setParameters=function(params) {m_object.parameters=JSQ.clone(params);};
  this.properties=function() {return JSQ.clone(m_object.properties||{});};
  this.setProperties=function(props) {m_object.properties=JSQ.clone(props);};

  var m_object={};

  function fileNames() {
    var files=m_object.files||{};
    var ret=[];
    for (var key in files) {
      ret.push(key);
    }
    return ret;
  }

  function file(name) {
    return (m_object.files||{})[name]||null;
  }
  function setFile(name,file0) {
    if (!m_object.files) m_object.files={};
    m_object.files[name]=JSQ.clone(file0);
  }
  function removeFile(name) {
    if (!m_object.files) m_object.files={};
    if (name in m_object.files) {
      delete m_object.files[name];
    }
  }

  that.setObject(obj||{});
}

function MLSBatchScript(obj) {
  var that=this;
  this.setObject=function(obj) {setObject(obj);};
  this.object=function() {return JSQ.clone(m_object);};
  this.setScript=function(script) {setScript(script);};
  this.script=function() {return m_object.script||'';};
  this.onChanged=function(handler) {m_changed_handlers.push(handler);};

  var m_object={};
  var m_changed_handlers=[];

  function setObject(obj) {
    if (JSON.stringify(obj)==JSON.stringify(m_object)) return;
    m_object=JSQ.clone(obj);
    for (var i in m_changed_handlers) {
      m_changed_handlers[i]();
    }
  }

  function setScript(script) {
    var obj=JSQ.clone(m_object);
    obj.script=script;
    setObject(obj);
  }

  that.setObject(obj||{});
}

function MLSWebModule(obj) {
  var that=this;
  this.setObject=function(obj) {setObject(obj);};
  this.object=function() {return JSQ.clone(m_object);};
  this.setContent=function(content) {setContent(content);};
  this.content=function() {return JSQ.clone(m_object.content||{});};
  this.onChanged=function(handler) {m_changed_handlers.push(handler);};

  var m_object={};
  var m_changed_handlers=[];

  function setObject(obj) {
    if (JSON.stringify(obj)==JSON.stringify(m_object)) return;
    m_object=JSQ.clone(obj);
    for (var i in m_changed_handlers) {
      m_changed_handlers[i]();
    }    
  }

  function setContent(content) {
    var obj=JSQ.clone(m_object);
    obj.content=JSQ.clone(content);
    setObject(obj);
  }

  that.setObject(obj||{});
}

function BatchJobManager(O) {
  O=O||this;
  JSQObject(O);

  this.startBatchJob=function(batch_script,module_scripts,study_object) {return startBatchJob(batch_script,module_scripts,study_object);};
  //this.setKuleleClient=function(KC) {m_kulele_client=KC;};
  //this.kuleleClient=function() {return m_kulele_client;};
  this.setLariClient=function(LC) {m_lari_client=LC;};
  this.lariClient=function() {return m_lari_client;};
  this.runningJobCount=function() {return m_running_jobs.length;};
  this.setDocStorClient=function(DSC) {return m_docstor_client=DSC;};
  this.setKBucketUrl=function(url) {m_kbucket_url=url;};

  var m_running_jobs=[];
  //var m_kulele_client=null;
  var m_lari_client=null;
  var m_docstor_client=null;
  var m_kbucket_url='';

  function startBatchJob(batch_script,module_scripts,study_object) {
    var has_error=false;
    mlpLog({bold:true,text:'Starting script...',labels:{script:1}});
    var J=new BatchJob(null,m_lari_client);
    J.setDocStorClient(m_docstor_client);
    J.setBatchScript(batch_script.script());
    J.setKBucketUrl(m_kbucket_url);
    var all_scripts={};
    for (var name0 in module_scripts) {
      all_scripts[name0]=module_scripts[name0].script();
    }
    J.setAllScripts(all_scripts);
    J.setStudyObject(study_object);
    JSQ.connect(J,'error',O,function(sender,err) {
      has_error=true;
      mlpLog({error:true,text:'Error in script: '+err,labels:{script:1}});
    });
    JSQ.connect(J,'completed',O,function() {
      var txt='Script completed';
      if (has_error) txt+=' with error.';
      else txt+=' without error.';
      mlpLog({bold:true,text:txt,error:has_error,labels:{script:1}});
      for (var i in m_running_jobs) {
        if (m_running_jobs[i]==J) {
          m_running_jobs.splice(i,1);
          break;
        }
      }
    });
    
    m_running_jobs.push(J);
    setTimeout(function() {
      J.start();
    },10);
    return J;
  }
}

