'use client';

import { X, Plus } from 'lucide-react';
import { ICard, Player } from '../types';

interface PublicDiscardModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicDiscard: ICard[];
  players: Player[];
  onAssignCardToPlayer: (cardIndex: number, playerId: string) => void;
}

export default function PublicDiscardModal({
  isOpen,
  onClose,
  publicDiscard,
  players,
  onAssignCardToPlayer
}: PublicDiscardModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h3 className="text-xl font-bold">公共弃牌堆 ({publicDiscard.length})</h3>
          <button onClick={onClose}><X size={24}/></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {publicDiscard.length === 0 ? (
            <div className="text-center text-slate-500 py-12">弃牌堆是空的</div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {publicDiscard.map((card, i) => (
                <div key={i} className="relative group">
                  <div className="border border-slate-700 rounded-lg overflow-hidden bg-black aspect-[2/3]">
                    <img src={card.imgUrl || `https://placehold.co/100x150/222/999?text=${card.name?.charAt(0) || '?'}`} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-xs text-center truncate mt-1 text-slate-300">{card.name}</div>
                  {/* 分配给玩家按钮 */}
                  <div className="mt-2 flex flex-col gap-1">
                    {players.map(player => (
                      <button
                        key={player.id}
                        onClick={() => onAssignCardToPlayer(i, player.id)}
                        className="w-full py-1.5 text-xs rounded flex items-center justify-center gap-1 font-medium transition-colors"
                        style={{ 
                          backgroundColor: player.color + '30',
                          borderColor: player.color,
                          borderWidth: '1px',
                          color: player.color
                        }}
                      >
                        <Plus size={12}/> {player.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

