'use client';

import { X, RotateCcw } from 'lucide-react';
import { Player } from '../types';

interface PlayerDiscardModalProps {
  player: Player;
  onClose: () => void;
  onRecoverCard: (playerId: string, cardIndex: number) => void;
}

export default function PlayerDiscardModal({
  player,
  onClose,
  onRecoverCard
}: PlayerDiscardModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center" style={{ borderLeftColor: player.color, borderLeftWidth: '5px' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 overflow-hidden bg-black" style={{ borderColor: player.color }}>
              {player.imgUrl && <img src={player.imgUrl} className="w-full h-full object-cover"/>}
            </div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: player.color }}>{player.name} 的弃牌堆</h3>
              <div className="text-xs text-slate-500">{player.discard.length} 张卡牌</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24}/></button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {player.discard.length === 0 ? (
            <div className="text-center text-slate-500 py-12">弃牌堆是空的</div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {player.discard.map((card, i) => (
                <div key={i} className="relative">
                  <div className="aspect-[2/3] rounded-lg border border-slate-600 overflow-hidden bg-black">
                    <img src={card.imgUrl || `https://placehold.co/100x150/222/999?text=${card.name?.charAt(0) || '?'}`} className="w-full h-full object-cover"/>
                  </div>
                  <div className="text-xs text-center truncate mt-2 text-slate-300">{card.name}</div>
                  <button 
                    onClick={() => onRecoverCard(player.id, i)}
                    className="w-full mt-2 py-2 text-xs bg-emerald-700 hover:bg-emerald-600 rounded-lg flex items-center justify-center gap-1 text-white font-medium"
                  >
                    <RotateCcw size={14}/> 取回手牌
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

