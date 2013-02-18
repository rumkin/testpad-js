var worker = require("worker")
  , spawn  = require("child_process").spawn
  , url    = require("url")
  , fs     = require("fs")
  , path   = require("path")
  , tools  = require("tools")
  , _extend = tools.extend

module.exports = worker.extend({
	constructor : function (server, host, config) {
		this.Worker(server, host, config)
	},

	run : function (next, req, res, err) {

		if (err || res.isFinished) {
			next(err)
			return
		}
		
		var hostconf = this.host.config
		  , query    = req.uri
		  , docRoot  = hostconf.docroot
			, pathname = path.join(docRoot, query.pathname)


		if ( ! fs.existsSync(pathname)) {
			return next()
		}
		

		if (fs.statSync(pathname).isDirectory()) {
			pathname = path.join(pathname, this.host.config.index)
		}

		if (path.extname(pathname).substr(1) !== this.config.ext) {
			next()
			return
		}

		if ( ! fs.existsSync(pathname)) {
			return next()
		}

		// Create process environment with CGI variables
		var env = _extend({}, process.env, {
			GATEWAY_INTERFACE : 'CGI/1.1',
	    SCRIPT_FILENAME   : pathname,
	    DOCUMENT_ROOT     : docRoot,
	    SERVER_NAME       : 'localhost',
	    SERVER_PORT       : 8090,
	    SERVER_PROTOCOL   : 'HTTP/1.1',
	    SERVER_SOFTWARE   : 'node/' + process.version,
	    REDIRECT_STATUS   : 1,
			REQUEST_METHOD    : req.method,
			QUERY_STRING      : (query.search || '?').substr(1)
		})

		// Add HTTP headers to environment prefixed with 'HTTP_'
		for (var header in req.headers) {
			var name = 'HTTP_' + header.toUpperCase().replace(/-/g, '_')
			env[name] = req.headers[header]
		}
		
		// Add special environment variables to process incoming data	
		if ('content-length' in req.headers) {
			env.CONTENT_LENGTH = req.headers['content-length']
		}

		if ('content-type' in req.headers) {
			env.CONTENT_TYPE = req.headers['content-type']
		}

		var cgi = spawn('php-cgi', hostconf.argv || ["-c", "/etc/php.ini"], { env : env, cwd : hostconf.docroot });

		if (req.method != 'GET') {
			// Redirect HTTP request body to cgi input
			req.pipe(cgi.stdin)
		}

		// PROCESS CGI RESPONSE -----------------------------------------------------
		
		var buff    = new Buffer('', 'utf-8')
			, headers = false

		cgi.stdout.on('data', function (data) {
			if ( ! headers) {
				header = true

				var data = data.toString('utf-8')
				
				// Parse headers
				while (true) {
					var crlfPos = data.indexOf("\r\n")

					if ( crlfPos < 0) break;

					var header = data.substr(0, crlfPos);
					if ( ! header.length) break;

					header = header.split(/:\s*/, 2)
					if (header.length !== 2) break;
					
					data = data.substr(crlfPos + 2)

					var name  = header[0]
						, value = header[1]

					if (name == 'Status') {
						res.statusCode = parseInt(value, 10) || 0
					} else {
						res.setHeader(name, value)
					}

				}

				res.write(buff.toString('utf-8'))
				res.write(data)
				buff = new Buffer('')
			} else {
				res.write(buff.toString('utf-8'))
				res.write(data)
			}
		});

		cgi.stderr.on('data', function (data) {
			// Prevent output before headers are sent. Use buffering to collect output
			if ( ! headers) {
			  buff = Buffer.concat([buff, data], buff.length + data.length)
			} else {
				res.write(data)
			}
		});

		cgi.on('exit', function (code) {
		  res.end();
		});
	}
})