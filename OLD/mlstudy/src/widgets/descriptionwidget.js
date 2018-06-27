function DescriptionWidget(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('DescriptionWidget');

	this.setLabel=function(label) {setLabel(label);};
	this.description=function() {return description();};
	this.setDescription=function(descr) {setDescription(descr);};
	this.onDescriptionEdited=function(handler) {JSQ.connect(O,'description-edited',O,handler);};

	var m_top_bar=$('<div><span id=label style="font-weight:bold"></span>&nbsp;&nbsp;&nbsp;&nbsp; <button id=edit_button>Edit</button></div>');
	var m_textarea=$('<textarea readonly=readonly class=descriptionwidget-textarea></textarea>');
	O.div().append(m_top_bar);
	O.div().append(m_textarea);

	m_top_bar.find('#edit_button').click(edit_description);
	
	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var W=O.width();
		var H=O.height();
		var bar_height=25;
		
		m_top_bar.css({position:'absolute',left:0,top:0,width:W,height:bar_height});
		m_textarea.css({position:'absolute',left:0,top:bar_height,width:W-15,height:H-bar_height-15});
	}

	function edit_description() {
		var dlg=new EditTextDlg();
		dlg.setLabel('Edit description');
		dlg.setText(description());
		JSQ.connect(dlg,'accepted',O,function() {
			setDescription(dlg.text());
			O.emit('description-edited');
		});
		dlg.show();
	}

	function setLabel(label) {
		O.div().find('#label').html(label);
	}

	function description() {
		return m_textarea.val();
	}

	function setDescription(descr) {
		m_textarea.val(descr);
	}

	update_layout();
}