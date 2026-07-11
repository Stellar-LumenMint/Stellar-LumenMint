import { useTranslation } from 'react-i18next'
import { Activity, Layers, Settings, Wallet, ChevronRight, BarChart3, Users, Shield, ArrowUpRight, Clock, Search, Bell } from 'lucide-react'

function App() {
  const { t } = useTranslation()

  const stats = [
    { label: 'Total Collections', value: '24', change: '+3', icon: Layers, color: '#0A0A0A' },
    { label: 'Active Wallets', value: '1,847', change: '+12.5%', icon: Users, color: '#4F46E5' },
    { label: 'Transactions (24h)', value: '3,421', change: '+8.2%', icon: Activity, color: '#10B981' },
    { label: 'Network Uptime', value: '99.97%', change: 'Stable', icon: Shield, color: '#F59E0B' },
  ]

  const recentActivity = [
    { action: 'Collection Minted', detail: 'Cosmic Dreams #42', time: '2 min ago', type: 'mint' },
    { action: 'Sale Completed', detail: 'Stellar Genesis → 0x8f3...a7b2', time: '15 min ago', type: 'sale' },
    { action: 'Bid Placed', detail: '3,500 XLM on Nebula #007', time: '1 hour ago', type: 'bid' },
    { action: 'Wallet Connected', detail: 'Freighter wallet linked', time: '2 hours ago', type: 'wallet' },
    { action: 'Collection Verified', detail: 'Artists United Pass', time: '4 hours ago', type: 'verify' },
  ]

  const navItems = [
    { icon: BarChart3, label: t('nav.dashboard'), active: true },
    { icon: Layers, label: t('nav.collections'), active: false },
    { icon: Wallet, label: 'Wallets', active: false },
    { icon: Activity, label: 'Activity', active: false },
    { icon: Users, label: 'Users', active: false },
    { icon: Settings, label: t('nav.settings'), active: false },
  ]

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0A0A0A] font-sans antialiased">
      <div className="flex h-screen overflow-hidden">
        <aside className="w-64 flex-shrink-0 bg-white border-r border-neutral-200 flex flex-col">
          <div className="flex items-center gap-3 px-5 py-5 border-b border-neutral-100">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-900 text-white">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-neutral-900">Stellar-LumenMint</p>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Admin Console</p>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {navItems.map(({ icon: Icon, label, active }) => (
              <button
                key={label}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-white' : 'text-neutral-400'}`} />
                <span>{label}</span>
                {active && <ChevronRight className="ml-auto h-3.5 w-3.5" />}
              </button>
            ))}
          </nav>

          <div className="px-4 py-4 border-t border-neutral-100">
            <div className="flex items-center gap-3 px-3 py-3 rounded-md border border-neutral-200 bg-neutral-50">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-neutral-900">Network Live</span>
                <span className="text-[10px] text-neutral-500">Stellar Mainnet</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-neutral-200 px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-neutral-900">{t('onboarding.welcome')}</h1>
              <p className="text-sm text-neutral-500 mt-0.5">{t('onboarding.walletHelp')}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="h-9 w-64 rounded-md border border-neutral-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400"
                />
              </div>
              <button className="relative flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900 transition-colors">
                <Bell className="h-4 w-4" />
                <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
              </button>
              <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {t('network.mainnet.label')}
              </div>
            </div>
          </header>

          <div className="p-8 space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map(({ label, value, change, icon: Icon, color }) => (
                <article
                  key={label}
                  className="group rounded-md border border-neutral-200 bg-white p-5 hover:border-neutral-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{label}</h2>
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-100 bg-neutral-50">
                      <Icon className="h-4 w-4" style={{ color }} />
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-2xl font-semibold text-neutral-900 tracking-tight">{value}</p>
                    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                      <ArrowUpRight className="h-3 w-3" />
                      {change}
                    </span>
                  </div>
                </article>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <section className="lg:col-span-2 rounded-md border border-neutral-200 bg-white p-6">
                <h2 className="text-sm font-semibold text-neutral-900 mb-5 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-neutral-400" />
                  Recent Activity
                </h2>
                <div className="space-y-1">
                  {recentActivity.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 rounded-md px-4 py-3 hover:bg-neutral-50 transition-colors group cursor-default"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-100 text-neutral-600">
                        {item.type === 'mint' && <Layers className="h-3.5 w-3.5" />}
                        {item.type === 'sale' && <ArrowUpRight className="h-3.5 w-3.5" />}
                        {item.type === 'bid' && <Wallet className="h-3.5 w-3.5" />}
                        {item.type === 'wallet' && <Shield className="h-3.5 w-3.5" />}
                        {item.type === 'verify' && <Shield className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">{item.action}</p>
                        <p className="text-xs text-neutral-500 truncate">{item.detail}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-neutral-400 shrink-0">
                        <Clock className="h-3 w-3" />
                        {item.time}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-md border border-neutral-200 bg-white p-6">
                <h2 className="text-sm font-semibold text-neutral-900 mb-5 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-neutral-400" />
                  Quick Actions
                </h2>
                <div className="space-y-2">
                  {[
                    { label: 'Verify Collection', desc: 'Approve pending collections', color: '#0A0A0A' },
                    { label: 'Review Reports', desc: '3 new moderation flags', color: '#F43F5E' },
                    { label: 'System Health', desc: 'All services operational', color: '#10B981' },
                    { label: 'Export Data', desc: 'Generate analytics report', color: '#4F46E5' },
                  ].map(({ label, desc, color }) => (
                    <button
                      key={label}
                      className="flex w-full items-center justify-between gap-3 rounded-md px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors group text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{label}</p>
                        <p className="text-xs text-neutral-500">{desc}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-900 transition-colors" />
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
