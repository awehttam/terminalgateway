# Terminal Gateway

A web-based terminal that can connect to remote systems via SSH or Telnet using xterm.js and a Node.js proxy server.

## Features

- 🖥️ Full terminal emulation using xterm.js
- 🔐 SSH connections with username/password authentication
- 📡 Telnet connections
- 🌐 WebSocket-based real-time communication
- 📱 Responsive design that works on desktop and mobile
- ⚡ Real-time terminal resizing
- 🎨 Dark theme terminal interface

## Installation

1. Clone or download this project
2. Install dependencies:
```bash
npm install
```

## Usage

1. Start the server:
```bash
npm start
```

2. Open your browser and go to `http://localhost:3000`

3. Connect to a remote system:
   - **SSH**: Enter host, port (default 22), username, and password
   - **Telnet**: Enter host and port (default 23)

## Development

For development with auto-restart:
```bash
npm run dev
```

## Example Connections

### SSH Examples
- **Linux Server**: `user@example.com:22`
- **Raspberry Pi**: `pi@192.168.1.100:22`
- **Cloud Instance**: `ubuntu@ec2-xxx.amazonaws.com:22`

### Telnet Examples
- **Star Wars ASCII**: `towel.blinkenlights.nl:23`
- **Weather Service**: `rainmaker.wunderground.com:3000`
- **Local Router**: `192.168.1.1:23`

## Production Deployment

For production use, it's recommended to run the Terminal Gateway behind a reverse proxy for TLS termination and additional security.

### Caddy Configuration

Create a `Caddyfile`:

```caddy
terminal.yourdomain.com {
    reverse_proxy localhost:3000
    
    # Optional: Add authentication
    # basicauth {
    #     user $2a$14$...hashed-password...
    # }
}
```

Start Caddy:
```bash
caddy run --config Caddyfile
```

### Nginx Configuration

Create `/etc/nginx/sites-available/terminal-gateway`:

```nginx
server {
    listen 443 ssl http2;
    server_name terminal.yourdomain.com;
    
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name terminal.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/terminal-gateway /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Apache Configuration

Create `/etc/apache2/sites-available/terminal-gateway.conf`:

```apache
<VirtualHost *:443>
    ServerName terminal.yourdomain.com
    
    SSLEngine on
    SSLCertificateFile /path/to/your/certificate.crt
    SSLCertificateKeyFile /path/to/your/private.key
    
    ProxyPreserveHost On
    ProxyRequests Off
    
    # WebSocket support
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://localhost:3000/$1" [P,L]
    
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # Set headers for WebSocket
    ProxyPassReverse / http://localhost:3000/
    ProxyPass /socket.io/ http://localhost:3000/socket.io/
    ProxyPassReverse /socket.io/ http://localhost:3000/socket.io/
</VirtualHost>

# Redirect HTTP to HTTPS
<VirtualHost *:80>
    ServerName terminal.yourdomain.com
    Redirect permanent / https://terminal.yourdomain.com/
</VirtualHost>
```

Enable required modules and site:
```bash
sudo a2enmod ssl rewrite proxy proxy_http proxy_wstunnel
sudo a2ensite terminal-gateway
sudo systemctl reload apache2
```

### Environment Variables

For production, set these environment variables:

```bash
export NODE_ENV=production
export PORT=3000
export HOST=localhost
```

## Security Notes

⚠️ **Important**: This tool requires additional security considerations for production use:

- Configure the `gateway.json` allowedHosts list appropriately
- Use HTTPS/WSS connections (via reverse proxy)
- Implement proper authentication at the reverse proxy level
- Add rate limiting
- Consider using SSH keys instead of passwords
- Monitor and log connections
- Keep the server updated

## Architecture

- **Frontend**: HTML5 + xterm.js + Socket.IO client
- **Backend**: Node.js + Express + Socket.IO + SSH2 + Telnet-client
- **Communication**: WebSocket for real-time terminal data

## Browser Support

- Chrome/Chromium 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Dependencies

- `express`: Web server framework
- `socket.io`: Real-time WebSocket communication
- `ssh2`: SSH client implementation
- `telnet-client`: Telnet client implementation
- `xterm`: Terminal emulator for the web

## License

MIT License