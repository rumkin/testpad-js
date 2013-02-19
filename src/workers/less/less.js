var worker = require("worker")
	, less   = require("less")
	, path   = require("path")
	, fs     = require("fs")


module.exports = worker.extend({
	constructor : function (server, host, config) {
		this.Worker(server, host, config)
	},

	run : function (next, req, res, err) {

		if (err || res.isFinished) return next(err)

		var ext      = path.extname(req.uri.pathname).substr(1)
			, location = path.join(this.host.config.docroot, this.config.dir, req.uri.pathname)

		if (this.host.config.extensions.less.split(/\s+/).indexOf(ext) < 0) {
			return next()
		}

		if ( ! fs.existsSync(location)) {
			next()
			return
		}

		var css = less.render(fs.readFileSync(location, 'utf-8'), {
			env : this.config.env || 'production'
		}, function(err, css){
			if (err) {
				next(err)
				return
			}

			res.setHeader("Content-Type", "text/css")
			res.statusCode = 200
			res.end(css)
			next()
		})
	},
})