exports.cmd_spec = cmd_spec;

var common = require(__dirname + '/common.js');

function cmd_spec(processor_name, opts, callback) {
  if (!('show_warnings' in opts)) opts.show_warnings = false;

  let spec_opts={
  	lari_id:opts.lari_id || process.env.LARI_ID,
  	lari_passcode:opts.lari_passcode || process.env.LARI_PASSCODE,
    mp_file:opts.mp_file||undefined,
    mp_file_args:opts.mp_file_args||undefined,
    container:opts.container||undefined
  };

  if (!processor_name) {
    common.get_processor_specs(spec_opts,function(err,specs) {
      if (err) {
        console.error(err);
        callback(err);
        return;
      }
      if (opts.print) {
        for (let i in specs) {
          console.info('------------------------------------------------');
          print_human_readable_spec(specs[i]);
          console.info('------------------------------------------------');
          console.info('');
          console.info('');
        }
      } else {
        let obj={
          processors:specs
        };
        console.info(JSON.stringify(obj, null, 4));
      }
    });
  }
  else {
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
        console.info(JSON.stringify(spec0, null, 4));
      }
      callback(null);
    });
  }
}

function print_human_readable_spec(spec0) {
  console.info(spec0.name || '');
  console.info(spec0.description || '');
  console.info('');
  console.info('INPUTS');
  var inputs = spec0.inputs || [];
  for (var i in inputs) {
    var X = inputs[i];
    var opt = '';
    if (X.optional) opt = '(optional) ';
    console.info(`  ${X.name||''} -- ${opt}${X.description||''}`)
  }
  console.info('');
  console.info('OUTPUTS');
  var outputs = spec0.outputs || [];
  for (var i in outputs) {
    var X = outputs[i];
    var opt = '';
    if (X.optional) opt = '(optional) ';
    console.info(`  ${X.name||''} -- ${opt}${X.description||''}`)
  }
  console.info('');
  console.info('PARAMETERS');
  var parameters = spec0.parameters || [];
  for (var i in parameters) {
    var X = parameters[i];
    var opt = '';
    if (X.optional) opt = '(optional) ';
    console.info(`  ${X.name||''} -- ${opt}${X.description||''}`)
  }
}