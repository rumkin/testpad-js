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
		workers_dir : path.join(__dirname, "workers"),
		worker      : {}
	},

	workerDefaults : {
		use     : false,
		include : false
	},

	constructor : function (config) {
		var runmode = config.runmode || 'development'
		config = this.valuesByRunmode(config, runmode)

		this.config  = _extend({}, this.configDefaults, config)
		
		if (typeof config.worker !== "object") {
			throw new Error("Workers not found in config")
		}

		this.workers = this.loadWorkers(config.worker)

		this.frames = config.frame
	},

	"static initWithIni" : function(iniLocation) {
		var config = ini.parse(fs.readFileSync(iniLocation, 'utf-8'))

		return new this(config)
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

	loadWorkers : function(workersConfig) {
		var workers = {}
		  , workerConfig, location, worker

		for (var name in workersConfig) {
			workerConfig = _extend({}, this.workerDefaults, workersConfig[name])

			if (workerConfig.use) {
				if ( ! this.workers[workerConfig.use]) {
					throw new Error(format("Worker '%s' doesn't exists"))
				}
				worker = this.workers[workerConfig.use]

			} else {

				if (workerConfig.include) {
					location = workerConfig.include
					if (location.charAt(0) !== "/") {
						location = path.join(this.config.workers_dir, location)
					}
				} else {
					location = path.join(this.config.workers_dir, name)
				}

				worker = require(location)
			}

			workers[name] = worker
		}

		return workers
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
		
		var config  = this.config
		  , workers = this.workers
	    , configured   = {}
	    , workerConfig = config.worker

	  for (var name in workers) {
	  	configured[name] = new workers[name](this, workerConfig[name] || {})
	  }

	  var host = config.hostname
	  	, port = config.port
	  
	  http.createServer(this.request.bind(this, configured)).listen(port, host)
	  return this
	},

	request : function(workers, req, res) {

		var queue = this.buildQueue(this.config.workers, workers)
			, app   =
			{
				server   : this,
				request  : req,
				response : res,
				send     : res.end.bind(res),
				config   : this.config,
				workers  : workers
			}

		req.uri = url.parse('http://' + req.headers.host + req.url, true)
		queue.push(this.clean)
		
		new Looop([app], queue).spin()
	},

	clean : function (next, app, err) {
		if (app.response.isFinished === false) {
			app.response.end('')
		}

		for (var i in app) {
			app[i] = null
			delete app[i]
		}
	}
})

