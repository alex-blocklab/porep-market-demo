import type { AppState, Page } from '../types'
import { formatBytes, formatFIL, formatTime, stateColor, stateDot } from '../utils'

interface Props {
  state: AppState
  onViewDeal: (id: number) => void
  onNavigate: (page: Page) => void
}

export function Dashboard({ state, onViewDeal, onNavigate }: Props) {
  const { deals, providers } = state

  const counts = {
    total: deals.length,
    proposed: deals.filter(d => d.state === 'Proposed').length,
    accepted: deals.filter(d => d.state === 'Accepted').length,
    completed: deals.filter(d => d.state === 'Completed').length,
  }

  const totalCommitted = providers.reduce((sum, p) => sum + p.committedBytes, 0n)
  const totalAvailable = providers.reduce((sum, p) => sum + p.availableBytes, 0n)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Decentralized storage deal marketplace on Filecoin</p>
        </div>
        <button
          onClick={() => onNavigate('propose')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-colors cursor-pointer border-0"
        >
          + Propose Deal
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {([
          { label: 'Total Deals', value: counts.total, color: 'text-white' },
          { label: 'Proposed', value: counts.proposed, color: 'text-yellow-400' },
          { label: 'Accepted', value: counts.accepted, color: 'text-green-400' },
          { label: 'Completed', value: counts.completed, color: 'text-blue-400' },
        ] as const).map(stat => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-slate-500 text-sm mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">Storage Network</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Active Providers</span>
              <span className="text-white font-medium">{providers.filter(p => p.status === 'active').length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Capacity</span>
              <span className="text-white font-medium">{formatBytes(totalAvailable)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Committed</span>
              <span className="text-white font-medium">{formatBytes(totalCommitted)}</span>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Utilization</span>
                <span>{totalAvailable > 0n ? ((Number(totalCommitted) / Number(totalAvailable)) * 100).toFixed(1) : 0}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: totalAvailable > 0n ? `${(Number(totalCommitted) / Number(totalAvailable)) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-4">Storage Providers</h2>
          <div className="space-y-3">
            {providers.map(sp => (
              <div key={sp.actorId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${sp.status === 'active' ? 'bg-green-400' : 'bg-slate-600'}`} />
                  <span className="text-sm text-slate-300">{sp.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{formatBytes(sp.availableBytes - sp.committedBytes)} free</span>
                  {sp.autoAccept && (
                    <span className="text-xs bg-green-900/40 text-green-400 border border-green-900 px-1.5 py-0.5 rounded">auto</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-white">All Deals</h2>
          <span className="text-slate-500 text-sm">{deals.length} total</span>
        </div>
        {deals.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No deals yet.
            <button onClick={() => onNavigate('propose')} className="ml-2 text-blue-400 hover:text-blue-300 cursor-pointer bg-transparent border-0">
              Propose one →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800">
                  <th className="px-5 py-3 text-left">Deal</th>
                  <th className="px-5 py-3 text-left">State</th>
                  <th className="px-5 py-3 text-left">Provider</th>
                  <th className="px-5 py-3 text-left">Size</th>
                  <th className="px-5 py-3 text-left">Price</th>
                  <th className="px-5 py-3 text-left">Accept</th>
                  <th className="px-5 py-3 text-left">Updated</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {[...deals].sort((a, b) => b.dealId - a.dealId).map(deal => {
                  const sp = providers.find(p => p.actorId === deal.providerActorId)
                  return (
                    <tr key={deal.dealId} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3 font-mono text-slate-400">#{deal.dealId}</td>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${stateDot(deal.state)}`} />
                          <span className={stateColor(deal.state)}>{deal.state}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-300">{sp?.label || `SP-${deal.providerActorId}`}</td>
                      <td className="px-5 py-3 text-slate-300">{formatBytes(deal.terms.dealSizeBytes)}</td>
                      <td className="px-5 py-3 text-slate-300">{formatFIL(deal.terms.priceForDeal)}</td>
                      <td className="px-5 py-3">
                        {deal.autoAccepted
                          ? <span className="text-xs bg-green-900/40 text-green-400 border border-green-900 px-1.5 py-0.5 rounded">Auto</span>
                          : <span className="text-xs bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded">Manual</span>
                        }
                      </td>
                      <td className="px-5 py-3 text-slate-500">{formatTime(deal.updatedAt)}</td>
                      <td className="px-5 py-3">
                        <button onClick={() => onViewDeal(deal.dealId)} className="text-blue-400 hover:text-blue-300 text-xs cursor-pointer bg-transparent border-0">View →</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
