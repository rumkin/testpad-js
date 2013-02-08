/*/// --------------------------------------------------------------------------
	DEPENDENCIES
/*/// --------------------------------------------------------------------------

var fs   = require("fs")
	, path = require("path")

/*/// --------------------------------------------------------------------------
	WORKER
/*/// --------------------------------------------------------------------------

module.exports = function(config, testpad) {

	// Configured worker
	return function(next, req, res, err) {
		if (err) return next(err)
		if ( ! req.host) return next()

		var host = req.host
			, directory   = host.directory
			, hostDir     = req.lookup
			, scriptName  = host['require.' + testpad.runmode]
			, script      = path.join(directory, hostDir, scriptName)
		
		req.pause()
		return fs.exists(script, function(exists) {
			if (! exists) {
				return next(new Error("Script " + script + "not found"))
			}
			
			req.resume()
			req.current = {
				directory : path.join(directory, hostDir)
			}


			require(script)(next, req, res)
		})

		//res.write(require("util").inspect(host) + "\r\n")

		//next.deeper(this.getLoop(config.workers)).next()
	}
}