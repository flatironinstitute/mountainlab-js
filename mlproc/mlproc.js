#!/usr/bin/env node

var program = require('commander');

var package_json = require('./package.json');

var program = require('commander');

program
  .command('list-processors [pattern]')
  .description('List MountainLab processors installed on this machine. Optionally specify a wildcard pattern for filtering the results.')
  .option('--package [package-name]', 'Specify ML processor package by name')
  .option('--package_uri [package-uri]', 'Specify ML processor package by URI')
  .action(function (pattern, cmd) {
  	cmd.pattern=pattern;
  	require(__dirname+'/list_processors.js').list_processors(cmd);
  });

program
  .command('spec <processor-name>')
  .description('Show the spec for a specific processor.')
  .option('--package [package-name]', 'Specify ML processor package by name')
  .option('--package_uri [package-uri]', 'Specify ML processor package by URI')
  .action(function (processor_name, cmd) {
  	require(__dirname+'/spec.js').spec(processor_name,cmd);
  });

program
  .command('run-process <processor-name>')
  .description('Show the spec for a specific processor.')
  .option('-i, --inputs [inputs...]', 'List of named input files in key:value format.')
  .option('-o, --outputs [outputs...]', 'List of named output files in key:value format.')
  .option('-p, --parameters [parameters...]', 'List of named parameters in key:value format.')
  .option('-m, --mode [mode]', 'Either run (default), exec, or queue.')
  .action(function (processor_name, cmd) {
  	require(__dirname+'/run_process.js').run_process(processor_name,cmd,function(err) {
  		if (err) {
  			console.error(err);
  			process.exit(-1);
  		}
  	});
  });

var argv=preprocess_argv(process.argv);
program.parse(argv);

function preprocess_argv(argv) {
	if (argv.indexOf('run-process')>=0) {
		return preprocess_run_process_argv(argv);
	}
	else {
		return argv;
	}
}

function preprocess_run_process_argv(argv) {
	var ret=[];
	var i=0;
	while (i<argv.length) {
		var arg0=argv[i];
		var do_combine=false;
		if ((arg0=='--inputs')||(arg0=='-i')||(arg0=='--outputs')||(arg0=='-o')||(arg0=='parameters')||(arg0=='-p'))
			do_combine=true;
		ret.push(arg0);
		i++;
		if (do_combine) {
			var args0=[];
			while ((i<argv.length)&&(argv[i].slice(0,1)!='-')&&(argv[i].indexOf(':')>=0)) {
				args0.push(argv[i]);
				i++;
			}
			ret.push(args0.join('[---]'));
		}
	}
	return ret;
}
