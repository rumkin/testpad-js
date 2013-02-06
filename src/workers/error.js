module.exports = function(config) {

	// Configured worker
	return function(next, req, res, err) {
		if (err) {
			res.end("Error: " + err.message)
		} else {
			res.end("Error: " + config.error)
		}
	}
}