module.exports = function(config) {

	// Configured worker
	return function(next, req, res, err) {
		
		if (err) return next(err)
		if ( ! req.host) return next()

		var host = req.host

		
		res.write(require("util").inspect(host) + "\r\n")

		next.deeper(this.getLoop(config.workers)).next()
	}
}