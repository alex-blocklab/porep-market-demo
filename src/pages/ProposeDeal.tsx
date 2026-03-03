import { useState } from 'react'
import type { AppState, Deal } from '../types'
import { formatFIL } from '../utils'
import { sendProposeDeal, sendAcceptDeal, type CachedDealTerms } from '../lib/contracts'

interface Props {
  state: AppState
  /** Demo mode: deal added to local state */
  onDealCreated: (deal: Deal) => void
  /** Live mode: deal created on-chain; cache entry provided for terms */
  onLiveDealCreated: (deal: Deal, cached: CachedDealTerms) => void
}

export function ProposeDeal({ state, onDealCreated, onLiveDealCreated }: Props) {
  const { providers, deals, mode } = state

  const [form, setForm] = useState({
    retrievabilityPct: 90,
    bandwidthMbps: 100,
    latencyMs: 100,
    indexingPct: 85,
    dealSizeGiB: 50,
    priceFIL: '0.5',
    durationDays: 90,
  })

  const [submitting, setSubmitting] = useState(false)
  const [txStatus, setTxStatus] = useState('')
  const [error, setError] = useState('')

  const priceWei = BigInt(Math.floor(parseFloat(form.priceFIL || '0') * 1e18))
  const dealSizeBytes = BigInt(form.dealSizeGiB) * BigInt(1024 ** 3)

  // Mirror contract matching logic
  const matchingProvider = providers
    .filter(sp => {
      if (sp.status !== 'active') return false
      const free = sp.availableBytes - sp.committedBytes
      if (free < dealSizeBytes) return false
      const c = sp.capabilities
      if (form.retrievabilityPct > 0 && c.retrievabilityPct < form.retrievabilityPct) return false
      if (form.bandwidthMbps > 0 && c.bandwidthMbps < form.bandwidthMbps) return false
      if (form.latencyMs > 0 && c.latencyMs > form.latencyMs) return false
      if (form.indexingPct > 0 && c.indexingPct < form.indexingPct) return false
      return true
    })
    .sort((a, b) => Number(a.committedBytes - b.committedBytes))[0]

  const autoApprove =
    matchingProvider &&
    matchingProvider.defaultPricePerDeal > 0n &&
    priceWei >= matchingProvider.defaultPricePerDeal

  // ── Demo submit ────────────────────────────────────────────────────────────

  const handleDemoSubmit = async () => {
    if (!matchingProvider) { setError('No provider matches your requirements'); return }
    setError('')
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 800))

    const newDeal: Deal = {
      dealId: Math.max(...deals.map(d => d.dealId), 0) + 1,
      client: state.walletAddress || '0x0000000000000000000000000000000000000000',
      providerActorId: matchingProvider.actorId,
      requirements: {
        retrievabilityPct: form.retrievabilityPct,
        bandwidthMbps: form.bandwidthMbps,
        latencyMs: form.latencyMs,
        indexingPct: form.indexingPct,
      },
      terms: { dealSizeBytes, priceForDeal: priceWei, durationEpochs: form.durationDays * 2880 },
      state: 'Proposed',
      railId: 0,
      validator: '0x0000000000000000000000000000000000000000',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      autoAccepted: autoApprove ?? false,
    }

    if (autoApprove) {
      await new Promise(r => setTimeout(r, 400))
      newDeal.state = 'Accepted'
      newDeal.railId = Math.floor(Math.random() * 1000) + 100
      newDeal.updatedAt = Date.now()
    }

    setSubmitting(false)
    onDealCreated(newDeal)
  }

  // ── Live submit ────────────────────────────────────────────────────────────

  const handleLiveSubmit = async () => {
    if (!matchingProvider) { setError('No provider matches your requirements'); return }
    setError('')
    setSubmitting(true)
    setTxStatus('Sending proposeDeal transaction…')

    const terms = {
      dealSizeBytes,
      priceForDeal: priceWei,
      durationEpochs: form.durationDays * 2880,
    }
    const requirements = {
      retrievabilityPct: form.retrievabilityPct,
      bandwidthMbps: form.bandwidthMbps,
      latencyMs: form.latencyMs,
      indexingPct: form.indexingPct,
    }

    let dealId: number
    try {
      dealId = await sendProposeDeal(requirements, terms)
    } catch (err) {
      setError(`proposeDeal failed: ${err}`)
      setSubmitting(false)
      setTxStatus('')
      return
    }

    const createdAt = Date.now()
    let autoAccepted = false

    if (autoApprove) {
      setTxStatus('Auto-accepting deal…')
      try {
        await sendAcceptDeal(dealId)
        autoAccepted = true
      } catch (err) {
        setError(`Deal #${dealId} proposed but auto-accept failed: ${err}`)
      }
    }

    setTxStatus('')
    setSubmitting(false)

    const deal: Deal = {
      dealId,
      client: state.walletAddress || '0x0000000000000000000000000000000000000000',
      providerActorId: matchingProvider.actorId,
      requirements,
      terms,
      state: autoAccepted ? 'Accepted' : 'Proposed',
      railId: 0,
      validator: '0x0000000000000000000000000000000000000000',
      createdAt,
      updatedAt: Date.now(),
      autoAccepted,
    }

    onLiveDealCreated(deal, { terms, createdAt, autoAccepted })
  }

  const handleSubmit = mode === 'live' ? handleLiveSubmit : handleDemoSubmit

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Propose a Deal</h1>
        <p className="text-slate-500 text-sm mt-1">
          Define your storage requirements. The market will automatically match you with the best
          provider.
          {mode === 'demo' && (
            <span className="ml-2 text-amber-400">(Demo mode — no on-chain transaction)</span>
          )}
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
        <h2 className="font-semibold text-white">SLI Requirements</h2>
        <p className="text-slate-500 text-xs -mt-3">Set to 0 to skip a requirement</p>

        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'retrievabilityPct', label: 'Retrievability', unit: '%', max: 100 },
            { key: 'indexingPct', label: 'Indexing', unit: '%', max: 100 },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs text-slate-400 mb-1.5">
                {f.label} (min {f.unit})
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={0} max={f.max}
                  value={form[f.key as keyof typeof form] as number}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: parseInt(e.target.value) }))}
                  className="flex-1 accent-blue-500"
                />
                <span className="text-slate-300 text-sm w-12 text-right">
                  {form[f.key as keyof typeof form]}{f.unit}
                </span>
              </div>
            </div>
          ))}

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Bandwidth (min Mbps)</label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={0} max={1000} step={50}
                value={form.bandwidthMbps}
                onChange={e => setForm(prev => ({ ...prev, bandwidthMbps: parseInt(e.target.value) }))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-slate-300 text-sm w-16 text-right">{form.bandwidthMbps} Mbps</span>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Latency (max ms)</label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={0} max={500} step={10}
                value={form.latencyMs}
                onChange={e => setForm(prev => ({ ...prev, latencyMs: parseInt(e.target.value) }))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-slate-300 text-sm w-16 text-right">{form.latencyMs} ms</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-white">Deal Terms</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Deal Size (GiB)</label>
            <input
              type="number" min={1} max={10240}
              value={form.dealSizeGiB}
              onChange={e => setForm(prev => ({ ...prev, dealSizeGiB: parseInt(e.target.value) || 1 }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Price (FIL)</label>
            <input
              type="number" min={0} step={0.1}
              value={form.priceFIL}
              onChange={e => setForm(prev => ({ ...prev, priceFIL: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-slate-400 mb-1.5">Duration (days)</label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={30} max={540} step={30}
                value={form.durationDays}
                onChange={e => setForm(prev => ({ ...prev, durationDays: parseInt(e.target.value) }))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-slate-300 text-sm w-20 text-right">{form.durationDays} days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Match preview */}
      <div className={`rounded-xl border p-4 ${matchingProvider ? 'bg-green-950/20 border-green-900/50' : 'bg-red-950/20 border-red-900/50'}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full ${matchingProvider ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className={`text-sm font-medium ${matchingProvider ? 'text-green-400' : 'text-red-400'}`}>
            {matchingProvider ? 'Provider matched' : 'No provider available'}
          </span>
        </div>
        {matchingProvider ? (
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Selected provider</span>
              <span className="text-white">{matchingProvider.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Acceptance</span>
              <span className={autoApprove ? 'text-green-400' : 'text-yellow-400'}>
                {autoApprove ? '⚡ Will auto-accept (price meets SP floor)' : '⏳ Manual (SP must accept)'}
              </span>
            </div>
            {!autoApprove && matchingProvider.defaultPricePerDeal > 0n && (
              <div className="flex justify-between">
                <span className="text-slate-400">SP price floor</span>
                <span className="text-slate-300">{formatFIL(matchingProvider.defaultPricePerDeal)}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-red-400 text-sm">Adjust requirements or try a larger price</p>
        )}
      </div>

      {txStatus && (
        <div className="bg-blue-950/30 border border-blue-900 rounded-lg px-4 py-3 text-blue-400 text-sm font-mono">
          ⟳ {txStatus}
        </div>
      )}

      {error && (
        <div className="bg-red-950/30 border border-red-900 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || !matchingProvider}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl font-medium transition-colors cursor-pointer border-0"
      >
        {submitting ? 'Submitting…' : 'Propose Deal'}
      </button>
    </div>
  )
}
