#!/bin/bash

# Terminal Gateway startup script
# Change to the correct directory
cd /path/to/terminalgateway

# Set environment variables
export NODE_ENV=production
export PORT=3000

# Start the server with logging
npm start >> /var/log/terminal-gateway.log 2>&1