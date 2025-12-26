'use client';

import { useEffect, useCallback } from 'react';
import { X, Heart, Sword, Eye, Zap, Coins } from 'lucide-react';
import { ICard } from '../types';

interface ImageViewerModalProps {
  // 支持两种模式：简单模式（只有图片URL）或完整模式（传入卡牌对象）
  imageUrl?: string;
  title?: string;
  card?: ICard;  // 完整卡牌数据
  onClose: () => void;
}

// 卡牌类型的中文标签和颜色
const cardTypeConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  'SKILL': { label: '技能卡', color: 'text-blue-400', bgColor: 'bg-blue-600' },
  'PLAYER': { label: '玩家角色', color: 'text-amber-400', bgColor: 'bg-amber-600' },
  'ENEMY': { label: '敌人', color: 'text-red-400', bgColor: 'bg-red-600' },
  'RESOURCE': { label: '资源卡', color: 'text-green-400', bgColor: 'bg-green-600' },
  'MAP': { label: '地图', color: 'text-amber-400', bgColor: 'bg-amber-700' },
  'SUPPORT': { label: '支援', color: 'text-cyan-400', bgColor: 'bg-cyan-600' },
  'BOSS': { label: 'Boss', color: 'text-rose-400', bgColor: 'bg-rose-600' },
  'DAYNIGHT': { label: '日夜', color: 'text-indigo-400', bgColor: 'bg-indigo-600' },
  'SPECIAL_CHARACTER': { label: '特殊人物', color: 'text-pink-400', bgColor: 'bg-pink-600' },
};

/**
 * 卡牌详情查看组件
 * 支持查看卡牌图片和详细信息
 */
export default function ImageViewerModal({ imageUrl, title, card, onClose }: ImageViewerModalProps) {
  // ESC 键关闭
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  // 获取显示的图片 URL
  const displayImageUrl = card?.imgUrl || imageUrl || '';
  const displayTitle = card?.name || title || '';
  const typeConfig = card?.type ? cardTypeConfig[card.type] : null;

  return (
    <div 
      className="fixed inset-0 bg-black/95 flex items-center justify-center z-[100] cursor-pointer backdrop-blur-sm"
      onClick={onClose}
    >
      {/* 装饰性背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-3 bg-slate-800/80 hover:bg-red-600 rounded-full text-white transition-all hover:scale-110 z-10 shadow-lg"
        title="关闭 (ESC)"
      >
        <X size={24} />
      </button>

      {/* 主内容区 */}
      <div 
        className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10 max-w-6xl mx-4 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 卡牌图片 */}
        <div className="relative group">
          {/* 发光边框效果 */}
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-purple-500 to-cyan-500 rounded-2xl opacity-50 blur group-hover:opacity-75 transition-opacity"></div>
          
          <div className="relative bg-slate-900 p-2 rounded-xl">
            <img 
              src={displayImageUrl}
              alt={displayTitle}
              className="max-h-[70vh] lg:max-h-[80vh] w-auto object-contain rounded-lg shadow-2xl"
              draggable={false}
            />
          </div>
        </div>

        {/* 卡牌信息面板 - 只在有完整卡牌数据时显示 */}
        {card && (
          <div className="w-full lg:w-80 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
            {/* 标题栏 */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                {typeConfig && (
                  <span className={`${typeConfig.bgColor} px-3 py-1 rounded-full text-xs font-bold text-white`}>
                    {typeConfig.label}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-white mt-2 tracking-wide">{card.name}</h2>
            </div>

            {/* 属性区 */}
            {(card.hp || card.attack || card.stealth || card.cost || card.level) && (
              <div className="px-6 py-4 border-b border-slate-700/50">
                <div className="grid grid-cols-2 gap-3">
                  {card.hp !== undefined && (
                    <div className="flex items-center gap-2 bg-red-950/50 px-3 py-2 rounded-lg border border-red-900/50">
                      <Heart size={18} className="text-red-400" />
                      <span className="text-red-300 font-bold">{card.hp}</span>
                      <span className="text-red-400/70 text-xs">血量</span>
                    </div>
                  )}
                  {card.attack !== undefined && (
                    <div className="flex items-center gap-2 bg-orange-950/50 px-3 py-2 rounded-lg border border-orange-900/50">
                      <Sword size={18} className="text-orange-400" />
                      <span className="text-orange-300 font-bold">{card.attack}</span>
                      <span className="text-orange-400/70 text-xs">攻击</span>
                    </div>
                  )}
                  {card.stealth !== undefined && (
                    <div className="flex items-center gap-2 bg-purple-950/50 px-3 py-2 rounded-lg border border-purple-900/50">
                      <Eye size={18} className="text-purple-400" />
                      <span className="text-purple-300 font-bold">{card.stealth}</span>
                      <span className="text-purple-400/70 text-xs">潜行</span>
                    </div>
                  )}
                  {card.cost !== undefined && (
                    <div className="flex items-center gap-2 bg-blue-950/50 px-3 py-2 rounded-lg border border-blue-900/50">
                      <Zap size={18} className="text-blue-400" />
                      <span className="text-blue-300 font-bold">{card.cost}</span>
                      <span className="text-blue-400/70 text-xs">费用</span>
                    </div>
                  )}
                  {card.level !== undefined && (
                    <div className="flex items-center gap-2 bg-amber-950/50 px-3 py-2 rounded-lg border border-amber-900/50">
                      <Coins size={18} className="text-amber-400" />
                      <span className="text-amber-300 font-bold">{card.level}</span>
                      <span className="text-amber-400/70 text-xs">等级</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 描述区 */}
            {card.description && (
              <div className="px-6 py-4">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-bold">描述</div>
                <div className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">
                  {card.description}
                </div>
              </div>
            )}

            {/* 角色信息 */}
            {card.role && (
              <div className="px-6 py-3 bg-slate-800/50 border-t border-slate-700/50">
                <span className="text-slate-500 text-xs">所属角色：</span>
                <span className="text-amber-400 font-medium ml-1">{card.role}</span>
              </div>
            )}
          </div>
        )}

        {/* 简单模式下只显示标题 */}
        {!card && title && (
          <div className="bg-slate-900/90 backdrop-blur-md px-8 py-4 rounded-xl border border-slate-700 shadow-xl">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-slate-500 text-sm bg-slate-900/50 px-4 py-2 rounded-full">
        <span>点击空白处或按</span>
        <kbd className="px-2 py-0.5 bg-slate-800 rounded text-slate-400 text-xs font-mono">ESC</kbd>
        <span>关闭</span>
      </div>
    </div>
  );
}
