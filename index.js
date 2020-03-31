'use strict';
const sha1 = require("crypto-js/sha1");
const Base64 = require("crypto-js/enc-base64");
const SimpleWebSocket = require('./SimpleWebSocket');
const net = require('net');

const httpServer = net.createServer(connection => {
    connection.on('data', () => {
        let content = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    WebSocket test page
    <script>
      let ws = new WebSocket('ws://localhost:3001');
      ws.onmessage = event => alert('Server says: ' + event.data);
      ws.onopen = () => ws.send("Top o' the mornin\' to ya");
    </script>
  </body>
</html>
`;
        connection.write('HTTP/1.1 200 OK\r\nContent-Length: ' + content.length + '\r\n\r\n' + content);
    });
});
httpServer.listen(3000, () => {
    console.log('HTTP server listening on port 3000');
});

let server = new SimpleWebSocket();
server.listen(3001);

setTimeout(() => {
    server.emit("Skubiddibapp");
}, 5000);