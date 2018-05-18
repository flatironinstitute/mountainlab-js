exports.MLMenuBar=MLMenuBar;

var JSQWidget=require('../mlscore/jsqcore/jsqwidget.js').JSQWidget;

function MLMenuBar(O) {
	O=O||this;
	JSQWidget(O);
	O.div().addClass('MLMenuBar');

	this.addMenu=function(label,opts) {return addMenu(label,opts);};
	this.addSpacer=function() {return addSpacer();};
	this.addButton=function(label,handler) {return addButton(label,handler);};

	var m_menus=[];

	JSQ.connect(O,'sizeChanged',O,update_layout);
	function update_layout() {
		var W=O.width();
		var H=O.height();

		var font_size=Math.max(12,Math.min(30,H-15));

		//var Hbutton=Math.max(12,H-20);

		O.div().find('.mlmenubar-menu-button').css({"font-size":font_size+'px'});
		O.div().find('.mlmenubar-button').css({"font-size":font_size+'px'});
		O.div().find('a').css({"font-size":font_size+'px',"line-height":H+'px'});
		
		//m_content.css({position:'absolute',left:0,top:0,width:W,height:H});
	}

	function addMenu(label,opts) {
		if (!opts) opts={};
		var menu=new MLMenu(opts);
		var menu_id=menu.menuId();
		var str='';
		if (opts.downarrow) str=' ▼';
		O.div().append(`<a class=mlmenubar-menu-button id=action_dropdown data-jq-dropdown="#action_dropdown_items-${menu_id}">${label}${str}</a>`);
		var elmt=$(`
		  <div id="action_dropdown_items-${menu_id}" class="jq-dropdown jq-dropdown-tip">
			  <ul class="jq-dropdown-menu">
			  </ul>
		  </div>
		`);
		$('body').append(elmt);
		menu.setElement(elmt);
		return menu;
	}

	function addSpacer() {
		var elmt=$('<span class=mlmenubar-spacer></span>');
		O.div().append(elmt);
		elmt.css({padding:'5px'});
		return elmt;
	}

	function addButton(label,handler) {
		var elmt;
		if (typeof(label)=='string')
			elmt=$('<a href=# class=mlmenubar-button>'+label+'</a>');
		else {
			elmt=label;
			elmt.addClass('mlmenubar-button');
		}

		O.div().append(elmt);
		elmt.css({"padding-left":'8px',"padding-right":'8px'});
		elmt.click(function() {setTimeout(handler,0);});
		return elmt;
	}

	update_layout();

	function MLMenu(opts) {
		if (!opts) opts={};

		this.menuId=function() {return m_menu_id;};	
		this.setElement=function(elmt) {m_element=elmt;};
		this.addItem=function(label,callback) {return addItem(label,callback);};
		this.addDivider=function() {addDivider();};

		var m_menu_id=JSQ.makeRandomId();
		var m_element=null;
		var m_items=[];

		function addItem(label,callback) {
			var ul=m_element.find('ul');
			var item=new MLMenuItem();
			item.setLabel(label);
			item.onClick(callback);
			ul.append(item.element());
			m_items.push(item);
			return item;
			/*
			<li><a href="#" id=share_documents>Share</a></li>
			<li><a href="#" id=unshare_documents>Unshare</a></li>
			<li class="jq-dropdown-divider"></li>
			<li><a href="#" id=add_label_to_documents>Add label</a></li>
			<li><a href="#" id=set_tag_to_documents>Set tag</a></li>
			<li><a href="#" id=remove_label_from_documents>Remove label</a></li>
			<li class="jq-dropdown-divider"></li>
			<li><a href="#" id=delete_documents>Delete selected documents</a></li>
			<li class="jq-dropdown-divider"></li>
			*/
		}
		function addDivider() {
			var ul=m_element.find('ul');
			var li=$('<li class="jq-dropdown-divider"></li>')
			ul.append(li);
		}
	}

	function MLMenuItem() {
		this.element=function() {return m_element;};
		this.setLabel=function(label) {setLabel(label);};
		this.onClick=function(handler) {m_click_handlers.push(handler);};
		this.setDisabled=function(val) {setDisabled(val);};

		var m_element=$('<li class=MLMenuItem />');
		var m_click_handlers=[];
		var m_disabled=false;
		var aa=$('<a href="#"><span id=label></span></a>');
		m_element.append(aa);
		aa.click(function(evt) {
			if (!m_disabled) {
				setTimeout(function() {
					for (var i in m_click_handlers) {
						m_click_handlers[i]();
					}
				},0);
			}
			else {
				evt.preventDefault();
				return false;
			}
		});

		function setLabel(label) {
			m_element.find('#label').html(label);
		}

		function setDisabled(val) {
			var aa=m_element.find('a');
			if (val) aa.addClass('disabled');
			else aa.removeClass('disabled');
			m_disabled=val;
		}
	}
}