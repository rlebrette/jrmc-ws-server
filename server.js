var rjs = require('requirejs');
rjs(['./jrmc-ws-server', './jrmc-ws-server-util'],
    function (JRMC, util) {
        var configuration = {
            port:1337,
            webPort:8080,
            jrmcHost:'localhost',
            jrmcPort:52199,
//            jrmcAuthenticate:'rlebrette:1',
            logger:{info:util.std, trace:util.std}
        }

        // Starts the server
        new JRMC.Server(configuration);
    });

