var worker = require("worker")

module.exports = worker.extend({
	constructor : function (server, config) {
		this.server = server
		this.config = config
	},

	run : function (next, app, err) {
		if (err) {
			app.send("Fuck you! ^___^")
		} else {
			app.send("Fuck you anyway! ^___^")
		}
	},

	skip : function (err, app) {
		if (err || app.response.isFinished) return true
	}

})