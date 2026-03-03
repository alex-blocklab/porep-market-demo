import type { StorageProvider, Deal, DealState } from '../types'
import { formatBytes, formatFIL } from '../utils'

interface Props {
  providers: StorageProvider[]
  deals: Deal[]
  onUpdateDealState: (dealId: number, state: DealState) => void
}

function CapBar({ label, value, max = 100, unit = '' }: { label: string; value: number; max?: number; unit?: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="text-slate-300">{value}{unit}</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function SPRegistry({ providers, deals, onUpdateDealState }: Props) {
  const pendingDeals = deals.filter(d => d.state === 'Proposed')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">SP Registry</h1>
        <p className="text-slate-500 text-sm mt-1">Registered storage providers and their capabilities</p>
      </div>

      {pendingDeals.length > 0 && (
        <div className="bg-yellow-950/30 border border-yellow-900/50 rounded-xl p-4">
          <h3 className="text-yellow-400 font-medium text-sm mb-3">⏳ Deals Awaiting Acceptance ({pendingDeals.length})</h3>
          <div className="space-y-2">
            {pendingDeals.map(deal => {
              const sp = providers.find(p => p.actorId === deal.providerActorId)
              return (
                <div key={deal.dealId} className="flex items-center justify-between bg-slate-900/50 rounded-lg px-4 py-3">
                  <div className="text-sm">
                    <span className="text-slate-400 font-mono">Deal #{deal.dealId}</span>
                    <span className="mx-2 text-slate-600">→</span>
                    <span className="text-slate-300">{sp?.label}</span>
                    <span className="mx-2 text-slate-600">·</span>
                    <span className="text-slate-400">{formatBytes(deal.terms.dealSizeBytes)} at {formatFIL(deal.terms.priceForDeal)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onUpdateDealState(deal.dealId, 'Accepted')}
                      className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-xs rounded font-medium cursor-pointer border-0 transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => onUpdateDealState(deal.dealId, 'Rejected')}
                      className="px-3 py-1 bg-slate-700 hover:bg-red-700 text-slate-300 hover:text-white text-xs rounded font-medium cursor-pointer border-0 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {providers.map(sp => {
          const spDeals = deals.filter(d => d.providerActorId === sp.actorId)
          const used = sp.availableBytes > 0n
            ? ((Number(sp.committedBytes) / Number(sp.availableBytes)) * 100).toFixed(1)
            : '0'

          return (
            <div key={sp.actorId} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${sp.status === 'active' ? 'bg-green-400' : 'bg-slate-600'}`} />
                    <h3 className="font-semibold text-white">{sp.label}</h3>
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-1">
                    Actor ID: t0{sp.actorId}
                  </div>
                </div>
                <div className="text-right">
                  {sp.autoAccept ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-green-900/40 text-green-400 border border-green-900 px-2 py-1 rounded-full">
                      ⚡ Auto-Accept
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs bg-slate-800 text-slate-400 border border-slate-700 px-2 py-1 rounded-full">
                      Manual
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Capacity Used</span>
                  <span className="text-slate-300">{used}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${used}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{formatBytes(sp.committedBytes)} committed</span>
                  <span>{formatBytes(sp.availableBytes)} total</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <CapBar label="Retrievability" value={sp.capabilities.retrievabilityPct} unit="%" />
                <CapBar label="Indexing" value={sp.capabilities.indexingPct} unit="%" />
                <CapBar label="Bandwidth" value={sp.capabilities.bandwidthMbps} max={1000} unit=" Mbps" />
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Latency</span>
                    <span className="text-slate-300">{sp.capabilities.latencyMs} ms</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.max(0, 100 - (sp.capabilities.latencyMs / 5))}%` }} />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 flex justify-between text-xs">
                <div>
                  <span className="text-slate-500">Price floor</span>
                  <span className="ml-2 text-slate-300">
                    {sp.defaultPricePerDeal > 0n ? formatFIL(sp.defaultPricePerDeal) : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Deals</span>
                  <span className="ml-2 text-slate-300">{spDeals.length}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
