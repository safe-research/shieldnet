#!/bin/bash
set -e

# --- Configuration ---
CLIENT_PACKAGE_NAME="client" # <-- Replace with your client package name
CONTRACTS_OUTPUT_FILE=".deploy-output.json"
ANVIL_RPC_URL="http://127.0.0.1:8545"

# --- 1. Start Anvil in the background ---
echo "Starting Anvil..."
anvil > /dev/null & 
ANVIL_PID=$!
echo "Anvil started with PID $ANVIL_PID"

# --- 2. Setup Cleanup ---
trap 'echo "Stopping Anvil (PID $ANVIL_PID)..." && kill $ANVIL_PID' EXIT
sleep 2

# --- 3. Deploy Contracts ---
# Use anvil default account
echo "Deploying contracts..."
forge script DeployScript \
    --rpc-url $ANVIL_RPC_URL \
    --private-key 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d \
    --broadcast

# --- 4. Run Client Integration Tests ---
echo "Running Vitest integration tests..."

npm test integration

forge clean

echo "Integration tests finished successfully."
