'use client';

import { useState } from 'react';
import { X, Heart, Shield, Utensils, Coins, Plus, Trash2, Backpack, Package, RotateCcw, ExternalLink, Play, Gift } from 'lucide-react';
import { Player, Equipment, ICard } from '../types';

interface PlayerDetailModalProps {
  player: Player;
  allPlayers: Player[];  // 所有玩家列表，用于赠送
  onClose: () => void;
  onUpdatePlayer: (updates: Partial<Player>) => void;
  onAddTag: () => void;
  onRemoveTag: (idx: number) => void;
  onDiscardCard: (idx: number, isSkill: boolean) => void;
  onPlayCard: (idx: number, isSkill: boolean) => void;
  onEquipCard: (idx: number, isSkill: boolean) => void;
  onGiftCard: (cardIndex: number, isSkill: boolean, toPlayerId: string) => void;  // 赠送卡牌
  onEquipmentClick: (idx: number) => void;
  onRemoveEquipment: (idx: number) => void;
  onRecoverCard: (idx: number) => void;
  onOpenDiscardModal: () => void;
}

function StatBlock({ label, value, max, icon, color, onChange }: any) {
  return (
    <div className="bg-slate-900 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="flex items-center justify-between">
        <button onClick={() => onChange(value - 1)} className={`w-8 h-8 rounded bg-${color}-900/30 hover:bg-${color}-900/50 text-${color}-400 font-bold`}>-</button>
        <span className="text-xl font-black">{value}{max ? `/${max}` : ''}</span>
        <button onClick={() => onChange(value + 1)} className={`w-8 h-8 rounded bg-${color}-900/30 hover:bg-${color}-900/50 text-${color}-400 font-bold`}>+</button>
      </div>
    </div>
  );
}

export default function PlayerDetailModal({ 
  player, 
  allPlayers,
  onClose, 
  onUpdatePlayer, 
  onAddTag, 
  onRemoveTag, 
  onDiscardCard,
  onPlayCard,
  onEquipCard,
  onGiftCard,
  onEquipmentClick, 
  onRemoveEquipment,
  onRecoverCard,
  onOpenDiscardModal
}: PlayerDetailModalProps) {
  // 赠送弹窗状态
  const [giftModal, setGiftModal] = useState<{ cardIndex: number; isSkill: boolean } | null>(null);
  const otherPlayers = allPlayers.filter(p => p.id !== player.id);

  // 根据技能牌的 role 字段找到原始拥有者
  const getSkillCardOwner = (card: ICard) => {
    if (card.role) {
      return allPlayers.find(p => p.name === card.role);
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center gap-4" style={{ borderLeftColor: player.color, borderLeftWidth: '6px' }}>
          <div className="w-16 h-16 rounded-full border-3 overflow-hidden bg-black" style={{ borderColor: player.color }}>
            {player.imgUrl && <img src={player.imgUrl} className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1">
            <div className="text-2xl font-bold" style={{ color: player.color }}>{player.name}</div>
            <div className="text-sm text-slate-400">{player.roleCard?.description || '冒险者'}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column */}
            <div className="space-y-4">
              {/* Stats */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">属性</h4>
                <div className="grid grid-cols-2 gap-3">
                  <StatBlock label="生命值" value={player.hp} max={player.maxHp} icon={<Heart className="text-red-500"/>} color="red" onChange={(v: number) => onUpdatePlayer({ hp: v })} />
                  <StatBlock label="潜行值" value={player.stealth} icon={<Shield className="text-blue-500"/>} color="blue" onChange={(v: number) => onUpdatePlayer({ stealth: v })} />
                  <StatBlock label="饥饿度" value={player.hunger} icon={<Utensils className="text-orange-500"/>} color="orange" onChange={(v: number) => onUpdatePlayer({ hunger: v })} />
                  <StatBlock label="金币" value={player.gold} icon={<Coins className="text-yellow-500"/>} color="yellow" onChange={(v: number) => onUpdatePlayer({ gold: v })} />
                </div>
              </div>

              {/* Tags */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center justify-between">
                  <span>状态标签</span>
                  <button onClick={onAddTag} className="text-slate-500 hover:text-white"><Plus size={16}/></button>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {player.tags.length === 0 && <span className="text-xs text-slate-600">无异常状态</span>}
                  {player.tags.map((tag: string, i: number) => (
                    <span key={i} className="text-xs bg-red-900/50 border border-red-800 text-red-300 px-2 py-1 rounded flex items-center gap-1">
                      {tag}
                      <X size={12} className="cursor-pointer hover:text-white" onClick={() => onRemoveTag(i)}/>
                    </span>
                  ))}
                </div>
              </div>

              {/* Equipment */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center justify-between">
                  <span><Backpack size={14} className="inline mr-1"/> 装备栏</span>
                  <span className="text-xs text-slate-600 font-normal">点击装备查看详情</span>
                </h4>
                <div className="space-y-2">
                  {player.equipment.length === 0 && <span className="text-xs text-slate-600">无装备</span>}
                  {player.equipment.map((eq: Equipment, i: number) => (
                    <div 
                      key={i} 
                      onClick={() => onEquipmentClick(i)}
                      className="flex items-center gap-2 bg-slate-900 rounded p-2 cursor-pointer hover:bg-slate-800 transition-colors"
                    >
                      <div className="w-10 h-10 rounded bg-black border border-slate-700 overflow-hidden shrink-0">
                        {eq.card.imgUrl ? <img src={eq.card.imgUrl} className="w-full h-full object-cover"/> : <Package className="w-full h-full p-2 text-slate-600"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{eq.card.name}</div>
                        {eq.labels && eq.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {eq.labels.map((lbl: string, li: number) => (
                              <span key={li} className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded">{lbl}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onRemoveEquipment(i); }} 
                        className="p-2 bg-slate-800 hover:bg-red-600 rounded-lg text-slate-400 hover:text-white transition-colors"
                        title="丢弃装备"
                      >
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Hand - Resources */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-sm font-bold text-amber-500/70 mb-3 uppercase tracking-wider">资源手牌 ({player.handResource.length})</h4>
                {player.handResource.length === 0 ? (
                  <div className="text-xs text-slate-600 py-4 text-center">空手牌</div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {player.handResource.map((card: ICard, i: number) => (
                      <div key={i} className="relative">
                        <div className="aspect-[2/3] rounded border border-slate-700 overflow-hidden bg-black">
                          <img src={card.imgUrl || `https://placehold.co/100x150/222/999?text=${card.name?.charAt(0) || '?'}`} className="w-full h-full object-cover"/>
                        </div>
                        <div className="text-[10px] text-center truncate mt-1 mb-1">{card.name}</div>
                        {/* Action buttons */}
                        <div className="flex gap-1 flex-wrap">
                          <button 
                            onClick={() => onPlayCard(i, false)}
                            className="flex-1 py-1 text-[10px] bg-emerald-600 hover:bg-emerald-500 rounded flex items-center justify-center gap-0.5 text-white font-medium min-w-[45px]"
                          >
                            <Play size={10}/> 打出
                          </button>
                          <button 
                            onClick={() => onEquipCard(i, false)}
                            className="flex-1 py-1 text-[10px] bg-amber-600 hover:bg-amber-500 rounded flex items-center justify-center gap-0.5 text-white font-medium min-w-[45px]"
                          >
                            <Backpack size={10}/> 装备
                          </button>
                          <button 
                            onClick={() => setGiftModal({ cardIndex: i, isSkill: false })}
                            className="flex-1 py-1 text-[10px] bg-pink-600 hover:bg-pink-500 rounded flex items-center justify-center gap-0.5 text-white font-medium min-w-[45px]"
                          >
                            <Gift size={10}/> 赠送
                          </button>
                          <button 
                            onClick={() => onDiscardCard(i, false)}
                            className="flex-1 py-1 text-[10px] bg-slate-700 hover:bg-red-600 rounded flex items-center justify-center gap-0.5 text-white font-medium min-w-[45px]"
                          >
                            <Trash2 size={10}/> 弃牌
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hand - Skills */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-sm font-bold text-purple-500/70 mb-3 uppercase tracking-wider">技能手牌 ({player.handSkill.length})</h4>
                {player.handSkill.length === 0 ? (
                  <div className="text-xs text-slate-600 py-4 text-center">空手牌</div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {player.handSkill.map((card: ICard, i: number) => {
                      // 根据技能牌的 role 字段判断是否是别人的牌
                      const originalOwner = getSkillCardOwner(card);
                      const isFromOther = originalOwner && originalOwner.id !== player.id;
                      
                      return (
                      <div key={i} className="relative">
                        <div className="aspect-[2/3] rounded border border-purple-700 overflow-hidden bg-black relative">
                          <img src={card.imgUrl || `https://placehold.co/100x150/222/999?text=${card.name?.charAt(0) || '?'}`} className="w-full h-full object-cover"/>
                          {isFromOther && originalOwner && (
                            <div 
                              className="absolute bottom-0 left-0 right-0 bg-black/80 text-[8px] text-center py-0.5 font-bold"
                              style={{ color: originalOwner.color }}
                            >
                              来自 {originalOwner.name}
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-center truncate mt-1 mb-1">{card.name}</div>
                        {/* Action buttons */}
                        <div className="flex gap-1 flex-wrap">
                          <button 
                            onClick={() => onPlayCard(i, true)}
                            className="flex-1 py-1 text-[10px] bg-emerald-600 hover:bg-emerald-500 rounded flex items-center justify-center gap-0.5 text-white font-medium min-w-[45px]"
                          >
                            <Play size={10}/> 打出
                          </button>
                          <button 
                            onClick={() => onEquipCard(i, true)}
                            className="flex-1 py-1 text-[10px] bg-amber-600 hover:bg-amber-500 rounded flex items-center justify-center gap-0.5 text-white font-medium min-w-[45px]"
                          >
                            <Backpack size={10}/> 装备
                          </button>
                          <button 
                            onClick={() => setGiftModal({ cardIndex: i, isSkill: true })}
                            className="flex-1 py-1 text-[10px] bg-pink-600 hover:bg-pink-500 rounded flex items-center justify-center gap-0.5 text-white font-medium min-w-[45px]"
                          >
                            <Gift size={10}/> 赠送
                          </button>
                          <button 
                            onClick={() => onDiscardCard(i, true)}
                            className="flex-1 py-1 text-[10px] bg-slate-700 hover:bg-red-600 rounded flex items-center justify-center gap-0.5 text-white font-medium min-w-[45px]"
                          >
                            <Trash2 size={10}/> 弃牌
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Discard */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">
                  个人弃牌堆 ({player.discard.length})
                </h4>
                {player.discard.length === 0 ? (
                  <div className="text-xs text-slate-600 py-4 text-center">弃牌堆为空</div>
                ) : (
                  // 显示最后弃掉的一张（索引0是最新的），点击打开弹窗
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-16 shrink-0 rounded border border-slate-600 overflow-hidden bg-black">
                      <img src={player.discard[0].imgUrl || `https://placehold.co/50x70/222/999?text=?`} className="w-full h-full object-cover"/>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-slate-300">{player.discard[0].name}</div>
                      <div className="text-xs text-slate-500">最新弃牌</div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onRecoverCard(0)}
                        className="px-3 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-600 rounded flex items-center gap-1 text-white font-medium"
                      >
                        <RotateCcw size={12}/> 取回
                      </button>
                      <button 
                        onClick={onOpenDiscardModal}
                        className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 rounded flex items-center gap-1 text-white font-medium"
                      >
                        <ExternalLink size={12}/> 查看全部
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 赠送选择弹窗 */}
      {giftModal && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70"
          onClick={() => setGiftModal(null)}
        >
          <div 
            className="bg-slate-800 border border-pink-600 rounded-xl p-4 max-w-sm w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-pink-400 mb-4 flex items-center gap-2">
              <Gift size={20}/> 选择赠送对象
            </h3>
            {otherPlayers.length === 0 ? (
              <div className="text-slate-500 text-center py-4">没有其他玩家</div>
            ) : (
              <div className="space-y-2">
                {otherPlayers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onGiftCard(giftModal.cardIndex, giftModal.isSkill, p.id);
                      setGiftModal(null);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700 transition-colors"
                    style={{ borderLeft: `4px solid ${p.color}` }}
                  >
                    <div className="w-10 h-10 rounded-full border-2 overflow-hidden bg-black" style={{ borderColor: p.color }}>
                      {p.imgUrl && <img src={p.imgUrl} className="w-full h-full object-cover"/>}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-bold" style={{ color: p.color }}>{p.name}</div>
                      <div className="text-xs text-slate-400">
                        手牌: {p.handResource.length + p.handSkill.length} | 装备: {p.equipment.length}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setGiftModal(null)}
              className="w-full mt-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
