exports.mlpLog=mlpLog;
var GLOBAL_LOG=new GlobalLog();
exports.GLOBAL_LOG=GLOBAL_LOG;
exports.onMessage=function(handler) {
	GLOBAL_LOG.onMessage(handler);
}

function mlpLog(msg) {
	msg.labels=msg.labels||{};
	GLOBAL_LOG.addMessage(msg);
}

function GlobalLog() {
	this.addMessage=function(msg) {addMessage(msg);};
	this.onMessage=function(handler) {m_message_handlers.push(handler);};

	var m_message_handlers=[];

	function addMessage(msg) {
		for (var i in m_message_handlers) {
			m_message_handlers[i](msg);
		}
	}
}
