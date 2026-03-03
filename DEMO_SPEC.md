# PoRep Market Demo — Build Spec

## What to Build
A demo frontend showing PoRep Market (Filecoin EVM) to a client. Simple, clean, focused.

## Demo Flow (What Client Sees)
1. **Storage Providers panel** — 2 SPs already registered, showing their capabilities and capacity
2. **Propose Deal** — client proposes a deal; the system auto-selects the best SP
3. **Deals panel** — shows both deals:
   - Deal 1: auto-accepted (frontend immediately calls acceptDeal after proposeDeal)
   - Deal 2: pending, with Accept / Reject buttons visible
4. **Single wallet** operates everything — SP owner + client

## Architecture

### Network: Local Anvil (Docker)
- Anvil starts in Docker, pre-funded accounts
- Deploy script runs on startup, writes contract addresses to `deployed.json`
- Frontend reads `deployed.json` for contract addresses

### Stack
- **Frontend**: Next.js 14 + ethers.js v6 + Tailwind CSS
- **Deployment**: Hardhat or raw ethers ContractFactory (no Foundry needed in frontend)
- **Docker Compose**: `anvil` service + `app` service (Next.js)

## Contract ABIs (in `contracts/abis/`)
Key contracts:
- `SPRegistry.json` — Storage Provider Registry
- `PoRepMarket.json` — Core market contract

## Key Contract Functions

### SPRegistry
```
registerProviderFor(
  provider: uint64,      // miner actor ID (use 1001, 1002 for demo)
  owner: address,        // wallet address
  capabilities: {        // SLIThresholds
    retrievabilityPct: uint8,
    bandwidthMbps: uint16,
    latencyMs: uint16,
    indexingPct: uint8
  },
  availableBytes: uint256,
  defaultPricePerDeal: uint256
)
getProviders() returns uint64[]
getProviderInfo(provider: uint64) returns ProviderData
```

### PoRepMarket
```
proposeDeal(
  requirements: { retrievabilityPct, bandwidthMbps, latencyMs, indexingPct },
  terms: { dealSizeBytes, priceForDeal, durationDays }
)
acceptDeal(dealId: uint256)
rejectDeal(dealId: uint256)
getDealProposal(dealId: uint256) returns DealProposal
// DealState: 0=Proposed, 1=Accepted, 2=Completed, 3=Rejected
```

## Setup & Deployment

### What needs to deploy on Anvil startup:
1. Deploy SPRegistry (upgradeable proxy)
2. Deploy ValidatorFactory (upgradeable proxy)
3. Deploy PoRepMarket (upgradeable proxy, needs SPRegistry + ValidatorFactory)
4. Grant MARKET_ROLE on SPRegistry to PoRepMarket
5. Register 2 demo SPs using `registerProviderFor` — use actorIds 1001 and 1002

**Important**: These are UUPS upgradeable proxies (OpenZeppelin). Deploy pattern:
- Deploy implementation
- Deploy ERC1967Proxy with initialize() calldata
- ABI for interactions uses the interface, not the proxy

Since we can't run Foundry in this project, use hardhat or ethers.js scripts.

### Demo Wallet
Use Anvil's default first account: 
- Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
- Private key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

## Frontend Pages

### Page 1: Dashboard (/)
Show 3 panels side by side:
- **Network** card: Chain (Anvil), Block number, Wallet address
- **Storage Providers** card: List of registered SPs with capacity bars
- **Deals** card: List of all deals with colored state badges

### Page 2: Storage Providers (/providers)
Table showing:
- Actor ID | Owner (short address) | Capacity | Capabilities | Default Price
Show "SP-1001" and "SP-1002" as display names

### Page 3: Deals (/deals)
Table + action panel:
- List all deals: ID | Client | Provider | Size | State (colored badge)
- State colors: Proposed=yellow, Accepted=green, Rejected=red
- For Proposed deals: Show Accept + Reject buttons

### Page 4: Propose Deal (/propose)
Simple form:
- Deal Size (bytes, default: 34359738368 = 32GB)
- Price (wei, default: 1000000000000000 = 0.001 ETH)  
- Duration (days, default: 180)
- SLI Requirements: retrievability%, bandwidth, latency, indexing% (with sensible defaults)
- Submit button
- After submit: auto-call acceptDeal for the first deal (simulate auto-accept SP behavior)

## UX Notes
- Clean, minimal — this is a technical demo, not a polished product
- No authentication — wallet is hardcoded/injected
- Real-time updates via polling (every 3s) or on tx confirmation
- Error messages should be human-readable
- Loading states on all tx buttons

## File Structure
```
porep-market-demo/
  contracts/
    abis/                 # Already here
    deploy/
      deploy.js           # Hardhat or ethers.js deployment script
  frontend/
    pages/ or app/        # Next.js pages
    components/
    lib/
      contracts.js        # Contract instances
      anvil.js            # Anvil connection
  scripts/
    init-demo.sh          # Runs deploy + seeds demo data
  docker-compose.yml
  hardhat.config.js (if using hardhat)
  package.json
```

## Docker Compose
```yaml
services:
  anvil:
    image: ghcr.io/foundry-rs/foundry:latest
    command: anvil --host 0.0.0.0 --chain-id 31337
    ports: ["8545:8545"]
  
  app:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      - NEXT_PUBLIC_RPC_URL=http://anvil:8545
      - NEXT_PUBLIC_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
    depends_on: [anvil]
```

## Important Notes
- Do NOT implement validator flow, payment settlement, or SLI/Oracle interactions
- Do NOT show anything about allocation IDs or datacap
- The goal is: show SP registration + deal proposal + deal acceptance/rejection in a simple UI
- Use ethers.js v6 (not v5) for all contract interactions
- Handle the UUPS proxy deployment carefully — use OpenZeppelin's ERC1967Proxy

## Completion
When done, run:
openclaw system event --text "Done: porep-market-demo frontend built with Docker Compose, SP registration + deal flow working" --mode now
