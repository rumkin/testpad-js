var FS   = require("fs")
  , Path = require('path')
  , URL  = require('url')
  , exec = require('child_process').exec


// TODO refactoring

module.exports = function cgi(config)
{
  return function (request, response) {

    var urlInfo = request.urlInfo
      //, config  = request.app.options
      , queryString = (URL.format({ query : urlInfo.query }) || '' ).substr(1)
      , postData    = (request.postData || '')
      , params =
	      {
	        GATEWAY_INTERFACE : "CGI/1.1",
	        SCRIPT_FILENAME : Path.join(request.current.directory, urlInfo.pathname),
	        QUERY_STRING    : queryString,
	        DOCUMENT_ROOT   : request.current.directory,
	        SERVER_NAME     : urlInfo.hostname,
	        SERVER_PORT     : urlInfo.port,
	        SERVER_PROTOCOL : "HTTP/" + request.httpVersion,
		    HTTP_HOST     	: urlInfo.hostname || 'localhost',
	        REDIRECT_STATUS : 1,
	      }

	for (var i in request.headers) {
		if ( ! params.hasOwnProperty(i))
			params[i] = request.headers[i]
	}

	var command = config.command

	command = command.replace('%pathname%', params.SCRIPT_FILENAME)

    if (postData)
    {
      params.BODY            = postData.replace(/(["\s'$`\\])/g,'\\$1')
      params.CONTENT_LENGTH  = postData.length
    }

    var cgiParams= ''
      , run = command

    for(var p in params)
      cgiParams += 'export ' + p + '="' + params[p] + '" \r\n'
    
    if (postData)
      run = 'exec echo "$BODY" | ' + run
    
    //var child = exec(run, { env : params, stdio : [ request. , process.stdout, process.stderr] },
    var child = exec(run, { env : params },
      function (error, stdout, stderr) {

      	// TODO normal headers parsing

        var ln= "\r\n" // stdout.indexOf('\n\n') < 0 ? "\r\n" : "\n"
          , delim   = ln + ln
          , pos     = stdout.indexOf(delim)
          , head    = stdout.substr(0, pos).split(ln)
          , body    = stdout.substr(pos + delim.length)
          , status  = head[0]
          , headers = head
        

        // Set http headers
        for(var i=-1, l= headers.length; l>(i+=1);)
        {
          var header = headers[i].split(': ', 2)
          response.setHeader(header[0], header[1])
        }
        
        if (error) {
          response.writeHead(500, 'Internal server error')
          response.end(stderr + body)
          return
        }
        
        response.write(body)
        response.end()
    });
    
  }
}
