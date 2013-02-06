module.exports = function(config) {

	// Configured worker
	return function(next, req, res) {
		res.write("loop b\r\n")
		next.deeper(this.getLoop(config.workers)).next()
	}
}