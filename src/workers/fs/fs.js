var worker = require("worker")

module.exports = worker.extend({
	constructor : function (server, config) {
		this.server = server
		this.config = config
	},

	run : function (next, app, err) {
		var path = this.config.path
		if ( ! path) {
			next()
			return
		}

		path = this.createValue(path, app.env)
		console.log(path)
		next()
	},

	skip : function (err, app) {
		if (err || app.response.isFinished) return true
	}

})