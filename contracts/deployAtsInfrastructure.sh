#!/bin/bash
set -euo pipefail

# Paths
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ATS_CONTRACTS_DIR="$BASE_DIR/lib/asset-tokenization-studio/contracts"
ENV_FILE="$BASE_DIR/config/ats/.env.ats"
ENV_TARGET="$ATS_CONTRACTS_DIR/.env"
DEPLOYMENTS_NAME="deployments"
ATS_DEPLOYMENTS_JSON="$ATS_CONTRACTS_DIR/$DEPLOYMENTS_NAME.json"
DEPLOYMENTS_JSON_TARGET="$BASE_DIR/config/ats/$DEPLOYMENTS_NAME.json"

echo "Starting Anvil chain..."
anvil -q &
ANVIL_PID=$!

sleep 3

# Copy .env
echo "Copying '.env.ats' to '.env'..."
cp "$ENV_FILE" "$ENV_TARGET"

echo "Deploying infrastructure..."

cd "$ATS_CONTRACTS_DIR"

if [[ ! -d "typechain-types" ]]; then
  echo "'typechain-types' directory not found. Running 'npm run compile:force'..."
  npm run compile:force
else
  echo "'typechain-types' directory already exists. Skipping compile."
fi

npx hardhat deployAll --network local --file-name "$DEPLOYMENTS_NAME"

# Ensure the destination directory exists
mkdir -p "$(dirname "$DEPLOYMENTS_JSON_TARGET")"

echo "Creating compact deployments.json..."

node <<EOF
const fs = require('fs');
const path = require('path');

const inputPath = path.resolve("${ATS_DEPLOYMENTS_JSON}");
const outputPath = path.resolve("${DEPLOYMENTS_JSON_TARGET}");

const nameToKey = (name) =>
  name
    .replace(/\s+/g, '')
    .replace(/^[A-Z]/, (c) => c.toLowerCase());

const raw = fs.readFileSync(inputPath, 'utf-8');
const parsed = JSON.parse(raw);

const result = {};
parsed.forEach(({ name, address }) => {
  const key = nameToKey(name);
  result[key] = { address };
});

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log("Compact deployments written to", outputPath);
EOF