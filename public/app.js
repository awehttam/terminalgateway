class TerminalGateway {
    constructor() {
        this.socket = io();
        this.terminal = null;
        this.fitAddon = null;
        this.isConnected = false;
        this.currentConnectionType = null;
        
        this.initializeTerminal();
        this.setupSocketHandlers();
        this.setupUIHandlers();
        this.updateStatus('disconnected', 'Disconnected');
    }

    initializeTerminal() {
        this.terminal = new Terminal({
            fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
            fontSize: 14,
            theme: {
                background: '#000000',
                foreground: '#ffffff',
                cursor: '#ffffff',
                selection: '#ffffff40'
            },
            cursorBlink: true,
            allowTransparency: false,
            convertEol: true
        });

        this.fitAddon = new FitAddon.FitAddon();
        this.terminal.loadAddon(this.fitAddon);

        const webLinksAddon = new WebLinksAddon.WebLinksAddon();
        this.terminal.loadAddon(webLinksAddon);

        this.terminal.open(document.getElementById('terminal'));
        this.fitAddon.fit();

        this.terminal.writeln('Welcome to Terminal Gateway');
        this.terminal.writeln('Connect to a remote system using SSH or Telnet above.');
        this.terminal.write('\r\n$ ');

        this.terminal.onData((data) => {
            if (this.isConnected) {
                this.socket.emit('input', data);
            }
        });

        window.addEventListener('resize', () => {
            this.fitAddon.fit();
            if (this.isConnected) {
                const dimensions = this.fitAddon.proposeDimensions();
                this.socket.emit('resize', {
                    cols: dimensions.cols,
                    rows: dimensions.rows
                });
            }
        });
    }

    setupSocketHandlers() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.handleDisconnection();
        });

        this.socket.on('connection-status', (data) => {
            console.log('Connection status:', data);
            if (data.status === 'connected') {
                this.isConnected = true;
                this.currentConnectionType = data.type;
                this.updateStatus('connected', `Connected via ${data.type.toUpperCase()}`);
                this.updateUI(true);
                this.terminal.clear();
                
                const dimensions = this.fitAddon.proposeDimensions();
                this.socket.emit('resize', {
                    cols: dimensions.cols,
                    rows: dimensions.rows
                });
            } else if (data.status === 'disconnected') {
                this.handleDisconnection();
            }
        });

        this.socket.on('data', (data) => {
            if (this.terminal) {
                this.terminal.write(data);
            }
        });

        this.socket.on('error', (error) => {
            console.error('Connection error:', error);
            this.updateStatus('disconnected', `Error: ${error.message}`);
            this.handleDisconnection();
            this.terminal.writeln(`\r\n\x1b[31mError: ${error.message}\x1b[0m`);
            this.terminal.write('$ ');
        });
    }

    setupUIHandlers() {
        document.getElementById('connect-ssh').addEventListener('click', () => {
            this.connectSSH();
        });

        document.getElementById('connect-telnet').addEventListener('click', () => {
            this.connectTelnet();
        });

        document.getElementById('disconnect').addEventListener('click', () => {
            this.disconnect();
        });

        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    if (input.id.startsWith('ssh-')) {
                        this.connectSSH();
                    } else if (input.id.startsWith('telnet-')) {
                        this.connectTelnet();
                    }
                }
            });
        });
    }

    connectSSH() {
        const host = document.getElementById('ssh-host').value.trim();
        const port = parseInt(document.getElementById('ssh-port').value) || 22;
        const username = document.getElementById('ssh-username').value.trim();
        const password = document.getElementById('ssh-password').value;

        if (!host || !username) {
            alert('Please provide host and username for SSH connection');
            return;
        }

        this.updateStatus('connecting', 'Connecting via SSH...');
        this.terminal.clear();
        this.terminal.writeln(`Connecting to ${username}@${host}:${port}...`);

        this.socket.emit('connect-ssh', {
            host: host,
            port: port,
            username: username,
            password: password
        });
    }

    connectTelnet() {
        const host = document.getElementById('telnet-host').value.trim();
        const port = parseInt(document.getElementById('telnet-port').value) || 23;

        if (!host) {
            alert('Please provide host for Telnet connection');
            return;
        }

        this.updateStatus('connecting', 'Connecting via Telnet...');
        this.terminal.clear();
        this.terminal.writeln(`Connecting to ${host}:${port}...`);

        this.socket.emit('connect-telnet', {
            host: host,
            port: port
        });
    }

    disconnect() {
        this.socket.emit('force-disconnect');
        this.handleDisconnection();
    }

    handleDisconnection() {
        this.isConnected = false;
        this.currentConnectionType = null;
        this.updateStatus('disconnected', 'Disconnected');
        this.updateUI(false);
        
        if (this.terminal) {
            this.terminal.writeln('\r\n\x1b[33mConnection closed.\x1b[0m');
            this.terminal.writeln('You can connect to another system using the form above.');
            this.terminal.write('$ ');
        }
    }

    updateStatus(type, message) {
        const statusElement = document.getElementById('status');
        statusElement.className = `status ${type}`;
        statusElement.textContent = message;
    }

    updateUI(connected) {
        const connectButtons = document.querySelectorAll('#connect-ssh, #connect-telnet');
        const disconnectButton = document.getElementById('disconnect');
        const inputs = document.querySelectorAll('input');
        const connectionPanel = document.querySelector('.connection-panel');

        connectButtons.forEach(btn => {
            btn.disabled = connected;
        });

        inputs.forEach(input => {
            input.disabled = connected;
        });

        if (connected) {
            disconnectButton.classList.remove('hidden');
            connectionPanel.classList.add('collapsed');
        } else {
            disconnectButton.classList.add('hidden');
            connectionPanel.classList.remove('collapsed');
        }
    }

    focus() {
        if (this.terminal) {
            this.terminal.focus();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const gateway = new TerminalGateway();
    
    document.addEventListener('click', (e) => {
        if (e.target.closest('.terminal-container')) {
            gateway.focus();
        }
    });
});