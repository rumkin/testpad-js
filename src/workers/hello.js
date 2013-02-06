/*// --------------------------------------------------------------------------
	DEPENDENCIES
*/// --------------------------------------------------------------------------
var url = require("url")



/*/// --------------------------------------------------------------------------
	MODULE
/*/// --------------------------------------------------------------------------


module.exports = function(config, testpad) {
	// Parse zones



	// Configured worker
	return function(next, req, res, err) {
		req.urlinfo = url.parse('http://' + req.headers.host + req.url, true)
		req.query = req.urlinfo.query

		// TODO detect host

		next()
	}
}