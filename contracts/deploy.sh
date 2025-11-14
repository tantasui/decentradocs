#!/bin/bash

# Deploy script for Sui Move contract
# Make sure you have Sui CLI installed and configured

echo "Building Move package..."
cd document_registry
sui move build

echo "Publishing to Sui network..."
sui client publish --gas-budget 100000000

echo "Deployment complete! Save the Package ID for your .env file"
