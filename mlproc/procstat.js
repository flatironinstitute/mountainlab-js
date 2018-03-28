#!/usr/bin/env nodejs

CLP=new CLParams(process.argv);

var opts={
	ignore_nulls:true,
	output_maxima_only:true
};
var pid=Number(CLP.unnamedParameters[0]||0);
if (!pid) {
	console.log('Usage: procstat [pid] [--out=rss|etime|cputime|%cpu|%mem]');
	return;
}
var out=CLP.namedParameters['out']||'';

var processes={};
var output={processes:processes};

var field_names=['rss','%cpu','%mem','cputime','etime'];

get_all_descendant_pids(pid,function(pids) {
	get_processes_stats(pids,function(stats) {
		for (var ii=0; ii<pids.length; ii++) {
			processes[pids[ii]]=stats[ii];
		}
		var maxima={};
		for (var jj in field_names) maxima[field_names[jj]]=0;
		output.maxima=maxima;
		for (var pid in processes) {
			var p=processes[pid];
			for (var jj in field_names) {
				if (p[field_names[jj]]>maxima[field_names[jj]])
					maxima[field_names[jj]]=p[field_names[jj]];
			}
		}
		if (opts.maxima_only) delete output['processes'];
		if (out) {
			console.log(output.maxima[out]);
		}
		else {
			console.log(JSON.stringify(output,null,4));	
		}
	});

	/*
	foreach(pids,function(i,pid0,cb) {
		get_process_stats(pid0,function(stats) {
			if ((stats.rss)||(!opts.ignore_nulls)) {
				processes[pid0]=stats;
			}
			cb();
		});
	},function() {
		var maxima={};
		for (var jj in field_names) maxima[field_names[jj]]=0;
		output.maxima=maxima;
		for (var pid in processes) {
			var p=processes[pid];
			for (var jj in field_names) {
				if (p[field_names[jj]]>maxima[field_names[jj]])
					maxima[field_names[jj]]=p[field_names[jj]];
			}
		}
		if (opts.maxima_only) delete output['processes'];
		if (out) {
			console.log(output.maxima[out]);
		}
		else {
			console.log(JSON.stringify(output,null,4));	
		}
		
	});
	*/
});

function convert_to_seconds(str) {
	var list0=str.split('-');
	if (list0.length==2) {
		return Number(list0[0])*24*60*60+convert_to_seconds(list0[1]);
	}
	else {
		var list=str.split(':');
		if (list.length==1)
			return Number(str);
		if (list.length==2)
			return Number(list[1])+Number(list[0])*60;
		else if (list.length==3) 
			return Number(list[2])+Number(list[1])*60+Number(list[0])*60*60;
	}
}

function format_field(str) {
	if (str.indexOf(':')>=0) {
		return convert_to_seconds(str);
	}
	else {
		return Number(str||0);
	}
}

function get_processes_stats(pids,callback) {
	var cmd='ps -p '+pids.join(',')+' -o ';
	for (var jj in field_names) {
		cmd+=field_names[jj]+'=,';
	}
	cmd+='comm=';

	run_process_and_read_stdout('/bin/bash',['-c',cmd],function(txt) {
		var lines=txt.split('\n');
		var ret=[];
		for (var j=0; j<pids.length; j++) {
			var list=(lines[j]||'').match(/\S+/g)||[];
			var tmp={};
			tmp.comm=list[field_names.length]||'';
			for (var jj in field_names) {
				tmp[field_names[jj]]=format_field(list[jj]||'');
			}	
			ret.push(tmp);
		}
		callback(ret);
	});
}

function get_process_stats(pid,callback) {
	
	var cmd='ps -p '+pid+' -o ';
	for (var jj in field_names) {
		cmd+=field_names[jj]+'=,';
	}
	cmd+='comm=';

	run_process_and_read_stdout('/bin/bash',['-c',cmd],function(txt) {
		var ret={};
		var list=txt.match(/\S+/g)||[];
		ret.comm=list[field_names.length]||'';
		for (var jj in field_names) {
			ret[field_names[jj]]=format_field(list[jj]||'');
		}
		callback(ret);
	});
}

function get_all_descendant_pids(pid,callback) {
	var cmd="pstree -p "+pid+" | grep -o '([0-9]\\+)' | grep -o '[0-9]\\+'";
	run_process_and_read_stdout('/bin/bash',['-c',cmd],function(txt) {
		var lines=txt.split('\n');
		var ret=[];
		for (var i=0; i<lines.length; i++) {
			var line=lines[i].trim();
			if (line) {
				ret.push(Number(line));
			}
		}
		callback(ret);
	});
}

function run_process_and_read_stdout(exe,args,callback) {
	var P;
	try {
		P=require('child_process').spawn(exe,args);
	}
	catch(err) {
		console.log (err);
		//callback({success:false,error:"Problem launching: "+exe+" "+args.join(" ")});
		//return;
	}
	var txt='';
	P.stdout.on('data',function(chunk) {
		txt+=chunk;
	});
	P.on('close',function(code) {
		callback(txt);
	});
	return P;
}

function foreach(X,step,callback) {
	var i=0;
	next_step();
	function next_step() {
		if (i>=X.length) {
			callback();
			return;
		}
		step(i,X[i],function() {
			i++;
			next_step();
		});
	}
}

function CLParams(argv) {
	this.unnamedParameters=[];
	this.namedParameters={};

	var args=argv.slice(2);
	for (var i=0; i<args.length; i++) {
		var arg0=args[i];
		if (arg0.indexOf('--')===0) {
			arg0=arg0.slice(2);
			var ind=arg0.indexOf('=');
			if (ind>=0) {
				this.namedParameters[arg0.slice(0,ind)]=arg0.slice(ind+1);
			}
			else {
				this.namedParameters[arg0]=args[i+1]||'';
				i++;
			}
		}
		else if (arg0.indexOf('-')===0) {
			arg0=arg0.slice(1);
			this.namedParameters[arg0]='';
		}
		else {
			this.unnamedParameters.push(arg0);
		}
	}
}
