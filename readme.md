# JRMC WS Server and Remote Client

jrmc-ws-server is a webserver including a websocket API that exposes the JRiver Media Center WS API for web clients.

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
    "jrmcHost": "localhost",
    "jrmcPort": 52199,
    "jrmcAuthenticate": "user:password",
    "logger":{
        "info": "std:logger",
        "trace": "std:logger"}
}
```

# Run the server

```bash
 $ node server.js
```

# Exposed clients API


