'use client';

import { useState } from 'react';
import { X, Skull, Zap, Crown, Sun, Layers, Users, User } from 'lucide-react';
import { ICard, ActiveEnemy } from '../types';

interface CombinedDiscardModalProps {
  enemyDiscard: ICard[];
  supportDiscard: ICard[];
  bossDiscard: ICard[];
  daynightDiscard: ICard[];
  specialCharacterDiscard: ICard[];
  onClose: () => void;
  onRestoreEnemyToActive: (index: number) => void;
  onRestoreEnemyToDeck: (index: number) => void;
  onRestoreBossToActive: (index: number) => void;
  onRestoreBossToDeck: (index: number) => void;
  onRestoreSupportToActive: (index: number) => void;
  onRestoreSupportToDeck: (index: number) => void;
  onRestoreDaynightToDeck: (index: number) => void;
  onRestoreSpecialCharacterToActive: (index: number) => void;
  onRestoreSpecialCharacterToDeck: (index: number) => void;
}

type TabType = 'enemy' | 'boss' | 'support' | 'daynight' | 'specialCharacter';

export default function CombinedDiscardModal({
  enemyDiscard,
  supportDiscard,
  bossDiscard,
  daynightDiscard,
  specialCharacterDiscard,
  onClose,
  onRestoreEnemyToActive,
  onRestoreEnemyToDeck,
  onRestoreBossToActive,
  onRestoreBossToDeck,
  onRestoreSupportToActive,
  onRestoreSupportToDeck,
  onRestoreDaynightToDeck,
  onRestoreSpecialCharacterToActive,
  onRestoreSpecialCharacterToDeck,
}: CombinedDiscardModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('enemy');

  const tabs: { key: TabType; label: string; icon: React.ReactNode; count: number; color: string }[] = [
    { key: 'enemy', label: '敌人', icon: <Skull size={14} />, count: enemyDiscard.length, color: 'purple' },
    { key: 'boss', label: 'Boss', icon: <Crown size={14} />, count: bossDiscard.length, color: 'rose' },
    { key: 'support', label: '支援', icon: <Zap size={14} />, count: supportDiscard.length, color: 'cyan' },
    { key: 'daynight', label: '日夜', icon: <Sun size={14} />, count: daynightDiscard.length, color: 'indigo' },
    { key: 'specialCharacter', label: '特殊人物', icon: <User size={14} />, count: specialCharacterDiscard.length, color: 'pink' },
  ];

  const renderCards = () => {
    let cards: ICard[] = [];
    let canReturnToField = false;

    switch (activeTab) {
      case 'enemy':
        cards = enemyDiscard;
        canReturnToField = true;
        break;
      case 'boss':
        cards = bossDiscard;
        canReturnToField = true;
        break;
      case 'support':
        cards = supportDiscard;
        canReturnToField = true;
        break;
      case 'daynight':
        cards = daynightDiscard;
        break;
      case 'specialCharacter':
        cards = specialCharacterDiscard;
        canReturnToField = true;
        break;
    }

    if (cards.length === 0) {
      return <div className="text-center text-slate-600 py-12">弃牌堆是空的</div>;
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <div
            key={index}
            className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-amber-600/50 transition-colors"
          >
            {/* Card Image */}
            <div className="aspect-square bg-black">
              {card.imgUrl ? (
                <img src={card.imgUrl} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  <Layers size={32} />
                </div>
              )}
            </div>

            {/* Card Info */}
            <div className="p-3">
              <div className="font-bold text-sm text-white truncate mb-1">{card.name}</div>
              <div className="flex gap-2 text-xs text-slate-500 mb-3">
                {card.hp && <span>HP: {card.hp}</span>}
                {card.attack && <span>攻击: {card.attack}</span>}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {canReturnToField && (
                  <button
                    onClick={() => {
                      if (activeTab === 'enemy') onRestoreEnemyToActive(index);
                      else if (activeTab === 'boss') onRestoreBossToActive(index);
                      else if (activeTab === 'support') onRestoreSupportToActive(index);
                      else if (activeTab === 'specialCharacter') onRestoreSpecialCharacterToActive(index);
                    }}
                    className="flex-1 py-2 bg-amber-900/30 hover:bg-amber-900/50 rounded-lg text-xs font-bold text-amber-400 flex items-center justify-center gap-1 transition-colors"
                  >
                    <Users size={12} /> 放回战场
                  </button>
                )}
                <button
                  onClick={() => {
                    if (activeTab === 'enemy') onRestoreEnemyToDeck(index);
                    else if (activeTab === 'boss') onRestoreBossToDeck(index);
                    else if (activeTab === 'support') onRestoreSupportToDeck(index);
                    else if (activeTab === 'daynight') onRestoreDaynightToDeck(index);
                    else if (activeTab === 'specialCharacter') onRestoreSpecialCharacterToDeck(index);
                  }}
                  className={`${canReturnToField ? 'flex-1' : 'w-full'} py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-400 flex items-center justify-center gap-1 transition-colors`}
                >
                  <Layers size={12} /> 放回牌库
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const totalCount = enemyDiscard.length + bossDiscard.length + supportDiscard.length + daynightDiscard.length + specialCharacterDiscard.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-xl font-bold text-amber-400 flex items-center gap-2">
            <Layers size={20} /> 弃牌区 ({totalCount})
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                activeTab === tab.key
                  ? `bg-${tab.color}-900/30 text-${tab.color}-400 border-b-2 border-${tab.color}-500`
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded ${activeTab === tab.key ? `bg-${tab.color}-900/50` : 'bg-slate-800'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">{renderCards()}</div>
      </div>
    </div>
  );
}

