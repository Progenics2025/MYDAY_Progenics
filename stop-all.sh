#!/bin/bash

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║  MyDay - Stop Services Script                                              ║
# ║  This script stops:                                                        ║
# ║    1. MyDay Application (port 5000)                                        ║
# ║    2. Cloudflare Tunnel (myday-tunnel only - won't affect other tunnels)   ║
# ╚════════════════════════════════════════════════════════════════════════════╝

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLOUDFLARED_CONFIG="$PROJECT_DIR/.cloudflared/config.yml"
TUNNEL_NAME="myday-tunnel"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           MyDay - Stopping Services                        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to stop process on port
stop_port() {
    local port=$1
    local service=$2
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Stopping $service (Port $port)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if check_port $port; then
        echo -e "${YELLOW}⚡ Stopping $service...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
        
        if check_port $port; then
            echo -e "${RED}✗ Failed to stop $service${NC}"
        else
            echo -e "${GREEN}✓ $service stopped successfully${NC}"
        fi
    else
        echo -e "${CYAN}ℹ️  $service is not running${NC}"
    fi
    echo ""
}

# Function to check if a specific tunnel config is running
check_tunnel_running() {
    local config_path=$1
    if pgrep -f "cloudflared.*$config_path" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Stop only MyDay Cloudflare tunnel (preserves other tunnels like AskEVO)
stop_myday_tunnel() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Stopping $TUNNEL_NAME (keeps other tunnels running)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if check_tunnel_running "$CLOUDFLARED_CONFIG"; then
        echo -e "${YELLOW}⚡ Stopping $TUNNEL_NAME...${NC}"
        # Kill only the tunnel process running with MyDay's config
        pkill -f "cloudflared.*$CLOUDFLARED_CONFIG" 2>/dev/null || true
        sleep 2
        
        if check_tunnel_running "$CLOUDFLARED_CONFIG"; then
            echo -e "${RED}✗ Failed to stop $TUNNEL_NAME${NC}"
        else
            echo -e "${GREEN}✓ $TUNNEL_NAME stopped successfully${NC}"
        fi
    else
        echo -e "${CYAN}ℹ️  $TUNNEL_NAME is not running${NC}"
    fi
    
    # Show info about other tunnels still running
    if pgrep -x "cloudflared" > /dev/null; then
        echo -e "${CYAN}ℹ️  Other Cloudflare tunnels are still running (not affected)${NC}"
    fi
    echo ""
}

# Stop services
stop_myday_tunnel
stop_port 5000 "MyDay App"

# Summary
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✓ MyDay Services Stopped                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}ℹ️  PostgreSQL was left running (shared service)${NC}"
echo -e "${CYAN}ℹ️  Other Cloudflare tunnels were preserved${NC}"
echo ""
echo -e "${YELLOW}To start again: ./start-all.sh${NC}"
echo ""
