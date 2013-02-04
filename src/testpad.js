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

	this.runmode = config.runmode || 'production'
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
}

Testpad.prototype.run = function() {
	var config  = this.config
	
	this.server = http
		.createServer(this.request.bind(this))
		.listen(config.port, config.hostname)

	console.log("Start running in %s mode at %s:%s", this.runmode, config.port, config.hostname || 'localhost')
}

Testpad.prototype.request = function(req, res) {

	var urlinfo = req.urlInfo = url.parse("http://" + req.headers.host + req.url, true)
	
	// res.end(urlinfo.hostname)
	var lookup = "." + urlinfo.hostname
		, zones  = this.zones

	for (var i = 0, l = zones.length; l > i; i++) {
		var zone = zones[i]

		if (lookup.substr( - zone.length) !== zone) continue


		var dns = this.dns[zone]
			, directory   = dns.directory
			, hostDir     = lookup.substr(0, lookup.length - zone.length).substr(1)
			, scriptName  = dns['require.' + this.runmode]
			, script = path.join(directory, hostDir, scriptName)

		fs.exists(script, function(exists) {
			if (! exists) return res.end('Not found')
				require(script)(req, res)
		})

		return
	}

	res.end('Not found')
}

Testpad.prototype.runScript = function(script) {
	
}