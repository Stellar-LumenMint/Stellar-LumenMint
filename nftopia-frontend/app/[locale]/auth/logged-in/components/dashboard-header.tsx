import { Plus, TrendingUp } from "lucide-react"

export const DashboardHeader = () => (
  <div className="shadow-sm border-b border-lumen-border text-lumen-text">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-lumen-text">Creator Dashboard</h1>
          <p className="mt-1 text-sm text-lumen-subtext">Manage your NFT collections and track performance</p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button className="inline-flex items-center px-4 py-2 border border-lumen-border rounded-lg text-sm font-medium text-lumen-text bg-lumen-card hover:bg-lumen-surface2 transition-colors">
            <TrendingUp className="w-4 h-4 mr-2 text-lumen-teal" />
            View Analytics
          </button>
          <button className="inline-flex items-center px-4 py-2 bg-lumen-teal text-[#0D1117] rounded-lg text-sm font-semibold hover:bg-lumen-teal-dim transition-colors">
            <Plus className="w-4 h-4 mr-2" />
            Create NFT
          </button>
        </div>
      </div>
    </div>
  </div>
)
