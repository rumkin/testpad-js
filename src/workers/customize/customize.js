// ----------------------------------------------------------------------------
//	Deps
// ----------------------------------------------------------------------------


var worker = require("worker")
	, fs     = require("fs")

// ----------------------------------------------------------------------------
//	Module
// ----------------------------------------------------------------------------


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
		
		if ( ! fs.existsSync(location))
			return next(new Error("Customization file '" + location + "' not found"))

		require(location).call(this.host, next, req, res, err)
	},
})