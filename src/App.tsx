import { useState, useEffect, useRef, useCallback } from 'react'
import { INITIAL_STATE } from './demo-data'
import type { AppState, Deal, DealState, Page } from './types'
import { Dashboard } from './pages/Dashboard'
import { SPRegistry } from './pages/SPRegistry'
import { ProposeDeal } from './pages/ProposeDeal'
import { DealDetail } from './pages/DealDetail'
import {
  fetchProviders,
  fetchDeals,
  sendAcceptDeal,
  sendRejectDeal,
  getWalletAddress,
  type CachedDealTerms,
} from './lib/contracts'

const DEPLOY_BLOCK = BigInt(import.meta.env.VITE_DEPLOY_BLOCK || 0)
const POLL_INTERVAL_MS = 6000

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE)
  const [page, setPage] = useState<Page>('dashboard')
  const [liveError, setLiveError] = useState('')
  const [liveLoading, setLiveLoading] = useState(false)
  const dealTermsCache = useRef<Map<number, CachedDealTerms>>(new Map())
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Live data polling ─────────────────────────────────────────────────────

  const refreshLive = useCallback(async () => {
    try {
      const [providers, deals] = await Promise.all([
        fetchProviders(),
        fetchDeals(DEPLOY_BLOCK, dealTermsCache.current),
      ])
      setLiveError('')
      setState(prev => ({
        ...prev,
        providers,
        deals,
        walletAddress: prev.walletAddress || getWalletAddress(),
      }))
    } catch (err) {
      setLiveError(String(err))
    }
  }, [])

  useEffect(() => {
    if (state.mode !== 'live') {
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = null
      return
    }

    setLiveLoading(true)
    refreshLive().finally(() => setLiveLoading(false))

    pollRef.current = setInterval(refreshLive, POLL_INTERVAL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [state.mode, refreshLive])

  // ── Mode switch ───────────────────────────────────────────────────────────

  const switchMode = () => {
    setState(prev => {
      const next = prev.mode === 'demo' ? 'live' : 'demo'
      if (next === 'demo') {
        // Reset to demo data
        return { ...INITIAL_STATE, mode: 'demo' }
      }
      // Keep structure, clear data — live fetch will populate
      return {
        ...prev,
        mode: 'live',
        providers: [],
        deals: [],
        walletAddress: getWalletAddress() || prev.walletAddress,
      }
    })
  }

  // ── Deal mutations (demo mode) ────────────────────────────────────────────

  const updateDealState = (dealId: number, newState: DealState) => {
    setState(prev => ({
      ...prev,
      deals: prev.deals.map(d =>
        d.dealId === dealId ? { ...d, state: newState, updatedAt: Date.now() } : d,
      ),
    }))
  }

  const addDeal = (deal: Deal) => {
    setState(prev => ({ ...prev, deals: [...prev.deals, deal] }))
  }

  // ── Live deal mutations ───────────────────────────────────────────────────

  const cacheDealTerms = (dealId: number, entry: CachedDealTerms) => {
    dealTermsCache.current.set(dealId, entry)
  }

  const liveAcceptDeal = async (dealId: number) => {
    await sendAcceptDeal(dealId)
    await refreshLive()
  }

  const liveRejectDeal = async (dealId: number) => {
    await sendRejectDeal(dealId)
    await refreshLive()
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  const viewDeal = (dealId: number) => {
    setState(prev => ({ ...prev, selectedDealId: dealId }))
    setPage('deal')
  }

  const navItems: { id: Page; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '◈' },
    { id: 'registry', label: 'SP Registry', icon: '⬡' },
    { id: 'propose', label: 'Propose Deal', icon: '+' },
  ]

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-blue-400 text-xl font-bold">⬡</span>
          <span className="font-semibold text-white text-lg">PoRep Market</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-mono ${
              state.mode === 'demo'
                ? 'bg-amber-900/50 text-amber-400 border border-amber-800'
                : 'bg-green-900/50 text-green-400 border border-green-800'
            }`}
          >
            {state.mode === 'demo' ? 'DEMO MODE' : liveLoading ? 'LIVE ⟳' : 'LIVE'}
          </span>
        </div>

        <nav className="flex gap-1 ml-4">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer border-0 ${
                page === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 bg-transparent'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
          {state.walletAddress && (
            <span className="font-mono bg-slate-800 px-2 py-1 rounded">
              {state.walletAddress.slice(0, 8)}…{state.walletAddress.slice(-4)}
            </span>
          )}
          <button
            onClick={switchMode}
            className="px-3 py-1 rounded border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer bg-transparent"
          >
            Switch to {state.mode === 'demo' ? 'Live' : 'Demo'}
          </button>
        </div>
      </header>

      {/* Live error banner */}
      {liveError && (
        <div className="bg-red-950/40 border-b border-red-900 px-6 py-2 text-xs text-red-400 font-mono">
          Live mode error: {liveError}
        </div>
      )}

      {/* Main */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {page === 'dashboard' && (
          <Dashboard state={state} onViewDeal={viewDeal} onNavigate={setPage} />
        )}
        {page === 'registry' && (
          <SPRegistry
            providers={state.providers}
            deals={state.deals}
            mode={state.mode}
            onUpdateDealState={updateDealState}
            onLiveAccept={liveAcceptDeal}
            onLiveReject={liveRejectDeal}
          />
        )}
        {page === 'propose' && (
          <ProposeDeal
            state={state}
            onDealCreated={(deal) => {
              addDeal(deal)
              viewDeal(deal.dealId)
            }}
            onLiveDealCreated={(deal, cached) => {
              cacheDealTerms(deal.dealId, cached)
              refreshLive()
              viewDeal(deal.dealId)
            }}
          />
        )}
        {page === 'deal' && state.selectedDealId != null && (
          <DealDetail
            deal={state.deals.find(d => d.dealId === state.selectedDealId)!}
            provider={
              state.providers.find(
                p =>
                  p.actorId ===
                  state.deals.find(d => d.dealId === state.selectedDealId)?.providerActorId,
              )!
            }
            mode={state.mode}
            onUpdateState={updateDealState}
            onLiveAccept={liveAcceptDeal}
            onLiveReject={liveRejectDeal}
            onBack={() => setPage('dashboard')}
          />
        )}
      </main>
    </div>
  )
}
