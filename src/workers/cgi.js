var FS   = require("fs")
  , Path = require('path')
  , URL  = require('url')
  , exec = require('child_process').exec


// TODO refactoring

module.exports = function cgi(config)
{
  return function (request, response) {

    var urlInfo = request.urlinfo
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
          SERVER_SOFTWARE : 'node/' + process.version,
	        SERVER_PROTOCOL : "HTTP/" + request.httpVersion,
          REQUEST_METHOD  : request.method,
	        REDIRECT_STATUS : 200,
	      }

	var command = config.command

	command = command.replace('%pathname%', params.SCRIPT_FILENAME)

  for (var header in request.headers) {
    var name = 'HTTP_' + header.toUpperCase().replace(/-/g, '_');
    params[name] = request.headers[header];
  }

  if (request.method == 'POST') {
    params.CONTENT_LENGTH  = request.headers['content-length']
    params.CONTENT_TYPE    = request.headers['content-type']
  }

  command = command.split(" ")
  var spawn    = require('child_process').spawn
    , cgiSpawn = spawn(command.shift(), command, { env : params });
  
  request.pipe(cgiSpawn.stdin, {
    data : function (data) {
      console.log('stdin: ' + data)
    },
    end : function () {
      console.log('stdin end')
    }
  })

  var headers = false
  cgiSpawn.stdout.on('data', function (data) {
    data = data + ''
    if (! headers) {
      while (! /^\r\n/.test(data)) {
        var match = /^([A-z][-_A-z]*):\s(.*)\r\n/.exec(data)
        if (match) {
          response.setHeader(match[1], match[2])
          data = data.substr(match[0].length)
        }

        if (!data.length) break;
      }

      if (data.length) headers = false
    }

    response.write(data)
  });

  cgiSpawn.stderr.on('data', function (data) {
    response.write(data)
  });

  cgiSpawn.on('exit', function (code) {
    response.end()
    if (code > 0)
     next(new Error('child process exited with code ' + code))
  });

    return
    //var child = exec(run, { env : params, stdio : [ request. , process.stdout, process.stderr] },
    var child = exec(run, { env : params, stdio : [ request.connection ] },
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
