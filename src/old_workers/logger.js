module.exports = function(config) {

	// Configured worker
	return function(next, app, err) {
		
		if (config.console == true) {
			console.log("%s %s %s", new Date(), app.request.urlinfo.hostname, app.request.url)
		}

		next(err)
	}
}