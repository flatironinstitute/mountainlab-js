exports.v1 = MLClient;

const MLClientImpl = require(__dirname + '/impl/mlclientimpl.js').MLClientImpl;
exports.stop_all_processes=require(__dirname + '/impl/mlclientimpl.js').stop_all_processes;

// When SIGINT or SIGTERM is received, we cleanup by stopping the running process, prior to truly exiting with error code -1
process.on('SIGTERM', cleanup_and_exit);
process.on('SIGINT', cleanup_and_exit);
function cleanup_and_exit() {
  console.log('cleanup');
  exports.stop_all_processes(function() {
    process.exit(-1);
  });
}

function MLClient() {
  let impl = new MLClientImpl();

  this.addProcess=function(processor_name,inputs,outputs,parameters,opts) {
    return impl.addProcess(processor_name,inputs,outputs,parameters,opts);
  };
  this.run=async function() {
    return impl.run();
  }
}
