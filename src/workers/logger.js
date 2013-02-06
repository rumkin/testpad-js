module.exports = function(config) {

	// Configured worker
	return function(next, req, res, err) {
		
		if (config.console == true) {
			console.log("%s %s %s", new Date(), req.urlinfo.hostname, req.url)
		}

		next(err)
	}
}