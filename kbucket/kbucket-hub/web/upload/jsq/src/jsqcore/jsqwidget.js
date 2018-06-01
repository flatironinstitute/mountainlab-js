/*
 * Copyright 2016-2017 Flatiron Institute, Simons Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function JSQWidget(O) {
	O=O||this;
	JSQObject(O);
	
	O.div=function() {return m_div;};
	O.size=function() {return JSQ.clone(m_size);};
	O.width=function() {return m_size[0];};
	O.height=function() {return m_size[1];};
	O.setSize=function(W,H) {setSize(W,H);};
	O.position=function() {return m_position;};
	O.left=function() {return m_position[0];};
	O.top=function() {return m_position[1];};
	O.setPosition=function(x,y) {setPosition(x,y);};
	O.setGeometry=function(x,y,W,H) {setGeometry(x,y,W,H);};
	O.geometry=function() {return [m_position[0],m_position[1],m_size[0],m_size[1]];};
	O.showFullBrowser=function() {showFullBrowser();};
	var JSQObject_setParent=O.setParent;
	O.setParent=function(parent) {setParent(parent);};
	O.parentWidget=function() {return parentWidget();};
	O.setVisible=function(visible) {setVisible(visible);};
	O.show=function() {O.setVisible(true);};
	O.hide=function() {O.setVisible(false);};
	O.hasFocus=function() {return hasFocus();};
	O.setFocus=function(val) {JSQ._set_widget_focus(O,val);};

	O.onMousePress=function(handler) {onMousePress(handler);};
	O.onMouseRelease=function(handler) {onMouseRelease(handler);};
	O.onMouseMove=function(handler) {onMouseMove(handler);};
	O.onMouseEnter=function(handler) {onMouseEnter(handler);};
	O.onMouseLeave=function(handler) {onMouseLeave(handler);};
	O.onWheel=function(handler) {onWheel(handler);};
	O.onKeyPress=function(handler) {onKeyPress(handler);};

	JSQ.connect(O,'destroyed',O,on_destroyed);
	function on_destroyed() {
		m_div.remove();
	}

	function connect_div() {
		m_div.mousedown(function(e) {JSQ._report_mouse_press(O); mouse_actions.emit('press',jq_mouse_event($(this),e));});
		m_div.mouseup(function(e) {mouse_actions.emit('release',jq_mouse_event($(this),e));});
		m_div.mousemove(function(e) {mouse_actions.emit('move',jq_mouse_event($(this),e));});
		m_div.mouseenter(function(e) {mouse_actions.emit('enter',jq_mouse_event($(this),e));});
		m_div.mouseleave(function(e) {mouse_actions.emit('leave',jq_mouse_event($(this),e));});
		m_div.on('dragstart',function() {return false;});
		m_div.bind('mousewheel', function(e){
			wheel_actions.emit('wheel',jq_wheel_event($(this),e));
    	});
    	m_div.css({overflow:"hidden"});
    	if (O.parentWidget()) {
    		O.parentWidget().div().append(m_div);
    	}
		set_div_geom();
	}
	function setSize(W,H) {
		var size=[W,H];
		if (H===undefined) size=W;
		if ((size[0]==m_size[0])&&(size[1]==m_size[1])) {
			return;
		}
		m_size[0]=size[0];
		m_size[1]=size[1];
		set_div_geom();
		O.emit('sizeChanged');
	}
	function setPosition(x,y) {
		var pos=[x,y];
		if (y===undefined) pos=x;
		if ((m_position[0]==pos[0])&&(m_position[1]==pos[1])) {
			return;
		}
		m_position[0]=pos[0];
		m_position[1]=pos[1];
		set_div_geom();
		O.emit('positionChanged');
	}
	function setGeometry(x,y,W,H) {
		var geom=[x,y,W,H];
		if (y===undefined) {
			geom=x;
		}
		O.setSize(geom[2],geom[3]);
		O.setPosition(geom[0],geom[1]);
	}
	function showFullBrowser(opts) {
		if (!opts) opts={};
		opts.margin_left=opts.margin_left||10;
		opts.margin_right=opts.margin_right||10;
		opts.margin_top=opts.margin_top||10;
		opts.margin_bottom=opts.margin_bottom||10;
		if ('margin' in opts) {
			opts.margin_left=opts.margin_right=opts.margin_top=opts.margin_bottom=opts.margin;
		}

		var X=new BrowserWindow();
		JSQ.connect(X,'sizeChanged',O,set_size);
		function set_size() {
			var ss=X.size();
			O.setSize([ss[0]-opts.margin_left-opts.margin_right,ss[1]-opts.margin_top-opts.margin_bottom]);
			O.setPosition([opts.margin_left,opts.margin_top]);
		}
		$('body').append(O.div());
		set_size();
		O.setFocus(true);
	}
	function setParent(parent) {
		JSQObject_setParent(parent);
		if ((parent)&&(parent.isWidget())) {
			parent.div().append(O.div());
		}
	}
	function parentWidget() {
		if (!O.parent()) return null;
		if (!O.parent().isWidget()) return null;
		return O.parent();
	}

	function mouseMove() {
		O.div().addClass('hovered');
	}
	function mouseEnter() {
		O.div().addClass('hovered');
	}
	function mouseLeave() {
		O.div().removeClass('hovered');
	}

	var mouse_actions=new JSQObject();
	var wheel_actions=new JSQObject();
	function onMousePress(handler) {
		JSQ.connect(mouse_actions,'press',O,function(sender,args) {
			handler(args);
		});
	}
	function onMouseRelease(handler) {
		JSQ.connect(mouse_actions,'release',O,function(sender,args) {
			handler(args);
		});
	}
	function onMouseMove(handler) {
		JSQ.connect(mouse_actions,'move',O,function(sender,args) {
			handler(args);
		});
	}
	function onMouseEnter(handler) {
		JSQ.connect(mouse_actions,'enter',O,function(sender,args) {
			handler(args);
		});
	}
	function onMouseLeave(handler) {
		JSQ.connect(mouse_actions,'leave',O,function(sender,args) {
			handler(args);
		});
	}
	function onKeyPress(handler) {
		JSQ.connect(O,'keyPress',O,function(sender,args) {
			handler(args.event);
		});
	}
	function onWheel(handler) {
		JSQ.connect(wheel_actions,'wheel',O,function(sender,args) {
			handler(args);
		});
	}
	function jq_mouse_event(elmt,e) {
		//var parentOffset = $(this).parent().offset(); 
		var offset=elmt.offset(); //if you really just want the current element's offset
		var posx = e.pageX - offset.left;
		var posy = e.pageY - offset.top;
		return {
			pos:[posx,posy],
			modifiers:{ctrlKey:e.ctrlKey}
		};
	}
	function jq_wheel_event(elmt,e) {
		return {
			delta:e.originalEvent.wheelDelta
		};
	}
	function setVisible(visible) {
		if (visible) m_div.css({visibility:'inherit'});
		else m_div.css({visibility:'hidden'});
	}
	function hasFocus() {
		return JSQ._widget_has_focus(O);
	}

	O._set_is_widget(true);
	var m_position=[0,0];
	var m_size=[0,0];

	var m_div=$('<div></div>');
	connect_div(m_div);

	function set_div_geom() {
		m_div.css({
			position:'absolute',
			left:m_position[0],
			top:m_position[1],
			width:m_size[0],
			height:m_size[1]
		})
	}

	O.onMouseMove(mouseMove);
	O.onMouseEnter(mouseEnter);
	O.onMouseLeave(mouseLeave);
}

function BrowserWindow(O) {
	if (!O) O=this;
	JSQObject(O);

	O.size=function() {return [$(window).width(),$(window).height()];}

	$(window).on('resize', function() {
		O.emit('sizeChanged');
	});
}
