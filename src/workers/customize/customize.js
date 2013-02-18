var worker = require("worker")

module.exports = worker.extend({
	constructor : function (server, host, config) {
		this.Worker(server, host, config)
	},

	run : function (next, req, res, err) {

		var location = this.host.config.docroot + '/' + this.config.require
			, exec = require(location)(next, req, res, err)
		next()		
	},
})