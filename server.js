const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const { Client } = require('ssh2');
const { Telnet } = require('telnet-client');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, 'public')));

let config = {};

function loadConfig() {
    const configPath = path.join(__dirname, 'config', 'gateway.json');
    try {
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            config = JSON.parse(configData);
            console.log('Configuration loaded successfully');
        } else {
            console.warn('Configuration file not found. Creating default config from example...');
            const examplePath = path.join(__dirname, 'config', 'gateway.json.example');
            if (fs.existsSync(examplePath)) {
                fs.copyFileSync(examplePath, configPath);
                const configData = fs.readFileSync(configPath, 'utf8');
                config = JSON.parse(configData);
                console.log('Default configuration created from example file');
            } else {
                console.error('Example configuration file not found. Using minimal default.');
                config = {
                    allowedHosts: [],
                    security: {
                        requireHostValidation: true,
                        allowPrivateNetworks: false,
                        maxConnectionTime: 3600000,
                        connectionTimeout: 30000
                    }
                };
            }
        }
    } catch (error) {
        console.error('Error loading configuration:', error.message);
        process.exit(1);
    }
}

function isHostAllowed(host, protocol) {
    if (!config.security?.requireHostValidation) {
        return true;
    }

    const allowedHost = config.allowedHosts?.find(h => 
        h.host === host && h.protocols.includes(protocol)
    );
    
    return !!allowedHost;
}

loadConfig();

class ConnectionManager {
    constructor() {
        this.connections = new Map();
    }

    createSSHConnection(socket, config) {
        const conn = new Client();
        const connectionId = socket.id;

        conn.on('ready', () => {
            console.log('SSH connection ready');
            socket.emit('connection-status', { status: 'connected', type: 'ssh' });
            
            conn.shell((err, stream) => {
                if (err) {
                    socket.emit('error', { message: 'Failed to start shell: ' + err.message });
                    return;
                }

                stream.on('close', () => {
                    console.log('SSH stream closed');
                    socket.emit('connection-status', { status: 'disconnected' });
                    this.connections.delete(connectionId);
                }).on('data', (data) => {
                    socket.emit('data', data.toString());
                });

                stream.stderr.on('data', (data) => {
                    socket.emit('data', data.toString());
                });

                this.connections.set(connectionId, { type: 'ssh', connection: conn, stream });

                socket.on('input', (data) => {
                    if (stream && !stream.destroyed) {
                        stream.write(data);
                    }
                });

                socket.on('resize', (data) => {
                    if (stream && !stream.destroyed) {
                        stream.setWindow(data.rows, data.cols);
                    }
                });
            });
        }).on('error', (err) => {
            console.error('SSH connection error:', err);
            socket.emit('error', { message: 'SSH connection failed: ' + err.message });
        }).on('end', () => {
            console.log('SSH connection ended');
            socket.emit('connection-status', { status: 'disconnected' });
            this.connections.delete(connectionId);
        });

        try {
            conn.connect({
                host: config.host,
                port: config.port || 22,
                username: config.username,
                password: config.password,
                privateKey: config.privateKey,
                readyTimeout: 20000
            });
        } catch (error) {
            socket.emit('error', { message: 'Failed to connect: ' + error.message });
        }
    }

    createTelnetConnection(socket, config) {
        const net = require('net');
        const connectionId = socket.id;

        const telnetSocket = new net.Socket();
        
        telnetSocket.connect(config.port || 23, config.host, () => {
            console.log('Telnet connection established');
            socket.emit('connection-status', { status: 'connected', type: 'telnet' });
            
            this.connections.set(connectionId, { type: 'telnet', connection: telnetSocket });
        });

        telnetSocket.on('data', (data) => {
            socket.emit('data', data.toString());
        });

        telnetSocket.on('error', (error) => {
            console.error('Telnet error:', error);
            socket.emit('error', { message: 'Telnet error: ' + error.message });
        });

        telnetSocket.on('close', () => {
            console.log('Telnet connection closed');
            socket.emit('connection-status', { status: 'disconnected' });
            this.connections.delete(connectionId);
        });

        telnetSocket.on('timeout', () => {
            console.error('Telnet connection timeout');
            socket.emit('error', { message: 'Telnet connection timeout' });
            telnetSocket.destroy();
        });

        socket.on('input', (data) => {
            if (telnetSocket && !telnetSocket.destroyed) {
                telnetSocket.write(data);
            }
        });
    }

    disconnect(connectionId) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            try {
                if (connection.type === 'ssh') {
                    if (connection.stream) connection.stream.end();
                    if (connection.connection) connection.connection.end();
                } else if (connection.type === 'telnet') {
                    if (connection.connection) connection.connection.destroy();
                }
            } catch (error) {
                console.error('Error disconnecting:', error);
            }
            this.connections.delete(connectionId);
        }
    }
}

const connectionManager = new ConnectionManager();

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('connect-ssh', (config) => {
        console.log('SSH connection request:', { host: config.host, port: config.port, username: config.username });
        
        if (!isHostAllowed(config.host, 'ssh')) {
            console.log('SSH connection denied - host not allowed:', config.host);
            socket.emit('error', { message: `Connection to ${config.host} is not permitted. Host not found in allowed hosts list.` });
            return;
        }
        
        connectionManager.createSSHConnection(socket, config);
    });

    socket.on('connect-telnet', (config) => {
        console.log('Telnet connection request:', { host: config.host, port: config.port });
        
        if (!isHostAllowed(config.host, 'telnet')) {
            console.log('Telnet connection denied - host not allowed:', config.host);
            socket.emit('error', { message: `Connection to ${config.host} is not permitted. Host not found in allowed hosts list.` });
            return;
        }
        
        connectionManager.createTelnetConnection(socket, config);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        connectionManager.disconnect(socket.id);
    });

    socket.on('force-disconnect', () => {
        connectionManager.disconnect(socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Terminal Gateway Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});