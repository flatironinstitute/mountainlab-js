exports.cmd_spec = cmd_spec;

var common = require(__dirname + '/common.js');

function cmd_spec(processor_name, opts, callback) {
  if (!('show_warnings' in opts)) opts.show_warnings = false;

  let spec_opts={
  	lari_id:opts.lari_id || process.env.LARI_ID,
  	lari_passcode:opts.lari_passcode || process.env.LARI_PASSCODE
  };
  
  common.get_processor_spec(processor_name, spec_opts, function(err, spec0) {
    if (err) {
      console.error(err);
      callback(err);
      return;
    }
    if (!spec0) {
      var err = `Processor not found: ${processor_name}`;
      console.error(err);
      callback(err);
      return;
    }
    if (opts.print) {
      print_human_readable_spec(spec0);
    } else {
      console.log(JSON.stringify(spec0, null, 4));
    }
    callback(null);
  });
}

function print_human_readable_spec(spec0) {
  console.log(spec0.name || '');
  console.log(spec0.description || '');
  console.log('');
  console.log('INPUTS');
  var inputs = spec0.inputs || [];
  for (var i in inputs) {
    var X = inputs[i];
    var opt = '';
    if (X.optional) opt = '(optional) ';
    console.log(`  ${X.name||''} -- ${opt}${X.description||''}`)
  }
  console.log('');
  console.log('OUTPUTS');
  var outputs = spec0.outputs || [];
  for (var i in outputs) {
    var X = outputs[i];
    var opt = '';
    if (X.optional) opt = '(optional) ';
    console.log(`  ${X.name||''} -- ${opt}${X.description||''}`)
  }
  console.log('');
  console.log('PARAMETERS');
  var parameters = spec0.parameters || [];
  for (var i in parameters) {
    var X = parameters[i];
    var opt = '';
    if (X.optional) opt = '(optional) ';
    console.log(`  ${X.name||''} -- ${opt}${X.description||''}`)
  }
}