'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { PlayedCard, ICard } from '../types';
import ImageViewerModal from './ImageViewerModal';
import { getCardDisplayUrl } from '../utils/imageUtils';

interface PlayedCardsDisplayProps {
  playedCard: PlayedCard | null;
  onClear: () => void;
}

export default function PlayedCardsDisplay({ playedCard, onClear }: PlayedCardsDisplayProps) {
  const [viewingCard, setViewingCard] = useState<ICard | null>(null);

  // 检查 playedCard 和 playedCard.card 是否存在
  if (!playedCard || !playedCard.card) return null;

  const displayUrl = getCardDisplayUrl(playedCard.card);

  return (
    <>
    <div className="flex items-center gap-2 bg-slate-900/70 px-2 py-1.5 rounded-lg border border-emerald-700/50 shadow-lg shadow-emerald-900/20 z-10">
      <span className="text-[10px] text-emerald-500 font-bold uppercase">打出</span>
      
      <div 
          className="w-20 h-28 rounded border-2 overflow-hidden shadow-md shrink-0 cursor-pointer hover:ring-2 hover:ring-white/50 transition-all"
        style={{ borderColor: playedCard.playerColor }}
          onDoubleClick={() => setViewingCard(playedCard.card)}
          title="双击查看详情"
      >
        <img 
            src={displayUrl}
          alt={playedCard.card.name}
            className="w-full h-full object-contain bg-black"
        />
      </div>
      
      <div className="flex flex-col">
        <span className="text-xs font-bold text-white truncate max-w-[70px]">{playedCard.card.name}</span>
        <span className="text-[10px]" style={{ color: playedCard.playerColor }}>
          {playedCard.playerName}
        </span>
          <span className="text-[9px] text-slate-500 mt-0.5">双击查看</span>
      </div>
      
      <button
        onClick={onClear}
        className="p-1 bg-slate-800 hover:bg-red-600 rounded text-slate-400 hover:text-white transition-colors"
        title="清除"
      >
        <X size={12} />
      </button>
    </div>

      {/* 卡牌详情查看弹窗 */}
      {viewingCard && (
        <ImageViewerModal
          card={viewingCard}
          onClose={() => setViewingCard(null)}
        />
      )}
    </>
  );
}
