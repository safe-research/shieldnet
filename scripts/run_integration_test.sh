#!/bin/bash
set -e

# --- Configuration ---
ANVIL_RPC_URL="http://127.0.0.1:8545"

# --- 1. Start Anvil in the background ---
echo "Starting Anvil..."
# Mute anvil logs
anvil > ./anvil_logs.txt & 
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
    --unlocked \
    --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
    --broadcast

# --- 4. Run Client Integration Tests ---
echo "Running integration tests..."

npm test integration

echo "Integration tests finished successfully."
