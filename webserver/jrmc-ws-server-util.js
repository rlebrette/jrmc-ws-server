/**
 * Server specific utilities
 */

// Module dependencies.
define(['util', 'os'], function (util, os) {
    var notify = function (message) {
        if (typeof message != 'string') {
            if (util.isArray(message)) {
                var mesg = '';
                for (var i = 0; i < message.length; i++) {
                    if (typeof message[i] != 'string') {
                        message[i] = JSON.stringify(message[i]);
                    }
                    mesg += message[i];
                }
                message = mesg;
            } else {
                message = JSON.stringify(message);
            }
        }
        console.log(new Date().toLocaleTimeString() + " - " + message);
    };
    var noop = function () {
    };

    notify("Detecting IP address");
    var ifaces = os.networkInterfaces();
    var localhost = 0;
    for (var dev in ifaces) {
        var alias = 0;
        ifaces[dev].forEach(function (details) {
            if (details.family == 'IPv4') {
                if (localhost == 0) {
                    localhost = details.address;
                }
                notify(dev + (alias ? ':' + alias : '') + ' ' + details.address + (localhost==details.address ? " (auto)" : ""));
                ++alias;
            }
        });
    }


    var replacer = function (key, value) {
        if (key == 'info' || key == 'trace') {
            if (value == "std:logger") {
                return notify;
            } else {
                return noop;
            }
        }
        if (key == 'webHost' || key == 'jrmcHost') {
            if (value == 'auto') {
                return localhost;
            } else {
                return value;
            }
        }
        return value;
    }
    return  {std: notify, nolog: noop, replacer: replacer};
});