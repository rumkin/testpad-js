var worker = require("worker")

module.exports = worker.extend({
	constructor : function (server, host, config) {
		this.Worker(server, host, config)
	},

	messages : [
		'Fuck you',
		'I hate you',
		'You will die alone',
		'It just doesn\'t work',
		'You are looser',
		'Looooooooooooser',
	],

	getRandomMessage : function () {

		var messages = this.messages 
		  , i = Math.round(Math.random() * (messages.length - 1))

		return messages[i]
	},

	run : function (next, req, res, err) {

		if (res.isFinished) {
			next()
			return
		}
		
		var message
		if (this.config.funny) {
			message = this.getRandomMessage()
			if (err) {
				message += "! ^___^"
			} else {
				message += " anyway! ^___^"
			}
		} else {
			if (err) {
				message = "Error"
			} else {
				res.statusCode = 404
				message = "Nothing to show"
			}
		}

		if (err) {
			res.end(message + "\r\n\r\n" + err)
		} else {
			res.end(message)
		}

		next()
		// console.log("THERE", req.uri.pathname)
	},
})