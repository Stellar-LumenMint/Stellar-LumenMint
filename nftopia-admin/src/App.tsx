import { useTranslation } from 'react-i18next'
import { Activity, Layers, Settings, Wallet, ChevronRight, Zap } from 'lucide-react'

function App() {
  const { t } = useTranslation()

  const stats = [
    { label: t('nav.dashboard'),      value: t('wallet.connect.label') },
    { label: t('explorer.tx.label'),  value: t('explorer.account.label') },
    { label: t('network.testnet.label'), value: t('wallet.address.label') },
  ]

  return (
    <div className="min-h-screen bg-[#0D1117] text-white font-sans antialiased">
      {/* ── Sidebar ───────────────────────────────── */}
      <div className="flex h-screen overflow-hidden">
        <aside className="w-60 flex-shrink-0 bg-[#141B24] border-r border-[#1E2D3D] flex flex-col">
          {/* Brand */}
          <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#1E2D3D]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00D4FF]/10 border border-[#00D4FF]/25">
              <Zap className="h-4 w-4 text-[#00D4FF]" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#00D4FF]">
                Stellar-LumenMint
              </p>
              <p className="text-[10px] text-[#8A9BB0] -mt-0.5">Admin Console</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {[
              { icon: Activity, label: t('nav.dashboard') },
              { icon: Layers,   label: t('nav.collections') },
              { icon: Wallet,   label: t('wallet.connect.label') },
              { icon: Settings, label: t('nav.settings') },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#8A9BB0] hover:text-white hover:bg-[#1C2433] transition-colors group"
              >
                <Icon className="h-4 w-4 flex-shrink-0 group-hover:text-[#00D4FF] transition-colors" />
                {label}
                <ChevronRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-40 transition-opacity" />
              </button>
            ))}
          </nav>

          {/* Network badge */}
          <div className="px-4 py-4 border-t border-[#1E2D3D]">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1C2433]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-[#8A9BB0]">{t('network.mainnet.label')}</span>
            </div>
          </div>
        </aside>

        {/* ── Main content ──────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-[#0D1117]/90 backdrop-blur border-b border-[#1E2D3D] px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">
                {t('onboarding.welcome')}
              </h1>
              <p className="text-sm text-[#8A9BB0] mt-0.5">
                {t('onboarding.walletHelp')}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {t('network.mainnet.label')}
            </span>
          </header>

          {/* Dashboard body */}
          <div className="p-8 space-y-8">
            {/* Stats grid */}
            <div className="grid gap-4 sm:grid-cols-3">
              {stats.map(({ label, value }) => (
                <article
                  key={label}
                  className="rounded-xl border border-[#1E2D3D] bg-[#141B24] p-5 hover:border-[#00D4FF]/30 transition-colors"
                >
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8A9BB0] mb-3">{label}</h2>
                  <p className="text-lg font-semibold text-white">{value}</p>
                  <div className="mt-3 h-[2px] w-8 rounded-full bg-[#00D4FF]/40" />
                </article>
              ))}
            </div>

            {/* Activity placeholder */}
            <section className="rounded-xl border border-[#1E2D3D] bg-[#141B24] p-6">
              <h2 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#00D4FF]" />
                Recent Activity
              </h2>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 rounded-lg bg-[#1C2433] px-4 py-3 animate-pulse"
                  >
                    <div className="h-8 w-8 rounded-full bg-[#1E2D3D]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-1/3 rounded bg-[#1E2D3D]" />
                      <div className="h-2.5 w-1/2 rounded bg-[#1E2D3D]" />
                    </div>
                    <div className="h-3 w-16 rounded bg-[#1E2D3D]" />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
