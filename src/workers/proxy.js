module.exports = function(config, pad) {

	// Configured worker
	return function(next, req, res, err) {
		
		if (err) return next(err)

		res.write("loop a\r\n")

		next()

	}
}