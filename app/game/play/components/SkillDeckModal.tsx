'use client';

import { X, Shuffle, Hand } from 'lucide-react';
import { Player, ICard } from '../types';
import { useState } from 'react';
import ImageViewerModal from './ImageViewerModal';

interface SkillDeckModalProps {
  player: Player;
  onClose: () => void;
  onDrawCardFromDeck: (cardIndex: number) => void;
  onShuffleDeck: () => void;
}

export default function SkillDeckModal({
  player,
  onClose,
  onDrawCardFromDeck,
  onShuffleDeck,
}: SkillDeckModalProps) {
  const [viewingCard, setViewingCard] = useState<ICard | null>(null);

  const handleDrawCard = (index: number) => {
    onDrawCardFromDeck(index);
  };

  const handleShuffleAndClose = () => {
    onShuffleDeck();
    onClose();
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div 
          className="bg-slate-900 border border-purple-900/50 rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full border-2 overflow-hidden bg-black shrink-0" 
                style={{ borderColor: player.color }}
              >
                {player.imgUrl && <img src={player.imgUrl} className="w-full h-full object-cover" />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-purple-400">
                  {player.name} 的技能牌堆
                </h3>
                <p className="text-sm text-slate-500">
                  共 {player.skillDeck?.length || 0} 张牌 · 点击取出到手牌
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleShuffleAndClose}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-bold text-sm flex items-center gap-2 transition-colors"
              >
                <Shuffle size={16}/> 洗混并关闭
              </button>
              <button onClick={onClose} className="text-slate-400 hover:text-white p-2">
                <X size={24}/>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto flex-1">
            {(!player.skillDeck || player.skillDeck.length === 0) ? (
              <div className="text-center text-slate-600 py-12">
                <p className="text-lg mb-2">技能牌堆是空的</p>
                <p className="text-sm">技能弃牌堆有 {player.skillDiscard?.length || 0} 张牌</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {player.skillDeck.map((card, index) => (
                  <div 
                    key={`${card._id}-${index}`}
                    className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden group hover:border-purple-500 transition-colors"
                  >
                    {/* Card Image */}
                    <div 
                      className="aspect-[3/4] bg-black cursor-pointer relative"
                      onDoubleClick={() => setViewingCard(card)}
                      title="双击查看大图"
                    >
                      {card.imgUrl ? (
                        <img 
                          src={card.thumbUrl || card.imgUrl} 
                          alt={card.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600 text-2xl">
                          ?
                        </div>
                      )}
                      {/* Position indicator */}
                      <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                        #{index + 1}
                      </div>
                    </div>
                    
                    {/* Card Info */}
                    <div className="p-2">
                      <div className="font-bold text-xs text-purple-300 truncate mb-2">{card.name}</div>
                      
                      {/* Draw Button */}
                      <button
                        onClick={() => handleDrawCard(index)}
                        className="w-full py-1.5 bg-purple-600/30 hover:bg-purple-600 rounded-lg text-xs font-bold text-purple-300 hover:text-white flex items-center justify-center gap-1 transition-colors"
                      >
                        <Hand size={12}/> 取出到手牌
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700 flex items-center justify-between text-sm text-slate-500">
            <div>
              手牌: {player.handSkill?.length || 0} 张技能牌 · 弃牌堆: {player.skillDiscard?.length || 0} 张
            </div>
            <div className="text-xs text-slate-600">
              提示: 双击卡牌查看大图
            </div>
          </div>
        </div>
      </div>

      {/* Image Viewer */}
      {viewingCard && (
        <ImageViewerModal 
          card={viewingCard}
          onClose={() => setViewingCard(null)}
        />
      )}
    </>
  );
}

