/*// --------------------------------------------------------------------------
	DEPENDENCIES
*/// --------------------------------------------------------------------------

var http = require("http")
	, ini  = require("ini")
	, fs   = require("fs")
	, path = require("path")
	, url  = require("url")
	, format = require("util").format


function _extend (target, source) {
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

function _proto (object) {
	object = _extend({}, object)
	var constructor = object.constructor
	delete object.constructor

	_extend(constructor.prototype, object)

	return constructor
}

// TESTPAD --------------------------------------------------------------------

var Testpad = module.exports = function (configPath) {

	this.config  = ini.parse(fs.readFileSync(configPath, 'utf-8'))
	this.runmode = this.config.runmode
	this.config.workers = (this.config.workers || '').split(/,\s*/)
	this.workers = {}
	
	this.loadWorkers()
}

_extend(Testpad.prototype, {
	run : function() {

		var config  = this.config
			, testpad = this

		http.createServer(function(req, res) {
			req.workers = testpad.loop
			new Loop([req, res], testpad, [testpad.loop.hello, testpad.loop.logger, testpad.loop.app]).next()
		}).listen(config.port, config.hostname)
		console.log("Testpad server started on %s:%s in %s mode", config.hostname, config.port, config.runmode.toUpperCase())
	},

	workerDefaults : {
		"workers" : [],
		"enabled" : false,
		"path"    : false,
		"use" : false
	},

	runLoop : function(req, res) {
		
		//res.setHeader("Content-Type", "text/plain")
		req.workers = _extend({}, this.loop)
		
		new Loop([req, res], this, this.getLoop(this.config.workers)).spin()
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

// Loop interface
// var loop = new Loop([], scope, [fn1, fn2, fn3])
// loop.spin() // Go inside loop
// loop.loop([fn4, fn5]) // push spins

var Loop = function(args, scope, spins) {
	if (arguments.length == 2) {
		spins  = scope
		scope = null
	} else if (arguments.length == 1) {
		spins  = args
		scope = null
		args  = []
	}

	this.spins = spins
	this.scope = scope
	this.args  = args

	var fn = this.spin.bind(this)
	fn.deeper  = this.loop.bind(this)
	this._next = fn
}

_extend(Loop.prototype, {

	spin : function () {
		if ( ! this.spins.length) {
			this._next = null
			delete this._next
			return
		}

		var passed = Array.prototype.slice.call(arguments)
			, args = [this._next].concat(this.args).concat(passed)
		
		if (this._trigger && this._started) {
				if ( this._trigger.apply(this.scope, this.args) === false) {
					return
				}
		}

		this._started = true
		this.spins.shift().apply(this.scope, args)
	},
	
	_started : false,
	// Step callback
	_trigger : false,

	trigger : function(fn) {
		this._trigger = fn
		return this
	},

	loop : function(spins) {
		this.spins = spins.concat(this.spins)
		return this
	}

})

var Testpad = module.exports = {
	initWithIni : function (iniPath) {
		var config = ini.parse(fs.readFileSync(iniPath, 'UTF-8'))

		return new LoopApp(config)
	}

}

var LoopApp = function (config) {
	var runmode = config.runmode || 'development'
	config = this.valuesByRunmode(config, runmode)

	this.config  = _extend({}, this.configDefaults, config)
	this.workers = _extend({}, this.standardWorkers)
	
	if ( typeof config.worker !== "object") {
		throw new Error("Workers not found in config")
	}

	this.initWorkers(config.worker)
	this.frames = config.frames
}

// Methods 
_extend(LoopApp.prototype, {
	workers : false,

	configDefaults : {
		port        : 8080,
		hostname    : 'localhost',
		workers_dir : path.join(__dirname, "workers"),
		worker      : {}
	},

	workerDefaults : {
		use     : false,
		include : false
	},

	valuesByRunmode : function (config, runmode) {

		var prefix    = runmode + '.'
		  , newConfig = {}
		  , section, value, newSection, newOption

		for (var key in config) {
			value = config[key]
			if (typeof value == "object") {
				newConfig[key] = this.valuesByRunmode(value, runmode)
			} else {
				if (key.indexOf(".") < 0) {
					newConfig[key] = value
				} else {
					if (key.substr(0, prefix.length) == prefix) {
						key = key.substr(prefix.length)
						newConfig[key] = value
					}
				}
			}
		}

		return newConfig
	},

	initWorkers : function (workers) {
		var config
		for (var name in workers) {
			config = workers[name] = _extend({}, this.workerDefaults, workers[name])

			this.initWorker(name, config)
		}
	},

	initWorker : function (name, config) {
		var worker
		if (config.include) {
			worker = this.loadWorker(config.include)
		} else if (config.use) {
			worker = this.getWorker(config.use)
		} else {
			worker = this.loadWorker(this.findWorker(name))
		}

		this.addWorker(name, worker)
	},

	buildWorkers : function() {
		var configured = {}
			, config = this.config.worker

		for (var name in this.workers) {
			configured[name] = this.workers[name](config[name] || {}, this)
		}

		return configured
	},

	loadWorker : function (path) {
		return require(path)
	},

	findWorker : function (name) {
		var location = path.join(this.config.workers_dir, name + '.js')
		

		if ( ! fs.existsSync(location)) {
			throw new Error(format("Worker '%s' not found", name))
		}

		return location
	},

	addWorker  : function (name, worker) {
		if ( this.hasWorker(name)) {
			throw new Error(format("Worker '%s' already exists", name))
		}

		this.workers[name] = worker
	},

	getWorker : function (name) {
		if ( ! this.hasWorker(name)) {
			throw new Error(format("Worker '%s' not found", name))
		}

		return this.workers[name]
	},

	hasWorker : function (name) {
		return (name in this.workers)
	},

	run : function() {
		var workers = this.getWorkers(this.config.workers, this.buildWorkers())
		http.createServer(this.request.bind(this, workers)).listen(this.config.port, this.config.hostname)
		return this
	},

	request : function (workers, request, response) {
		var app = {
			env      : _extend({}, this.config.environment),
			frame    : {},
			request  : request,
			response : response,
			server   : this
		}

		new Loop([app], this, workers).spin()
		//response.end(JSON.stringify(this.config, null, 4))
	},

	getWorkers : function(loop, workers) {
		
		if (typeof loop == "string") {
			loop = loop.split(/,\s*/)
		}

		var newLoop = []
			, name
		for (var i = 0, l = loop.length; l > i; i++) {
			name = loop[i]
			if ((name in workers) == false) {
				throw new Error(format("Worker '%s' not found", name))
			}
			newLoop.push(workers[name])
		}

		return newLoop
	}
})

// Standart workers
LoopApp.prototype.standardWorkers = {
	hi : function (options, server) {
		return function (next, app) {
			app.response.end("Hi ^___^")
		}
	}
}

Testpad.application = LoopApp


var Loop = _extend({

	constructor : function(args, scope, spins) {
		if (arguments.length == 2) {
			spins = scope
			scope = null
		} else if (arguments.length == 1) {
			spins = args
			scope = null
			args  = []
		}

		this.spins = spins
		this.scope = scope
		this.args  = args

		var fn     = this.spin.bind(this)
		fn.loop    = this.loop.bind(this)
		this._spin = fn
	},

	spin : function () {
		if ( ! this.spins.length) {
			this._spin = null
			delete this._spin
			return
		}

		var passed = Array.prototype.slice.call(arguments)
			, args = [this._spin].concat(this.args).concat(passed)
		
		this._started = true
		this.spins.shift().apply(this.scope, args)
	},
	
	loop : function(spins) {
		this.spins = spins.concat(this.spins)
		return this
	}

})


process.exit()