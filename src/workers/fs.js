module.exports = function(config) {

	// Configured worker
	return function(next, req, res) {
		res.end('Static worker')
	}
}