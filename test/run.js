var Pad = require('../src/testpad');

var pad = Pad.initWithIni('./run.ini').run()
console.log("Running at %s:%s", pad.config.hostname, pad.config.port)