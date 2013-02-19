var worker = require("worker")

module.exports = worker.extend({
	constructor : function (server, host, config) {
		this.Worker(server, host, config)
	},

	run : function (next, req, res, err) {

		res.end("Default worker")
		
	},
})