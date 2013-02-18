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

		if (err) {
			res.end(this.getRandomMessage() + "! ^___^\r\n\r\n" + err)
		} else {
			res.end(this.getRandomMessage() + " anyway! ^___^")
		}
	},
})