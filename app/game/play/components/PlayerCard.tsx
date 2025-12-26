'use client';

import { Heart, Shield, Utensils, Coins, X, Plus, Trash2, CreditCard, Package, Backpack, Zap } from 'lucide-react';
import { Player, Equipment } from '../types';
import StatMini from './StatMini';

interface PlayerCardProps {
  player: Player;
  onUpdateStat: (stat: keyof Player, delta: number) => void;
  onUpdateGold: (delta: number) => void;
  onAddTag: () => void;
  onRemoveTag: (idx: number) => void;
  onDrawCard: (deck: 'RED' | 'BLUE' | 'GREEN' | 'SHOP' | 'SKILL') => void;
  onClick: () => void;
  onEquipmentClick: (idx: number) => void;
  onUpdateEquipAmmo: (equipIdx: number, delta: number) => void;
  onViewSkillDeck: () => void;
}

export default function PlayerCard({ 
  player, 
  onUpdateStat, 
  onUpdateGold, 
  onAddTag, 
  onRemoveTag, 
  onDrawCard, 
  onClick, 
  onEquipmentClick, 
  onUpdateEquipAmmo,
  onViewSkillDeck
}: PlayerCardProps) {
  const totalHand = player.handResource.length + player.handSkill.length;
  
  return (
    <div 
      onClick={onClick}
      className="bg-slate-900/80 border border-slate-700 rounded-xl p-4 cursor-pointer hover:border-slate-600 transition-colors"
      style={{ borderLeftColor: player.color, borderLeftWidth: '5px' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full border-2 overflow-hidden bg-black shrink-0" style={{ borderColor: player.color }}>
          {player.imgUrl && <img src={player.imgUrl} className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base truncate" style={{ color: player.color }}>{player.name}</div>
          <div className="flex gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1" title="手牌"><CreditCard size={12}/> {totalHand}</span>
            <span 
              className="flex items-center gap-1 cursor-pointer hover:text-purple-400 transition-colors" 
              title="点击查看技能牌堆"
              onClick={(e) => { e.stopPropagation(); onViewSkillDeck(); }}
            >
              <Zap size={12} className="text-purple-400"/> {player.skillDeck?.length || 0}
            </span>
            <span className="flex items-center gap-1" title="弃牌堆"><Trash2 size={12}/> {player.discard.length}</span>
          </div>
        </div>
      </div>

      {/* Stats Row 1: HP, Stealth, Hunger, Gold */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        <StatMini icon={<Heart size={14} className="text-red-500"/>} value={player.hp} onMinus={() => onUpdateStat('hp', -1)} onPlus={() => onUpdateStat('hp', 1)} />
        <StatMini icon={<Shield size={14} className="text-blue-500"/>} value={player.stealth} onMinus={() => onUpdateStat('stealth', -1)} onPlus={() => onUpdateStat('stealth', 1)} />
        <StatMini icon={<Utensils size={14} className="text-orange-500"/>} value={player.hunger} onMinus={() => onUpdateStat('hunger', -1)} onPlus={() => onUpdateStat('hunger', 1)} />
        <StatMini icon={<Coins size={14} className="text-yellow-500"/>} value={player.gold} onMinus={() => onUpdateGold(-1)} onPlus={() => onUpdateGold(1)} />
      </div>

      {/* Tags */}
      {player.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {player.tags.map((tag: string, i: number) => (
            <span key={i} className="text-xs bg-red-900/50 border border-red-800 text-red-300 px-2 py-1 rounded flex items-center gap-1">
              {tag}
              <X size={10} className="cursor-pointer hover:text-white" onClick={(e) => { e.stopPropagation(); onRemoveTag(i); }}/>
            </span>
          ))}
        </div>
      )}

      {/* Equipment - Larger cards with clear labels and ammo */}
      {player.equipment.length > 0 && (
        <div className="bg-slate-800/30 rounded-lg p-3 mb-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Backpack size={10}/> 装备栏
          </div>
          <div className="space-y-2">
            {player.equipment.map((eq: Equipment, i: number) => (
              <div 
                key={i} 
                className="flex items-center gap-3 bg-slate-900/50 rounded-lg p-2 hover:bg-slate-800/50 transition-colors"
              >
                {/* Equipment thumbnail - clickable for details */}
                <div 
                  onClick={(e) => { e.stopPropagation(); onEquipmentClick(i); }}
                  className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden cursor-pointer hover:border-amber-500 shrink-0"
                >
                  {eq.card.imgUrl ? <img src={eq.card.imgUrl} className="w-full h-full object-cover"/> : <Package size={20} className="w-full h-full p-2 text-slate-600"/>}
                </div>
                
                {/* Equipment info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate mb-1">{eq.card.name}</div>
                  {/* Labels */}
                  {eq.labels && eq.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {eq.labels.map((lbl: string, li: number) => (
                        <span key={li} className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-medium">{lbl}</span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Ammo counter - always visible with +/- */}
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateEquipAmmo(i, -1); }}
                    className="w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded text-cyan-400 font-bold text-sm flex items-center justify-center"
                  >−</button>
                  <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded min-w-[50px] justify-center">
                    <span className="text-cyan-400">🔹</span>
                    <span className="text-sm font-bold text-cyan-300 font-mono">{eq.ammo || 0}</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateEquipAmmo(i, 1); }}
                    className="w-6 h-6 bg-cyan-600 hover:bg-cyan-500 rounded text-white font-bold text-sm flex items-center justify-center"
                  >+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={(e) => { e.stopPropagation(); onDrawCard('RED'); }} className="flex-1 py-1.5 text-xs bg-red-900/30 hover:bg-red-900/50 rounded text-red-400 font-medium min-w-[32px]">红</button>
        <button onClick={(e) => { e.stopPropagation(); onDrawCard('BLUE'); }} className="flex-1 py-1.5 text-xs bg-blue-900/30 hover:bg-blue-900/50 rounded text-blue-400 font-medium min-w-[32px]">蓝</button>
        <button onClick={(e) => { e.stopPropagation(); onDrawCard('GREEN'); }} className="flex-1 py-1.5 text-xs bg-green-900/30 hover:bg-green-900/50 rounded text-green-400 font-medium min-w-[32px]">绿</button>
        <button onClick={(e) => { e.stopPropagation(); onDrawCard('SHOP'); }} className="flex-1 py-1.5 text-xs bg-yellow-900/30 hover:bg-yellow-900/50 rounded text-yellow-400 font-medium min-w-[32px]">商店</button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDrawCard('SKILL'); }} 
          className="flex-1 py-1.5 text-xs bg-purple-900/30 hover:bg-purple-900/50 rounded text-purple-400 font-medium flex items-center justify-center gap-1 min-w-[48px]"
          title={`技能牌堆: ${player.skillDeck?.length || 0} 张`}
        >
          <Zap size={12}/> 技能
        </button>
        <button onClick={(e) => { e.stopPropagation(); onAddTag(); }} className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-400"><Plus size={12}/></button>
      </div>
    </div>
  );
}

