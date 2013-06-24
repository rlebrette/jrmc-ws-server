/**
 * JRMCWsServer is a web server and a websocket server that acts as a service provider for JRiver MC.
 * It allows the clients to access a JRMC server via a simplified API exposed as websocket services.
 *
 * @type {*}
 */

// Module dependencies.
define(['socket.io', 'http', 'xml2js', 'util', 'querystring', 'express', 'ejs'],
    function (wss, http, xml2js, util, qs, express, ejs) {
        const NOT_CONNECTED = {_ActionStatus: 'KO'};
        const NOOP = function () {
        };
        const DEFAULT_CONFIGURATION = {
            jrmcHost: 'localhost',
            jrmcPort: 52199,
            jrmcAuthenticate: '',
            webHost: 'localhost',
            wsPort: 1337,
            webPort: 80,
            logger: {
                info: NOOP,
                trace: NOOP
            }
        };

        var JRMCServer = function (configuration) {
            var self = this;
            self.conf = complete(configuration, DEFAULT_CONFIGURATION);
            self.parser = new xml2js.Parser();
            self.log = configuration.logger;
            self.jrmcZoneStatus = {};
            self.jrmcIsConnected = false;
            initializeWebSocketServer(self);
            initializeWebServer(self);
            authenticateAndConnect(self);
            self.log.info('JRMC WebSocket Server v1.0 started');
            self.log.info('Listen Websocket on : ' + self.conf.wsPort + ' Listen web client on : ' + self.conf.webPort);
        };
        /**
         * Manage request that ask for browsing the playlist.
         * @param continuation the continuation provided by the caller.
         */
        JRMCServer.prototype.fetchPlaylist = function (continuation) {
            var self = this;
            var clientRequest = {
                Action: 'Playback/Playlist',
                Mode: 'list',
                ItemFinalizer: function (item) {
                    item.ItemType = 'Media';
                    item.ImageURL = self.jrmcGetFileImage + item.Key
                }};
            self.invokeJRMC_API(clientRequest, continuation);
        };
        JRMCServer.prototype.media = function (action, item) {
            var clientRequest, args;
            var self = this;
            if (item.folder) {
                args = {ID: item.folder, Action: 'Play'};
                switch (action) {
                    case 'play-next':
                        args.PlayMode = 'NextToPlay';
                        break;
                    case 'play-after':
                        args.PlayMode = 'Add';
                        break;
                }
                clientRequest = {
                    Action: 'Browse/Files',
                    Args: args
                };
            } else {
                args = {Key: item.file};
                switch (action) {
                    case 'play-next':
                        args.Location = 'Next';
                        break;
                    case 'play-after':
                        args.Location = 'End';
                        break;
                }
                clientRequest = {
                    Action: 'Playback/PlayByKey',
                    Args: args
                };
            }
            self.invokeJRMC_API(clientRequest, NOOP);

        };
        /**
         * Manage request that ask for browsing the media tree.
         * @param params
         * @param continuation the continuation provided by the caller.
         */
        JRMCServer.prototype.fetchItems = function (params, continuation) {
            var self = this;
            var clientRequest = {
                Action: 'Browse/Children',
                Args: params,
                Mode: 'list',
                ItemFinalizer: function (item) {
                    item.ItemType = 'Folder';
                    item.ImageURL = self.jrmcGetFolderImage + item.Key
                }
            };
            var folderContinuation = function (response, hasItem) {
                if (hasItem) {
                    continuation(response);
                } else {
                    clientRequest.Action = 'Browse/Files';
                    clientRequest.ItemFinalizer = function (item) {
                        item.ItemType = 'Media';
                        item.ImageURL = self.jrmcGetFileImage + item.Key
                    };
                    self.invokeJRMC_API(clientRequest, continuation);
                }
            };
            process.nextTick(function () {
                self.invokeJRMC_API(clientRequest, folderContinuation);
            });
        };
        JRMCServer.prototype.invokeJRMC_API = function (clientRequest, continuation) {
            var self = this;
            self.callJRMC_API(clientRequest, function (res) {
                self.manageJRMC_API_Response(res, clientRequest, continuation);
            })
        };
        /**
         * Invoke the JRMC WS API.
         * @param request  an Object composed as {Action: string, Args: {}}
         * @param continuation the continuation provided by the caller.
         */
        JRMCServer.prototype.callJRMC_API = function (request, continuation) {
            var args = false;
            var self = this;
            var req = request.Action;
            if (request.Args != null) {
                args = true;
                req = req + "?" + qs.encode(request.Args);
            }
            var options = {
                hostname: self.conf.jrmcHost,
                port: self.conf.jrmcPort,
                auth: self.conf.jrmcAuthenticate,
                method: 'GET',
                headers: {Connection: 'keep-alive'}
            };
            if (request.Action == "Authenticate") {
                options.auth = self.conf.jrmcAuthenticate;
            } else {
                req = req + (args ? "&" : "?") + self.token;
            }
            options.path = '/MCWS/v1/' + req;

            var httpReq = http.request(options, function (data) {
//                self.log.info(options.hostname + '/' + req + ':' + data.statusCode);
                if (data.statusCode == 401) {
                    self.log.info("Authentication informations are missing or wrong");
                    authenticateAgain(self);
                } else {
                    continuation(data);
                }
            });
            httpReq.on('error', function (e) {
                self.log.info('Error while communicating with JRMC' + e);
                authenticateAgain(self)
            });

            httpReq.end();
//            var httpReq = http.get(request.URL, continuation);
        };
        /**
         * The continuation that manages the data returned by the JRMC WS API.
         * @param data
         * @param clientRequest
         * @param continuation
         */
        JRMCServer.prototype.manageJRMC_API_Response = function (data, clientRequest, continuation) {
            var self = this;
            data.setEncoding('utf8');
            if (data.statusCode == 200) {
                data.on('data', function (data) {
                    self.parser.parseString(data, function (err, result) {
                        self.convertJRMC_API_Data(result, clientRequest, continuation);
                    });
                });
                data.on('error', function (error) {
                    throw error;
                });
            }
        };
        /**
         * Convert JSONified XML structure to JSON.
         * @param data
         * @param clientRequest
         * @param continuation
         * @return {Object}
         */
        JRMCServer.prototype.convertJRMC_API_Data = function (data, clientRequest, continuation) {
            var response = {};
            var self = this;
            if (data != null) {
                var items, i;
                var hasItems = false;
                var itemFinalizer = NOOP;
                if (clientRequest.ItemFinalizer) itemFinalizer = clientRequest.ItemFinalizer;
                if (data.hasOwnProperty('Response')) {
                    response._ActionStatus = data.Response.$.Status;
                    if (response._ActionStatus != 'OK') {
                        response._ActionFailure = data.Response.$.Information;
                    } else {
                        items = propertyAccess(data.Response, 'Item');
                        if (items != null) {
                            var list = (propertyAccess(clientRequest, 'Mode') == 'list');
                            if (list) response.Items = [];
                            for (i = 0; i < items.length; i++) {
                                if (i == 1) hasItems = true;
                                var item = items[i];
                                if (list) {
                                    var element = {};
                                    element.Name = item.$.Name;
                                    element.Key = item._;
                                    response.Items.push(element);
                                    itemFinalizer(element);
                                } else {
                                    response[item.$.Name] = item._;
                                    if (item.$.Name == 'ImageURL') {
                                        response[item.$.Name] = self.jrmcBaseURL + response[item.$.Name];
                                    }
                                }
                            }
                        }
                    }
                } else {
                    response._ActionStatus = 'OK';
                    items = data.MPL.Item;
                    response.Items = [];
                    if (items != undefined) {
                        for (i = 0; i < items.length; i++) {
                            hasItems = true;
                            var fields = items[i].Field;
                            var tuple = {};
                            for (var j = 0; j < fields.length; j++) {
                                var field = fields[j];
                                tuple[field.$.Name] = field._;
                            }
                            itemFinalizer(tuple);
                            response.Items.push(tuple);
                        }
                    }
                }
                clientRequest.response = response;
                self.log.trace(clientRequest);
                process.nextTick(function () {
                    continuation(response, hasItems)
                });
            } else {
                self.log.info(util.inspect(data, false, 5));
            }
            return false;
        };

        function authenticateAgain(self) {
            setTimeout(function () {
                authenticateAndConnect(self)
            }, 1000);
        }

        function authenticateAndConnect(self) {
            self.jrmcServerURL = buildAddress(self.conf);
            self.log.info('Pinging ' + self.jrmcServerURL + ', waiting for response.');
            self.invokeJRMC_API({Action: 'Authenticate'}, function (response) {
                self.log.info('Authentification done, got token ' + response.Token);
                self.jrmcIsConnected = true;
                self.token = 'token=' + response.Token;
                self.conf.jrmcAuthenticate = '';
                self.jrmcServerURL = buildAddress(self.conf);
                self.jrmcGetFolderImage = self.jrmcServerURL + 'Browse/Image?Format=png&' + self.token + '&ID=';
                self.jrmcGetFileImage = self.jrmcServerURL + 'File/GetImage?Format=png&' + self.token + '&File=';
                self.jrmcBaseURL = 'http://' + self.conf.jrmcHost + ':' + self.conf.jrmcPort + "/";
                self.log.info('Communicating with : ' + self.jrmcServerURL);
                startStatusChecker(self);
            });
        }

        /**
         * Check JRMC status every seconds and dispatch it to all requesting clients.
         */
        function startStatusChecker(self) {
            var zoneChecker = function () {
                var rooms = self.jrmcWsServer.sockets.manager.rooms;
                for (var zone in rooms) {
                    if (rooms.hasOwnProperty(zone)) {
                        var zoneId = String(zone).substr(1);
                        if (zoneId != '') {
                            self.invokeJRMC_API({Action: 'Playback/Info', Args: {Zone: zoneId}},
                                function (response) {
                                    var zId = zoneId;
                                    var lastStatus = self.jrmcZoneStatus[zId];
                                    response["ImageURL"] = response["ImageURL"] + '&' + self.token;
                                    self.jrmcZoneStatus[zId] = response;
                                    if (lastStatus != null && lastStatus != undefined) {
                                        response = diff(lastStatus, response);
                                        self.log.trace(['Updating zone ', zId, ' with ', response]);
                                    }
                                    if (response.length != 0) {
                                        self.jrmcWsServer.sockets.in(zId).emit('zoneUpdate', response);
                                    }
                                });
                        }
                    }
                }
            };
            self.checker = setInterval(zoneChecker, 1000);
        }

        function initializeWebServer(self) {
            var app = express();
            self.app = app;
            app.configure(function () {
//                app.use(express.logger());
                app.use(express.compress());
                app.use(express.bodyParser());
                app.use(express.static('./webclient'));
//                self.app.use(self.app.router);
            });
            app.set('view engine', 'ejs');
            app.set('view options', {
                layout: false
            });
            app.get('/', function (req, res) {
                res.render('index', {
                    remoteServer: self.conf.webHost + ':' + self.conf.wsPort
                });
            });
            app.listen(self.conf.webPort);
        }

        function initializeWebSocketServer(self) {
            self.jrmcWsServer = wss.listen(self.conf.wsPort, {log: false});
            self.jrmcWsServer.sockets.on('connection', function (socket) {
                self.log.trace('Connection');
                socket.on('media', function (params) {
                    self.media(params.Action, params.Item)
                });
                socket.on('fetchItems', function (params, continuation) {
                    self.fetchItems(params, continuation)
                });
                socket.on('fetchPlaylist', function (continuation) {
                    self.fetchPlaylist(continuation)
                });
                socket.on('fetch', function (request, continuation) {
                    self.invokeJRMC_API(request, continuation)
                });
                socket.on('execute', function (request) {
                    self.invokeJRMC_API(request, function () {
                    })
                });
                socket.on('watchZone', function (request, continuation) {
                    socket.join(request.ZoneID);
                    self.invokeJRMC_API({Action: 'Playback/Info', Args: {Zone: request.ZoneId}}, function (response) {
                        response["ImageURL"] = response["ImageURL"] + '&' + self.token;
                        continuation(response);
                    });
                });
            });
        }

        /**
         * Helper to return the value of an expected property but that can be missing.
         * @param object the owner of the property.
         * @param name the property name.
         * @param noPropertyValue the value to return if the property is not found.
         * @return the existing value if any, the noPropertyValue if the property is not available.
         */
        function propertyAccess(object, name, noPropertyValue) {
            if (object.hasOwnProperty(name)) {
                return object[name];
            }
            return noPropertyValue;
        }

        function resolver(key, value) {
            if (typeof value == 'function') {
                return 'function()';
            }
            return value;
        }

        function complete(obj1, obj2) {
            for (var p in obj2) {
                // Property in destination object set; update its value.
                if (obj2.hasOwnProperty(p)) {
                    if (obj2[p].constructor == Object) {
                        obj1[p] = complete(obj1[p], obj2[p]);

                    } else {
                        if (!obj1.hasOwnProperty(p)) {
                            obj1[p] = obj2[p];
                        }
                    }
                }
            }
            return obj1;
        }

        function diff(template, override) {
            var ret = {};
            for (var name in template) {
                if (template.hasOwnProperty(name) && name in override) {
                    if (template[name] != override[name]) {
                        ret[name] = override[name];
                    }
                }
            }
            return ret;
        }

        function buildAddress(configuration) {
            return 'http://' +
                configuration.jrmcHost + ':' +
                configuration.jrmcPort + '/MCWS/v1/';
        }

        // Export JRMCServer class as Server.
        return {Server: JRMCServer};
    });