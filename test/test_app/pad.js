var util = require('util')
module.exports = function(req, res) {
	
	var info = req.urlInfo

	info.query.__URI__ = info.pathname
	req.headers['X-Redirect-Uri'] = info.pathname

	info.pathname = "/" + req.config.index

	req.workers['php-cgi'](req, res)

	//res.end(util.inspect(req.current))
}