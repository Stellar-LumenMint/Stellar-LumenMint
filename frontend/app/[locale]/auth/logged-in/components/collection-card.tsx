"use client"

import { useState } from "react"
import { MoreVertical, Edit, Share, Trash2 } from "lucide-react"
type CollectionCardProps = {
  collection: {
    id: string | number
    name: string
    description: string
    nftCount: number
    floorPrice: number
    totalVolume: number
    createdAt: string | number | Date
  }
  isLoading?: boolean
}
import { CollectionCardSkeleton } from "./skelletons/collection-card-skeleton"
import { OptimizedImage } from '@/components/image';

export const CollectionCard = ({ collection, isLoading = false }: CollectionCardProps) => {
  const [showMenu, setShowMenu] = useState(false)

  if (isLoading) return <CollectionCardSkeleton />

  return (
    <div className="rounded-lg border border-lumen-border bg-lumen-card overflow-hidden hover:shadow-lg transition-shadow group">
      <div className="relative">
        <OptimizedImage
          src={`https://picsum.photos/300/200?random=${collection.id}`}
          alt={collection.name}
          width={300}
          height={200}
          className="w-full h-48 object-cover"
          fallbackSrc="/images/fallbacks/collection-fallback.svg"
          sizes="(max-width: 640px) 100vw, 300px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-4 left-4 right-4">
            <button className="w-full bg-lumen-teal text-[#0D1117] py-2 px-4 rounded-lg font-semibold hover:bg-lumen-teal-dim transition-colors">
              View Collection
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-lumen-text line-clamp-1">{collection.name}</h3>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-full hover:bg-lumen-surface2 transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-lumen-subtext" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-lumen-card border border-lumen-border rounded-lg shadow-xl py-1 z-10 min-w-32">
                <button className="w-full text-left px-3 py-2 hover:bg-lumen-surface2 flex items-center gap-2 text-sm text-lumen-text">
                  <Edit className="w-4 h-4" /> Edit
                </button>
                <button className="w-full text-left px-3 py-2 hover:bg-lumen-surface2 flex items-center gap-2 text-sm text-lumen-text">
                  <Share className="w-4 h-4" /> Share
                </button>
                <button className="w-full text-left px-3 py-2 hover:bg-lumen-surface2 flex items-center gap-2 text-sm text-red-400">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-sm text-lumen-subtext mb-4 line-clamp-2">{collection.description}</p>

        <div className="flex justify-between items-center mb-3 text-sm">
          <span className="text-lumen-subtext">{collection.nftCount} NFTs</span>
          <span className="font-medium text-lumen-subtext">Floor: {collection.floorPrice} XLM</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-lumen-subtext">Volume: {collection.totalVolume} XLM</span>
          <span className="text-xs text-lumen-subtext">{new Date(collection.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  )
}
