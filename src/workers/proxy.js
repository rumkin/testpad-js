module.exports = function(config, pad) {

	// Configured worker
	return function(next, req, res) {
		res.setHeader("Content-Type", "text/plain")
		res.write("loop a\r\n")

		next()

	}
}