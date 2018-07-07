exports.v1 = LariClient;

const LariClientImpl = require(__dirname + '/impl/lariclientimpl.js').LariClientImpl;

function LariClient() {
  let impl = new LariClientImpl();

  this.runProcess = function(node_id, processor_name, inputs, outputs, parameters, opts) {
    return new Promise(function(resolve, reject) {
      impl.runProcess(node_id, processor_name, inputs, outputs, parameters, opts, function(err, resp) {
        if (err) return reject(err);
        resolve(resp);
      });
    });
  };
  this.probeProcess = function(node_id, job_id) {
    return new Promise(function(resolve, reject) {
      impl.probeProcess(node_id, job_id, function(err, resp) {
        if (err) return reject(err);
        resolve(resp);
      });
    });
  };
  this.cancelProcess = function(node_id, job_id) {
    return new Promise(function(resolve, reject) {
      impl.probeProcess(node_id, job_id, function(err, resp) {
        if (err) return reject(err);
        resolve(resp);
      });
    });
  };
}