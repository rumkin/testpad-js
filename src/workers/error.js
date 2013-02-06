module.exports = function(config) {

	// Configured worker
	return function(next, req, res, err) {
		if (err) {
			res.end(err.message)
		} else {
			res.end(config.error)
		}
	}
}