export function formatBytes(bytes: bigint): string {
  const n = Number(bytes)
  if (n >= 1024 ** 4) return (n / 1024 ** 4).toFixed(1) + ' TiB'
  if (n >= 1024 ** 3) return (n / 1024 ** 3).toFixed(1) + ' GiB'
  if (n >= 1024 ** 2) return (n / 1024 ** 2).toFixed(1) + ' MiB'
  return n + ' B'
}

export function formatFIL(attoFIL: bigint): string {
  const fil = Number(attoFIL) / 1e18
  return fil.toFixed(4) + ' FIL'
}

export function shortAddr(addr: string): string {
  if (!addr || addr === '0x' + '0'.repeat(40)) return '—'
  return addr.slice(0, 6) + '…' + addr.slice(-4)
}

export function formatTime(ms: number): string {
  const diff = Date.now() - ms
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago'
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
  return Math.floor(diff / 86400000) + 'd ago'
}

export function epochsToDays(epochs: number): string {
  return (epochs / 2880).toFixed(0) + ' days'
}

export function stateColor(state: string): string {
  switch (state) {
    case 'Proposed': return 'text-yellow-400'
    case 'Accepted': return 'text-green-400'
    case 'Completed': return 'text-blue-400'
    case 'Rejected': return 'text-red-400'
    default: return 'text-gray-400'
  }
}

export function stateDot(state: string): string {
  switch (state) {
    case 'Proposed': return 'bg-yellow-400'
    case 'Accepted': return 'bg-green-400'
    case 'Completed': return 'bg-blue-400'
    case 'Rejected': return 'bg-red-400'
    default: return 'bg-gray-400'
  }
}
