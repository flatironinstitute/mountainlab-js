exports.cmd_prv_locate = cmd_prv_locate;
exports.cmd_prv_create = cmd_prv_create;
exports.cmd_prv_download = cmd_prv_download;
exports.prv_locate = prv_locate;
exports.prv_create = prv_create;
exports.prv_download = prv_download;
exports.compute_file_sha1 = compute_file_sha1;

var common = require(__dirname + '/common.js');
var db_utils = require(__dirname + '/db_utils.js');
var sha1 = require('node-sha1');
var url_exists = require('url-exists');
var async = require('async');
var request = require('request');

const KBClient = require('kbclient').v1;

function cmd_prv_locate(prv_fname, opts, callback) {
  prv_locate(prv_fname, opts, function(err, path) {
    if (err) {
      callback(err);
      return;
    }
    if (path) {
    	console.info(path);
      callback('', path);
      return;
    } else {
      console.error('Unable to locate file.');
      callback(null, path);
      return;
    }
  });
}

function cmd_prv_create(fname, prv_fname_out, opts, callback) {
  if (!prv_fname_out) prv_fname_out = fname + '.prv';
  if ((!opts.stat) && (!opts.sha1))
    console.info('Creating prv record for file ... : ' + fname);
  prv_create(fname, function(err, obj) {
    if (err) {
      console.error(err);
      callback(err);
      return;
    }
    if (obj) {
      if (opts.stat) {
        console.info(JSON.stringify(obj, null, 4));
        callback('', obj);
        return;
      }
      if (opts.sha1) {
        console.info(obj.original_checksum);
        callback('', obj.original_checksum);
        return;
      }
      console.info('Writing prv file ... : ' + prv_fname_out);
      if (common.write_text_file(prv_fname_out, JSON.stringify(obj, null, 4))) {
        console.info('Done.')
      } else {
        var err = 'Unable to write output file.';
        console.error(err);
        callback(err);
        return;
      }
      callback('', obj);
      return;
    } else {
      var err = 'Unable to create prv object.';
      console.err(err);
      callback(err);
      return;
    }
  });
}

function cmd_prv_download(prv_fname, output_filename, opts, callback) {
  if (output_filename) opts.output = output_filename;
  prv_download(prv_fname, opts, function(err, path) {
    if (err) {
      console.error(`Error downloading: ${err}`);
      callback(err);
      return;
    }
    if (path) {
      callback(null, path);
      return;
    } else {
      callback('Unexpected: path is empty in cmd_prv_download.');
      return;
    }
  });
}

function prv_download(prv_fname, opts, callback) {
  let KBC=new KBClient();
  if (opts.output) {
    KBC.downloadFile(prv_fname, opts.output)
      .then(function() {
        callback(null, opts.output);
      })
      .catch(function(err) {
        callback('Error downloading file: ' + err.message);
      });
  }
  else {
    KBC.realizeFile(prv_fname, {})
      .then(function(path2) {
        callback(null, path2);
      })
      .catch(function(err) {
        callback('Error realizing file: ' + err.message);
      });  
  }
}

function prv_locate(prv_fname, opts, callback) {
  let KBC=new KBClient();
  if ('download' in opts) {
    supress_console_info();
    KBC.realizeFile(prv_fname, {})
      .then(function(url2) {
        restore_console_info();
        callback(null, url2, null);
      })
      .catch(function(err) {
        restore_console_info();
        callback('Error locating file: ' + err.message);
      });
  } else {
    supress_console_info();
    KBC.locateFile(prv_fname, {})
      .then(function(url2) {
        restore_console_info();
        callback(null, url2, null);
      })
      .catch(function(err) {
        restore_console_info();
        callback('Error locating file: ' + err.message);
      });
  }
}

let hold_console_info = console.info;

function supress_console_info() {
  console.info = function() {};
}

function restore_console_info() {
  console.info = hold_console_info;
}

function prv_create(fname, callback) {
  let KBC=new KBClient();
  KBC.prvCreate(fname, {})
    .then(function(obj) {
      callback(null, obj);
    })
    .catch(function(err) {
      callback(err.message);
    });
}

function compute_file_sha1(fname, callback) {
  prv_create(fname, function(err,obj) {
    if (err) {
      callback(err);
      return;
    }
    callback(null, obj.original_checksum);
  });
}
