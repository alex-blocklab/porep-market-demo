export interface SLIThresholds {
  retrievabilityPct: number // 0-100
  bandwidthMbps: number
  latencyMs: number
  indexingPct: number // 0-100
}

export interface DealTerms {
  dealSizeBytes: bigint
  priceForDeal: bigint // in attoFIL
  durationEpochs: number
}

export interface StorageProvider {
  actorId: number
  owner: string
  label: string
  availableBytes: bigint
  committedBytes: bigint
  capabilities: SLIThresholds
  defaultPricePerDeal: bigint // 0 = no auto-accept
  autoAccept: boolean // UI flag for demo
  status: 'active' | 'paused'
}

export type DealState = 'Proposed' | 'Accepted' | 'Completed' | 'Rejected'

export interface Deal {
  dealId: number
  client: string
  providerActorId: number
  requirements: SLIThresholds
  terms: DealTerms
  state: DealState
  railId: number
  validator: string
  createdAt: number // timestamp ms
  updatedAt: number
  autoAccepted: boolean
}

export type Page = 'dashboard' | 'registry' | 'propose' | 'deal'

export interface AppState {
  mode: 'demo' | 'live'
  providers: StorageProvider[]
  deals: Deal[]
  selectedDealId: number | null
  walletAddress: string | null
  rpcUrl: string
  contractAddresses: {
    poRepMarket: string
    spRegistry: string
    validatorFactory: string
  }
}
