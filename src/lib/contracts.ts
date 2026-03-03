import {
  createPublicClient,
  createWalletClient,
  http,
  parseEventLogs,
  defineChain,
  type Abi,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { StorageProvider, Deal, DealState, SLIThresholds, DealTerms } from '../types'
import PoRepMarketABIRaw from '../../contracts/abis/PoRepMarket.json'
import SPRegistryABIRaw from '../../contracts/abis/SPRegistry.json'

const PoRepMarketABI = PoRepMarketABIRaw as Abi
const SPRegistryABI = SPRegistryABIRaw as Abi

const DEAL_STATES: DealState[] = ['Proposed', 'Accepted', 'Completed', 'Rejected']

const calibration = defineChain({
  id: 314159,
  name: 'Filecoin Calibration',
  nativeCurrency: { name: 'Filecoin', symbol: 'tFIL', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://api.calibration.node.glif.io/rpc/v1'] },
  },
  blockExplorers: {
    default: { name: 'Filfox', url: 'https://calibration.filfox.info' },
  },
})

function rpcUrl(): string {
  return import.meta.env.VITE_RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1'
}

export function getPublicClient() {
  return createPublicClient({
    chain: calibration,
    transport: http(rpcUrl()),
  })
}

export function getWalletClient() {
  const key = import.meta.env.VITE_PRIVATE_KEY as string | undefined
  if (!key || key === '0xYOUR_PRIVATE_KEY_HERE') {
    throw new Error('VITE_PRIVATE_KEY not configured — set it in .env')
  }
  const account = privateKeyToAccount(key as `0x${string}`)
  const client = createWalletClient({
    account,
    chain: calibration,
    transport: http(rpcUrl()),
  })
  return { client, account }
}

export function getContractAddresses() {
  return {
    poRepMarket: (import.meta.env.VITE_POREP_MARKET || '') as `0x${string}`,
    spRegistry: (import.meta.env.VITE_SP_REGISTRY || '') as `0x${string}`,
  }
}

export function getWalletAddress(): string {
  try {
    const { account } = getWalletClient()
    return account.address
  } catch {
    return ''
  }
}

// ─── Providers ───────────────────────────────────────────────────────────────

export async function fetchProviders(): Promise<StorageProvider[]> {
  const client = getPublicClient()
  const { spRegistry } = getContractAddresses()

  const actorIds = (await client.readContract({
    address: spRegistry,
    abi: SPRegistryABI,
    functionName: 'getProviders',
  })) as bigint[]

  const providers = await Promise.all(
    actorIds.map(async (actorId) => {
      const info = (await client.readContract({
        address: spRegistry,
        abi: SPRegistryABI,
        functionName: 'getProviderInfo',
        args: [actorId],
      })) as {
        owner: `0x${string}`
        paused: boolean
        capabilities: { retrievabilityPct: number; bandwidthMbps: number; latencyMs: number; indexingPct: number }
        availableBytes: bigint
        committedBytes: bigint
        defaultPricePerDeal: bigint
      }

      return {
        actorId: Number(actorId),
        owner: info.owner,
        label: `SP-${actorId}`,
        availableBytes: info.availableBytes,
        committedBytes: info.committedBytes,
        capabilities: {
          retrievabilityPct: info.capabilities.retrievabilityPct,
          bandwidthMbps: info.capabilities.bandwidthMbps,
          latencyMs: info.capabilities.latencyMs,
          indexingPct: info.capabilities.indexingPct,
        },
        defaultPricePerDeal: info.defaultPricePerDeal,
        autoAccept: info.defaultPricePerDeal > 0n,
        status: info.paused ? ('paused' as const) : ('active' as const),
      } satisfies StorageProvider
    }),
  )

  return providers
}

// ─── Deals ────────────────────────────────────────────────────────────────────

export interface CachedDealTerms {
  terms: DealTerms
  createdAt: number
  autoAccepted: boolean
}

export async function fetchDeals(
  deployBlock: bigint,
  termsCache: Map<number, CachedDealTerms>,
): Promise<Deal[]> {
  const client = getPublicClient()
  const { poRepMarket } = getContractAddresses()

  // Get all deal IDs from DealProposalCreated events
  const logs = await client.getLogs({
    address: poRepMarket,
    event: {
      type: 'event',
      name: 'DealProposalCreated',
      inputs: [
        { type: 'uint256', name: 'dealId', indexed: true },
        { type: 'address', name: 'client', indexed: true },
        { type: 'uint64', name: 'provider', indexed: true },
        {
          type: 'tuple',
          name: 'requirements',
          indexed: false,
          components: [
            { type: 'uint8', name: 'retrievabilityPct' },
            { type: 'uint16', name: 'bandwidthMbps' },
            { type: 'uint16', name: 'latencyMs' },
            { type: 'uint8', name: 'indexingPct' },
          ],
        },
      ],
    },
    fromBlock: deployBlock,
  })

  if (logs.length === 0) return []

  // Fetch current state for each deal
  const deals = await Promise.all(
    logs.map(async (log) => {
      const args = log.args as {
        dealId: bigint
        client: `0x${string}`
        provider: bigint
        requirements: SLIThresholds
      }
      const dealId = Number(args.dealId)

      const proposal = (await client.readContract({
        address: poRepMarket,
        abi: PoRepMarketABI,
        functionName: 'getDealProposal',
        args: [args.dealId],
      })) as {
        dealId: bigint
        client: `0x${string}`
        provider: bigint
        requirements: SLIThresholds
        validator: `0x${string}`
        state: number
        railId: bigint
      }

      const cached = termsCache.get(dealId)

      return {
        dealId,
        client: proposal.client,
        providerActorId: Number(proposal.provider),
        requirements: {
          retrievabilityPct: proposal.requirements.retrievabilityPct,
          bandwidthMbps: proposal.requirements.bandwidthMbps,
          latencyMs: proposal.requirements.latencyMs,
          indexingPct: proposal.requirements.indexingPct,
        },
        terms: cached?.terms ?? {
          dealSizeBytes: 0n,
          priceForDeal: 0n,
          durationEpochs: 0,
        },
        state: DEAL_STATES[proposal.state] ?? 'Proposed',
        railId: Number(proposal.railId),
        validator: proposal.validator,
        createdAt: cached?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        autoAccepted: cached?.autoAccepted ?? false,
      } satisfies Deal
    }),
  )

  return deals
}

// ─── Write ops ────────────────────────────────────────────────────────────────

/** Call proposeDeal — returns on-chain dealId from event log */
export async function sendProposeDeal(
  requirements: SLIThresholds,
  terms: DealTerms,
): Promise<number> {
  const { client, account } = getWalletClient()
  const pub = getPublicClient()
  const { poRepMarket } = getContractAddresses()

  const hash = await client.writeContract({
    address: poRepMarket,
    abi: PoRepMarketABI,
    functionName: 'proposeDeal',
    account,
    args: [
      requirements,
      {
        dealSizeBytes: terms.dealSizeBytes,
        priceForDeal: terms.priceForDeal,
        durationDays: Math.floor(terms.durationEpochs / 2880),
      },
    ],
  })

  const receipt = await pub.waitForTransactionReceipt({ hash })

  const parsedLogs = parseEventLogs({
    abi: PoRepMarketABI,
    logs: receipt.logs,
    eventName: 'DealProposalCreated',
  })

  if (parsedLogs.length === 0) throw new Error('DealProposalCreated event not found in receipt')

  return Number((parsedLogs[0].args as { dealId: bigint }).dealId)
}

/** Accept a deal on-chain */
export async function sendAcceptDeal(dealId: number): Promise<void> {
  const { client, account } = getWalletClient()
  const pub = getPublicClient()
  const { poRepMarket } = getContractAddresses()

  const hash = await client.writeContract({
    address: poRepMarket,
    abi: PoRepMarketABI,
    functionName: 'acceptDeal',
    account,
    args: [BigInt(dealId)],
  })

  await pub.waitForTransactionReceipt({ hash })
}

/** Reject a deal on-chain */
export async function sendRejectDeal(dealId: number): Promise<void> {
  const { client, account } = getWalletClient()
  const pub = getPublicClient()
  const { poRepMarket } = getContractAddresses()

  const hash = await client.writeContract({
    address: poRepMarket,
    abi: PoRepMarketABI,
    functionName: 'rejectDeal',
    account,
    args: [BigInt(dealId)],
  })

  await pub.waitForTransactionReceipt({ hash })
}
