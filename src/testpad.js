/*// --------------------------------------------------------------------------
	DEPENDENCIES
*/// --------------------------------------------------------------------------

var http = require("http")
	, ini  = require("ini")
	, fs   = require("fs")
	, path = require("path")
	, url  = require("url")
// Libraries and tools
	, format  = require("util").format
	, tools   = require("tools")
	, _extend = tools.extend
	, _proto  = tools.proto


// RUN LOOP -------------------------------------------------------------------
var Looop = _proto({

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

// TESTPAD --------------------------------------------------------------------

var Server = module.exports = _proto({
	workers : false,

	configDefaults : {
		port        : 8080,
		hostname    : 'localhost',
		//workers_dir : path.join(__dirname, "workers"),
		worker      : {}
	},

	workerDefaults : {
		use     : false,
		include : false
	},

	"static initWithIni" : function(iniLocation) {
		var config = ini.parse(fs.readFileSync(iniLocation, 'utf-8'))
			, server = new this(config)

		var hostDir = config.dirs.hosts
			, files   = fs.readdirSync(hostDir)

		var file, stat, host, hostConfig
		for (var i = 0, l = files.length; l > i; i++) {
			file = path.join(hostDir, files[i])
			if (path.extname(file) !== ".ini") continue
			stat = fs.statSync(file)

			host = files[i]
			host = host.substr(0, host.length - 4)
			// Add host
			server.addHost(host, ini.parse(fs.readFileSync(file, 'utf-8')))
		}
		return server
	},


	constructor : function (config) {
		var runmode = this.runmode = config.runmode || 'development'
		config = this.valuesByRunmode(config, runmode)

		this.config  = _extend({}, this.configDefaults, config)
		this.hosts   = {}
		this.workers = {}

		this.workersDir = this.config.dirs.workers || path.join(__dirname, "workers")

		if (typeof config.worker !== "object") {
			throw new Error("Workers not found in config")
		}

		//this.workers = this.loadWorkers(config.worker)

		this.frames = config.frame
	},

	valuesByRunmode : function (config, runmode) {
		runmode = runmode || this.runmode

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

	hasHost : function (name) {
		return (name in this.hosts)
	},

	addHost : function(name, config) {
		if (this.hasHost(name)) {
			throw new Error(format("Host '%s' already exists", name))
		}

		var workers = config.workers
		if (typeof workers == "string") {
			workers = workers.split(/,\s*/)
			config.workers = workers
		}

		var worker
		for (var i = 0, l = workers.length; l > i; i++) {
			worker = workers[i]
			if (this.hasWorker(worker)) continue

			this.loadWorker(worker)
		}

		this.hosts[name] = config
	},

	getHost : function (name) {
		return this.hosts[name]
	},

	hasWorker : function (name) {
		return (name in this.workers)
	},

	loadWorker : function (workerName) {
		var location = path.join(this.workersDir, workerName)

		this.workers[workerName] = require(location)
	},

	getWorker : function (name) {
		return this.workers[name]
	},

	buildQueue : function(list, workers) {
		if (typeof list == "string") {
			list = list.split(/,\s*/)
		}

		var queue = []
		  , name, worker
		
		for (var i = 0, l = list.length; l > i; i++) {
			name = list[i]

			if ( ! workers.hasOwnProperty(name)) {
				throw new Error(format("Wrong queue entry: worker '%s' not found", name))
			}
			worker = workers[name]
			queue.push(worker.run.bind(worker))
		}

		return queue
	},

	run : function() {
		
	  var host = this.config.hostname
	  	, port = this.config.port
	  
	  http.createServer(this.request.bind(this)).listen(port, host)
	  return this
	},

	request : function (req, res) {

		req.uri = url.parse('http://' + req.headers.host + req.url, true)

		var host = req.uri.hostname.split(".")
			, search

		while (host.length) {
			search = host.join('.')
			if (this.hasHost(search)) {

				
				var host  = new Host(this, search)
				  , queue = host.buildQueue()

				queue.push(this.clean.bind([host, queue]))
				var loop =  new Looop([req, res], queue)
				loop.spin()
				return
			}

			host.shift()
		}

		res.end("Not found")
	},

	clean : function (next, req, res, err) {
		var item
		for (var i = 0, l = this.length; l > i; i++) {
			item = this[i]

			if (typeof item.destroy == "function") {
				item.destroy()
			}

			for (var name in item) {
				item[name] = undefined
				delete item[name]
			}
		}
	}
})


var Host = _proto({
	constructor : function (server, name) {
		this.server  = server
		this.name    = name
		this.config  = _extend({}, server.getHost(name))
		this.params  = {}
		this.workers = {}
	},

	getParam : function (name) {
		return this.params[name]
	},

	getParams : function() {
		return _extend({}, this.params)
	},

	setParam : function (name, value) {
		this.params[name] = value
		return this
	},

	setParams : function() {
		for (var name in params) {
			this.params[name] = params[name]
		}

		return this
	},

	getName   : function () {
		return this.name
	},
	getConfig : function () {
		return this.config
	},
	
	buildQueue : function () {
		var workers = this.config.workers
			, queue   = []
			, name, worker, config

		for (var i = 0, l = workers.length; l > i; i++) {
			name   = workers[i]
			config = this.server.valuesByRunmode(this.config[name] || this.server.config[name])
			worker = this.getWorker(name, config)
			this.workers[name] = worker
			queue.push(worker.run.bind(worker))
		}

		return queue
	},

	getWorker : function (name, config) {
		var worker = this.server.getWorker(name)

		return new worker(this.server, this, config)
	},
	destroy : function () {

		for (var name in this.workers) {
			worker.destroy()
			this.workers[name] = undefined
			delete this.workers[name]
		}

		for (var prop in this) {
			this[prop] = undefined
			delete this[prop]
		}
	}
})