import type { StorageProvider, Deal, AppState } from './types'

export const DEMO_PROVIDERS: StorageProvider[] = [
  {
    actorId: 1001,
    owner: '0x149661aB3B2d343114e4F518fF3cC3b47266d8C4',
    label: 'AlphaStore (SP-1001)',
    availableBytes: BigInt(10 * 1024 * 1024 * 1024 * 1024), // 10 TiB
    committedBytes: BigInt(2 * 1024 * 1024 * 1024 * 1024),  // 2 TiB
    capabilities: {
      retrievabilityPct: 98,
      bandwidthMbps: 500,
      latencyMs: 50,
      indexingPct: 95,
    },
    defaultPricePerDeal: BigInt('1000000000000000000'), // 1 FIL
    autoAccept: true,
    status: 'active',
  },
  {
    actorId: 1002,
    owner: '0x2b3f5cA30d3d78E3e5B2A6F651cb6a124997F84c',
    label: 'BetaVault (SP-1002)',
    availableBytes: BigInt(5 * 1024 * 1024 * 1024 * 1024), // 5 TiB
    committedBytes: BigInt(500 * 1024 * 1024 * 1024),       // 500 GiB
    capabilities: {
      retrievabilityPct: 95,
      bandwidthMbps: 200,
      latencyMs: 100,
      indexingPct: 90,
    },
    defaultPricePerDeal: BigInt(0), // no auto-accept
    autoAccept: false,
    status: 'active',
  },
]

const now = Date.now()

export const DEMO_DEALS: Deal[] = [
  {
    dealId: 1,
    client: '0x149661aB3B2d343114e4F518fF3cC3b47266d8C4',
    providerActorId: 1001,
    requirements: {
      retrievabilityPct: 95,
      bandwidthMbps: 100,
      latencyMs: 100,
      indexingPct: 90,
    },
    terms: {
      dealSizeBytes: BigInt(100 * 1024 * 1024 * 1024), // 100 GiB
      priceForDeal: BigInt('1000000000000000000'),       // 1 FIL (meets SP price)
      durationEpochs: 518400,                            // ~180 days
    },
    state: 'Accepted',
    railId: 42,
    validator: '0x0000000000000000000000000000000000000000',
    createdAt: now - 3 * 60 * 1000,
    updatedAt: now - 2 * 60 * 1000,
    autoAccepted: true,
  },
  {
    dealId: 2,
    client: '0x149661aB3B2d343114e4F518fF3cC3b47266d8C4',
    providerActorId: 1002,
    requirements: {
      retrievabilityPct: 90,
      bandwidthMbps: 100,
      latencyMs: 200,
      indexingPct: 85,
    },
    terms: {
      dealSizeBytes: BigInt(50 * 1024 * 1024 * 1024), // 50 GiB
      priceForDeal: BigInt('500000000000000000'),       // 0.5 FIL (below SP price = no auto)
      durationEpochs: 259200,                           // ~90 days
    },
    state: 'Proposed',
    railId: 0,
    validator: '0x0000000000000000000000000000000000000000',
    createdAt: now - 60 * 1000,
    updatedAt: now - 60 * 1000,
    autoAccepted: false,
  },
]

export const INITIAL_STATE: AppState = {
  mode: 'demo',
  providers: DEMO_PROVIDERS,
  deals: DEMO_DEALS,
  selectedDealId: null,
  walletAddress: '0x149661aB3B2d343114e4F518fF3cC3b47266d8C4',
  rpcUrl: import.meta.env.VITE_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1',
  contractAddresses: {
    poRepMarket: import.meta.env.VITE_POREP_MARKET || '0x7a80b6fa9c9663eF5C3d8A9C4F863a15f15517D4',
    spRegistry: import.meta.env.VITE_SP_REGISTRY || '0x7C3D1A9f2e8b4c6a0d5E3f1B9C7A2d4E6f8b0c30',
    validatorFactory: import.meta.env.VITE_VALIDATOR_FACTORY || '0x5f685B75dd055b684AbA33de370824806d2846Af',
  },
}
