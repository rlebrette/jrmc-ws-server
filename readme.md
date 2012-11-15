# JRMC Websocket Server

jrmc-ws-server is a webserver including a websocket API that exposes the JRiver Media Center WS API for web clients.

# Configure the server

    Edit the server.js and update the configuration:

```js
var configuration = {
    port:1337,
    webPort:8080,
    jrmcHost:'localhost',
    jrmcPort:52199,
    jrmcAuthenticate:'user:password',
    logger:{info:util.std, trace:util.std}
}
```

# Run the server

```bash
 $ node server.js
```


# Exposed clients API


