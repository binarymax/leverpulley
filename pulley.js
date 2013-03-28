(function (self) {
	"use strict";

	var cache = null;
	var thread = self.thread = {};
	thread.init = function(data){
		importScripts(data.library);
		var library = self[data.name];
		for(var key in library) {
			register(key);	
			if(typeof library[key] === 'function') thread[key] = library[key];
		}
		send("ready");
		return 0;
	};

	//Worker Messaging System
	var context = {};
	var send = function(type,data) { self.postMessage( {type:type,data:data} );};
	var register = function(data) { send("register",data); };
	var message = function(data) { send("message",data); };
	self.onmessage = function(event) {
		
		var data = event.data;
		var params = data.params;
		var types = data.types;
		var id   = data.id;
		var type = data.type;
		if (type ==='init') {
			thread.init(data.data);
		} else 	if (type ==='hoist') {
			context = data.context;
 		} else if (type && typeof thread[type]==='function' && data.params instanceof Array) {
 			for(var args=[],i=0,l=data.params.length;i<l;i++) {
				var obj = data.params[i], val;
				if (obj.type==='function') {
					var func = (eval("(" + obj.value + ")"));
					val = function() { return func.apply(context,arguments); };
				} else {
					val = obj.value;
				}
				args.push(val);
			}
			thread[type].apply(self,args);
			send(type + id, context);
		}
	};

})(self);