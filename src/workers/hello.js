/*// --------------------------------------------------------------------------
	DEPENDENCIES
*/// --------------------------------------------------------------------------
var url = require("url")



/*/// --------------------------------------------------------------------------
	MODULE
/*/// --------------------------------------------------------------------------


module.exports = function(config, testpad) {
	// Parse zones
	var config = testpad.config
		, dns   = {}
		, zones = []

	for (var option in config) {
		if ( ! /^zone /.test(option)) continue;

		var zone =  config[option]
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

	// Configured worker
	return function (next, req, res, err) {
		req.urlinfo = url.parse('http://' + req.headers.host + req.url, true)
		req.query   = req.urlinfo.query

		res.write(require("util").inspect(this.dns))
		res.write(require("util").inspect(this.zones))
		// TODO detect host

		next()
	}
}