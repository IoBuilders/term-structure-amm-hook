#!/usr/bin/env bash
set -euo pipefail

# ——— Configurable via .env.ats ———
# .env.ats should contain at least:
#   NETWORK=local
# or
#   NETWORK=testnet
#
# (you can add more vars here later if you like)

# Paths
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ATS_CONFIG_DIR="$BASE_DIR/config/ats"
ATS_CONTRACTS_DIR="$BASE_DIR/lib/asset-tokenization-studio/contracts"
ENV_FILE="$ATS_CONFIG_DIR/.env.ats"
ENV_TARGET="$ATS_CONTRACTS_DIR/.env"
DEPLOYMENTS_NAME="deployments"
ATS_DEPLOYMENTS_JSON="$ATS_CONTRACTS_DIR/$DEPLOYMENTS_NAME.json"
DEPLOYMENTS_JSON_TARGET="$ATS_CONFIG_DIR/$DEPLOYMENTS_NAME.json"

# Load network (and any future vars) from .env.ats
if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌  Missing $ENV_FILE; please create it with at least NETWORK=local or testnet"
  exit 1
fi
set -a
. "$ENV_FILE"
set +a

echo "✔️  Using network: $NETWORK"

# Spin up Anvil only when running locally
if [[ "$NETWORK" == "local" ]]; then
  echo "🚀  Starting Anvil chain..."
  anvil -q &
  ANVIL_PID=$!
  # give it a moment to be ready
  sleep 3
else
  echo "🔗  SKIPPING local Anvil (testnet)"
fi

# Push the same .env.ats into the contracts folder as `.env`
echo "📋  Copying $ENV_FILE → $ENV_TARGET"
cp "$ENV_FILE" "$ENV_TARGET"

echo "📦  Deploying contracts via Hardhat…"
cd "$ATS_CONTRACTS_DIR"

if [[ ! -d "typechain-types" ]]; then
  echo "🛠  typechain-types not found, compiling…"
  npm run compile:force
else
  echo "✅  typechain-types present, skipping compile"
fi

npx hardhat deployAll --network "$NETWORK" --file-name "$DEPLOYMENTS_NAME"

# ensure target dir exists
mkdir -p "$(dirname "$DEPLOYMENTS_JSON_TARGET")"

echo "🔍  Generating compact $DEPLOYMENTS_NAME.json…"
node <<EOF
const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(path.resolve("${ATS_DEPLOYMENTS_JSON}"), 'utf-8');
const parsed = JSON.parse(raw);

const compact = parsed.reduce((acc, { name, address }) => {
  const key = name.replace(/\s+/g, '').replace(/^[A-Z]/, c => c.toLowerCase());
  acc[key] = { address };
  return acc;
}, {});

fs.writeFileSync(path.resolve("${DEPLOYMENTS_JSON_TARGET}"),
                 JSON.stringify(compact, null, 2));
console.log("👉  Compact deployments written to", "${DEPLOYMENTS_JSON_TARGET}");
EOF
