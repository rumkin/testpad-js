/*/// --------------------------------------------------------------------------
	Dependencies
/*/// --------------------------------------------------------------------------

var worker  = require("worker")
	, tools   = require("tools")
	, _extend = tools.extend

/*/// --------------------------------------------------------------------------
	Worker
/*/// --------------------------------------------------------------------------

module.exports = worker.extend({
	constructor : function (server, config) {
		this.server = server
		this.config = config

		var serverConfig = server.config
		, routes = {}
		, frames = []

		for (var name in serverConfig.frame) {

			var frame =  serverConfig.frame[name]
				, mask = (frame.mask || '').split(/,\s*/)

			frame.mask = mask

			for (var i = 0, l = mask.length; l > i; i++) {
				routes[mask[i]] = frame
				frames.push(mask[i])
			}
		}

		// Sort route frames in reverse order
		frames = frames.sort(function(a, b) {
			a = a.split('.').reverse().join('.')
			b = b.split('.').reverse().join('.')

			switch(true){
			 case a > b:
			 	return -1;
			 case a < b:
			 	return 1;
			 default:
			 	return 0
			}
		})

		this.frames = frames
		this.routes = routes
	},

	run : function (next, app, err) {
		if (this.skip(err, app)) return next(err)

		var req = app.request
			, res = app.response
			, frame = app.frame = {}

		var hostname = req.uri.hostname
			, lookup   = "." + hostname
			, frames   = this.frames
			, routes   = this.routes
			, name

		for (var i = 0, l = frames.length; l > i; i++) {
			var name = frames[i]
			
			if (lookup.substr( - name.length) === name) {
				frame.name   = name
				frame.search = lookup.substr(0, lookup.length - name.length).substr(1)
				break
			}
		}
		
		if ( ! frame.name) {
			next (new Error("Host not found"))
			return
		}
		
		app.frame    = frame = _extend({}, this.routes[name], frame)
		app.env.host = req.uri.hostname
		for (var name in frame) {
			app.env['frame_' + name] = frame[name]
		}

		next()

	},

	skip : function (err, app) {
		if (err || app.response.isFinished) return true
	}

})