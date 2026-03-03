import type { Deal, DealState, StorageProvider } from '../types'
import { formatBytes, formatFIL, formatTime, epochsToDays, shortAddr, stateColor, stateDot } from '../utils'

interface Props {
  deal: Deal
  provider: StorageProvider
  onUpdateState: (dealId: number, state: DealState) => void
  onBack: () => void
}

const STATE_FLOW: DealState[] = ['Proposed', 'Accepted', 'Completed']

export function DealDetail({ deal, provider, onUpdateState, onBack }: Props) {
  if (!deal) return null

  const currentIdx = STATE_FLOW.indexOf(deal.state as DealState)

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-white text-sm cursor-pointer bg-transparent border-0 transition-colors"
        >
          ← Back
        </button>
        <span className="text-slate-600">/</span>
        <span className="text-slate-400 text-sm">Deal #{deal.dealId}</span>
      </div>

      {/* Header card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className={`flex items-center gap-1.5 text-lg font-semibold ${stateColor(deal.state)}`}>
                <span className={`w-3 h-3 rounded-full ${stateDot(deal.state)}`} />
                {deal.state}
              </span>
              {deal.autoAccepted && (
                <span className="text-xs bg-green-900/40 text-green-400 border border-green-900 px-2 py-0.5 rounded-full">
                  ⚡ Auto-Accepted
                </span>
              )}
            </div>
            <div className="text-slate-500 text-sm">Created {formatTime(deal.createdAt)} · Updated {formatTime(deal.updatedAt)}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl font-bold text-white">#{deal.dealId}</div>
          </div>
        </div>

        {/* Progress timeline */}
        <div className="mt-5">
          <div className="flex items-center">
            {STATE_FLOW.map((s, i) => {
              const past = i < currentIdx || deal.state === 'Completed'
              const current = i === currentIdx && deal.state !== 'Completed'
              return (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                      past || current
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}>
                      {past && i < currentIdx ? '✓' : i + 1}
                    </div>
                    <span className={`text-xs mt-1 ${past || current ? stateColor(s) : 'text-slate-600'}`}>{s}</span>
                  </div>
                  {i < STATE_FLOW.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${i < currentIdx ? 'bg-blue-500' : 'bg-slate-700'}`} />
                  )}
                </div>
              )
            })}
            {deal.state === 'Rejected' && (
              <div className="ml-3 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-900 border-2 border-red-700 text-red-400 text-xs font-bold">✕</div>
                <span className="text-xs mt-1 text-red-400">Rejected</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {deal.state === 'Proposed' && (
        <div className="bg-yellow-950/30 border border-yellow-900/50 rounded-xl p-4">
          <h3 className="text-yellow-400 font-medium text-sm mb-1">⏳ Awaiting Provider Decision</h3>
          <p className="text-slate-400 text-xs mb-3">
            {provider?.label} must accept or reject this deal.
            {!provider?.autoAccept && ' This provider requires manual acceptance.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => onUpdateState(deal.dealId, 'Accepted')}
              className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm rounded-lg font-medium cursor-pointer border-0 transition-colors"
            >
              Accept Deal (as SP)
            </button>
            <button
              onClick={() => onUpdateState(deal.dealId, 'Rejected')}
              className="px-4 py-2 bg-slate-700 hover:bg-red-800 text-slate-300 hover:text-white text-sm rounded-lg font-medium cursor-pointer border-0 transition-colors"
            >
              Reject Deal
            </button>
          </div>
        </div>
      )}

      {deal.state === 'Accepted' && (
        <div className="bg-green-950/20 border border-green-900/50 rounded-xl p-4">
          <h3 className="text-green-400 font-medium text-sm mb-1">✓ Deal Accepted — Data Transfer in Progress</h3>
          <p className="text-slate-400 text-xs mb-3">
            Client transfers data to the provider. Once sealing is complete, the deal can be marked complete.
          </p>
          <button
            onClick={() => onUpdateState(deal.dealId, 'Completed')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium cursor-pointer border-0 transition-colors"
          >
            Mark Completed
          </button>
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-white text-sm">Deal Info</h2>
          {[
            { label: 'Client', value: shortAddr(deal.client) },
            { label: 'Provider', value: provider?.label || `t0${deal.providerActorId}` },
            { label: 'Actor ID', value: `t0${deal.providerActorId}` },
            { label: 'Rail ID', value: deal.railId || '—' },
            { label: 'Validator', value: shortAddr(deal.validator) },
          ].map(row => (
            <div key={row.label} className="flex justify-between text-sm">
              <span className="text-slate-500">{row.label}</span>
              <span className="text-slate-300 font-mono text-right">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-white text-sm">Terms</h2>
          {[
            { label: 'Size', value: formatBytes(deal.terms.dealSizeBytes) },
            { label: 'Price', value: formatFIL(deal.terms.priceForDeal) },
            { label: 'Duration', value: epochsToDays(deal.terms.durationEpochs) },
            { label: 'Epochs', value: deal.terms.durationEpochs.toLocaleString() },
          ].map(row => (
            <div key={row.label} className="flex justify-between text-sm">
              <span className="text-slate-500">{row.label}</span>
              <span className="text-slate-300">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 md:col-span-2">
          <h2 className="font-semibold text-white text-sm">SLI Requirements</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Retrievability', value: `${deal.requirements.retrievabilityPct}%`, met: provider && provider.capabilities.retrievabilityPct >= deal.requirements.retrievabilityPct },
              { label: 'Indexing', value: `${deal.requirements.indexingPct}%`, met: provider && provider.capabilities.indexingPct >= deal.requirements.indexingPct },
              { label: 'Bandwidth', value: `${deal.requirements.bandwidthMbps} Mbps`, met: provider && provider.capabilities.bandwidthMbps >= deal.requirements.bandwidthMbps },
              { label: 'Latency', value: `≤ ${deal.requirements.latencyMs} ms`, met: provider && provider.capabilities.latencyMs <= deal.requirements.latencyMs },
            ].map(req => (
              <div key={req.label} className="bg-slate-800 rounded-lg p-3">
                <div className="text-xs text-slate-500 mb-1">{req.label}</div>
                <div className="text-white font-medium">{req.value}</div>
                {provider && (
                  <div className={`text-xs mt-1 ${req.met ? 'text-green-400' : 'text-red-400'}`}>
                    {req.met ? '✓ Met' : '✗ Not met'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
