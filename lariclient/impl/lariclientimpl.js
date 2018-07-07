exports.LariClientImpl = LariClientImpl;

const axios = require('axios');

function LariClientImpl() {
  this.setLariHubUrl = function(url) {
    m_lari_hub_url = url;
  };
  this.runProcess = function(node_id, processor_name, inputs, outputs, parameters, opts, callback) {
    let url = m_lari_hub_url + '/' + node_id + '/api/run_process';
    let data = {
      processor_name: processor_name,
      inputs: inputs,
      outputs: outputs,
      parameters: parameters,
      opts: opts
    };
    http_post_json(url, data, function(err, resp) {
      callback(err, resp);
    });
  };
  this.probeProcess = function(node_id, job_id, callback) {
    let url = m_lari_hub_url + '/' + node_id + '/api/probe_process';
    let data = {
      job_id: job_id
    };
    http_post_json(url, data, function(err, resp) {
      callback(err, resp);
    });
  };
  this.cancelProcess = function(node_id, job_id, callback) {
    let url = m_lari_hub_url + '/' + node_id + '/api/cancel_process';
    let data = {
      job_id: job_id
    };
    http_post_json(url, data, function(err, resp) {
      callback(err, resp);
    });
  };

  let m_lari_hub_url = process.env.LARI_HUB_URL || 'https://larihub.org';
}

function http_post_json(url, data, callback) {
  axios.post(url,data,{
    responseType: 'json'
  })
    .then(function(response) {
      setTimeout(function() { // so we don't catch an error from the timeout
        callback(null, response.data);
      }, 0);
    })
    .catch(function(error) {
      console.error(error.response.data);
      callback(error.message);
    });
}