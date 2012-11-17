var rjs = require('requirejs');
rjs(['webserver/jrmc-ws-server', 'webserver/jrmc-ws-server-util' , 'fs', 'os'],
    function (JRMC, util, fs, os) {
        fs.readFile('configuration.json', function (err, data) {
            if (err) throw err;
            // Starts the server
            new JRMC.Server(JSON.parse(data, util.replacer));
        });
    });

