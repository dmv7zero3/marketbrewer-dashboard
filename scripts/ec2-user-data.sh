#!/bin/bash
# MarketBrewer EC2 GPU Instance Bootstrap Script
# This runs automatically when the instance launches

set -e
exec > >(tee /var/log/user-data.log) 2>&1

echo "=== MarketBrewer EC2 Bootstrap Starting ==="
echo "Timestamp: $(date)"

# Update system
apt-get update -y

# Install Ollama
echo "=== Installing Ollama ==="
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
systemctl enable ollama
systemctl start ollama

# Wait for Ollama to be ready
echo "=== Waiting for Ollama to start ==="
sleep 10
until curl -s http://localhost:11434/api/tags > /dev/null 2>&1; do
    echo "Waiting for Ollama..."
    sleep 5
done
echo "Ollama is running"

# Pull the model
echo "=== Pulling llama3.2:latest ==="
ollama pull llama3.2:latest

# Install Node.js 20
echo "=== Installing Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify installations
echo "=== Verifying installations ==="
node --version
npm --version
ollama --version

# Create app directory
mkdir -p /home/ubuntu/marketbrewer
chown ubuntu:ubuntu /home/ubuntu/marketbrewer

# Create a ready marker file
touch /home/ubuntu/.bootstrap-complete
chown ubuntu:ubuntu /home/ubuntu/.bootstrap-complete

echo "=== Bootstrap Complete ==="
echo "Timestamp: $(date)"
echo "Instance is ready for deployment"
