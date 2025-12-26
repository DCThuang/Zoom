'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Package } from 'lucide-react';
import { Player, Equipment } from '../types';

interface EquipmentPreviewModalProps {
  player: Player;
  equipIndex: number;
  onClose: () => void;
  onAddLabel: (playerId: string, equipIndex: number, label: string) => void;
  onRemoveLabel: (playerId: string, equipIndex: number, labelIndex: number) => void;
  onUpdateAmmo: (playerId: string, equipIndex: number, delta: number) => void;
  onRemoveEquipment: (playerId: string, equipIndex: number) => void;
}

export default function EquipmentPreviewModal({
  player,
  equipIndex,
  onClose,
  onAddLabel,
  onRemoveLabel,
  onUpdateAmmo,
  onRemoveEquipment
}: EquipmentPreviewModalProps) {
  const [newLabel, setNewLabel] = useState('');
  const equip = player.equipment[equipIndex];

  if (!equip) return null;

  const handleAddLabel = () => {
    if (newLabel.trim()) {
      onAddLabel(player.id, equipIndex, newLabel);
      setNewLabel('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-amber-700/50 rounded-xl p-4 shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="flex gap-4">
          {/* Left: Equipment Card Image */}
          <div className="w-32 h-44 rounded-lg border-2 border-amber-600/50 overflow-hidden bg-black shadow-lg shrink-0">
            {equip.card.imgUrl ? (
              <img src={equip.card.imgUrl} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                <Package size={40}/>
              </div>
            )}
          </div>
          
          {/* Right: Equipment Info */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-lg font-bold text-white">{equip.card.name}</div>
                <div className="text-xs text-slate-500">持有者: <span style={{ color: player.color }}>{player.name}</span></div>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18}/></button>
            </div>
            
            {/* Description */}
            {equip.card.description && (
              <div className="text-xs text-slate-400 mb-2 line-clamp-2">{equip.card.description}</div>
            )}
            
            {/* Current Labels Display */}
            {equip.labels && equip.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {equip.labels.map((lbl: string, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-amber-600 text-white text-xs px-2 py-0.5 rounded font-bold">
                    {lbl}
                    <X size={10} className="cursor-pointer hover:text-red-200" onClick={() => onRemoveLabel(player.id, equipIndex, i)}/>
                  </span>
                ))}
              </div>
            )}
            
            {/* Add Label Input */}
            <div className="mb-2">
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">添加标签</label>
              <div className="flex gap-1">
                <input 
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddLabel();
                  }}
                  placeholder="如: 强化+2"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-amber-400 placeholder-slate-600 focus:border-amber-500 outline-none"
                />
                <button 
                  onClick={handleAddLabel}
                  className="px-2 py-1 bg-amber-600 hover:bg-amber-500 rounded text-white text-xs font-bold"
                >
                  <Plus size={14}/>
                </button>
              </div>
            </div>
            
            {/* Ammo Counter */}
            <div className="mb-3 bg-slate-800 rounded-lg p-2">
              <label className="block text-[10px] text-slate-500 mb-1 uppercase tracking-wider">弹药数量</label>
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => onUpdateAmmo(player.id, equipIndex, -1)}
                  className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold text-lg flex items-center justify-center"
                >
                  −
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 text-xl">⬤</span>
                  <span className="text-2xl font-bold text-white font-mono">{equip.ammo || 0}</span>
                </div>
                <button 
                  onClick={() => onUpdateAmmo(player.id, equipIndex, 1)}
                  className="w-8 h-8 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-bold text-lg flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
            
            {/* Unequip Button */}
            <button 
              onClick={() => {
                onRemoveEquipment(player.id, equipIndex);
                onClose();
              }}
              className="mt-auto py-1.5 bg-red-900/30 hover:bg-red-900/50 rounded text-red-400 text-xs font-bold flex items-center justify-center gap-1"
            >
              <Trash2 size={12}/> 卸下装备
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

