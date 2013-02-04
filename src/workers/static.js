module.exports = function(config) {

	// Configured worker
	return function(req, res) {
		res.end('Static worker')
	}
}