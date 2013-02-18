var worker = require("worker")
	, path   = require("path")
	, fs     = require("fs")

module.exports = worker.extend({
	constructor : function (server, host, config) {
		this.server = server
		this.host	  = host
		this.config = config
	},

	run : function (next, req, res, err) {
		var base = "." + this.host.getName()
			, host = req.uri.hostname

		if (host.substr( - base.length) !== base) {
			return next(new Error("Host '" + host + "' not found"))
		}

		var search = host.substr(0, host.length - base.length)
			, layout = this.config.layout || 'flat'
			, hostPath

		switch (layout) {
			case 'tree' :
				hostPath = search.split('.').reverse().join(this.config.separate || path.sep)
				break;
			default: //flat
				hostPath = search
		}


		var docRoot = path.join(this.host.config.docroot, hostPath)
		//res.write("New docroot is" + docRoot + "\r\n")
		this.host.config.docroot = docRoot

		req.pause()
		fs.exists(docRoot, function(exists) {
			req.resume()
			exists ? next() : next(new Error ("Host document root '" + docRoot + "' not found"))
		})
	}
})