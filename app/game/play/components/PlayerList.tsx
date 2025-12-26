'use client';

import { User } from 'lucide-react';
import { Player } from '../types';
import PlayerCard from './PlayerCard';

interface PlayerListProps {
  players: Player[];
  onUpdatePlayer: (playerId: string, updates: Partial<Player>) => void;
  onUpdateGold: (playerId: string, delta: number) => void;
  onAddTag: (playerId: string) => void;
  onRemoveTag: (playerId: string, idx: number) => void;
  onDrawCard: (playerId: string, deck: 'RED' | 'BLUE' | 'GREEN' | 'SHOP' | 'SKILL') => void;
  onSelectPlayer: (player: Player) => void;
  onEquipmentClick: (playerId: string, idx: number) => void;
  onUpdateEquipAmmo: (playerId: string, equipIdx: number, delta: number) => void;
  onViewSkillDeck: (playerId: string) => void;
}

export default function PlayerList({
  players,
  onUpdatePlayer,
  onUpdateGold,
  onAddTag,
  onRemoveTag,
  onDrawCard,
  onSelectPlayer,
  onEquipmentClick,
  onUpdateEquipAmmo,
  onViewSkillDeck,
}: PlayerListProps) {
  return (
    <div className="w-[420px] bg-[#0d0d10] border-r border-slate-800 overflow-y-auto p-4 space-y-4 shrink-0">
      <div className="text-xs text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
        <User size={12}/> 玩家列表
      </div>
      
      {players.map(player => (
        <PlayerCard 
          key={player.id}
          player={player}
          onUpdateStat={(stat: keyof Player, delta: number) => onUpdatePlayer(player.id, { [stat]: (player as any)[stat] + delta })}
          onUpdateGold={(delta: number) => onUpdateGold(player.id, delta)}
          onAddTag={() => onAddTag(player.id)}
          onRemoveTag={(idx: number) => onRemoveTag(player.id, idx)}
          onDrawCard={(deck: 'RED' | 'BLUE' | 'GREEN' | 'SHOP' | 'SKILL') => onDrawCard(player.id, deck)}
          onClick={() => onSelectPlayer(player)}
          onEquipmentClick={(idx: number) => onEquipmentClick(player.id, idx)}
          onUpdateEquipAmmo={(equipIdx: number, delta: number) => onUpdateEquipAmmo(player.id, equipIdx, delta)}
          onViewSkillDeck={() => onViewSkillDeck(player.id)}
        />
      ))}
    </div>
  );
}

