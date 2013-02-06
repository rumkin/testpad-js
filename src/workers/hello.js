/*// --------------------------------------------------------------------------
	DEPENDENCIES
*/// --------------------------------------------------------------------------
var url = require("url")



/*/// --------------------------------------------------------------------------
	MODULE
/*/// --------------------------------------------------------------------------


module.exports = function(config, testpad) {
	// Parse zones
	var testpadConfig = testpad.config
		, dns   = {}
		, zones = []

	for (var option in testpadConfig) {
		if ( ! /^zone /.test(option)) continue;

		var zone =  testpadConfig[option]
			, name = option.substr(5)
			, mask = (zone.mask || '').split(/,\s*/)

		zone.mask = mask

		for (var i = 0, l = mask.length; l > i; i++) {
			dns[mask[i]] = zone
			zones.push(mask[i])
		}
	}

	// Sort dns zones in reverse order
	zones = zones.sort(function(a, b) {
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

	testpad.zones = zones
	testpad.dns   = dns

	// WORKER -------------------------------------------------------------------
	
	return function (next, req, res, err) {
		if (err) next(err)

		req.urlinfo = url.parse('http://' + req.headers.host + req.url, true)
		req.query   = req.urlinfo.query
		req.zone    = false

		var lookup = "." + req.urlinfo.hostname
			, zones  = testpad.zones

		for (var i = 0, l = zones.length; l > i; i++) {
			var zone = zones[i]

			if (lookup.substr( - zone.length) !== zone) continue

			req.zone = testpad.dns[zone]
		}

		if ( config.force && ! req.zone) {
			next (new Error("No dns zone found"))
		} else {
			next()
		}
	}
}