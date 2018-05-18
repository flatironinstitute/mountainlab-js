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

exports.FileUploader=FileUploader;

function FileUploader() {
  var that=this;
  this.uploadTextFile=function(opts,callback) {uploadTextFile(opts,callback);};
  this.uploadBinaryFile=function(opts,callback) {uploadBinaryFile(opts,callback);};

  function uploadTextFile(opts,callback) {
    var opts2={};
    opts2.text_mode=true;
    opts2.multiple_files_mode=false;
    opts2.validate_file=opts.validate_file||(function() {return true});
    upload_file(opts2,function(tmp) {
      if (!tmp.success) {
        if (callback) callback(tmp);
        callback=null;
        return;
      }
      if (tmp.files.length!=1) {
        if (callback) callback({success:false,error:'Unexpected problem: files.length!=1'});
        callback=null;
        return;
      }
      if (callback) callback({success:true,text:tmp.files[0].file_data,file_name:tmp.files[0].file_name});
      callback=null;
    });

  }
  function uploadBinaryFile(opts,callback) {
    var opts2={};
    opts2.text_mode=false;
    opts2.multiple_files_mode=false;
    opts2.validate_file=opts.validate_file||(function() {return true});
    upload_file(opts2,function(tmp) {
      if (!tmp.success) {
        if (callback) callback(tmp);
        callback=null;
        return;
      }
      if (tmp.files.length!=1) {
        if (callback) callback({success:false,error:'Unexpected problem: files.length!=1'});
        callback=null;
        return;
      }
      if (callback) callback({success:true,data:tmp.files[0].file_data,file_name:tmp.files[0].file_name});
      callback=null;
    });
  }
}

function upload_file(opts,callback) {
  
  //opts.multiple_files_mode
  //opts.text_mode
  //opts.validate_file
  //output: {files:[{file_name:'file.dat',file_data:[...]},...],success:true}
  
  if (!opts.validate_file) opts.validate_file=function() {return true;};
  
  var ret={files:[],success:false};
  var current_num_files=0;
  
  var button;
  if (opts.multiple_files_mode)
    button=$('<input type="file" name="files[]" label="Upload" multiple></input>');
  else
    button=$('<input type="file" name="files[]" label="Upload"></input>');
  
  button.change(function(evt) {on_upload(evt);});
  
  //Popup
  var W=600;
  var H=90;
  var label0='Upload files';
  if (!opts.multiple_files_mode) label0='Upload file';
  
  var dialog=$('<div id="dialog"></div>');
  var X0=$('<div></div>');
  
  X0.css('position','absolute');
  X0.css('width',W);
  X0.css('height',H);
  //Popup Basic Content
  X0.append('<p><span id="label"></span></p>');
  X0.append('<p><span id="upload_button"></span></p>');
  X0.append('<p id="prog_evol"><progress id="progress" max="100" value="0"></progress><span id="more_button"></span></p>');
  
  X0.find('#label').text(label0);
  X0.find('#upload_button').append(button);
  X0.find('#prog_evol').hide();
  dialog.css('overflow','hidden');
  dialog.append(X0);
  $('body').append(dialog);
  dialog.dialog({width:W+20,
                  height:H+60,
                  resizable:false,
                  modal:true,
                  title:label0});
  
  function on_upload(evt) {
    dialog.find('#upload_button').hide();
    dialog.find('#prog_evol').show();
    
    //Wisdm.resetImportFileBytesUploaded();
    
    var files=evt.target.files;
    current_num_files=files.length;
    
    function do_read(ind) {
      if (ind<files.length) {
        if (opts.validate_file(files[ind])) {
          read_file(files[ind],function(data0) {
            var file_name=files[ind].fileName||files[ind].name;
            if (!data0) {
              alert('Problem reading file: '+file_name);
              dialog.dialog('close');
              setTimeout(function() {
                ret.success=false;
                if (callback) callback(ret);
                callback=null;
              },100);
              return;
            }
            var file0={file_name:file_name,file_data:data0};
            ret.files.push(file0);
            setTimeout(function() {
              do_read(ind+1);
            },10);
          });
        }
        else {
          dialog.dialog('close');
          setTimeout(function() {
            ret.success=false;
          },100);
        }
      }
      else {
        dialog.dialog('close');
        setTimeout(function() {
          ret.success=true;
          if (callback) callback(ret);
          callback=null;
        },100);
      }
    }
    do_read(0);
  }
  /*
  function on_progress(bytes_uploaded,total_bytes) {
    dialog.find('#progress').val(Math.floor(bytes_uploaded/total_bytes*100));
    var txt0='';
    if (current_num_files>1) {
      txt0+='File '+(current_file_index+1)+'/'+current_num_files+' ';
    }
    txt0+=Math.floor(bytes_uploaded/1000)+' of '+Math.floor(total_bytes/1000)+' KB uploaded...';
    dialog.find('#label').html(txt0);
  }
  */
  function read_file(file0,callback) {
    var reader=new FileReader();
    reader.onload=function(ee) {
      var data0 = ee.target.result;
      if (callback) callback(data0);
      callback=null;
    };
    if (opts.text_mode) reader.readAsText(file0);
    else reader.readAsArrayBuffer(file0);
  }
}
