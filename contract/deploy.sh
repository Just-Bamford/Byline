#!/bin/bash
set -e

echo "Building Byline contract..."
cargo build --target wasm32-unknown-unknown --release

echo "Running tests..."
cargo test

WASM_PATH="target/wasm32-unknown-unknown/release/byline_contract.wasm"

echo "Deploying to Stellar testnet..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --network testnet \
  --source-account "$STELLAR_SOURCE_ACCOUNT")

echo ""
echo "✅ Contract deployed!"
echo "CONTRACT_ID=$CONTRACT_ID"
echo ""
echo "Add this to your .env files:"
echo "CONTRACT_ID=$CONTRACT_ID"

# Write to a .contract file for other scripts to read
echo "$CONTRACT_ID" > .contract_id
