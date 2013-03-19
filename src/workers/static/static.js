var worker = require("worker")
  , fs     = require("fs")
  , path   = require("path")

module.exports = worker.extend({
	constructor : function (server, host, config) {
		this.Worker(server, host, config)
	},

	getRandomMessage : function () {

		var messages = this.messages 
		  , i = Math.round(Math.random() * (messages.length - 1))

		return messages[i]
	},

	mimeTypes : {
		// Text formats
		"css" : "text/css",
		"html": "text/html",
		"txt" : "text/plain",
		"js"  : "text/javascript",
		"json": "application/json",
		// Images
		"jpg"  : "image/jpeg",
		"jpeg" : "image/jpeg",
		"gif"  : "image/gif",
		"png"  : "image/png"
	},

	run : function (next, req, res, err) {

		if (err || res.isFinished) return next(err)

		var pathname = path.join(this.host.config.docroot, this.host.config.static.dir, req.uri.pathname)
			, ext      = path.extname(req.uri.pathname).substr(1).toLowerCase()


		if (this.config.skip_ext) {

			var extname = path.extname(pathname)
			if (this.config.skip_ext.indexOf(extname.substr(1)) > -1) {
				next()
				return
			}
		}

		var worker = this
		req.pause()
		fs.exists(pathname, function(exists) {
			
			if (! exists) {
				req.resume()
				return next()
			}

			fs.stat(pathname, function(err, stat){
				if (err || ! stat.isFile()) {
					req.resume()
					next(err)
					return
				}

				fs.readFile(pathname, function(err, file){
					req.resume()
					if ( ! err ) {

						if (ext in worker.mimeTypes) {
							res.setHeader("Content-Type", worker.mimeTypes[ext])
						}

						res.end(file)
					}

					next(err)
				})
			})
		})
		
	}
})