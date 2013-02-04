/* DEPENDENCIES */
var http = require('http')
	, ini  = require('ini')
	, fs   = require('fs')
	, path = require('path')
	, url  = require('url')

var Testpad = module.exports = function (configPath) {
	var config = this.config = ini.parse(
		fs.readFileSync(configPath, 'utf-8')
	)

	config.workers = config.workers || path.join(__dirname, 'workers')
	this.runmode = config.runmode || 'production'
	this.workers = {}
	this.cache = {}
	this.dns   = {}
	this.zones = []

	for (var option in config) {
		if ( ! /^zone /.test(option)) continue;

		var zone =  config[option]
			, name = option.substr(5)
			, mask = (zone.mask || '').split(/,\s*/)

		zone.mask = mask

		for (var i = 0, l = mask.length; l > i; i++) {
			this.dns[mask[i]] = zone
			this.zones.push(mask[i])
		}
	}

	// Sort dns zones in reverse order
	this.zones = this.zones.sort(function(a, b) {
		a = a.split('.').reverse().join('.')
		b = b.split('.').reverse().join('.')

		switch(true){
		 case a > b:
		 	return -1;
		 case a < b:
		 	return 1;
		 default:
		 	return 0
		}
	})

	// Initialize workers
	for ( var name in config.worker) {
		var workerConfig = config.worker[name]
		console.log(name, workerConfig)
		if (workerConfig.enabled != true) continue

		var usedWorker = workerConfig.use ? this.workers[workerConfig.use] : void(0)

		this.workers[name] = require(path.join(config.workers, name + '.js'))(workerConfig, usedWorker)
	}
}

Testpad.prototype.run = function() {
	var config  = this.config
	
	this.server = http
		.createServer(this.request.bind(this))
		.listen(config.port, config.hostname)

	console.log("Start running in %s mode at %s:%s", this.runmode, config.hostname || 'localhost', config.port)
}

Testpad.prototype.request = function(req, res) {
	new Runbox(this, req, res).run()
}

var Runbox = function(testpad, req, res) {
	this.testpad  = testpad
	this.request  = req
	this.response = res
}

Runbox.prototype.run = function() {

	var req  = this.request
		, resp = this.response
		, testpad = this.testpad
		, info = req.urlInfo = url.parse('http://' + req.headers.host + req.url)

	this.log(req.url)

	if (this.cache[info.hostname]) {
		return this.runScript(this.cache[info.hostname])
	}

	var lookup = "." + info.hostname
		, zones  = testpad.zones

	for (var i = 0, l = zones.length; l > i; i++) {
		var zone = zones[i]

		if (lookup.substr( - zone.length) !== zone) continue

		var dns = testpad.dns[zone]
			, directory   = dns.directory
			, hostDir     = lookup.substr(0, lookup.length - zone.length).substr(1)
			, scriptName  = dns['require.' + testpad.runmode]
			, script      = path.join(directory, hostDir, scriptName)

		var testpad = this.testpad
			, runbox  = this

		return fs.exists(script, function(exists) {
			if (! exists) {
				runbox.error(500, 'Server error')
				console.error("Host " + info.hostname + " run script not found")
				return
			}
				runbox.runScript(script)
		})
	}

	this.error(404, "Host not found")
}

Runbox.prototype.cache = {}

Runbox.prototype.error = function(code, message) {
	this.response
		.writeHead(code, {
			'Content-Type' : 'text/plain'
		})
		.end(message)
}

Runbox.prototype.runScript = function(script) {
	this.cache[this.request.urlInfo.hostname] = script
	require(script)(this.request, this.response)
}

Runbox.prototype.log = function(msg) {
	console.log("%s %s %s", new Date(), this.request.urlInfo.hostname, msg)
}