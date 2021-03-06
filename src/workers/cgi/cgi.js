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
			REQUEST_URI       : req.uri.pathname,
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

		var cgi = spawn('php-cgi', this.config.argv || ["-c", "/etc/php.ini"], { env : env, cwd : docRoot });

		if (req.method != 'GET') {
			// Redirect HTTP request body to cgi input
			req.pipe(cgi.stdin)
		}

		// PROCESS CGI RESPONSE -----------------------------------------------------
		
		var buff    = new Buffer('', 'utf-8')
			, headers = false

		cgi.stdout.on('data', function (data) {
		  buff = Buffer.concat([buff, data], buff.length + data.length)
		});

		cgi.stderr.on('data', function (data) {
		  buff = Buffer.concat([buff, data], buff.length + data.length)
		});

		cgi.on('exit', function (code) {

			var data = buff.toString('utf-8')
			
			// Parse headers
			while (true) {
				var crlfPos = data.indexOf("\r\n")

				if ( crlfPos < 0) break;

				var header = data.substr(0, crlfPos);
				data = data.substr(crlfPos + 2)
				
				if ( ! header.length) break;

				var colonPos = header.indexOf(':')
				if (colonPos < 0) break;
				

				var name  = header.substr(0, colonPos)
					, value = header.substr(colonPos + 1)

				if (name == 'Status') {
					res.statusCode = parseInt(value, 10) || 0
				} else {
					res.setHeader(name, value)
				}

			}

			// res.write(buff.toString('utf-8'))
			res.write(data)
			// buff = new Buffer('')

		  res.end();
		});
	}
})