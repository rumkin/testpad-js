/*// --------------------------------------------------------------------------
	DEPENDENCIES
*/// --------------------------------------------------------------------------
var url = require("url")



/*/// --------------------------------------------------------------------------
	MODULE
/*/// --------------------------------------------------------------------------


module.exports = function(config, testpad) {
	// Parse hosts
	var testpadConfig = testpad.config
		, dns   = {}
		, hosts = []

	for (var option in testpadConfig) {
		if ( ! /^host /.test(option)) continue;

		var host =  testpadConfig[option]
			, name = option.substr(5)
			, mask = (host.mask || '').split(/,\s*/)

		host.mask = mask

		for (var i = 0, l = mask.length; l > i; i++) {
			dns[mask[i]] = host
			hosts.push(mask[i])
		}
	}

	// Sort dns hosts in reverse order
	hosts = hosts.sort(function(a, b) {
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

	testpad.hosts = hosts
	testpad.dns   = dns

	// WORKER -------------------------------------------------------------------
	
	return function (next, req, res, err) {
		if (err) next(err)

		req.urlinfo = url.parse('http://' + req.headers.host + req.url, true)
		req.query   = req.urlinfo.query
		req.host    = false

		var lookup = "." + req.urlinfo.hostname
			, hosts  = testpad.hosts

		for (var i = 0, l = hosts.length; l > i; i++) {
			var host = hosts[i]

			if (lookup.substr( - host.length) !== host) continue

			req.host = testpad.dns[host]
		}

		if ( config.force && ! req.host) {
			next (new Error("No dns host found"))
		} else {
			next()
		}
	}
}