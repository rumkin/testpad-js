var worker = require("worker")

module.exports = worker.extend({
	constructor : function (server, host, config) {
		this.Worker(server, host, config)
	},

	run : function (next, req, res, err) {

		if (err || res.isFinished) {
			next(err)
			return
		}

		var location = this.host.config.docroot + '/' + this.config.require
			, exec = require(location).call(this.host, next, req, res, err)
	},
})