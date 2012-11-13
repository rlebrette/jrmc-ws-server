define(['socket.io'], function (websocket) {
    var JRMCClient = function (clientId, serverAddress, logger) {
        this.clientId = clientId;
        this.logger = logger;
        this.serverAddress = serverAddress;
        this.context = {};
        this.context.CurrentSongTitle = null;
        this.evtCallback = function () {
        };
        // the real connection is delayed until all the configuration is done.
        this.connect();
    };
    JRMCClient.prototype.connect = function () {
        var self = this;
        self.wsClient = websocket.connect(self.serverAddress, {'connect timeout':3000});
        // register associated handlers
        self.wsClient.on('connect', function () {
            self.logger('WebSocket client connected');
        });
        self.wsClient.on('connecting', function (transport) {
            self.logger('Connecting : ' + transport);
        });
        self.wsClient.on('connect_failed', function () {
            self.logger('Connect Error');
            self.reconnectLater();
        });
        self.wsClient.on('zoneUpdate', function (message) {
            self.evtCallback(message, self.context);
        });
        self.wsClient.on('disconnect', function () {
            self.logger('Connection Closed');
            self.reconnectLater();
        });
    };
    JRMCClient.prototype.reconnectLater = function () {
        var self = this;
        setTimeout(function () {
            self.connect();
        }, 2000);
    };
    JRMCClient.prototype.onZoneUpdate = function (evtCallback) {
        this.evtCallback = evtCallback;
    };
    JRMCClient.prototype.fetch = function (action, args, cb) {
        this.wsClient.emit('fetch', {Action:action, Args: args}, cb);
    };
    JRMCClient.prototype.invoke = function (action, cb) {
        this.wsClient.emit('fetch', {Action:action, Args: nil}, cb);
    };
    JRMCClient.prototype.fetchItems = function (itemId, cb) {
        this.wsClient.emit('fetchItems', {ID:itemId}, cb);
    };
    JRMCClient.prototype.watchZone = function (zoneId, cb) {
        this.wsClient.emit('watchZone', {ZoneID:zoneId}, cb);
    };
    return {Client:JRMCClient};
});
