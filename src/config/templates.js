module.exports = {

	"php" : {
		"file_dir" : "public",
		"workers"  : {
			"cgi" : {
				"command" : ["php", "--ini-file", "/etc/php.ini"]
			}
		}
	}

}