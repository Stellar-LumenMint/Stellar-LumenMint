import { useTranslation } from 'react-i18next'
import { Activity, Layers, Settings, Wallet, ChevronRight, Zap, BarChart3, Users, Shield, ArrowUpRight, Sparkles, Clock } from 'lucide-react'

function App() {
  const { t } = useTranslation()

  const stats = [
    { label: 'Total Collections', value: '24', change: '+3', icon: Layers, color: '#00D4FF' },
    { label: 'Active Wallets', value: '1,847', change: '+12.5%', icon: Users, color: '#7B6FFF' },
    { label: 'Transactions (24h)', value: '3,421', change: '+8.2%', icon: Activity, color: '#FF6B9D' },
    { label: 'Network Uptime', value: '99.97%', change: 'Stable', icon: Shield, color: '#34D399' },
  ]

  const recentActivity = [
    { action: 'Collection Minted', detail: 'Cosmic Dreams #42', time: '2 min ago', type: 'mint' },
    { action: 'Sale Completed', detail: 'Stellar Genesis → 0x8f3...a7b2', time: '15 min ago', type: 'sale' },
    { action: 'Bid Placed', detail: '3,500 XLM on Nebula #007', time: '1 hour ago', type: 'bid' },
    { action: 'Wallet Connected', detail: 'Freighter wallet linked', time: '2 hours ago', type: 'wallet' },
    { action: 'Collection Verified', detail: 'Artists United Pass', time: '4 hours ago', type: 'verify' },
  ]

  return (
    <div className="min-h-screen bg-[#0D1117] text-white font-sans antialiased overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00D4FF]/3 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#7B6FFF]/3 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-[#00D4FF]/2 to-[#7B6FFF]/2 rounded-full blur-[150px]" />
      </div>

      <div className="flex h-screen overflow-hidden relative z-10">
        {/* ── Sidebar ───────────────────────────────── */}
        <aside className="w-64 flex-shrink-0 bg-[#141B24]/80 backdrop-blur-xl border-r border-[#1E2D3D]/60 flex flex-col">
          {/* Brand */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-[#1E2D3D]/60">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#00D4FF]/20 to-[#7B6FFF]/20 border border-[#00D4FF]/25">
              <Sparkles className="h-5 w-5 text-[#00D4FF]" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-white">
                Stellar<span className="text-[#00D4FF] font-light">-LumenMint</span>
              </p>
              <p className="text-[10px] text-[#8A9BB0] tracking-wider uppercase">Admin Console</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-5 space-y-1">
            {[
              { icon: BarChart3, label: t('nav.dashboard'), active: true },
              { icon: Layers,   label: t('nav.collections'), active: false },
              { icon: Wallet,   label: 'Wallets', active: false },
              { icon: Activity, label: 'Activity', active: false },
              { icon: Users,    label: 'Users', active: false },
              { icon: Settings, label: t('nav.settings'), active: false },
            ].map(({ icon: Icon, label, active }) => (
              <button
                key={label}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group ${
                  active 
                    ? 'bg-gradient-to-r from-[#00D4FF]/10 to-[#7B6FFF]/10 text-white border border-[#00D4FF]/20' 
                    : 'text-[#8A9BB0] hover:text-white hover:bg-[#1C2433] hover:border hover:border-[#1E2D3D]'
                }`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 transition-colors ${active ? 'text-[#00D4FF]' : 'group-hover:text-[#00D4FF]'}`} />
                <span>{label}</span>
                {active && (
                  <div className="ml-auto flex h-5 w-5 items-center justify-center rounded-md bg-[#00D4FF]/20">
                    <ChevronRight className="h-3 w-3 text-[#00D4FF]" />
                  </div>
                )}
              </button>
            ))}
          </nav>

          {/* Network badge */}
          <div className="px-4 py-4 border-t border-[#1E2D3D]/60">
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-emerald-400/5 to-transparent border border-emerald-400/10">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-emerald-300">Network Live</span>
                <span className="text-[10px] text-[#8A9BB0]">Stellar Mainnet</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main content ──────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-[#0D1117]/80 backdrop-blur-xl border-b border-[#1E2D3D]/60 px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">
                {t('onboarding.welcome')}
              </h1>
              <p className="text-sm text-[#8A9BB0] mt-0.5">
                {t('onboarding.walletHelp')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 text-xs font-medium text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t('network.mainnet.label')}
              </div>
              <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#141B24] border border-[#1E2D3D] text-[#8A9BB0] hover:text-white hover:border-[#00D4FF]/30 transition-colors duration-200">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Dashboard body */}
          <div className="p-8 space-y-8">
            {/* Stats grid */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map(({ label, value, change, icon: Icon, color }) => (
                <article
                  key={label}
                  className="group relative rounded-2xl border border-[#1E2D3D]/60 bg-[#141B24]/80 backdrop-blur-sm p-5 hover:border-[#00D4FF]/20 transition-all duration-300 overflow-hidden"
                >
                  {/* Hover glow */}
                  <div 
                    className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${color}10, transparent 40%)` }}
                  />
                  
                  <div className="relative z-10 flex items-start justify-between mb-3">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8A9BB0]">{label}</h2>
                    <div 
                      className="flex h-8 w-8 items-center justify-center rounded-lg border"
                      style={{ borderColor: `${color}20`, backgroundColor: `${color}10` }}
                    >
                      <Icon className="h-4 w-4" style={{ color }} />
                    </div>
                  </div>
                  <div className="relative z-10 flex items-end justify-between">
                    <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
                    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-400">
                      <ArrowUpRight className="h-3 w-3" />
                      {change}
                    </span>
                  </div>
                  <div className="relative z-10 mt-4 h-[2px] w-12 rounded-full" style={{ background: `linear-gradient(to right, ${color}40, transparent)` }} />
                </article>
              ))}
            </div>

            {/* Two-column layout */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Activity feed */}
              <section className="lg:col-span-2 rounded-2xl border border-[#1E2D3D]/60 bg-[#141B24]/80 backdrop-blur-sm p-6">
                <h2 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#00D4FF]" />
                  Recent Activity
                </h2>
                <div className="space-y-1">
                  {recentActivity.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 rounded-xl px-4 py-3 hover:bg-[#1C2433]/50 transition-colors duration-200 group cursor-default"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1C2433] border border-[#1E2D3D] group-hover:border-[#00D4FF]/20 transition-colors">
                        {item.type === 'mint' && <Sparkles className="h-3.5 w-3.5 text-[#00D4FF]" />}
                        {item.type === 'sale' && <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />}
                        {item.type === 'bid' && <Wallet className="h-3.5 w-3.5 text-[#7B6FFF]" />}
                        {item.type === 'wallet' && <Shield className="h-3.5 w-3.5 text-[#FF6B9D]" />}
                        {item.type === 'verify' && <Zap className="h-3.5 w-3.5 text-yellow-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{item.action}</p>
                        <p className="text-xs text-[#8A9BB0] truncate">{item.detail}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[#6B7A8D] shrink-0">
                        <Clock className="h-3 w-3" />
                        {item.time}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Quick actions */}
              <section className="rounded-2xl border border-[#1E2D3D]/60 bg-[#141B24]/80 backdrop-blur-sm p-6">
                <h2 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#00D4FF]" />
                  Quick Actions
                </h2>
                <div className="space-y-2">
                  {[
                    { label: 'Verify Collection', desc: 'Approve pending collections', color: '#00D4FF' },
                    { label: 'Review Reports', desc: '3 new moderation flags', color: '#FF6B9D' },
                    { label: 'System Health', desc: 'All services operational', color: '#34D399' },
                    { label: 'Export Data', desc: 'Generate analytics report', color: '#7B6FFF' },
                  ].map(({ label, desc, color }) => (
                    <button
                      key={label}
                      className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 bg-[#1C2433]/50 hover:bg-[#1C2433] border border-transparent hover:border-[#1E2D3D] transition-all duration-200 group"
                    >
                      <div className="text-left">
                        <p className="text-sm font-medium text-white">{label}</p>
                        <p className="text-xs text-[#8A9BB0]">{desc}</p>
                      </div>
                      <div 
                        className="flex h-7 w-7 items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ backgroundColor: `${color}15` }}
                      >
                        <ChevronRight className="h-3.5 w-3.5" style={{ color }} />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
