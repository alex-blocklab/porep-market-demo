import { useState } from 'react'
import { INITIAL_STATE } from './demo-data'
import type { AppState, Deal, DealState, Page } from './types'
import { Dashboard } from './pages/Dashboard'
import { SPRegistry } from './pages/SPRegistry'
import { ProposeDeal } from './pages/ProposeDeal'
import { DealDetail } from './pages/DealDetail'

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE)
  const [page, setPage] = useState<Page>('dashboard')

  const updateDealState = (dealId: number, newState: DealState) => {
    setState(prev => ({
      ...prev,
      deals: prev.deals.map(d =>
        d.dealId === dealId
          ? { ...d, state: newState, updatedAt: Date.now() }
          : d
      ),
    }))
  }

  const addDeal = (deal: Deal) => {
    setState(prev => ({
      ...prev,
      deals: [...prev.deals, deal],
    }))
  }

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
          <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
            state.mode === 'demo'
              ? 'bg-amber-900/50 text-amber-400 border border-amber-800'
              : 'bg-green-900/50 text-green-400 border border-green-800'
          }`}>
            {state.mode === 'demo' ? 'DEMO MODE' : 'LIVE'}
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
          <span className="font-mono bg-slate-800 px-2 py-1 rounded">
            {state.walletAddress?.slice(0, 8)}…{state.walletAddress?.slice(-4)}
          </span>
          <button
            onClick={() => setState(prev => ({ ...prev, mode: prev.mode === 'demo' ? 'live' : 'demo' }))}
            className="px-3 py-1 rounded border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer bg-transparent"
          >
            Switch to {state.mode === 'demo' ? 'Live' : 'Demo'}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {page === 'dashboard' && (
          <Dashboard
            state={state}
            onViewDeal={viewDeal}
            onNavigate={setPage}
          />
        )}
        {page === 'registry' && (
          <SPRegistry
            providers={state.providers}
            deals={state.deals}
            onUpdateDealState={updateDealState}
          />
        )}
        {page === 'propose' && (
          <ProposeDeal
            state={state}
            onDealCreated={(deal) => {
              addDeal(deal)
              viewDeal(deal.dealId)
            }}
          />
        )}
        {page === 'deal' && state.selectedDealId != null && (
          <DealDetail
            deal={state.deals.find(d => d.dealId === state.selectedDealId)!}
            provider={state.providers.find(p =>
              p.actorId === state.deals.find(d => d.dealId === state.selectedDealId)?.providerActorId
            )!}
            onUpdateState={updateDealState}
            onBack={() => setPage('dashboard')}
          />
        )}
      </main>
    </div>
  )
}
