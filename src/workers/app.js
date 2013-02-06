module.exports = function(config) {

	// Configured worker
	return function(next, req, res, err) {
		
		if (err) return next(err)
		if ( ! req.zone) return next()

		var zone = req.zone


		res.write(require("util").inspect(zone) + "\r\n")

		next.deeper(this.getLoop(config.workers)).next()
	}
}