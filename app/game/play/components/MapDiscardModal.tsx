'use client';

import { X } from 'lucide-react';
import { ICard } from '../types';

interface MapDiscardModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapDiscard: ICard[];
  onDragStart: (index: number, e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export default function MapDiscardModal({
  isOpen,
  onClose,
  mapDiscard,
  onDragStart,
  onDragEnd
}: MapDiscardModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8" onClick={onClose}>
      <div className="bg-slate-900 border border-amber-700 rounded-xl max-w-3xl w-full max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-amber-500">地图弃牌堆 ({mapDiscard.length})</h3>
          <button onClick={onClose}><X size={24}/></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {mapDiscard.length === 0 ? (
            <div className="text-center text-slate-500 py-12">地图弃牌堆是空的</div>
          ) : (
            <div className="grid grid-cols-6 gap-3">
              {mapDiscard.map((card, i) => (
                <div key={i} className="relative group flex flex-col items-center">
                  <div 
                    draggable
                    onDragStart={(e) => onDragStart(i, e)}
                    onDragEnd={onDragEnd}
                    className="w-[80px] h-[80px] border-2 border-amber-700 rounded-lg overflow-hidden bg-black cursor-grab active:cursor-grabbing hover:border-amber-500 transition-colors"
                  >
                    <img src={card.imgUrl || `https://placehold.co/80/222/999?text=${card.name?.charAt(0) || '?'}`} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-[10px] text-center truncate mt-1 text-slate-300 w-[80px]">{card.name}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 text-center text-xs text-slate-500">拖拽卡片到地图格子放置</div>
        </div>
      </div>
    </div>
  );
}

