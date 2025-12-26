'use client';

import { Layers, RotateCcw, Shuffle, Check } from 'lucide-react';
import { ICard } from '../types';

interface MapSetupPanelProps {
  gameStarted: boolean;
  terrainEditMode: boolean;
  terrainGrid: boolean[];
  mapCards: ICard[];
  placedMap: (any | null)[];
  draggingMapCard: number | null;
  onToggleTerrainEditMode: () => void;
  onMapCardDragStart: (index: number) => void;
  onClearMap: () => void;
  onRandomFill: () => void;
  onStartGame: () => void;
}

export default function MapSetupPanel({
  gameStarted,
  terrainEditMode,
  terrainGrid,
  mapCards,
  placedMap,
  draggingMapCard,
  onToggleTerrainEditMode,
  onMapCardDragStart,
  onClearMap,
  onRandomFill,
  onStartGame
}: MapSetupPanelProps) {
  if (gameStarted) return null;

  return (
    <div className="relative z-40 bg-slate-900/95 backdrop-blur-md p-4 border-b border-amber-500/30 shadow-xl flex-shrink-0">
      <h3 className="font-bold text-lg text-amber-500 mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Layers size={20}/> 
          {terrainEditMode ? '地形编辑 - 点击格子启用/禁用' : '地图构建 - 拖拽卡牌到网格'}
        </span>
        <button
          onClick={onToggleTerrainEditMode}
          className={`px-3 py-1.5 rounded text-xs font-bold ${
            terrainEditMode 
              ? 'bg-cyan-600 text-white' 
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {terrainEditMode ? '退出地形编辑' : '编辑地形'}
        </button>
      </h3>
      
      {terrainEditMode ? (
        <div className="text-sm text-slate-400 mb-4">
          <p>点击下方网格的格子来启用或禁用该位置。禁用的格子将不会放置地图卡牌。</p>
          <p className="text-xs mt-1 text-slate-500">
            已启用: {terrainGrid.filter(Boolean).length} 格 | 
            已禁用: {terrainGrid.filter(v => !v).length} 格
          </p>
        </div>
      ) : mapCards.length > 0 ? (
        <div className="flex gap-2 flex-wrap mb-4">
          {mapCards.map((card, i) => (
            <div 
              key={i}
              draggable
              onDragStart={() => onMapCardDragStart(i)}
              className={`w-14 h-14 rounded-lg cursor-grab active:cursor-grabbing border-2 transition-all relative overflow-hidden ${
                draggingMapCard === i ? 'border-amber-400 opacity-50' : 'border-slate-600 hover:border-amber-500'
              }`}
            >
              <img src={card.imgUrl || `https://placehold.co/80/333/999?text=${card.name.charAt(0)}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-slate-500 mb-4">所有地图卡已放置完毕</div>
      )}
      
      <div className="flex gap-3 justify-end">
        {!terrainEditMode && (
          <>
            <button 
              onClick={onClearMap} 
              className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold flex items-center gap-2"
              disabled={!placedMap.some(t => t !== null)}
            >
              <RotateCcw size={14}/> 清空地图
            </button>
            <button onClick={onRandomFill} className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold flex items-center gap-2">
              <Shuffle size={14}/> 随机填充
            </button>
            <button 
              onClick={onStartGame} 
              className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold flex items-center gap-2"
            >
              <Check size={14}/> 开始游戏
            </button>
          </>
        )}
      </div>
    </div>
  );
}

