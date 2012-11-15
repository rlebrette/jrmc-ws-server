var rjs = require('requirejs');
rjs(['webserver/jrmc-ws-server', 'webserver/jrmc-ws-server-util' , 'fs'],
    function (JRMC, util, fs) {
        fs.readFile('configuration.json', function (err, data) {
            if (err) throw err;
            var configuration = JSON.parse(data, util.replacer);
            // Starts the server
            new JRMC.Server(configuration);
        });


    });

