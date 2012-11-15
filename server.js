var rjs = require('requirejs');
rjs(['./jrmc-ws-server', './jrmc-ws-server-util' , 'fs'],
    function (JRMC, util, fs) {
        fs.readFile('configuration.json', function (err, data) {
            if (err) throw err;
            var configuration = JSON.parse(data);
            configuration.logger = {info: util.std, trace: util.std}
            // Starts the server
            new JRMC.Server(configuration);
        });


    });

