#!/usr/bin/env bash
# Deploy Solana Stablecoin Standard programs to Devnet.
# Run from repo root. Requires: solana CLI, anchor, funded devnet wallet.
#
# Usage: ./scripts/deploy-devnet.sh

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
PROOF_FILE="$REPO_ROOT/deployments/devnet-proof.json"

echo "==> Configuring Solana for devnet"
solana config set --url devnet

echo "==> Deploying programs (anchor deploy --provider.cluster devnet)"
DEPLOY_OUTPUT=$(mktemp)
trap "rm -f $DEPLOY_OUTPUT" EXIT

if ! anchor deploy --provider.cluster devnet 2>&1 | tee "$DEPLOY_OUTPUT"; then
  echo "ERROR: anchor deploy failed"
  exit 1
fi

# Extract program IDs from Anchor.toml [programs.devnet]
echo ""
echo "==> Program IDs (from Anchor.toml [programs.devnet])"
STABLECOIN_ID=$(grep -A 10 '\[programs.devnet\]' Anchor.toml | grep 'stablecoin =' | sed 's/.*"\([^"]*\)".*/\1/' | head -1)
TRANSFER_HOOK_ID=$(grep -A 10 '\[programs.devnet\]' Anchor.toml | grep 'transfer_hook =' | sed 's/.*"\([^"]*\)".*/\1/' | head -1)
ORACLE_ID=$(grep -A 10 '\[programs.devnet\]' Anchor.toml | grep 'oracle =' | sed 's/.*"\([^"]*\)".*/\1/' | head -1)

echo "  stablecoin:    $STABLECOIN_ID"
echo "  transfer_hook: $TRANSFER_HOOK_ID"
echo "  oracle:        $ORACLE_ID"

# Try to extract deploy transaction signatures from anchor output.
# Anchor may print signatures; base58 Solana sigs are ~87-88 chars.
extract_sigs() {
  grep -oE '[1-9A-HJ-NP-Za-km-z]{87,88}' "$DEPLOY_OUTPUT" 2>/dev/null | head -10 || true
}

SIGS=($(extract_sigs))
SIGS_JSON="[]"
if [ ${#SIGS[@]} -gt 0 ]; then
  SIGS_JSON="[$(printf '"%s",' "${SIGS[@]}" | sed 's/,$//')]"
fi

# Update devnet-proof.json if we have node and possibly new signatures
if command -v node >/dev/null 2>&1; then
  if [ -f "$PROOF_FILE" ]; then
    # If we extracted sigs, try to match by order (stablecoin, transfer_hook, oracle)
    # Anchor typically deploys in workspace order.
    if [ ${#SIGS[@]} -ge 3 ]; then
      node -e "
        const fs = require('fs');
        const proof = JSON.parse(fs.readFileSync('$PROOF_FILE', 'utf8'));
        proof.programIds = { stablecoin: '$STABLECOIN_ID', transfer_hook: '$TRANSFER_HOOK_ID', oracle: '$ORACLE_ID' };
        proof.generatedAt = new Date().toISOString().slice(0, 10);
        if (!proof.deployments) proof.deployments = [];
        const sigs = $SIGS_JSON;
        sigs.forEach(s => proof.deployments.push({ signature: s, deployedAt: new Date().toISOString() }));
        proof.deployTransactions = { stablecoin: sigs[0], transfer_hook: sigs[1], oracle: sigs[2] };
        fs.writeFileSync('$PROOF_FILE', JSON.stringify(proof, null, 2));
        console.log('Updated', '$PROOF_FILE', 'with deploy signatures');
      "
    elif [ ${#SIGS[@]} -gt 0 ]; then
      node -e "
        const fs = require('fs');
        const proof = JSON.parse(fs.readFileSync('$PROOF_FILE', 'utf8'));
        proof.programIds = { stablecoin: '$STABLECOIN_ID', transfer_hook: '$TRANSFER_HOOK_ID', oracle: '$ORACLE_ID' };
        proof.generatedAt = new Date().toISOString().slice(0, 10);
        if (!proof.deployments) proof.deployments = [];
        const sigs = $SIGS_JSON;
        sigs.forEach(s => proof.deployments.push({ signature: s, deployedAt: new Date().toISOString() }));
        fs.writeFileSync('$PROOF_FILE', JSON.stringify(proof, null, 2));
        console.log('Updated', '$PROOF_FILE', '(appended', sigs.length, 'sig(s) to deployments; add deployTransactions manually if needed)');
      "
    else
      node -e "
        const fs = require('fs');
        const proof = JSON.parse(fs.readFileSync('$PROOF_FILE', 'utf8'));
        proof.programIds = { stablecoin: '$STABLECOIN_ID', transfer_hook: '$TRANSFER_HOOK_ID', oracle: '$ORACLE_ID' };
        proof.generatedAt = new Date().toISOString().slice(0, 10);
        fs.writeFileSync('$PROOF_FILE', JSON.stringify(proof, null, 2));
        console.log('Updated programIds in', '$PROOF_FILE', '(no deploy sigs parsed)');
      "
    fi
  else
    mkdir -p "$(dirname "$PROOF_FILE")"
    node -e "
      const fs = require('fs');
      const proof = {
        cluster: 'devnet',
        rpcUrl: 'https://api.devnet.solana.com',
        explorerBase: 'https://explorer.solana.com/tx/{signature}?cluster=devnet',
        programIds: { stablecoin: '$STABLECOIN_ID', transfer_hook: '$TRANSFER_HOOK_ID', oracle: '$ORACLE_ID' },
        deployTransactions: {},
        deployments: [],
        generatedAt: new Date().toISOString().slice(0, 10)
      };
      fs.writeFileSync('$PROOF_FILE', JSON.stringify(proof, null, 2));
      console.log('Created', '$PROOF_FILE');
    "
  fi
else
  echo "Note: node not found; skipping JSON update. Update $PROOF_FILE manually."
fi

echo ""
echo "==> Next steps"
echo "  1. If program IDs changed, update Anchor.toml [programs.devnet] and redeploy."
echo "  2. If deploy tx signatures were not parsed, add them manually to deployments/devnet-proof.json deployTransactions."
echo "  3. Record example operations (init, mint, etc.) per docs/DEPLOYMENT.md."
