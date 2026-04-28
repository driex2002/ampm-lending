#!/bin/bash
set -e
echo "Starting AMPM Lending System..."
docker-compose up -d
echo ""
echo "Application is running at http://localhost:3000"
echo "PostgreSQL is available at localhost:5432"
echo ""
echo "Use ./stop.sh to shut down."
