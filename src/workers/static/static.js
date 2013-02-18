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

	run : function (next, req, res, err) {

		var pathname = path.join(this.host.config.docroot, req.uri.pathname)

		if (this.config.skip_ext) {

			var extname = path.extname(pathname)
			if (this.config.skip_ext.indexOf(extname.substr(1)) > -1) {
				next()
				return
			}
		}

		req.pause()
		fs.stat(pathname, function(err, stat){

			if (err || ! stat.isFile()) {
				req.resume()
				next(err)
				return
			}

			fs.readFile(pathname, function(err, file){
				req.resume()
				if ( ! err ) {
					res.end(file)
				}

				next(err)
			})
		})
	}
})