'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, Backpack, Gift, Trash2, Heart, Sword, Eye, Zap } from 'lucide-react';
import { ICard, Player } from '../../play/types';
import { getCardDisplayUrl } from '../../play/utils/imageUtils';

interface CardCarouselProps {
  cards: ICard[];
  title: string;
  titleColor: string;
  borderColor: string;
  currentPlayer: Player;
  allPlayers: Player[];
  isSkill: boolean;
  onPlay: (index: number) => void;
  onDiscard: (index: number) => void;
  onEquip: (index: number) => void;
  onGift: (index: number) => void;
}

export default function CardCarousel({
  cards,
  title,
  titleColor,
  borderColor,
  currentPlayer,
  allPlayers,
  isSkill,
  onPlay,
  onDiscard,
  onEquip,
  onGift,
}: CardCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [showActions, setShowActions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 确保 currentIndex 在有效范围内
  useEffect(() => {
    if (cards.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= cards.length) {
      setCurrentIndex(cards.length - 1);
    }
  }, [cards.length, currentIndex]);

  const currentCard = cards[currentIndex];

  // 判断技能卡原主人
  const getOriginalOwner = (card: ICard) => {
    return isSkill && card.role ? allPlayers.find(p => p.name === card.role) : null;
  };

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setShowActions(false);
    }
  }, [currentIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowActions(false);
    }
  }, [currentIndex, cards.length]);

  // 触摸/鼠标事件处理
  const handleStart = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
    setTranslateX(0);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    const diff = clientX - startX;
    setTranslateX(diff);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // 滑动阈值
    const threshold = 50;
    if (translateX > threshold && currentIndex > 0) {
      handlePrev();
    } else if (translateX < -threshold && currentIndex < cards.length - 1) {
      handleNext();
    }
    
    setTranslateX(0);
  };

  // 触摸事件
  const handleTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);
  const handleTouchEnd = () => handleEnd();

  // 鼠标事件
  const handleMouseDown = (e: React.MouseEvent) => handleStart(e.clientX);
  const handleMouseMove = (e: React.MouseEvent) => handleMove(e.clientX);
  const handleMouseUp = () => handleEnd();
  const handleMouseLeave = () => { if (isDragging) handleEnd(); };

  if (cards.length === 0) {
    return (
      <div className="mb-6">
        <div className={`text-sm font-bold mb-3 ${titleColor}`}>{title} (0)</div>
        <div className="text-center text-slate-600 py-12 bg-slate-900/50 rounded-xl">
          暂无卡牌
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <div className={`text-sm font-bold ${titleColor}`}>{title} ({cards.length})</div>
        <div className="text-xs text-slate-500">
          {currentIndex + 1} / {cards.length}
        </div>
      </div>

      {/* 轮播区域 */}
      <div className="relative">
        {/* 左箭头 */}
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/70 hover:bg-black/90 rounded-full text-white shadow-lg transition-all"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* 右箭头 */}
        {currentIndex < cards.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/70 hover:bg-black/90 rounded-full text-white shadow-lg transition-all"
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* 卡牌滑动容器 */}
        <div
          ref={containerRef}
          className="overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* 卡牌列表 */}
          <div
            className="flex items-center justify-center py-4 relative"
            style={{
              transform: `translateX(${translateX * 0.5}px)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out'
            }}
          >
            {/* 左侧小卡牌 */}
            <div className="flex items-center gap-1 px-2">
              {cards.slice(Math.max(0, currentIndex - 3), currentIndex).reverse().map((card, i) => {
                const realIndex = currentIndex - i - 1;
                const scale = 0.5 - (i * 0.1);
                const opacity = 0.6 - (i * 0.15);
                return (
                  <div
                    key={`left-${realIndex}`}
                    className="shrink-0 transition-all cursor-pointer"
                    style={{
                      transform: `scale(${scale})`,
                      opacity: opacity,
                      marginRight: '-30px',
                      zIndex: 3 - i,
                    }}
                    onClick={() => {
                      setCurrentIndex(realIndex);
                      setShowActions(false);
                    }}
                  >
                    <div className="w-20 h-28 rounded-lg border-2 border-slate-600 overflow-hidden bg-slate-900 shadow-lg">
                      <img
                        src={getCardDisplayUrl(card)}
                        alt={card.name || '卡牌'}
                        className="w-full h-full object-contain"
                        draggable={false}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://placehold.co/80x112/1e293b/64748b?text=${card.name?.charAt(0) || '?'}`;
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 中间主卡牌 */}
            <div
              className={`shrink-0 transition-all duration-300 ${showActions ? 'scale-95' : ''}`}
              onClick={() => setShowActions(!showActions)}
            >
              <div
                className={`w-40 h-56 rounded-xl border-3 overflow-hidden bg-slate-900 shadow-2xl relative cursor-pointer ${
                  showActions ? 'ring-2 ring-amber-400' : ''
                }`}
                style={{ borderColor: borderColor }}
              >
                <img
                  src={getCardDisplayUrl(currentCard)}
                  alt={currentCard?.name || '卡牌'}
                  className="w-full h-full object-contain"
                  draggable={false}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://placehold.co/160x224/1e293b/64748b?text=${currentCard?.name?.charAt(0) || '?'}`;
                  }}
                />
                
                {/* 来自其他玩家的标识 */}
                {currentCard && (() => {
                  const owner = getOriginalOwner(currentCard);
                  const isFromOther = owner && owner.id !== currentPlayer.id;
                  if (isFromOther && owner) {
                    return (
                      <div
                        className="absolute top-0 left-0 right-0 bg-black/80 text-xs text-center py-1 font-bold"
                        style={{ color: owner.color }}
                      >
                        来自 {owner.name}
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* 操作按钮覆盖层 */}
                {showActions && (
                  <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-2 p-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); onPlay(currentIndex); setShowActions(false); }}
                      className="w-full py-2.5 text-sm bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center justify-center gap-2 text-white font-bold shadow-lg"
                    >
                      <Play size={16} /> 打出
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEquip(currentIndex); setShowActions(false); }}
                      className="w-full py-2.5 text-sm bg-amber-600 hover:bg-amber-500 rounded-lg flex items-center justify-center gap-2 text-white font-bold shadow-lg"
                    >
                      <Backpack size={16} /> 装备
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onGift(currentIndex); setShowActions(false); }}
                      className="w-full py-2.5 text-sm bg-pink-600 hover:bg-pink-500 rounded-lg flex items-center justify-center gap-2 text-white font-bold shadow-lg"
                    >
                      <Gift size={16} /> 赠送
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDiscard(currentIndex); setShowActions(false); }}
                      className="w-full py-2.5 text-sm bg-slate-700 hover:bg-red-600 rounded-lg flex items-center justify-center gap-2 text-white font-bold shadow-lg"
                    >
                      <Trash2 size={16} /> 弃牌
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 右侧小卡牌 */}
            <div className="flex items-center gap-1 px-2">
              {cards.slice(currentIndex + 1, currentIndex + 4).map((card, i) => {
                const realIndex = currentIndex + i + 1;
                const scale = 0.5 - (i * 0.1);
                const opacity = 0.6 - (i * 0.15);
                return (
                  <div
                    key={`right-${realIndex}`}
                    className="shrink-0 transition-all cursor-pointer"
                    style={{
                      transform: `scale(${scale})`,
                      opacity: opacity,
                      marginLeft: '-30px',
                      zIndex: 3 - i,
                    }}
                    onClick={() => {
                      setCurrentIndex(realIndex);
                      setShowActions(false);
                    }}
                  >
                    <div className="w-20 h-28 rounded-lg border-2 border-slate-600 overflow-hidden bg-slate-900 shadow-lg">
                      <img
                        src={getCardDisplayUrl(card)}
                        alt={card.name || '卡牌'}
                        className="w-full h-full object-contain"
                        draggable={false}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://placehold.co/80x112/1e293b/64748b?text=${card.name?.charAt(0) || '?'}`;
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 卡牌详情区域 */}
        {currentCard && (
          <div className="mt-3 px-4 py-3 bg-slate-900/80 rounded-xl border border-slate-800">
            {/* 卡牌名称和属性 */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-lg font-bold text-white flex-1">{currentCard.name}</h3>
              
              {/* 属性小图标 */}
              <div className="flex items-center gap-2 shrink-0">
                {currentCard.hp !== undefined && (
                  <div className="flex items-center gap-1 bg-red-950/50 px-2 py-1 rounded border border-red-900/50">
                    <Heart size={12} className="text-red-400" />
                    <span className="text-red-300 text-xs font-bold">{currentCard.hp}</span>
                  </div>
                )}
                {currentCard.attack !== undefined && (
                  <div className="flex items-center gap-1 bg-orange-950/50 px-2 py-1 rounded border border-orange-900/50">
                    <Sword size={12} className="text-orange-400" />
                    <span className="text-orange-300 text-xs font-bold">{currentCard.attack}</span>
                  </div>
                )}
                {currentCard.stealth !== undefined && (
                  <div className="flex items-center gap-1 bg-purple-950/50 px-2 py-1 rounded border border-purple-900/50">
                    <Eye size={12} className="text-purple-400" />
                    <span className="text-purple-300 text-xs font-bold">{currentCard.stealth}</span>
                  </div>
                )}
                {currentCard.cost !== undefined && (
                  <div className="flex items-center gap-1 bg-blue-950/50 px-2 py-1 rounded border border-blue-900/50">
                    <Zap size={12} className="text-blue-400" />
                    <span className="text-blue-300 text-xs font-bold">{currentCard.cost}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* 描述 */}
            {currentCard.description && (
              <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                {currentCard.description}
              </p>
            )}
            
            {/* 类型和角色 */}
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-800">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                isSkill ? 'bg-purple-900/50 text-purple-400 border border-purple-800/50' : 'bg-amber-900/50 text-amber-400 border border-amber-800/50'
              }`}>
                {isSkill ? '技能卡' : '资源卡'}
              </span>
              {currentCard.role && (
                <span className="text-xs text-slate-500">
                  所属: <span className="text-amber-400">{currentCard.role}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* 底部指示点 */}
        {cards.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrentIndex(i); setShowActions(false); }}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIndex 
                    ? `w-6 ${isSkill ? 'bg-purple-500' : 'bg-amber-500'}`
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


