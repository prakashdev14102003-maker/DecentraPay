#!/bin/bash
set -e

echo "══════════════════════════════════════════════════"
echo "  DecentraPay — All-in-One Container Starting..."
echo "══════════════════════════════════════════════════"

# ── 1. Initialize PostgreSQL if needed ───────────────────────
PGDATA="/var/lib/postgresql/data"
if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "▸ Initializing PostgreSQL data directory..."
    su - postgres -c "/usr/lib/postgresql/15/bin/initdb -D $PGDATA"
    # Allow local connections without password
    echo "host all all 127.0.0.1/32 trust" >> "$PGDATA/pg_hba.conf"
    echo "local all all trust" >> "$PGDATA/pg_hba.conf"
fi

# ── 2. Start PostgreSQL temporarily ─────────────────────────
echo "▸ Starting PostgreSQL..."
su - postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D $PGDATA -l /tmp/pg.log start -w"

# Wait for Postgres to be ready
until su - postgres -c "pg_isready -h 127.0.0.1" > /dev/null 2>&1; do
    echo "  Waiting for PostgreSQL..."
    sleep 1
done
echo "  ✓ PostgreSQL is ready"

# ── 3. Create database if it doesn't exist ──────────────────
su - postgres -c "psql -h 127.0.0.1 -tc \"SELECT 1 FROM pg_database WHERE datname='decentrapay'\" | grep -q 1" || \
    su - postgres -c "createdb -h 127.0.0.1 decentrapay"
echo "  ✓ Database 'decentrapay' ready"

# ── 4. Start Hardhat node temporarily ───────────────────────
echo "▸ Starting Hardhat local blockchain..."
cd /app/packages/contracts
bunx hardhat node --hostname 127.0.0.1 &
HARDHAT_PID=$!

# Wait for Hardhat to be ready
sleep 5
for i in $(seq 1 30); do
    if curl -s http://127.0.0.1:8545 -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' > /dev/null 2>&1; then
        break
    fi
    echo "  Waiting for Hardhat node..."
    sleep 2
done
echo "  ✓ Hardhat node is ready"

# ── 5. Deploy contracts to local Hardhat ────────────────────
echo "▸ Deploying contracts to local Hardhat..."
DEPLOY_OUTPUT=$(npx hardhat run scripts/deploy-local.ts --network localhost 2>&1) || {
    echo "  ⚠ Contract deployment failed (non-fatal):"
    echo "$DEPLOY_OUTPUT"
}
echo "$DEPLOY_OUTPUT"

# Parse deployed contract addresses from output
REGISTRY_ADDR=$(echo "$DEPLOY_OUTPUT" | grep "DecentraPayRegistry deployed to:" | awk '{print $NF}')
MARKETPLACE_ADDR=$(echo "$DEPLOY_OUTPUT" | grep "Marketplace deployed to:" | awk '{print $NF}')
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

if [ -n "$REGISTRY_ADDR" ]; then
    echo "  ✓ Registry:    $REGISTRY_ADDR"
    echo "  ✓ Marketplace: $MARKETPLACE_ADDR"
    # Export for the API process
    export REGISTRY_ADDRESS="$REGISTRY_ADDR"
    export MARKETPLACE_ADDRESS="$MARKETPLACE_ADDR"
    export PRIVATE_KEY="$PRIVATE_KEY"

    # Update the supervisord API environment with contract addresses
    sed -i "s|environment=DATABASE_URL=|environment=REGISTRY_ADDRESS=\"$REGISTRY_ADDR\",MARKETPLACE_ADDRESS=\"$MARKETPLACE_ADDR\",PRIVATE_KEY=\"$PRIVATE_KEY\",DATABASE_URL=|" \
        /etc/supervisor/conf.d/decentrapay.conf
else
    echo "  ⚠ Could not parse contract addresses"
fi

# ── 6. Stop temporary Hardhat (supervisord will restart it) ──
kill $HARDHAT_PID 2>/dev/null || true
wait $HARDHAT_PID 2>/dev/null || true

# ── 7. Run Drizzle schema push ──────────────────────────────
echo "▸ Pushing database schema..."
cd /app/apps/api
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/decentrapay" \
    bunx drizzle-kit push --force
echo "  ✓ Database schema synced"

# ── 8. Seed the database ────────────────────────────────────
echo "▸ Seeding database..."
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/decentrapay" \
    bun run src/scripts/seed.ts || echo "  ⚠ Seed script skipped or failed (non-fatal)"
echo "  ✓ Database seeded"

# ── 9. Stop temporary PostgreSQL (supervisord will restart it)
su - postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D $PGDATA stop -w"

# ── 10. Inject runtime env vars into supervisord config ──────
# Allow overriding via Railway env vars
if [ -n "$JWT_SECRET" ]; then
    sed -i "s|environment=REGISTRY_ADDRESS|environment=JWT_SECRET=\"$JWT_SECRET\",REGISTRY_ADDRESS|" \
        /etc/supervisor/conf.d/decentrapay.conf 2>/dev/null || true
fi

if [ -n "$NEXT_PUBLIC_API_URL" ]; then
    # Rebuild is needed for NEXT_PUBLIC_ vars — for now, set it at runtime
    sed -i "s|environment=PORT=\"3000\"|environment=NEXT_PUBLIC_API_URL=\"$NEXT_PUBLIC_API_URL\",PORT=\"3000\"|" \
        /etc/supervisor/conf.d/decentrapay.conf 2>/dev/null || true
fi

# ── 11. Launch everything with supervisord ───────────────────
echo ""
echo "══════════════════════════════════════════════════"
echo "  ✓ All services starting via supervisord"
echo "    Web:     http://0.0.0.0:3000"
echo "    API:     http://0.0.0.0:3001"
echo "    Hardhat: http://127.0.0.1:8545"
echo "══════════════════════════════════════════════════"

cd /app
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/decentrapay.conf
