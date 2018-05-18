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
if (typeof module !== 'undefined' && module.exports) {
	JSQ=require(__dirname+'/jsq.js').JSQ;
	exports.JSQObject=JSQObject;
}

function JSQObject(O) {
	O=O||this;
	O.objectId=function() {return m_object_id;}
	O.setParent=function(parent_object) {setParent(parent_object);}
	O.parent=function() {return parent();}
	O.setProperty=function(name,value) {setProperty(name,value);}
	O.property=function(name) {return property(name);}
	O.emit=function(signal_name,args) {emit(signal_name,args);}
	O.destroy=function() {destroy();}
	O.isWidget=function() {return m_is_widget;}

	function setParent(parent_object) {
		if (O.parent()) {
			O.parent()._remove_child(O);
		}
		if (parent_object) {
			m_parent_id=parent_object.objectId();
			parent_object._add_child(O);
		}
		else {
			m_parent_id=null;
		}
	}
	function parent() {
		if (!m_parent_id) return null;
		return JSQ._object(m_parent_id);
	}
	function setProperty(name,val) {
		m_properties[name]=val;
	}
	function property(name) {
		if (name in m_properties)
			return m_properties[name];
		else
			return null;
	}
	function emit(signal_name,args) {
		JSQ.emit(O,signal_name,args);
	}
	function destroy() {
		for (var id in m_child_ids) {
			var child_obj=JSQ._object(id);
			if (child_obj) {
				child_obj.destroy();
			}
		}
		O.setParent(null);
		O.emit('destroyed');
		JSQ._removeObject(m_object_id);
	}
	O._remove_child=function(child) {
		var id=child.objectId();
		if (id in m_child_ids) {
			delete m_child_ids[id];
		}
	}
	O._add_child=function(child) {
		var id=child.objectId();
		if (!id) return;
		m_child_ids[id]=1;
	}
	O._connect=function(signal_name,receiver,callback,connection_type) {
		JSQ.connect(O,signal_name,receiver,callback,connection_type);
	}
	O._set_is_widget=function() {m_is_widget=true;}

	var m_object_id=JSQ.makeRandomId(10);
	var m_parent_id=null;;
	var m_child_ids={};
	var m_properties={};
	var m_is_widget=false;

	JSQ._addObject(m_object_id,O);
}

