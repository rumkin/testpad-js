/*// --------------------------------------------------------------------------
	DEPENDENCIES
*/// --------------------------------------------------------------------------

var http = require("http")
	, ini  = require("ini")
	, fs   = require("fs")
	, path = require("path")
	, url  = require("url")
	, format = require("util").format


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

	this.spins  = spins
	this.scope = scope
	this.args  = args

	var fn = this.spin.bind(this)
	fn.deeper  = this.spins.bind(this)
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
		
		this.spins.shift().apply(this.scope, args)
	},

	loop : function(spins) {
		this.spins = spins.concat(this.spins)
		return this
	}

})

var Testpad = module.exports = {
	initWithIni : function (iniPath) {
		var config = ini.parse(fs.readFileSync())

		return new LoopApp(config)
	}

}

var LoopApp = function (config) {
	this.config  = _extend({}, config)
	this.workers = {}

	if ( typeof config.workers !== "object") {
		throw new Error("Workers not found in config")
	}

	this.initWorkers(config.workers)
}

_extend(LoopApp.prototype, {
	workers : false,

	workerDefaults : {
		use     : false,
		include : false
	},

	initWorkers : function (workers) {
		var worker
		for (var name in workers) {
			worker = workers[name] = _extend({}, this.workerDefaults, workers[name])

			this.initWorker(name, config)
		}

		this.buildWorkers()
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
			, config = this.config.workers

		for (var name in this.workers) {
			configured[name] = this.workers[name](config[name], this)
		}

		this.configuredWorkers = configured
	},

	loadWorker : function (path) {
		return require(path)
	},

	findWorker : function (name) {
		var path = path.join(this.config.workers_dir, name + '.js')
		
		if ( ! fs.existsSync(path)) {
			throw new Error("Worker '%s' not found" )
		}

		return path
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

		return this.workers[worker]
	},

	hasWorker : function (name) {
		return (name in this.workers)
	}
})



Testpad.application = LoopApp
