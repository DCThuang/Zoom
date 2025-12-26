'use client';

import { X, Crown } from 'lucide-react';
import { ICard } from '../types';

interface DeckPickModalProps {
  deck: ICard[];
  onClose: () => void;
  onPutToField: (cardIndex: number) => void;
}

export default function DeckPickModal({
  deck,
  onClose,
  onPutToField,
}: DeckPickModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-rose-900/50 rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-xl font-bold text-rose-400 flex items-center gap-2">
            <Crown size={20} /> Boss牌 ({deck.length})
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {deck.length === 0 ? (
            <div className="text-center text-slate-600 py-12">牌堆是空的</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {deck.map((card, index) => (
                <div
                  key={index}
                  className="bg-slate-800 border border-slate-700 hover:border-rose-500 rounded-xl overflow-hidden transition-all cursor-pointer group hover:scale-105"
                  onClick={() => {
                    onPutToField(index);
                    onClose();
                  }}
                >
                  {/* Card Image */}
                  <div className="aspect-[3/4] bg-black relative">
                    {card.imgUrl ? (
                      <img src={card.imgUrl} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Crown size={32} />
                      </div>
                    )}
                    {/* Name overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-2 py-1.5">
                      <div className="text-xs font-bold text-white truncate">{card.name}</div>
                      {(card.hp || card.attack) && (
                        <div className="text-[10px] text-slate-400 flex gap-2">
                          {card.hp && <span>HP: {card.hp}</span>}
                          {card.attack && <span>攻: {card.attack}</span>}
                        </div>
                      )}
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-rose-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white font-bold text-sm">放入战场</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="p-3 border-t border-slate-700 text-xs text-slate-500 text-center">
          点击卡牌直接放入敌人区域
        </div>
      </div>
    </div>
  );
}

