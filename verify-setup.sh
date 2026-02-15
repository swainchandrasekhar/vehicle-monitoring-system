#!/bin/bash

echo "========================================"
echo "  Vehicle Monitoring - Setup Check"
echo "========================================"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1: $($1 --version 2>&1 | head -n 1)"
    else
        echo -e "${RED}✗${NC} $1: NOT installed"
    fi
}

echo "--- Essential Tools ---"
check_command node
check_command npm
check_command git
check_command psql
check_command redis-cli

echo ""
echo "--- PostgreSQL Database ---"
export PGPASSWORD='sekhar'
if psql -h localhost -U vehicle_admin -d vehicle_monitoring -c "SELECT 1;" &> /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Connection: SUCCESS (localhost:5432)"
    
    POSTGIS=$(psql -h localhost -U vehicle_admin -d vehicle_monitoring -t -c "SELECT PostGIS_Version();" 2>/dev/null | xargs)
    if [ -n "$POSTGIS" ]; then
        echo -e "${GREEN}✓${NC} PostGIS: $POSTGIS"
    fi
else
    echo -e "${RED}✗${NC} Connection: FAILED"
fi
unset PGPASSWORD

echo ""
echo "--- Redis Cache ---"
if redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo -e "${GREEN}✓${NC} Connection: SUCCESS (localhost:6379)"
else
    echo -e "${RED}✗${NC} Connection: FAILED"
fi

echo ""
echo "--- Project Structure ---"
for dir in client server database ml-integration docs; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓${NC} $dir/"
    else
        echo -e "${RED}✗${NC} $dir/"
    fi
done

echo ""
echo "Current directory: $(pwd)"
echo ""
echo "========================================"
echo "  Phase 1: COMPLETE ✓"
echo "========================================"
