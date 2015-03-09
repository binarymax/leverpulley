var lp = window.lp = (function(){
	"use strict";

	var callbacks = {};
	var wrapperId = 0;
	
	var isFunc = function(obj) { return typeof obj === 'function'; };
		
	//------------------------------------------------------------------
	//Client Library Loader:
	var Client = function(name,library,callback){

		var self = this;

		self.promises=[];
		self.promissed = null;
		
		var done = function(callback){
			if (!self.promissed) self.promises.push(callback);
			else callback.call(self,self.promissed);
			return self;
		};
		
		var promise = function(data) {
			var p; self.promissed = data;
			while(p = self.promises.pop()) p.call(self,data);
			return self;
		};

		var wrap = function(type){
			var wrapper = function() {
				var data = {params:[]};
				data.type = type;
				data.id = wrapperId++;

				for(var i=0,l=arguments.length,val;i<l;i++) {
					val = arguments[i];
					data.params[i] = {
						value:isFunc(val)?val.toString():val,
						type:typeof val
					};
				}

				post(data,function(data){ wrapper.promise(data); });

				return wrapper;

			};
			wrapper.done = done;			
			wrapper.promise = promise;
			return wrapper;
		};
		
		//Receives a library method registration
		var workerRegister = function(key) { self[key] = wrap(key); };
		
		//Receives a generic message
		var workerMessage = function(data){ console.log(data); };
		
		//Receives a calculation result
		var workerResult = function(data) {
			if(isFunc(callbacks[data.type])) {
				callbacks[data.type](data.data);
			}
		};
		
		//Triggered when the library was loaded successfully
		var workerReady = function(data) {
			if(isFunc(callback)) callback.apply(self[name],data);
		};
		
		//
		var post = function(data,callback) {
			callbacks[data.type + data.id] = callback;
			worker.postMessage(data);	
		};
				
		//Include the script on the client side
		var script = document.createElement('script');
		script.setAttribute("type","text/javascript");
		script.setAttribute("src",library);
		document.body.appendChild(script);
		
		//Initialize the worker to load the library:
		var worker = this.worker = new Worker('pulley.js');
		worker.onmessage = workerEvent("worker",workerRegister,workerMessage,workerResult,workerReady);
		worker.postMessage({'type':'init',data:{name:name,library:library}});
	}
		
	//Hoists data into the worker
	Client.prototype.hoist = function(data){
		this.worker.postMessage({'type':'hoist',context:data});
		return this;
	};

	//------------------------------------------------------------------
	
	//Create the client library
	var client  = function(name,library,callback) {
		if(!lp[name]) { 
			lp[name] = new Client(name,library,callback);
		}
	};
			
	//------------------------------------------------------------------
	//Event builder:
	var workerEvent = function(source,register,message,result,ready) {
		return function(event) {
			var data = event.data;
			var type = data.type;
			switch (data.type) {
				case "register":register(data.data);break;
				case "message":message(data.data);break;
				case "result":result(data.data);break;
				case "ready":ready(data.data);break;
				default: result(data);break;
			}
		};	
	};
	
	return client;

})();
