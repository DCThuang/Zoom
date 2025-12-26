'use client';

import { useState, useMemo } from 'react';
import { Skull, X, Users, Layers, Crown, Zap, User, Filter } from 'lucide-react';
import { Player, ActiveEnemy, ICard } from '../types';
import EnemyCard from './EnemyCard';
import ImageViewerModal from './ImageViewerModal';

interface EnemyListProps {
  activeEnemies: ActiveEnemy[];
  activeBosses: ActiveEnemy[];
  activeSupports: ActiveEnemy[];
  activeSpecialCharacters: ActiveEnemy[];
  players: Player[];
  enemyDiscard: ICard[];
  onSelectEnemy: (enemy: ActiveEnemy) => void;
  onUpdateEnemyHp: (enemyId: string, delta: number) => void;
  onBindEnemyToPlayer: (enemyId: string, playerId: string | undefined) => void;
  onDiscardEnemy: (enemyId: string) => void;
  onUpdateBossHp: (bossId: string, delta: number) => void;
  onBindBossToPlayer: (bossId: string, playerId: string | undefined) => void;
  onDiscardBoss: (bossId: string) => void;
  onUpdateSupportHp: (supportId: string, delta: number) => void;
  onBindSupportToPlayer: (supportId: string, playerId: string | undefined) => void;
  onDiscardSupport: (supportId: string) => void;
  onUpdateSpecialCharacterHp: (charId: string, delta: number) => void;
  onBindSpecialCharacterToPlayer: (charId: string, playerId: string | undefined) => void;
  onDiscardSpecialCharacter: (charId: string) => void;
  onRestoreEnemyToActive: (cardIndex: number) => void;
  onRestoreEnemyToDeck: (cardIndex: number) => void;
}

export default function EnemyList({
  activeEnemies,
  activeBosses,
  activeSupports,
  activeSpecialCharacters,
  players,
  enemyDiscard,
  onSelectEnemy,
  onUpdateEnemyHp,
  onBindEnemyToPlayer,
  onDiscardEnemy,
  onUpdateBossHp,
  onBindBossToPlayer,
  onDiscardBoss,
  onUpdateSupportHp,
  onBindSupportToPlayer,
  onDiscardSupport,
  onUpdateSpecialCharacterHp,
  onBindSpecialCharacterToPlayer,
  onDiscardSpecialCharacter,
  onRestoreEnemyToActive,
  onRestoreEnemyToDeck,
}: EnemyListProps) {
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [viewingCard, setViewingCard] = useState<ICard | null>(null);
  const [filterBy, setFilterBy] = useState<string>('all'); // 'all' | 'unbound' | playerId
  
  // 根据筛选条件过滤敌人
  const filterEnemies = (enemies: ActiveEnemy[]) => {
    if (filterBy === 'all') return enemies;
    if (filterBy === 'unbound') return enemies.filter(e => !e.boundToPlayerId);
    return enemies.filter(e => e.boundToPlayerId === filterBy);
  };
  
  const filteredBosses = useMemo(() => filterEnemies(activeBosses), [activeBosses, filterBy]);
  const filteredSupports = useMemo(() => filterEnemies(activeSupports), [activeSupports, filterBy]);
  const filteredSpecialCharacters = useMemo(() => filterEnemies(activeSpecialCharacters), [activeSpecialCharacters, filterBy]);
  const filteredEnemies = useMemo(() => filterEnemies(activeEnemies), [activeEnemies, filterBy]);
  
  // 计算各筛选项的数量
  const totalCount = activeBosses.length + activeSupports.length + activeSpecialCharacters.length + activeEnemies.length;
  const unboundCount = [...activeBosses, ...activeSupports, ...activeSpecialCharacters, ...activeEnemies].filter(e => !e.boundToPlayerId).length;
  const getPlayerBoundCount = (playerId: string) => 
    [...activeBosses, ...activeSupports, ...activeSpecialCharacters, ...activeEnemies].filter(e => e.boundToPlayerId === playerId).length;
  
  const filteredTotal = filteredBosses.length + filteredSupports.length + filteredSpecialCharacters.length + filteredEnemies.length;
  
  return (
    <div className="w-56 bg-[#0d0d10] border-l border-slate-800 overflow-y-auto p-3 space-y-3 shrink-0">
      <div className="text-xs text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
        <Skull size={12}/> 敌人列表
      </div>
      
      {/* 筛选选择器 */}
      <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-800">
        <div className="flex items-center gap-1 mb-2">
          <Filter size={12} className="text-slate-500"/>
          <span className="text-[10px] text-slate-500 uppercase">按绑定筛选</span>
        </div>
        <select
          value={filterBy}
          onChange={(e) => setFilterBy(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
        >
          <option value="all">全部 ({totalCount})</option>
          <option value="unbound">未绑定 ({unboundCount})</option>
          {players.map(p => (
            <option key={p.id} value={p.id} style={{ color: p.color }}>
              {p.name} ({getPlayerBoundCount(p.id)})
            </option>
          ))}
        </select>
      </div>

      {/* Active Bosses */}
      {filteredBosses.length > 0 && (
        <>
          <div className="text-[10px] text-rose-500 uppercase tracking-widest mt-2 flex items-center gap-1">
            <Crown size={10}/> Boss ({filteredBosses.length})
          </div>
          {filteredBosses.map(boss => (
            <EnemyCard 
              key={boss.id}
              enemy={boss}
              players={players}
              isBoss={true}
              onClick={() => onSelectEnemy(boss)}
              onUpdateHp={(delta: number) => onUpdateBossHp(boss.id, delta)}
              onBindPlayer={(playerId: string | undefined) => onBindBossToPlayer(boss.id, playerId)}
              onDiscard={() => onDiscardBoss(boss.id)}
              onViewCard={() => setViewingCard(boss.card)}
            />
          ))}
        </>
      )}

      {/* Active Supports */}
      {filteredSupports.length > 0 && (
        <>
          <div className="text-[10px] text-cyan-500 uppercase tracking-widest mt-2 flex items-center gap-1">
            <Zap size={10}/> 支援 ({filteredSupports.length})
          </div>
          {filteredSupports.map(support => (
            <EnemyCard 
              key={support.id}
              enemy={support}
              players={players}
              isSupport={true}
              onClick={() => onSelectEnemy(support)}
              onUpdateHp={(delta: number) => onUpdateSupportHp(support.id, delta)}
              onBindPlayer={(playerId: string | undefined) => onBindSupportToPlayer(support.id, playerId)}
              onDiscard={() => onDiscardSupport(support.id)}
              onViewCard={() => setViewingCard(support.card)}
            />
          ))}
        </>
      )}

      {/* Active Special Characters */}
      {filteredSpecialCharacters.length > 0 && (
        <>
          <div className="text-[10px] text-pink-500 uppercase tracking-widest mt-2 flex items-center gap-1">
            <User size={10}/> 特殊人物 ({filteredSpecialCharacters.length})
          </div>
          {filteredSpecialCharacters.map(character => (
            <EnemyCard 
              key={character.id}
              enemy={character}
              players={players}
              isSpecialCharacter={true}
              onClick={() => onSelectEnemy(character)}
              onUpdateHp={(delta: number) => onUpdateSpecialCharacterHp(character.id, delta)}
              onBindPlayer={(playerId: string | undefined) => onBindSpecialCharacterToPlayer(character.id, playerId)}
              onDiscard={() => onDiscardSpecialCharacter(character.id)}
              onViewCard={() => setViewingCard(character.card)}
            />
          ))}
        </>
      )}

      {/* Active Enemies */}
      {filteredEnemies.length > 0 && (
        <>
          <div className="text-[10px] text-red-500 uppercase tracking-widest mt-2 flex items-center gap-1">
            <Skull size={10}/> 敌人 ({filteredEnemies.length})
          </div>
          {filteredEnemies.map(enemy => (
            <EnemyCard 
              key={enemy.id}
              enemy={enemy}
              players={players}
              onClick={() => onSelectEnemy(enemy)}
              onUpdateHp={(delta: number) => onUpdateEnemyHp(enemy.id, delta)}
              onBindPlayer={(playerId: string | undefined) => onBindEnemyToPlayer(enemy.id, playerId)}
              onDiscard={() => onDiscardEnemy(enemy.id)}
              onViewCard={() => setViewingCard(enemy.card)}
            />
          ))}
        </>
      )}

      {filteredTotal === 0 && (
        <div className="text-center text-slate-600 py-8 text-sm">
          {filterBy === 'all' ? '暂无激活的敌人' : 
           filterBy === 'unbound' ? '暂无未绑定的敌人' :
           `暂无绑定到该玩家的敌人`}
        </div>
      )}

      {/* Enemy Discard Pile - Clickable */}
      {enemyDiscard.length > 0 && (
        <div 
          className="mt-4 pt-4 border-t border-slate-800 cursor-pointer hover:bg-slate-900/50 rounded-lg p-2 -m-2 transition-colors"
          onClick={() => setShowDiscardModal(true)}
        >
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
            <span>敌人弃牌堆 ({enemyDiscard.length})</span>
            <span className="text-[10px] text-slate-600">点击查看</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {enemyDiscard.slice(0, 4).map((card, i) => (
              <div key={i} className="w-8 h-8 rounded bg-slate-800 border border-slate-700 overflow-hidden opacity-50">
                {card.imgUrl && <img src={card.thumbUrl || card.imgUrl} className="w-full h-full object-contain"/>}
              </div>
            ))}
            {enemyDiscard.length > 4 && (
              <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-500">
                +{enemyDiscard.length - 4}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enemy Discard Modal */}
      {showDiscardModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowDiscardModal(false)}
        >
          <div 
            className="bg-slate-900 border border-red-900/50 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">
                <Skull size={20}/> 敌人弃牌堆 ({enemyDiscard.length})
              </h3>
              <button onClick={() => setShowDiscardModal(false)} className="text-slate-400 hover:text-white">
                <X size={24}/>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto flex-1">
              {enemyDiscard.length === 0 ? (
                <div className="text-center text-slate-600 py-12">弃牌堆是空的</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {enemyDiscard.map((card, index) => (
                    <div 
                      key={index} 
                      className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden group hover:border-red-600/50 transition-colors"
                      onDoubleClick={() => setViewingCard(card)}
                    >
                      {/* Card Image */}
                      <div className="aspect-square bg-black cursor-pointer" title="双击查看大图">
                        {card.imgUrl ? (
                          <img src={card.thumbUrl || card.imgUrl} className="w-full h-full object-contain"/>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Skull size={32}/>
                          </div>
                        )}
                      </div>
                      
                      {/* Card Info */}
                      <div className="p-3">
                        <div className="font-bold text-sm text-red-400 truncate mb-1">{card.name}</div>
                        <div className="flex gap-2 text-xs text-slate-500 mb-3">
                          {card.hp && <span>HP: {card.hp}</span>}
                          {card.attack && <span>攻击: {card.attack}</span>}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              onRestoreEnemyToActive(index);
                              if (enemyDiscard.length === 1) setShowDiscardModal(false);
                            }}
                            className="flex-1 py-2 bg-red-900/30 hover:bg-red-900/50 rounded-lg text-xs font-bold text-red-400 flex items-center justify-center gap-1 transition-colors"
                          >
                            <Users size={12}/> 放回战场
                          </button>
                          <button
                            onClick={() => {
                              onRestoreEnemyToDeck(index);
                              if (enemyDiscard.length === 1) setShowDiscardModal(false);
                            }}
                            className="flex-1 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-400 flex items-center justify-center gap-1 transition-colors"
                          >
                            <Layers size={12}/> 放回牌库
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {viewingCard && (
        <ImageViewerModal 
          card={viewingCard}
          onClose={() => setViewingCard(null)}
        />
      )}
    </div>
  );
}

