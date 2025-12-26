'use client';

import { Heart, Trash2, Crown, Zap, User } from 'lucide-react';
import { Player, ActiveEnemy } from '../types';

interface EnemyCardProps {
  enemy: ActiveEnemy;
  players: Player[];
  isBoss?: boolean;
  isSupport?: boolean;
  isSpecialCharacter?: boolean;
  onClick: () => void;
  onUpdateHp: (delta: number) => void;
  onBindPlayer: (playerId: string | undefined) => void;
  onDiscard: () => void;
  onViewCard?: () => void;
}

export default function EnemyCard({ enemy, players, isBoss = false, isSupport = false, isSpecialCharacter = false, onClick, onUpdateHp, onBindPlayer, onDiscard, onViewCard }: EnemyCardProps) {
  const boundPlayer = players.find((p: Player) => p.id === enemy.boundToPlayerId);
  const hpPercent = (enemy.currentHp / enemy.maxHp) * 100;
  
  const borderColor = isBoss ? 'border-rose-800' : isSupport ? 'border-cyan-800' : isSpecialCharacter ? 'border-pink-800' : 'border-red-900/50';
  const bgColor = isBoss ? 'bg-rose-950/40' : isSupport ? 'bg-cyan-950/40' : isSpecialCharacter ? 'bg-pink-950/40' : 'bg-red-950/30';
  const hoverBorder = isBoss ? 'hover:border-rose-600' : isSupport ? 'hover:border-cyan-600' : isSpecialCharacter ? 'hover:border-pink-600' : 'hover:border-red-700/50';
  const imageBorder = isBoss ? 'border-rose-700' : isSupport ? 'border-cyan-700' : isSpecialCharacter ? 'border-pink-700' : 'border-red-800';
  
  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-2 ${hoverBorder} transition-colors`}>
      {/* Type Icon */}
      {isBoss && (
        <div className="flex items-center gap-1 text-[10px] text-rose-400 mb-1">
          <Crown size={10} /> <span className="font-bold">BOSS</span>
        </div>
      )}
      {isSupport && (
        <div className="flex items-center gap-1 text-[10px] text-cyan-400 mb-1">
          <Zap size={10} /> <span className="font-bold">支援</span>
        </div>
      )}
      {isSpecialCharacter && (
        <div className="flex items-center gap-1 text-[10px] text-pink-400 mb-1">
          <User size={10} /> <span className="font-bold">特殊人物</span>
        </div>
      )}
      
      {/* Card Image - Top */}
      <div 
        onClick={onClick}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onViewCard?.();
        }}
        className={`w-full h-40 rounded border ${imageBorder} overflow-hidden bg-black cursor-pointer hover:brightness-110 relative mb-2`}
        title="双击查看大图"
      >
        {enemy.card.imgUrl && <img src={enemy.card.thumbUrl || enemy.card.imgUrl} className="w-full h-full object-contain" />}
        {/* Name overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 py-1">
          <div className="text-[10px] font-bold text-white truncate">{enemy.card.name}</div>
        </div>
      </div>

      {/* Stats & Controls - Bottom */}
      <div className="flex flex-col gap-1.5">
        {/* Bind Player & HP Row */}
        <div className="flex items-center gap-1.5">
          {/* Bind to Player - Left */}
          <select 
            value={enemy.boundToPlayerId || ''}
            onChange={(e) => onBindPlayer(e.target.value || undefined)}
            className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded px-1 py-1 text-[10px] text-white"
          >
            <option value="">绑定</option>
            {players.map((p: Player) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          
          {/* HP - Right */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button 
              onClick={() => onUpdateHp(-1)}
              className="text-slate-500 hover:text-red-400 text-xs w-4 h-4 flex items-center justify-center"
            >−</button>
            <Heart size={10} className="text-red-500"/>
            <span className="text-xs font-bold text-red-400 font-mono">{enemy.currentHp}</span>
            <button 
              onClick={() => onUpdateHp(1)}
              className="text-slate-500 hover:text-red-400 text-xs w-4 h-4 flex items-center justify-center"
            >+</button>
          </div>
        </div>

        {/* Bound Player Display & Attack */}
        <div className="flex items-center justify-between">
          {boundPlayer ? (
            <div className="flex items-center gap-1 text-[10px]">
              <div className="w-4 h-4 rounded-full border overflow-hidden shrink-0" style={{ borderColor: boundPlayer.color }}>
                {boundPlayer.imgUrl && <img src={boundPlayer.imgUrl} className="w-full h-full object-cover"/>}
              </div>
              <span className="truncate" style={{ color: boundPlayer.color }}>{boundPlayer.name}</span>
            </div>
          ) : (
            <div></div>
          )}
          {enemy.card.attack && (
            <div className="text-[10px] text-slate-400">
              攻: <span className="text-red-300 font-bold">{enemy.card.attack}</span>
            </div>
          )}
        </div>

        {/* Discard Button */}
        <button 
          onClick={onDiscard}
          className="w-full py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 text-[10px] font-bold flex items-center justify-center gap-1"
        >
          <Trash2 size={10}/> 弃牌
        </button>
      </div>
    </div>
  );
}

