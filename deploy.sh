#!/bin/bash

##############################################################################
# ZeFile Frontend - Production Deployment Script
#
# This script handles the complete deployment process for production:
# - Stops existing processes
# - Pulls latest code
# - Installs dependencies
# - Builds the Next.js application
# - Starts the application with PM2
#
# Usage:
#   ./deploy.sh [environment]
#
# Arguments:
#   environment: development or production (default: production)
#
# Examples:
#   ./deploy.sh                 # Deploy to production
#   ./deploy.sh development     # Deploy to development
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
APP_NAME="zefile-frontend"
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"

# Print colored message
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date +%H:%M:%S)] ${message}${NC}"
}

print_message "$BLUE" "=========================================="
print_message "$BLUE" "  ZeFile Frontend Deployment"
print_message "$BLUE" "  Environment: $ENVIRONMENT"
print_message "$BLUE" "=========================================="
echo ""

# Step 1: Create logs directory
print_message "$YELLOW" "Creating logs directory..."
mkdir -p logs

# Step 2: Backup current .env files
if [ -f .env.local ]; then
    print_message "$YELLOW" "Backing up .env.local file..."
    mkdir -p "$BACKUP_DIR"
    cp .env.local "$BACKUP_DIR/.env.local"
    print_message "$GREEN" "✓ .env.local backed up to $BACKUP_DIR"
fi

# Step 3: Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    print_message "$YELLOW" "PM2 not found. Installing PM2 globally..."
    npm install -g pm2
    print_message "$GREEN" "✓ PM2 installed"
else
    print_message "$GREEN" "✓ PM2 already installed"
fi

# Step 4: Install dependencies
print_message "$YELLOW" "Installing dependencies..."
npm ci
print_message "$GREEN" "✓ Dependencies installed"

# Step 5: Build the Next.js application
print_message "$YELLOW" "Building Next.js application..."
npm run build
print_message "$GREEN" "✓ Application built successfully"

# Step 6: Stop existing PM2 process
print_message "$YELLOW" "Stopping existing PM2 process..."
pm2 delete $APP_NAME 2>/dev/null || true
print_message "$GREEN" "✓ Existing process stopped"

# Step 7: Start application with PM2
print_message "$YELLOW" "Starting application with PM2..."
pm2 start ecosystem.config.js --env $ENVIRONMENT
pm2 save
print_message "$GREEN" "✓ Application started"

# Step 8: Setup PM2 startup script (run only once)
if [ "$ENVIRONMENT" = "production" ]; then
    print_message "$YELLOW" "Setting up PM2 startup script..."
    pm2 startup | tail -n 1 | bash
    print_message "$GREEN" "✓ PM2 startup configured"
fi

# Step 9: Display status
echo ""
print_message "$BLUE" "=========================================="
print_message "$GREEN" "  Deployment Complete!"
print_message "$BLUE" "=========================================="
echo ""

print_message "$YELLOW" "Application Status:"
pm2 status

echo ""
print_message "$YELLOW" "Useful Commands:"
echo "  pm2 logs $APP_NAME      - View logs"
echo "  pm2 restart $APP_NAME   - Restart application"
echo "  pm2 stop $APP_NAME      - Stop application"
echo "  pm2 monit               - Monitor resources"
echo ""

print_message "$GREEN" "Deployment successful! 🎉"
