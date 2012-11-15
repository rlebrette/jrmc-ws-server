var rjs = require('requirejs');
rjs(['webserver/jrmc-ws-server', 'webserver/jrmc-ws-server-util' , 'fs', 'os'],
    function (JRMC, util, fs, os) {
        fs.readFile('configuration.json', function (err, data) {
            if (err) throw err;
            var configuration = JSON.parse(data, util.replacer);
            console.log(JSON.stringify(os.networkInterfaces()));
            // Starts the server
            new JRMC.Server(configuration);
        });


    });

