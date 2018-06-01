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
var JSQ=new JSQCore();

if (typeof module !== 'undefined' && module.exports) {
	exports.JSQ=JSQ;
	window={};
}

function JSQCore() {
	this.connect=function(sender,signal,receiver,callback,connection_type) {connect(sender,signal,receiver,callback,connection_type);};
	this.emit=function(sender,signal_name,args) {emit(sender,signal_name,args);};
	this.clone=function(obj_or_array) {return clone(obj_or_array);};
	this.compare=function(X,Y) {return compare(X,Y);};
	this.computeSha1SumOfString=function(str) {return computeSha1SumOfString(str);};
	this.numSet2List=function(set) {return numSet2List(set);};
	this.numSort=function(array) {numSort(array);};
	this.makeRandomId=function(num_chars) {return make_random_id(num_chars||10);};
	this.toSet=function(list) {return toSet(list);};
	this.addPreventDefaultKeyPressHandler=function(handler) {m_prevent_default_key_press_handlers.push(handler);};

	this._object=function(id) {return object(id);};
	this._addObject=function(id,obj) {addObject(id,obj);};
	this._removeObject=function(id) {removeObject(id);};

	this._report_mouse_press=function(W) {_report_mouse_press(W);};
	this._widget_has_focus=function(W) {return (W.objectId() in m_focused_widget_ids_set);};
	this._set_widget_focus=function(W,val) {_set_widget_focus(W,val);};
	this._handle_key_press=function(e) {_handle_key_press(e);};

	var m_prevent_default_key_press_handlers=[];

	function connect(sender,signal_name,receiver,callback,connection_type) {
		m_connection_manager.connect(sender,signal_name,receiver,callback,connection_type);
	}
	function emit(sender,signal_name,args) {
		m_connection_manager.emit(sender,signal_name,args);
	}
	function clone(obj_or_array) {
		return JSON.parse(JSON.stringify(obj_or_array));
	}
	function compare(X,Y) {
		return (JSON.stringify(X)==JSON.stringify(Y));
	}
	function object(id) {
		if (id in m_objects) {
			return m_objects[id];
		}
		return null;
	}
	function addObject(id,obj) {
		m_objects[id]=obj;
	}
	function removeObject(id) {
		if (id in m_objects) {
			delete m_objects[id];
		}
	}
	function computeSha1SumOfString(str) {
		return Sha1.hash(str);
	}
	function numSet2List(set) {
		var ret=[];
		for (var key in set) {
			ret.push(key);
		}
		JSQ.numSort(ret);
		return ret;
	}
	function numSort(array) {
		array.sort(function(a,b) {return (a-b);});
	}
	function toSet(list) {
		var ret={};
		for (var i in list) {
			ret[list[i]]=1;
		}
		return ret;
	}
	var m_focused_widget_ids=[];
	var m_focused_widget_ids_set={};
	var m_last_mouse_press_group=0;
	var m_mouse_press_group=1;
	function _report_mouse_press(W,timestamp) {
		if (m_mouse_press_group!=m_last_mouse_press_group) {
			m_last_mouse_press_group=m_mouse_press_group;
			m_focused_widget_ids=[];
			m_focused_widget_ids_set={};
			setTimeout(function() {m_mouse_press_group=m_last_mouse_press_group+1},1);
		}
		m_focused_widget_ids.push(W.objectId());
		m_focused_widget_ids_set[W.objectId()]=true;
	}
	function _set_widget_focus(W,val) {
		if (val) {
			if (!m_focused_widget_ids_set[W.objectId()]) {
				m_focused_widget_ids.push(W.objectId());
				m_focused_widget_ids_set[W.objectId()]=true;
			}
		}
		else {
			if (m_focused_widget_ids_set[W.objectId()]) {
				delete m_focused_widget_ids[W.objectId()];
				var ii=m_focused_widget_ids.indexOf(W.objectId());
				m_focused_widget_ids.splice(ii,1);
			}	
		}
	}
	function _handle_key_press(e) {
		if (!e.key) e.key=String.fromCharCode(e.keyCode); //for support Qt webkit
		for (var j=0; j<m_focused_widget_ids.length; j++) {
			var obj=object(m_focused_widget_ids[j]);
			if (obj) {
				obj.emit('keyPress',{event:e,key:e.which});
			}
		}
		for (var i in m_prevent_default_key_press_handlers) {
			if (m_prevent_default_key_press_handlers[i](e)) {
				e.preventDefault();
				return false;
			}
		}
	}

	var m_connection_manager=new JSQConnectionManager();
	var m_objects={};
}

function JSQConnectionManager() {
	this.connect=function(sender,signal_name,receiver,callback,connection_type) {connect(sender,signal_name,receiver,callback,connection_type);}
	this.emit=function(sender,signal_name,args) {emit(sender,signal_name,args);}

	function signal(sender_id,signal_name) {
		var code=sender_id+'-'+signal_name;
		if (!(code in m_signals)) {
			m_signals[code]={
				sender_id:sender_id,
				signal_name:signal_name,
				connections:[]
			}
		}
		return m_signals[code];
	}
	function connect(sender,signal_name,receiver,callback,connection_type) {
		var SS=signal(sender.objectId(),signal_name);
		var receiver_id=null;
		if (receiver) receiver_id=receiver.objectId();
		var CC={
			receiver_id:receiver_id,
			callback:callback,
			connection_type:connection_type||'direct', //should direct be the default?
			scheduled:false
		}
		SS.connections.push(CC);
	}
	function emit(sender,signal_name,args) {
		var sender_id=sender.objectId();
		var code=sender_id+'-'+signal_name;
		if (code in m_signals) {
			var SS=m_signals[code];
			for (var j=0; j<SS.connections.length; j++) {
				var CC=SS.connections[j];
				if ((!CC.receiver_id)||(JSQ._object(CC.receiver_id))) { //make sure receiver has not been destroyed
					if (CC.connection_type=='direct') {
						CC.callback(sender,args);
					}
					else if (CC.connection_type=='queued') {
						schedule_trigger_connection(CC,sender,args);
					}
				}
				else {
					/// TODO: delete this connection because the receiver has been destroyed
				}
			}
		}
	}
	function schedule_trigger_connection(CC,sender,args) {
		if (CC.scheduled) return;
		CC.scheduled=true;
		setTimeout(function() {
			CC.scheduled=false;
			if ((!CC.receiver_id)||(JSQ._object(CC.receiver_id))) { //make sure object has not been destroyed
				CC.callback(sender,args);
			}
		},1);
	}
	var m_signals={};
}

function make_random_id(num_chars)
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < num_chars; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/*  SHA-1 implementation in JavaScript                  (c) Chris Veness 2002-2014 / MIT Licence  */
/*                                                                                                */
/*  - see http://csrc.nist.gov/groups/ST/toolkit/secure_hashing.html                              */
/*        http://csrc.nist.gov/groups/ST/toolkit/examples.html                                    */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/* jshint node:true *//* global define, escape, unescape */
'use strict';


/**
 * SHA-1 hash function reference implementation.
 *
 * @namespace
 */
var Sha1 = {};


/**
 * Generates SHA-1 hash of string.
 *
 * @param   {string} msg - (Unicode) string to be hashed.
 * @returns {string} Hash of msg as hex character string.
 */
Sha1.hash = function(msg) {
    // convert string to UTF-8, as SHA only deals with byte-streams
    msg = msg.utf8Encode();

    // constants [§4.2.1]
    var K = [ 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6 ];

    // PREPROCESSING

    msg += String.fromCharCode(0x80);  // add trailing '1' bit (+ 0's padding) to string [§5.1.1]

    // convert string msg into 512-bit/16-integer blocks arrays of ints [§5.2.1]
    var l = msg.length/4 + 2; // length (in 32-bit integers) of msg + ‘1’ + appended length
    var N = Math.ceil(l/16);  // number of 16-integer-blocks required to hold 'l' ints
    var M = new Array(N);

    for (var i=0; i<N; i++) {
        M[i] = new Array(16);
        for (var j=0; j<16; j++) {  // encode 4 chars per integer, big-endian encoding
            M[i][j] = (msg.charCodeAt(i*64+j*4)<<24) | (msg.charCodeAt(i*64+j*4+1)<<16) |
                (msg.charCodeAt(i*64+j*4+2)<<8) | (msg.charCodeAt(i*64+j*4+3));
        } // note running off the end of msg is ok 'cos bitwise ops on NaN return 0
    }
    // add length (in bits) into final pair of 32-bit integers (big-endian) [§5.1.1]
    // note: most significant word would be (len-1)*8 >>> 32, but since JS converts
    // bitwise-op args to 32 bits, we need to simulate this by arithmetic operators
    M[N-1][14] = ((msg.length-1)*8) / Math.pow(2, 32); M[N-1][14] = Math.floor(M[N-1][14]);
    M[N-1][15] = ((msg.length-1)*8) & 0xffffffff;

    // set initial hash value [§5.3.1]
    var H0 = 0x67452301;
    var H1 = 0xefcdab89;
    var H2 = 0x98badcfe;
    var H3 = 0x10325476;
    var H4 = 0xc3d2e1f0;

    // HASH COMPUTATION [§6.1.2]

    var W = new Array(80); var a, b, c, d, e;
    for (var i=0; i<N; i++) {

        // 1 - prepare message schedule 'W'
        for (var t=0;  t<16; t++) W[t] = M[i][t];
        for (var t=16; t<80; t++) W[t] = Sha1.ROTL(W[t-3] ^ W[t-8] ^ W[t-14] ^ W[t-16], 1);

        // 2 - initialise five working variables a, b, c, d, e with previous hash value
        a = H0; b = H1; c = H2; d = H3; e = H4;

        // 3 - main loop
        for (var t=0; t<80; t++) {
            var s = Math.floor(t/20); // seq for blocks of 'f' functions and 'K' constants
            var T = (Sha1.ROTL(a,5) + Sha1.f(s,b,c,d) + e + K[s] + W[t]) & 0xffffffff;
            e = d;
            d = c;
            c = Sha1.ROTL(b, 30);
            b = a;
            a = T;
        }

        // 4 - compute the new intermediate hash value (note 'addition modulo 2^32')
        H0 = (H0+a) & 0xffffffff;
        H1 = (H1+b) & 0xffffffff;
        H2 = (H2+c) & 0xffffffff;
        H3 = (H3+d) & 0xffffffff;
        H4 = (H4+e) & 0xffffffff;
    }

    return Sha1.toHexStr(H0) + Sha1.toHexStr(H1) + Sha1.toHexStr(H2) +
           Sha1.toHexStr(H3) + Sha1.toHexStr(H4);
};


/**
 * Function 'f' [§4.1.1].
 * @private
 */
Sha1.f = function(s, x, y, z)  {
    switch (s) {
        case 0: return (x & y) ^ (~x & z);           // Ch()
        case 1: return  x ^ y  ^  z;                 // Parity()
        case 2: return (x & y) ^ (x & z) ^ (y & z);  // Maj()
        case 3: return  x ^ y  ^  z;                 // Parity()
    }
};

/**
 * Rotates left (circular left shift) value x by n positions [§3.2.5].
 * @private
 */
Sha1.ROTL = function(x, n) {
    return (x<<n) | (x>>>(32-n));
};


/**
 * Hexadecimal representation of a number.
 * @private
 */
Sha1.toHexStr = function(n) {
    // note can't use toString(16) as it is implementation-dependant,
    // and in IE returns signed numbers when used on full words
    var s="", v;
    for (var i=7; i>=0; i--) { v = (n>>>(i*4)) & 0xf; s += v.toString(16); }
    return s;
};


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */


/** Extend String object with method to encode multi-byte string to utf8
 *  - monsur.hossa.in/2012/07/20/utf-8-in-javascript.html */
if (typeof String.prototype.utf8Encode == 'undefined') {
    String.prototype.utf8Encode = function() {
        return unescape( encodeURIComponent( this ) );
    };
}

/** Extend String object with method to decode utf8 string to multi-byte */
if (typeof String.prototype.utf8Decode == 'undefined') {
    String.prototype.utf8Decode = function() {
        try {
            return decodeURIComponent( escape( this ) );
        } catch (e) {
            return this; // invalid UTF-8? return as-is
        }
    };
}


///////////////////////////////////////////////////////////////////////////////////////
// ************************ ENCODE Base64 ************************
// Converts an ArrayBuffer directly to base64, without any intermediate 'convert to string then
// use window.btoa' step. According to my tests, this appears to be a faster approach:
// http://jsperf.com/encoding-xhr-image-data/5
// indices added by jfm
window.typed_arrays_alert_has_been_shown=false;
function base64ArrayBuffer(arrayBuffer,min_index,max_index) {
	
	if (typeof(Uint8Array)=='undefined') {
		if (!window.typed_arrays_alert_has_been_shown) {
			alert('Your browser does not support typed arrays. Please view this page using Chrome, FireFox, or Safari');
			window.typed_arrays_alert_has_been_shown=true;
		}
	}
	
  var base64    = '';
  var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  var bytes         = new Uint8Array(arrayBuffer);
  if (min_index===undefined) min_index=0;
  if (max_index===undefined) max_index=bytes.byteLength-1;
  var byteLength    = max_index-min_index+1;
  var byteRemainder = byteLength % 3;
  var mainLength    = byteLength - byteRemainder;

  var a, b, c, d;
  var chunk;

  // Main loop deals with bytes in chunks of 3
  for (var i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[min_index+i] << 16) | (bytes[min_index+i + 1] << 8) | bytes[min_index+i + 2];

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048)   >> 12; // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032)     >>  6; // 4032     = (2^6 - 1) << 6
    d = chunk & 63;               // 63       = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder == 1) {
    chunk = bytes[min_index+mainLength];

    a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    b = (chunk & 3)   << 4; // 3   = 2^2 - 1

    base64 += encodings[a] + encodings[b] + '==';
  } else if (byteRemainder == 2) {
    chunk = (bytes[min_index+mainLength] << 8) | bytes[min_index+mainLength + 1];

    a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008)  >>  4; // 1008  = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
    c = (chunk & 15)    <<  2; // 15    = 2^4 - 1

    base64 += encodings[a] + encodings[b] + encodings[c] + '=';
  }
  
  return base64;
}


// ************************ DECODE Base64 ************************
/**
 * Uses the new array typed in javascript to binary base64 encode/decode
 * at the moment just decodes a binary base64 encoded
 * into either an ArrayBuffer (decodeArrayBuffer)
 * or into an Uint8Array (decode)
 * 
 * References:
 * https://developer.mozilla.org/en/JavaScript_typed_arrays/ArrayBuffer
 * https://developer.mozilla.org/en/JavaScript_typed_arrays/Uint8Array
 */

var Base64Binary = {
	_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
	

	/* will return a  Uint8Array type */
	decodeArrayBuffer: function(input) {

		if (typeof(Uint8Array)=='undefined') {
			if (!window.typed_arrays_alert_has_been_shown) {
				alert('Your browser does not support typed arrays. Please view this page using Chrome, FireFox, or Safari');
				window.typed_arrays_alert_has_been_shown=true;
			}
		}
		
		var bytes = Math.ceil( (3*input.length) / 4.0);
		var ab = new ArrayBuffer(bytes);
		this.decode(input, ab);

		return ab;
	},

	decode: function(input, arrayBuffer) {
		
		//the following added by jfm (10/4/13)
		var _keyStr_lookup={};
		for (var j=0; j<this._keyStr.length; j++) {
			_keyStr_lookup[this._keyStr[j]]=j;
		}
		
		if (typeof(Uint8Array)=='undefined') {
			if (!window.typed_arrays_alert_has_been_shown) {
				alert('Your browser does not support typed arrays. Please view this page using Chrome, FireFox, or Safari');
				window.typed_arrays_alert_has_been_shown=true;
			}
		}
		
		//get last chars to see if are valid
		var lkey1 = this._keyStr.indexOf(input.charAt(input.length-1));
		var lkey2 = this._keyStr.indexOf(input.charAt(input.length-2)); //there was a bug here! See the comments of: http://blog.danguer.com/2011/10/24/base64-binary-decoding-in-javascript/

		var bytes = Math.ceil( (3*input.length) / 4.0);
		if (lkey1 == 64) bytes--; //padding chars, so skip
		if (lkey2 == 64) bytes--; //padding chars, so skip
		
		var uarray;
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;
		var j = 0;

		if (arrayBuffer)
			uarray = new Uint8Array(arrayBuffer);
		else
			uarray = new Uint8Array(bytes);

		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

		for (i=0; i<bytes; i+=3) {	
			//get the 3 octects in 4 ascii chars
			
			//jfm replaced the following (10/4/13)
			//enc1 = this._keyStr.indexOf(input.charAt(j++));
			//enc2 = this._keyStr.indexOf(input.charAt(j++));
			//enc3 = this._keyStr.indexOf(input.charAt(j++));
			//enc4 = this._keyStr.indexOf(input.charAt(j++));
			enc1=_keyStr_lookup[input.charAt(j++)]||0;
			enc2=_keyStr_lookup[input.charAt(j++)]||0;
			enc3=_keyStr_lookup[input.charAt(j++)]||0;
			enc4=_keyStr_lookup[input.charAt(j++)]||0;
			
			if ((enc1<0)||(enc2<0)||(enc3<0)||(enc4<0)) {
				console.log ('################',input.slice(j-4,j),enc1,enc2,enc3,enc4);
			}

			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;

			uarray[i] = chr1;			
			if (enc3 != 64) uarray[i+1] = chr2;
			if (enc4 != 64) uarray[i+2] = chr3;
		}

		return uarray;	
	}
};
