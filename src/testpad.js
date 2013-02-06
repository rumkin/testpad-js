/*// --------------------------------------------------------------------------
	DEPENDENCIES
*/// --------------------------------------------------------------------------

var http = require("http")
	ini  = require("ini")
	fs   = require("fs")
	path = require("path")
	url  = require("url")


var _extend = function() {
	if (arguments.length < 1) return {}
	if (arguments.length == 1) return arguments[0]

	var target = arguments[0]
		, source
	for (var i = 1, l = arguments.length; l > i; i++) {
		source = arguments[i]
		for (var prop in source) {
			target[prop] = source[prop]
		}
	}

	return target
}

// TESTPAD --------------------------------------------------------------------

var Testpad = module.exports = function (configPath) {

	this.config =  ini.parse(fs.readFileSync(configPath, 'utf-8'))
	this.config.workers = (this.config.workers || '').split(/,\s*/)
	this.workers = {}
	
	this.loadWorkers()
}

_extend(Testpad.prototype, {
	run : function() {

		var config = this.config

		http.createServer(this.runLoop.bind(this)).listen(config.port, config.hostname)
		console.log("Testpad server started on %s:%s in %s mode", config.hostname, config.port, config.runmode.toUpperCase())
	},

	workerDefaults : {
		"workers" : [],
		"enabled" : false,
		"path"    : false,
		"use" : false
	},

	runLoop : function(req, res) {
		new Loop([req, res], this, this.getLoop(this.config.workers)).next()
	},

	getLoop : function(queue) {

		var loop = []
			, config  = this.config.worker
			, workers = this.workers

		for (var i = 0, l = queue.length; l > i; i++) {
			var name = queue[i]
			//if (config[name].enabled)
				loop.push(this.loop[name])
		}

		return loop
	},

	// Load workers
	loadWorkers : function () {
		var dir = this.config.workers_dir || (__dirname + '/workers')
			, workers = this.workers
			, loop = {}

		for (var name in this.config.worker) {
			var config = _extend({}, this.workerDefaults, this.config.worker[name])
			
			if (typeof config.workers == "string") {
				config.workers = config.workers.split(/,\s*/)
			}

			this.config.worker[name] = config

			if ( ! config.use) {
				var workerPath = config.path || path.join(dir, name + ".js")
				workers[name] = require(workerPath)
			} else {
				workers[name] = workers[config.use]
			}
		}

		// Init workers
		for (var name in workers) {
			loop[name] = workers[name](this.config.worker[name], this)
		}

		this.loop = loop
	}
})



// RUN LOOP -------------------------------------------------------------------

var Loop = function(args, scope, loop) {
	if (arguments.length == 2) {
		loop  = scope
		scope = null
	} else if (arguments.length == 1) {
		loop  = args
		scope = null
		args  = []
	}

	this.loop  = loop
	this.scope = scope
	this.args  = args

	var fn = this.next.bind(this)
	fn.deeper = this.deeper.bind(this)
	this._next = fn
}

_extend(Loop.prototype, {

	next : function () {
		if ( ! this.loop.length) {
			this._next = null
			delete this._next
			return
		}

		var passed = Array.prototype.slice.call(arguments)
			, args = [this._next].concat(this.args).concat(passed)
		
		this.loop.shift().apply(this.scope, args)
	},

	deeper : function(loop) {
		this.loop = loop.concat(this.loop)
		return this
	}

})

