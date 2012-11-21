# JRMC WS Server and Remote Client

jrmc-ws-server is a webserver including a websocket API that exposes the JRiver Media Center WS API for web clients.

It comes with a javascript client side library that offers the following features:

 * all data is formatted as JSON objects,
 * the available services are exposed as meaningful functions,
 * the functions are asynchrone and provide a callback feature allowing the client to handle the result,

Finally, this javascript library is used in a JQuery Mobile based web client.

# Install the server

Everything is built on top of node.js :

 * first you have to have an existing node.js installation.
 * next you have to download additional modules in the project:

```bash
$ npm update
```

# Configure the server

Edit the configuration.json and update the configuration:

```js
{
    "wsPort": 1337,
    "webPort": 8080,
    "webHost": "localhost",
    "jrmcHost": "localhost",
    "jrmcPort": 52199,
    "jrmcAuthenticate": "user:password",
    "logger":{
        "info": "std:logger",
        "trace": "std:logger"}
}
```

wsPort is the websocket port that will be used.
webPort is the port that will be used to deploy the Remote Client webapp
webHost is the ip or DNS name of the machine where this installation is running on, it's used by the web client to retrieve this instance.
jrmcHost is the ip or DNS name of the machine where JRMC is running on, it's recommended that keep the server on the same machine that the one hosting JRMC.
jrmcPort is the port of the JRMC MCWS services
jrmAuthenticate is the information that allows this server to connect to JRMC if authentication is activated.

# Run the server

```bash
 $ npm start
```

# Exposed clients API

Connecting the websocket server from a client is as easy as writing the following code:

```js
var jrmc = new JRMC.Client("client", 'ws://host:port/');
````

- *Watch a given zone*, every seconds the given function will be called with the information of that zone.
jrmc.watchZone(zoneId, function(zoneInfo) {})

- *Browse the library*, fetch the information for the given key.
jrmc.fetchItems(key, function(items) {})

- *Fetch the current playlist*
jrmc.fetchPlaylist(function(items) {})

jrmc.play()

jrmc.pause()

jrmc.stop()

jrmc.next()

jrmc.previous()
