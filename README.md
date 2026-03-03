# PoRep Market Demo

A client demo frontend for the [PoRep Market](https://github.com/fidlabs/porep-market) smart contracts.

Demonstrates the full deal lifecycle: SP registration → deal proposal → auto-accept and manual-accept flows.

## What it shows

| Feature | Description |
|---------|-------------|
| SP Registry | Two registered storage providers with different capabilities |
| SP-1001 (AlphaStore) | Sets a price floor — deals that meet it are **auto-accepted** |
| SP-1002 (BetaVault) | No price floor — all deals require **manual acceptance** |
| Deal proposal | SLI requirements + deal terms → automatic SP matchmaking |
| Deal board | Live deal status with full detail view |
| Demo mode | Full flow works without a connected blockchain |

## One-wallet answer

Yes — **one EVM address can be both SP owner and client**. Each SP needs a unique `FilActorId` (uint64), but the controlling EVM address can be shared. For this demo, both SPs and the client use the same wallet.

## Running locally

```bash
cp .env.example .env
# Edit .env with your contract addresses (or leave empty for demo mode)
npm install
npm run dev
```

Open http://localhost:5173

## Docker

```bash
# Build and run on port 3080
docker-compose up --build -d
```

Open http://localhost:3080

## Environment variables

| Variable | Description |
|----------|-------------|
| `VITE_RPC_URL` | RPC endpoint (default: Calibration testnet) |
| `VITE_CHAIN_ID` | Chain ID (default: 314159 = Calibration) |
| `VITE_POREP_MARKET` | PoRepMarket contract address |
| `VITE_SP_REGISTRY` | SPRegistry contract address |
| `VITE_VALIDATOR_FACTORY` | ValidatorFactory contract address |

## Demo vs Live mode

**Demo mode** (default): All state is local. No wallet or contract needed. Perfect for client presentations.

**Live mode**: Connects to deployed contracts via the configured RPC. Requires MetaMask or a private key.

## Contract base

Built on top of these PRs from the porep-market repo:
- `main` (latest)
- PR #14: SP Registry MVP (`feature/sp-registry`)
- PR #12: Deployment script (`FIL-1342-deployment-script`)

Auto-accept logic mirrors the contract: `autoApprove = priceForDeal >= sp.defaultPricePerDeal && defaultPricePerDeal > 0`.
