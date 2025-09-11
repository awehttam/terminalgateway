<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terminal Gateway</title>
    <link rel="stylesheet" href="assets/xterm.css" />
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            overflow: hidden;
            height: 100vh;
        }
        #terminal {
            width: 100%;
            height: 80vh;
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        h1 {
            color: #e2e8f0;
            text-align: center;
            margin-bottom: 30px;
            font-size: 2.5rem;
            font-weight: 300;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        .login-form {
            background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            color: #fff;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .login-form h3 {
            margin-top: 0;
            color: #f8fafc;
            font-weight: 400;
            text-align: center;
            margin-bottom: 25px;
        }
        .login-form input {
            width: 100%;
            padding: 15px;
            margin: 12px 0;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            border-radius: 8px;
            font-size: 16px;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
        }
        .login-form input::placeholder {
            color: rgba(255, 255, 255, 0.7);
        }
        .login-form input:focus {
            outline: none;
            border-color: #60a5fa;
            background: rgba(255, 255, 255, 0.15);
            box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
        }
        .login-form button {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: #fff;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
        }
        .login-form button:hover {
            background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 25px rgba(59, 130, 246, 0.4);
        }
        .hidden {
            display: none;
        }
        
        /* Hide scrollbars */
        ::-webkit-scrollbar {
            display: none;
        }
        * {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Terminal Gateway</h1>
        <div id="login-form" class="login-form">
            <h3>SSH Connection to <?php echo 'revpol.lovelybits.org:22'; ?></h3>
            <input type="text" id="username" placeholder="Username" autocomplete="username">
            <input type="password" id="password" placeholder="Password" autocomplete="current-password">
            <button onclick="startConnection()">Connect</button>
        </div>
        <div id="terminal" class="hidden"></div>
    </div>

    <script src="assets/xterm.js"></script>
    <script src="assets/xterm-addon-fit.js"></script>
    <script src="assets/xterm-addon-web-links.js"></script>
    <script src="assets/socket.io.min.js"></script>

    <script>
        // Pre-configured proxy server settings
        const PROXY_HOST = 'localhost';
        const PROXY_PORT = 3000;
        
        // Remote SSH host settings
        const REMOTE_HOST = 'revpol.lovelybits.org';
        const REMOTE_PORT = 22;
        
        // Initialize xterm.js
        const terminal = new Terminal({
            cursorBlink: true,
            theme: {
                background: '#000000',
                foreground: '#ffffff'
            }
        });

        // Add fit addon
        const fitAddon = new FitAddon.FitAddon();
        terminal.loadAddon(fitAddon);

        // Add web links addon
        const webLinksAddon = new WebLinksAddon.WebLinksAddon();
        terminal.loadAddon(webLinksAddon);

        // Initialize terminal but don't open it yet
        let terminalInitialized = false;

        // Socket.IO connection
        let socket;
        
        function startConnection() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            if (!username || !password) {
                alert('Please enter both username and password');
                return;
            }
            
            // Hide login form and show terminal
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('terminal').classList.remove('hidden');
            
            // Initialize terminal if not already done
            if (!terminalInitialized) {
                terminal.open(document.getElementById('terminal'));
                fitAddon.fit();
                terminalInitialized = true;
            }
            
            connect(username, password);
        }
        
        function connect(username, password) {
            const serverUrl = `http://${PROXY_HOST}:${PROXY_PORT}`;
            console.log('Connecting to:', serverUrl);
            socket = io(serverUrl);
            
            socket.on('connect', function() {
                console.log('Socket.IO connected successfully');
                terminal.write('\r\n\x1b[32mConnected to terminal server\x1b[0m\r\n');
                
                // Initiate SSH connection
                console.log('Sending connect-ssh request:', { host: REMOTE_HOST, port: REMOTE_PORT, username });
                socket.emit('connect-ssh', {
                    host: REMOTE_HOST,
                    port: REMOTE_PORT,
                    username: username,
                    password: password
                });
            });
            
            socket.on('data', function(data) {
                terminal.write(data);
            });
            
            socket.on('connection-status', function(status) {
                if (status.status === 'connected') {
                    terminal.write('\r\n\x1b[32mSSH connection established\x1b[0m\r\n');
                } else if (status.status === 'disconnected') {
                    terminal.write('\r\n\x1b[31mSSH connection closed\x1b[0m\r\n');
                }
            });
            
            socket.on('error', function(error) {
                console.error('Socket.IO error:', error);
                terminal.write(`\r\n\x1b[31mError: ${error.message}\x1b[0m\r\n`);
            });
            
            socket.on('disconnect', function() {
                console.log('Socket.IO disconnected');
                terminal.write('\r\n\x1b[31mConnection lost. Attempting to reconnect...\x1b[0m\r\n');
            });
            
            socket.on('connect_error', function(error) {
                console.error('Socket.IO connection error:', error);
                terminal.write(`\r\n\x1b[31mConnection Error: ${error.message}\x1b[0m\r\n`);
            });
        }

        // Send data from terminal to server
        terminal.onData(function(data) {
            if (socket && socket.connected) {
                socket.emit('input', data);
            }
        });

        // Handle terminal resize
        terminal.onResize(function(size) {
            if (socket && socket.connected) {
                socket.emit('resize', { rows: size.rows, cols: size.cols });
            }
        });

        // Handle window resize
        window.addEventListener('resize', function() {
            fitAddon.fit();
        });

        // Allow Enter key to submit form
        document.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !document.getElementById('login-form').classList.contains('hidden')) {
                startConnection();
            }
        });
    </script>
</body>
</html>