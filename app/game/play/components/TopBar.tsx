'use client';

import { useState } from 'react';
import { Plus, Save, Check, Loader2, Share2, Wifi, WifiOff, Skull, Dice5, X } from 'lucide-react';
import { GameState } from '../types';
import PlayedCardsDisplay from './PlayedCardsDisplay';

interface MiniDeckProps {
  title: string;
  count: number;
  color: string;
  onClick?: () => void;
  isDiscard?: boolean;
}

function MiniDeck({ title, count, color, onClick, isDiscard }: MiniDeckProps) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`w-12 h-16 rounded-lg border-2 ${color} flex flex-col items-center justify-center shadow-lg ${onClick ? 'cursor-pointer hover:brightness-125 transition-all' : ''}`}
    >
      <span className="text-xs text-slate-400">{title}</span>
      <span className={`text-lg font-black ${isDiscard ? 'text-slate-500' : 'text-white'}`}>{count}</span>
    </Wrapper>
  );
}

interface TopBarProps {
  gameState: GameState;
  playerCount: number;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  sessionId: string | null;
  isConnected: boolean;
  isReconnecting: boolean;
  onOpenDiscardModal: () => void;
  onOpenMapDiscardModal: () => void;
  onOpenCombinedDiscardModal: () => void;
  onOpenSpecialCharacterModal: () => void;
  onOpenBossModal: () => void;
  onOpenMarkerModal: () => void;
  onAddMonsterMarker: () => void;
  diceResult: { dice1: number; dice2: number } | null;
  isRolling: boolean;
  customHighlight: number | null;
  onRollDice: () => void;
  onClearDice: () => void;
  onSetCustomHighlight: (num: number | null) => void;
  onDrawEnemy: () => void;
  onDrawSupport: () => void;
  onDrawDaynight: () => void;
  onSave: () => void;
  onClearPlayedCard: () => void;
}

export default function TopBar({
  gameState,
  playerCount,
  saveStatus,
  sessionId,
  isConnected,
  isReconnecting,
  onOpenDiscardModal,
  onOpenMapDiscardModal,
  onOpenCombinedDiscardModal,
  onOpenSpecialCharacterModal,
  onOpenBossModal,
  onOpenMarkerModal,
  onAddMonsterMarker,
  diceResult,
  isRolling,
  customHighlight,
  onRollDice,
  onClearDice,
  onSetCustomHighlight,
  onDrawEnemy,
  onDrawSupport,
  onDrawDaynight,
  onSave,
  onClearPlayedCard
}: TopBarProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleShare = async () => {
    if (!sessionId) {
      alert('请先保存游戏后再分享');
      return;
    }
    
    const playerUrl = `${window.location.origin}/game/player?sessionId=${sessionId}`;
    
    try {
      await navigator.clipboard.writeText(playerUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      // 降级方案：显示链接让用户手动复制
      prompt('复制以下链接分享给玩家:', playerUrl);
    }
  };

  return (
    <div className="h-28 bg-[#0f1115] border-b border-slate-800 flex items-center justify-between gap-4 px-4 shrink-0 shadow-lg z-30 relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] opacity-50 pointer-events-none"></div>
      
      {/* Campaign Name - 绝对定位居中 */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10 pointer-events-none">
        <div className="text-amber-500 font-bold text-lg">{gameState.campaignName || '战役'}</div>
        <div className="text-xs text-slate-500 flex items-center justify-center gap-2">
          {playerCount} 名玩家
          {sessionId && (
            <span className={`flex items-center gap-1 ${isConnected ? 'text-green-500' : isReconnecting ? 'text-yellow-500' : 'text-red-500'}`}>
              {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
              {isConnected ? '已连接' : isReconnecting ? '重连中...' : '未连接'}
            </span>
          )}
        </div>
      </div>
      
      {/* Left: Resource Decks + Marker */}
      <div className="flex gap-2 items-center z-10">
        <div className="flex gap-2 items-center bg-slate-900/50 p-2 rounded-xl border border-slate-800">
          <MiniDeck title="红" count={gameState.redDeck.length} color="bg-red-800 border-red-600" />
          <MiniDeck title="蓝" count={gameState.blueDeck.length} color="bg-blue-800 border-blue-600" />
          <MiniDeck title="绿" count={gameState.greenDeck.length} color="bg-green-800 border-green-600" />
          <MiniDeck title="商店" count={gameState.shopDeck.length} color="bg-yellow-700 border-yellow-500" />
          <div className="w-px h-10 bg-slate-700"></div>
          <MiniDeck title="资弃" count={gameState.publicDiscard.length} onClick={onOpenDiscardModal} color="bg-slate-700 border-slate-500" isDiscard />
          <MiniDeck title="地弃" count={gameState.mapDiscard.length} onClick={onOpenMapDiscardModal} color="bg-amber-900 border-amber-600" isDiscard />
        </div>
        
        {/* Map Marker */}
        <button
          onClick={onOpenMarkerModal}
          className="px-3 py-2 bg-cyan-800 hover:bg-cyan-700 border border-cyan-600 rounded-lg text-xs font-bold text-white flex items-center gap-1"
        >
          <Plus size={14}/> 标记
        </button>
        
        {/* Monster Marker Shortcut */}
        <button
          onClick={onAddMonsterMarker}
          className="px-3 py-2 bg-red-800 hover:bg-red-700 border border-red-600 rounded-lg text-xs font-bold text-white flex items-center gap-1"
          title="快速添加怪物标记"
        >
          <Skull size={14}/> 怪物
        </button>
        
        {/* Dice Roll & Custom Highlight */}
        <div className="flex items-center gap-1">
          {isRolling ? (
            /* 骰子滚动动画 */
            <div className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-700 to-amber-600 border border-amber-500 rounded-lg shadow-lg">
              <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center text-amber-900 font-black text-lg shadow-inner animate-bounce">
                <span className="animate-pulse">?</span>
              </div>
              <span className="text-amber-300 font-bold">+</span>
              <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center text-amber-900 font-black text-lg shadow-inner animate-bounce" style={{ animationDelay: '0.1s' }}>
                <span className="animate-pulse">?</span>
              </div>
              <span className="text-amber-300 font-bold">=</span>
              <div className="w-8 h-8 bg-amber-400 rounded-md flex items-center justify-center text-amber-900 font-black text-lg shadow animate-spin">
                <Dice5 size={18} />
              </div>
            </div>
          ) : diceResult ? (
            <>
              {/* 显示骰子结果 */}
              <div className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-700 to-amber-600 border border-amber-500 rounded-lg shadow-lg">
                <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center text-amber-900 font-black text-lg shadow-inner">
                  {diceResult.dice1}
                </div>
                <span className="text-amber-300 font-bold">+</span>
                <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center text-amber-900 font-black text-lg shadow-inner">
                  {diceResult.dice2}
                </div>
                <span className="text-amber-300 font-bold">=</span>
                <div className="w-8 h-8 bg-amber-400 rounded-md flex items-center justify-center text-amber-900 font-black text-lg shadow">
                  {diceResult.dice1 + diceResult.dice2}
                </div>
              </div>
              <button
                onClick={onClearDice}
                className="p-2 bg-slate-700 hover:bg-red-600 border border-slate-600 rounded-lg text-white transition-colors"
                title="取消高亮"
              >
                <X size={14}/>
              </button>
            </>
          ) : customHighlight ? (
            <>
              {/* 显示自定义高亮数字 */}
              <div className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-cyan-700 to-cyan-600 border border-cyan-500 rounded-lg shadow-lg">
                <span className="text-cyan-200 text-xs font-bold">地图</span>
                <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center text-cyan-900 font-black text-lg shadow">
                  {customHighlight}
                </div>
              </div>
              <button
                onClick={() => onSetCustomHighlight(null)}
                className="p-2 bg-slate-700 hover:bg-red-600 border border-slate-600 rounded-lg text-white transition-colors"
                title="取消高亮"
              >
                <X size={14}/>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onRollDice}
                className="px-3 py-2 bg-amber-700 hover:bg-amber-600 border border-amber-500 rounded-lg text-xs font-bold text-white flex items-center gap-1"
                title="摇骰子定位地图"
              >
                <Dice5 size={14}/> 骰子
              </button>
              {/* 自定义数字输入 */}
              <select
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val >= 2 && val <= 12) {
                    onSetCustomHighlight(val);
                  }
                  e.target.value = '';
                }}
                defaultValue=""
                className="px-2 py-2 bg-cyan-800 hover:bg-cyan-700 border border-cyan-600 rounded-lg text-xs font-bold text-white cursor-pointer"
                title="选择数字高亮对应地图"
              >
                <option value="" disabled>地图#</option>
                {[2,3,4,5,6,7,8,9,10,11,12].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Played Card Display */}
      <PlayedCardsDisplay 
        playedCard={gameState.playedCard}
        onClear={onClearPlayedCard}
      />

      {/* 弹性空间 */}
      <div className="flex-1"></div>

      {/* Right: Special Decks + Enemy + Save */}
      <div className="flex gap-2 items-center z-10">
        <div className="flex gap-2 items-center bg-slate-900/50 p-2 rounded-xl border border-slate-800">
          <MiniDeck title="敌人" count={gameState.enemyDeck.length} onClick={onDrawEnemy} color="bg-purple-900 border-purple-600" />
          <MiniDeck title="支援" count={gameState.supportDeck.length} onClick={onDrawSupport} color="bg-cyan-800 border-cyan-600" />
          <MiniDeck title="Boss" count={gameState.bossDeck.length} onClick={onOpenBossModal} color="bg-rose-900 border-rose-600" />
          <MiniDeck title="日夜" count={gameState.daynightDeck.length} onClick={onDrawDaynight} color="bg-indigo-800 border-indigo-600" />
          <MiniDeck title="特殊" count={gameState.specialCharacterDeck.length} onClick={onOpenSpecialCharacterModal} color="bg-pink-800 border-pink-600" />
          <div className="w-px h-10 bg-slate-700"></div>
          <MiniDeck 
            title="弃牌" 
            count={gameState.enemyDiscard.length + gameState.supportDiscard.length + gameState.bossDiscard.length + gameState.daynightDiscard.length + (gameState.specialCharacterDiscard?.length || 0)} 
            onClick={onOpenCombinedDiscardModal} 
            color="bg-slate-700 border-slate-500" 
            isDiscard 
          />
        </div>
        
        {/* 分享按钮 */}
        <button 
          onClick={handleShare}
          className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors ${
            copySuccess 
              ? 'bg-green-700 text-white' 
              : 'bg-pink-800 hover:bg-pink-700 border border-pink-600 text-white'
          }`}
        >
          {copySuccess ? <><Check size={14}/> 已复制</> : <><Share2 size={14}/> 分享</>}
        </button>
        
        <button 
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 ${
            saveStatus === 'saved' ? 'bg-green-700 text-white' :
            saveStatus === 'error' ? 'bg-red-700 text-white' :
            saveStatus === 'saving' ? 'bg-slate-600 text-slate-300' :
            'bg-slate-800 hover:bg-slate-700 text-slate-300'
          }`}
        >
          {saveStatus === 'saving' ? <><Loader2 size={14} className="animate-spin"/> 保存中</> :
           saveStatus === 'saved' ? <><Check size={14}/> 已保存</> : <><Save size={14}/> 保存</>}
        </button>
      </div>
    </div>
  );
}

