exports.FileBrowserWidget=FileBrowserWidget;

function FileBrowserWidget() {
	var that=this;

	this.element=function() {return m_element;};
	this.on=function(name,callback) {m_element.on(name,callback);};
	this.baseUrl=function() {return m_base_url;};
	this.setBaseUrl=function(url) {m_base_url=url; m_current_directory=''; refresh();};
	this.setCurrentDirectory=function(path) {m_current_directory=path; refresh();};

	var m_element=$(`
		<span>
			<span id=path></span>
			<table class=table id=files_table></table>
		</span>
	`);
	var m_files_table=m_element.find('#files_table');
	var m_base_url='';
	var m_current_directory='';

	refresh();
	function refresh() {
		if (!m_base_url) {
			m_element.find('#path').html('');
			m_files_table.empty();
			return;
		}
		var path_element=create_path_element();
		m_element.find('#path').empty();
		m_element.find('#path').append(path_element);
		m_files_table.empty();
		m_files_table.append(`<tr><th style="width:100px">Name</th><th>Size</th></tr>`);
		$.getJSON(`${m_base_url}/api/readdir/${m_current_directory}`,function(resp) {
			if (resp.error) {
				throw resp.error;
			}
			var dirs=resp.dirs;
			for (var i in dirs) {
				var row=$('<tr></tr>');
				row.append('<td id=name></td>')
				row.append('<td id=size></td>')
				row.dir=dirs[i];
				m_files_table.append(row);
				update_dir_row(row);
			}
			var files=resp.files;
			for (var i in files) {
				var row=$('<tr></tr>');
				row.append('<td id=name></td>')
				row.append('<td id=size></td>')
				row.file=files[i];
				m_files_table.append(row);
				update_file_row(row);
			}
		});
	}

	function create_path_element() {
		var path_element=$('<span />');
		path_element.append(`<a href=# data-path="">ROOT</a>`);
		var aaa=m_current_directory.split('/');
		var path0='';
		for (var i in aaa) {
			if (aaa[i]) {
				path0=require('path').join(path0,aaa[i]);
				path_element.append('/');
				path_element.append(`<a href=# data-path="${path0}">${aaa[i]}</a>`);
			}
		}
		path_element.find('a').click(function() {
			var path0=$(this).attr('data-path')
			that.setCurrentDirectory(path0);
		});
		return path_element;
	}

	function update_dir_row(row) {
		var dir=row.dir;
		var link=$('<a href=#></a>');
		link.html(dir.name);
		link.click(function() {
			var path=require('path').join(m_current_directory,dir.name);
			that.setCurrentDirectory(path);
		});
		row.find('#name').empty();
		row.find('#name').append('<span class="octicon octicon-file-directory"></span>&nbsp;');
		row.find('#name').append(link);
		row.find('#size').html('.');
	}
	function update_file_row(row) {
		var file=row.file;
		var link=$('<a></a>');
		link.html(file.name);
		link.attr('target','_blank');
		var filepath=require('path').join(m_current_directory,file.name);
		var url=`${m_base_url}/download/${filepath}`;
		link.attr('href',url);
		row.find('#name').empty();
		row.find('#name').append('<span class="octicon octicon-file"></span>&nbsp;');
		row.find('#name').append(link);
		row.find('#size').html(format_file_size(file.size));
	}

	function shorten_key(key,num) {
		return key.slice(0,num)+'...';
	}
}

function format_file_size(size_bytes) {
    var a=1024;
    var aa=a*a;
    var aaa=a*a*a;
    if (size_bytes>aaa) {
      return Math.floor(size_bytes/aaa)+' GB';
    }
    else if (size_bytes>aaa) {
      return Math.floor(size_bytes/(aaa/10))/10+' GB';  
    }
    else if (size_bytes>aa) {
      return Math.floor(size_bytes/aa)+' MB';
    }
    else if (size_bytes>aa) {
      return Math.floor(size_bytes/(aa/10))/10+' MB';  
    }
    else if (size_bytes>10*a) {
      return Math.floor(size_bytes/a)+' KB';
    }
    else if (size_bytes>a) {
      return Math.floor(size_bytes/(a/10))/10+' KB';  
    }
    else {
      return size_bytes+' bytes';
    }
}

