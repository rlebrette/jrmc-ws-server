/**
 * Logger Functions
 */

// Module dependencies.
define(['util'], function (util) {
    var notify = function (message) {
        if (typeof message != 'string') {
            if (util.isArray(message)) {
                var mesg = '';
                for (var i=0;i<message.length;i++) {
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
    return  {std:notify, nolog:noop};
});