'use strict';
const sha1 = require("crypto-js/sha1");
const Base64 = require("crypto-js/enc-base64");
const net = require('net');

module.exports = class SimpleWebSocket
{
    constructor()
    {
        this.connections = [];
        this.server = net.createServer(connection => {
            this.onData(connection);
            this.closeConnection(connection);
        });

        this.server.on('error', error => {
            console.error(error);
        })
    }

    listen(port)
    {
        this.server.listen(port, () => {
            console.log(`Listening on port ${port}\n`);
        });
    }

    emit(message)
    {
        let data = this.createByteData(message);
        for (let i = 0; i < this.connections.length; i++)
        {
            this.connections[i].write(data);
        }
    }

    onData(connection)
    {
        connection.on("data", data => {
            if (data.toString().includes("HTTP/1.1"))
            {
                this.shake(connection, data);
            } else
            {
                console.log(data);
                this.share(connection, data);
            }
        })
    }

    share(connection, data)
    {
        for (let i = 0; i < this.connections.length; i++)
        {
            if (Buffer.from(data)[0] === 136)
            {
                continue;
            }

            if (this.connections[i] !== connection)
            {
                let message = this.createByteData(this.decode(data));
                this.connections[i].write(message);
            } else if (this.connections[i] === connection)
            {
                this.connections[i].write(this.createByteData("Data shared"));
            }
        }
    }

    closeConnection(connection)
    {
        connection.on("end", () => {
            console.log("Client disconnected");
            this.connections = this.connections.filter(c => c !== connection);
            connection.end();
        })
    }

    shake(connection, data)
    {
        //console.log(`Client wrote: ${data.toString()}\n`);
        if (this.connections.indexOf(connection) === -1)
        {
            this.connections.push(connection);
        }

        let headers = data.toString().split("\n");

        let key = "";
        headers.map(header => {
            if (header.indexOf("Sec-WebSocket-Key:") > -1)
            {
                key = header.substring(header.indexOf("Key:") + 4).trim();
            }
        });

        let encoded = Base64.stringify(sha1(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")).trim();

        connection.write("HTTP/1.1 101 Switching Protocols\r\n");
        connection.write("Upgrade: websocket\r\n");
        connection.write("Connection: Upgrade\r\n");
        connection.write("Sec-WebSocket-Accept: " + encoded + " \r\n");
        connection.write("\r\n");
    }

    decode(hex)
    {
        let bytes = Buffer.from(hex);
        let len = bytes[1] & 127;
        let mask = 2;
        let data = mask + 4;
        let msg = "";
        for (let i = data; i < data + len; i++)
        {
            msg += String.fromCharCode(bytes[i] ^ bytes[mask + ((i - data) % 4)]);
        }
        return msg;
    }

    createByteData(message)
    {
        let data = [];
        data.push(0x81);
        if (message.length > 127)
        {
            return this.createByteData("Skiræpp");
        }

        let length = 0b00000000 | message.length;
        data.push(length);

        let bytes = Buffer.from(message);
        for (let i = 0; i < bytes.length; i++)
        {
            data.push(bytes[i]);
        }

        return Buffer.from(data);
    }
};