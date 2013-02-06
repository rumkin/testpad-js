module.exports = function(config, pad) {

	// Configured worker
	return function(next, req, res) {
		
		res.write("loop a\r\n")

		next()

	}
}