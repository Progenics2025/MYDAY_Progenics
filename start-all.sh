#!/bin/bash

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║  MyDay - Start All Services Script                                         ║
# ║  This script starts:                                                       ║
# ║    1. PostgreSQL (if not running)                                          ║
# ║    2. MyDay Application (port 5000)                                        ║
# ║    3. Cloudflare Tunnel (myday-tunnel → myday.progenicslabs.com)           ║
# ╚════════════════════════════════════════════════════════════════════════════╝

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Use the project-local cloudflared config for MyDay tunnel
CLOUDFLARED_CONFIG="$PROJECT_DIR/.cloudflared/config.yml"
TUNNEL_NAME="myday-tunnel"

# Log file
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           MyDay - Starting All Services                    ║${NC}"
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

# Function to kill process on port
kill_port() {
    local port=$1
    local service=$2
    if check_port $port; then
        echo -e "${YELLOW}⚠️  Port $port is already in use by $service${NC}"
        echo -e "${YELLOW}   Killing existing process...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
        echo -e "${GREEN}✓ Port $port freed${NC}"
    fi
}

# Function to check if PostgreSQL is running
check_postgres() {
    if pg_isready -q 2>/dev/null; then
        return 0  # PostgreSQL is running
    else
        return 1  # PostgreSQL is not running
    fi
}

# Function to start PostgreSQL
start_postgres() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}[1/3] Checking PostgreSQL Service${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if check_postgres; then
        echo -e "${GREEN}✓ PostgreSQL is already running${NC}"
    else
        echo -e "${YELLOW}⚡ Starting PostgreSQL...${NC}"
        sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null || {
            echo -e "${RED}✗ Failed to start PostgreSQL automatically${NC}"
            echo -e "${YELLOW}   Please start PostgreSQL manually before running this script${NC}"
            exit 1
        }
        sleep 3
        
        if check_postgres; then
            echo -e "${GREEN}✓ PostgreSQL started successfully${NC}"
        else
            echo -e "${RED}✗ Failed to start PostgreSQL${NC}"
            exit 1
        fi
    fi
    echo ""
}

# Function to start the application (dev server)
start_app() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}[2/3] Starting MyDay Application (Port 5000)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    kill_port 5000 "MyDay App"
    
    echo -e "${YELLOW}⚡ Starting application server...${NC}"
    cd "$PROJECT_DIR"
    nohup npm run dev > "$LOG_DIR/app_$TIMESTAMP.log" 2>&1 &
    APP_PID=$!
    
    # Wait for app to start
    echo -e "${CYAN}   Waiting for application to start...${NC}"
    sleep 8
    
    if check_port 5000; then
        echo -e "${GREEN}✓ Application started successfully on port 5000${NC}"
        echo -e "${CYAN}   PID: $APP_PID${NC}"
        echo -e "${CYAN}   Log: $LOG_DIR/app_$TIMESTAMP.log${NC}"
    else
        echo -e "${RED}✗ Failed to start application${NC}"
        echo -e "${YELLOW}   Check logs: tail -f $LOG_DIR/app_$TIMESTAMP.log${NC}"
        exit 1
    fi
    echo ""
}

# Function to check if a specific tunnel config is already running
check_tunnel_running() {
    local config_path=$1
    if pgrep -f "cloudflared.*$config_path" > /dev/null 2>&1; then
        return 0  # Tunnel with this config is running
    else
        return 1  # Tunnel is not running
    fi
}

# Function to start Cloudflare tunnel (MyDay only - won't affect other tunnels)
start_cloudflared() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}[3/3] Starting Cloudflare Tunnel ($TUNNEL_NAME)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [ ! -f "$CLOUDFLARED_CONFIG" ]; then
        echo -e "${RED}✗ Cloudflare config not found: $CLOUDFLARED_CONFIG${NC}"
        exit 1
    fi
    
    # Check if THIS tunnel (MyDay) is already running - don't kill other tunnels!
    if check_tunnel_running "$CLOUDFLARED_CONFIG"; then
        echo -e "${GREEN}✓ MyDay tunnel is already running${NC}"
        echo ""
        return 0
    fi
    
    # Show info about other running tunnels (don't kill them)
    if pgrep -x "cloudflared" > /dev/null; then
        echo -e "${CYAN}ℹ️  Other Cloudflare tunnels detected (keeping them running)${NC}"
    fi
    
    echo -e "${YELLOW}⚡ Starting $TUNNEL_NAME...${NC}"
    nohup cloudflared tunnel --config "$CLOUDFLARED_CONFIG" run > "$LOG_DIR/cloudflared_myday_$TIMESTAMP.log" 2>&1 &
    CLOUDFLARED_PID=$!
    
    sleep 3
    
    if check_tunnel_running "$CLOUDFLARED_CONFIG"; then
        echo -e "${GREEN}✓ $TUNNEL_NAME started successfully${NC}"
        echo -e "${CYAN}   PID: $CLOUDFLARED_PID${NC}"
        echo -e "${CYAN}   Log: $LOG_DIR/cloudflared_myday_$TIMESTAMP.log${NC}"
        echo -e "${MAGENTA}   🌐 myday.progenicslabs.com → localhost:5000${NC}"
    else
        echo -e "${RED}✗ Failed to start $TUNNEL_NAME${NC}"
        echo -e "${YELLOW}   Check logs: tail -f $LOG_DIR/cloudflared_myday_$TIMESTAMP.log${NC}"
        exit 1
    fi
    echo ""
}

# Main execution
echo -e "${CYAN}📂 Project Directory: $PROJECT_DIR${NC}"
echo -e "${CYAN}📝 Logs Directory: $LOG_DIR${NC}"
echo ""

# Start all services
start_postgres
start_app
start_cloudflared

# Summary
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              🎉 All Services Started Successfully! 🎉       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📊 Service Status:${NC}"
echo -e "${GREEN}   ✓ PostgreSQL:       Running${NC}"
echo -e "${GREEN}   ✓ MyDay App:        Running on localhost:5000${NC}"
echo -e "${GREEN}   ✓ Cloudflare:       Tunneling to progenicslabs.com${NC}"
echo ""
echo -e "${MAGENTA}🌐 Access URLs:${NC}"
echo -e "${CYAN}   Local:             http://localhost:5000${NC}"
echo -e "${CYAN}   Production:        https://myday.progenicslabs.com${NC}"
echo ""
echo -e "${YELLOW}📝 Logs are available in: $LOG_DIR${NC}"
echo ""
echo -e "${BLUE}ℹ️  To stop all services, run: ./stop-all.sh${NC}"
echo -e "${BLUE}ℹ️  To view logs, run: tail -f $LOG_DIR/<service>_$TIMESTAMP.log${NC}"
echo ""
