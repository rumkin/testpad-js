module.exports = function(config) {

	// Configured worker
	return function(next, req, res, err) {
		if (err) {
			res.end(err)
		} else {
			res.end(config.error)
		}
	}
}