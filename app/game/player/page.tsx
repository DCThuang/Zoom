'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Heart, Shield, Utensils, Coins, RefreshCw, 
  Trash2, Gift, X, ChevronDown, ChevronUp,
  Package, Plus, Wifi, WifiOff, Zap, RotateCcw, Layers, ZoomIn
} from 'lucide-react';
import { processCardDiscard } from '../play/utils/cardUtils';
import { ICard, Player, GameState, Equipment, PlayedCard } from '../play/types';
import { useGameSync } from '../play/hooks/useGameSync';
import { getCardDisplayUrl } from '../play/utils/imageUtils';
import CardCarousel from './components/CardCarousel';
import ImageViewerModal from '../play/components/ImageViewerModal';

// 移动端玩家页面内容
function PlayerMobilePageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  // UI 状态
  const [showEquipment, setShowEquipment] = useState(true);
  const [giftModal, setGiftModal] = useState<{ cardIndex: number; isSkill: boolean } | null>(null);
  const [showPersonalDiscardModal, setShowPersonalDiscardModal] = useState(false);
  const [showPublicDiscardModal, setShowPublicDiscardModal] = useState(false);
  const [viewingCard, setViewingCard] = useState<ICard | null>(null);
  
  // 防止循环同步
  const isRemoteUpdateRef = useRef(false);
  const clientIdRef = useRef(`player-${Date.now()}`);

  // WebSocket 同步处理 - 手机端只接收需要的数据（玩家、牌堆、弃牌堆）
  const handleRemoteSync = useCallback((data: { players: Player[]; gameState: Partial<GameState>; activeEnemies?: any[] }) => {
    console.log('[Player] Received remote sync');
    isRemoteUpdateRef.current = true;
    
    if (data.players) {
      // 智能合并玩家数据，使用版本号防止旧数据覆盖新数据
      setPlayers(prev => {
        return prev.map(localPlayer => {
          const remotePlayer = data.players.find(p => p.id === localPlayer.id);
          if (!remotePlayer) return localPlayer;
          
          // 确保版本号存在（兼容旧数据）
          const localVersion = localPlayer._version || 0;
          const remoteVersion = remotePlayer._version || 0;
          
          // 只有远程版本号更高时才更新
          if (remoteVersion > localVersion) {
            console.log(`[Player Sync] Updating player ${localPlayer.name}: v${localVersion} -> v${remoteVersion}`);
            return remotePlayer;
          } else if (remoteVersion < localVersion) {
            console.log(`[Player Sync] Keeping local player ${localPlayer.name}: local v${localVersion} > remote v${remoteVersion}`);
          }
          return localPlayer;
        });
      });
    }
    
    // 手机端只接收牌堆和弃牌堆数据，忽略地图、敌人等数据
    if (data.gameState) {
      const { redDeck, blueDeck, greenDeck, shopDeck, publicDiscard } = data.gameState;
      setGameState(prev => {
        if (!prev) return prev;
        const updates: Partial<GameState> = {};
        if (redDeck !== undefined) updates.redDeck = redDeck;
        if (blueDeck !== undefined) updates.blueDeck = blueDeck;
        if (greenDeck !== undefined) updates.greenDeck = greenDeck;
        if (shopDeck !== undefined) updates.shopDeck = shopDeck;
        if (publicDiscard !== undefined) updates.publicDiscard = publicDiscard;
        return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
      });
    }
    
    setLastSync(new Date());
    
    setTimeout(() => {
      isRemoteUpdateRef.current = false;
    }, 100);
  }, []);

  const handleRemotePlayedCard = useCallback((playedCard: PlayedCard) => {
    console.log('[Player] Received played card from remote:', playedCard);
    // 验证 playedCard 数据完整性
    if (!playedCard || !playedCard.card) {
      console.warn('[Player] Invalid played card data received');
      return;
    }
    setGameState(prev => prev ? { ...prev, playedCard } : prev);
  }, []);

  // WebSocket 连接
  const { isConnected, isReconnecting, sendSync, sendPlayedCard } = useGameSync({
    sessionId,
    onSync: handleRemoteSync,
    onPlayedCard: handleRemotePlayedCard,
    clientId: clientIdRef.current
  });

  // 加载存档数据 - 使用轻量接口，只获取手机端需要的数据
  const loadSession = useCallback(async () => {
    if (!sessionId) {
      setError('缺少游戏存档ID');
      setLoading(false);
      return;
    }
    
    try {
      setSyncing(true);
      // 使用 ?lite=true 参数，只获取玩家、牌堆、弃牌堆等必要数据
      const res = await fetch(`/api/game-sessions/${sessionId}?lite=true`);
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || '加载失败');
      }
      
      const session = data.data;
      
      // 恢复玩家数据
      const restoredPlayers = (session.players || []).map((p: any) => ({
        ...p,
        skillDeck: p.skillDeck || [],
        skillDiscard: [],
        discard: [...(p.discard || []), ...(p.skillDiscard || [])],
      }));
      setPlayers(restoredPlayers);
      
      // 恢复游戏状态 - 手机端只需要牌堆、弃牌堆等必要数据
      // 不加载地图、敌人等数据，减少资源占用
      setGameState({
        campaignName: session.campaignName,
        // 牌堆（手机端需要抽卡）
        redDeck: session.redDeck || [],
        blueDeck: session.blueDeck || [],
        greenDeck: session.greenDeck || [],
        shopDeck: session.shopDeck || [],
        // 弃牌堆（手机端需要查看和取回）
        publicDiscard: session.publicDiscard || [],
        // 以下数据手机端不需要，使用空数组占位
        enemyDeck: [],
        enemyDiscard: [],
        supportDeck: [],
        supportDiscard: [],
        bossDeck: [],
        bossDiscard: [],
        daynightDeck: [],
        daynightDiscard: [],
        specialCharacterDeck: [],
        specialCharacterDiscard: [],
        mapCards: [],
        placedMap: [],
        terrainGrid: [],
        mapDiscard: [],
        mapMarkers: [],
        // 状态
        gameStarted: session.gameStarted || false,
        playedCard: null,
      });
      
      setLastSync(new Date());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [sessionId]);

  // 初始加载
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // 如果没有 WebSocket 连接，使用定时同步作为备用
  useEffect(() => {
    if (!sessionId || !selectedPlayerId || isConnected) return;
    const interval = setInterval(loadSession, 10000);
    return () => clearInterval(interval);
  }, [sessionId, selectedPlayerId, loadSession, isConnected]);

  // 保存数据到服务器并发送 WebSocket 同步
  const saveToServer = async (updatedPlayers: Player[], updatedGameState?: Partial<GameState>) => {
    if (!sessionId || !gameState) return;
    
    // 合并游戏状态更新
    const newGameState = updatedGameState ? { ...gameState, ...updatedGameState } : gameState;
    
    // 发送 WebSocket 同步 - 只发送手机端需要同步的数据，避免覆盖主持端的地图等数据
    if (isConnected && !isRemoteUpdateRef.current) {
      // 手机端只同步：玩家数据、牌堆、弃牌堆
      // 不同步地图相关数据（placedMap, terrainGrid, mapCards等），避免覆盖主持端的地图状态
      const syncGameState: Partial<GameState> = {
        publicDiscard: newGameState.publicDiscard,
        redDeck: newGameState.redDeck,
        blueDeck: newGameState.blueDeck,
        greenDeck: newGameState.greenDeck,
        shopDeck: newGameState.shopDeck,
      };
      sendSync({ players: updatedPlayers, gameState: syncGameState });
    }
    
    // 更新本地状态
    if (updatedGameState) {
      setGameState(prev => prev ? { ...prev, ...updatedGameState } : prev);
    }
    
    try {
      const sessionData = {
        players: updatedPlayers,
        publicDiscard: newGameState.publicDiscard,
        redDeck: newGameState.redDeck,
        blueDeck: newGameState.blueDeck,
        greenDeck: newGameState.greenDeck,
      };
      
      await fetch(`/api/game-sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });
      
      setLastSync(new Date());
    } catch (err) {
      console.error('保存失败:', err);
    }
  };

  // 获取当前选中的玩家
  const currentPlayer = players.find(p => p.id === selectedPlayerId);
  const otherPlayers = players.filter(p => p.id !== selectedPlayerId);

  // 更新玩家属性（增加版本号防止同步覆盖）
  const updatePlayer = async (updates: Partial<Player>) => {
    if (!currentPlayer) return;
    
    const newVersion = (currentPlayer._version || 0) + 1;
    const updatedPlayers = players.map(p => 
      p.id === currentPlayer.id ? { ...p, ...updates, _version: newVersion } : p
    );
    setPlayers(updatedPlayers);
    await saveToServer(updatedPlayers);
  };

  // 弃牌（增加版本号防止同步覆盖）
  const discardCard = async (cardIndex: number, isSkill: boolean) => {
    if (!currentPlayer || !gameState) return;
    
    const card = isSkill ? currentPlayer.handSkill[cardIndex] : currentPlayer.handResource[cardIndex];
    if (!card) return;
    
    const newVersion = (currentPlayer._version || 0) + 1;
    const playerWithoutCard: Player = isSkill 
      ? { ...currentPlayer, handSkill: currentPlayer.handSkill.filter((_, i) => i !== cardIndex), _version: newVersion }
      : { ...currentPlayer, handResource: currentPlayer.handResource.filter((_, i) => i !== cardIndex), _version: newVersion };
    
    const playersWithoutCard = players.map(p => p.id === currentPlayer.id ? playerWithoutCard : p);
    const { updatedPlayers, updatedGameState } = processCardDiscard(card, currentPlayer.id, playersWithoutCard, gameState);
    
    setPlayers(updatedPlayers);
    if (updatedGameState) {
      setGameState(prev => prev ? { ...prev, ...updatedGameState } : prev);
    }
    
    await saveToServer(updatedPlayers, updatedGameState);
  };

  // 打出卡牌（增加版本号防止同步覆盖）
  const playCard = async (cardIndex: number, isSkill: boolean) => {
    if (!currentPlayer || !gameState) return;
    
    const card = isSkill ? currentPlayer.handSkill[cardIndex] : currentPlayer.handResource[cardIndex];
    if (!card) return;
    
    const newVersion = (currentPlayer._version || 0) + 1;
    const playerWithoutCard: Player = isSkill 
      ? { ...currentPlayer, handSkill: currentPlayer.handSkill.filter((_, i) => i !== cardIndex), _version: newVersion }
      : { ...currentPlayer, handResource: currentPlayer.handResource.filter((_, i) => i !== cardIndex), _version: newVersion };
    
    const playersWithoutCard = players.map(p => p.id === currentPlayer.id ? playerWithoutCard : p);
    const { updatedPlayers, updatedGameState } = processCardDiscard(card, currentPlayer.id, playersWithoutCard, gameState);
    
    // 设置打出的卡牌显示
    const newPlayedCard: PlayedCard = {
      card,
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      playerColor: currentPlayer.color,
      timestamp: Date.now()
    };
    
    setPlayers(updatedPlayers);
    setGameState(prev => prev ? { 
      ...prev, 
      ...updatedGameState,
      playedCard: newPlayedCard
    } : prev);
    
    // 发送打出卡牌的 WebSocket 消息
    if (isConnected) {
      sendPlayedCard(newPlayedCard);
    }
    
    await saveToServer(updatedPlayers, { ...updatedGameState, playedCard: newPlayedCard });
  };

  // 装备卡牌（增加版本号防止同步覆盖）
  const equipCard = async (cardIndex: number, isSkill: boolean) => {
    if (!currentPlayer) return;
    
    const card = isSkill ? currentPlayer.handSkill[cardIndex] : currentPlayer.handResource[cardIndex];
    if (!card) return;
    
    const newVersion = (currentPlayer._version || 0) + 1;
    const newEquip: Equipment = { card, labels: [], ammo: 0 };
    const updatedPlayer: Player = isSkill
      ? { ...currentPlayer, handSkill: currentPlayer.handSkill.filter((_, i) => i !== cardIndex), equipment: [...currentPlayer.equipment, newEquip], _version: newVersion }
      : { ...currentPlayer, handResource: currentPlayer.handResource.filter((_, i) => i !== cardIndex), equipment: [...currentPlayer.equipment, newEquip], _version: newVersion };
    
    const updatedPlayers = players.map(p => p.id === currentPlayer.id ? updatedPlayer : p);
    setPlayers(updatedPlayers);
    await saveToServer(updatedPlayers);
  };

  // 赠送卡牌（增加版本号防止同步覆盖）
  const giftCard = async (cardIndex: number, isSkill: boolean, toPlayerId: string) => {
    if (!currentPlayer) return;
    
    const card = isSkill ? currentPlayer.handSkill[cardIndex] : currentPlayer.handResource[cardIndex];
    if (!card) return;
    
    const updatedPlayers = players.map(p => {
      if (p.id === currentPlayer.id) {
        const newVersion = (p._version || 0) + 1;
        return isSkill 
          ? { ...p, handSkill: p.handSkill.filter((_, i) => i !== cardIndex), _version: newVersion }
          : { ...p, handResource: p.handResource.filter((_, i) => i !== cardIndex), _version: newVersion };
      }
      if (p.id === toPlayerId) {
        const newVersion = (p._version || 0) + 1;
        return isSkill
          ? { ...p, handSkill: [...p.handSkill, card], _version: newVersion }
          : { ...p, handResource: [...p.handResource, card], _version: newVersion };
      }
      return p;
    });
    
    setPlayers(updatedPlayers);
    await saveToServer(updatedPlayers);
    setGiftModal(null);
  };

  // 洗牌函数
  const shuffle = (array: any[]) => [...array].sort(() => Math.random() - 0.5);

  // 抽卡功能（增加版本号防止同步覆盖）
  const drawCard = async (deckType: 'RED' | 'BLUE' | 'GREEN' | 'SHOP' | 'SKILL') => {
    if (!currentPlayer || !gameState) return;
    
    const newVersion = (currentPlayer._version || 0) + 1;
    
    if (deckType === 'SKILL') {
      // 从玩家的技能牌堆抽取
      if (currentPlayer.skillDeck.length === 0) {
        // 如果技能牌堆为空，将弃牌堆洗回牌堆
        if (currentPlayer.discard.filter(c => c.type === 'SKILL').length > 0) {
          const skillCards = currentPlayer.discard.filter(c => c.type === 'SKILL');
          const otherCards = currentPlayer.discard.filter(c => c.type !== 'SKILL');
          const reshuffled = shuffle(skillCards);
          const [card, ...rest] = reshuffled;
          const updatedPlayer = {
            ...currentPlayer,
            skillDeck: rest,
            discard: otherCards,
            handSkill: [...currentPlayer.handSkill, card],
            _version: newVersion
          };
          const updatedPlayers = players.map(p => p.id === currentPlayer.id ? updatedPlayer : p);
          setPlayers(updatedPlayers);
          await saveToServer(updatedPlayers);
        }
        return;
      }
      
      const [card, ...rest] = currentPlayer.skillDeck;
      const updatedPlayer: Player = {
        ...currentPlayer,
        skillDeck: rest,
        handSkill: [...currentPlayer.handSkill, card],
        _version: newVersion
      };
      const updatedPlayers = players.map(p => p.id === currentPlayer.id ? updatedPlayer : p);
      setPlayers(updatedPlayers);
      await saveToServer(updatedPlayers);
      return;
    }
    
    // 资源牌抽卡
    const deckKey = deckType === 'RED' ? 'redDeck' : deckType === 'BLUE' ? 'blueDeck' : deckType === 'SHOP' ? 'shopDeck' : 'greenDeck';
    const deck = gameState[deckKey];
    if (deck.length === 0) return;

    const [card, ...rest] = deck;
    const updatedGameState = { [deckKey]: rest };
    const updatedPlayer = { ...currentPlayer, handResource: [...currentPlayer.handResource, card], _version: newVersion };
    const updatedPlayers = players.map(p => p.id === currentPlayer.id ? updatedPlayer : p);
    
    setGameState(prev => prev ? { ...prev, ...updatedGameState } : prev);
    setPlayers(updatedPlayers);
    await saveToServer(updatedPlayers, updatedGameState);
  };

  // 从个人弃牌堆拿回卡牌（增加版本号防止同步覆盖）
  const recoverFromDiscard = async (cardIndex: number) => {
    if (!currentPlayer) return;
    
    const card = currentPlayer.discard[cardIndex];
    if (!card) return;
    
    const newVersion = (currentPlayer._version || 0) + 1;
    const isSkillCard = card.type === 'SKILL';
    const updatedPlayer: Player = {
      ...currentPlayer,
      discard: currentPlayer.discard.filter((_, i) => i !== cardIndex),
      _version: newVersion,
      ...(isSkillCard 
        ? { handSkill: [...currentPlayer.handSkill, card] }
        : { handResource: [...currentPlayer.handResource, card] }
      )
    };
    
    const updatedPlayers = players.map(p => p.id === currentPlayer.id ? updatedPlayer : p);
    setPlayers(updatedPlayers);
    await saveToServer(updatedPlayers);
    setShowPersonalDiscardModal(false);
  };

  // 从公共弃牌堆拿回卡牌（增加版本号防止同步覆盖）
  const recoverFromPublicDiscard = async (cardIndex: number) => {
    if (!currentPlayer || !gameState) return;
    
    const card = gameState.publicDiscard[cardIndex];
    if (!card) return;
    
    const newVersion = (currentPlayer._version || 0) + 1;
    const isSkillCard = card.type === 'SKILL';
    const updatedPlayer: Player = {
      ...currentPlayer,
      _version: newVersion,
      ...(isSkillCard 
        ? { handSkill: [...currentPlayer.handSkill, card] }
        : { handResource: [...currentPlayer.handResource, card] }
      )
    };
    
    const updatedGameState = {
      publicDiscard: gameState.publicDiscard.filter((_, i) => i !== cardIndex)
    };
    
    const updatedPlayers = players.map(p => p.id === currentPlayer.id ? updatedPlayer : p);
    setPlayers(updatedPlayers);
    setGameState(prev => prev ? { ...prev, ...updatedGameState } : prev);
    await saveToServer(updatedPlayers, updatedGameState);
    setShowPublicDiscardModal(false);
  };

  // 卸下装备（增加版本号防止同步覆盖）
  const removeEquipment = async (equipIndex: number) => {
    if (!currentPlayer || !gameState) return;
    
    const removedEquipment = currentPlayer.equipment[equipIndex];
    if (!removedEquipment) return;
    
    const newVersion = (currentPlayer._version || 0) + 1;
    const card = removedEquipment.card;
    const playerWithoutEquip: Player = { 
      ...currentPlayer, 
      equipment: currentPlayer.equipment.filter((_, i) => i !== equipIndex),
      _version: newVersion
    };
    
    const playersWithoutEquip = players.map(p => p.id === currentPlayer.id ? playerWithoutEquip : p);
    const { updatedPlayers, updatedGameState } = processCardDiscard(card, currentPlayer.id, playersWithoutEquip, gameState);
    
    setPlayers(updatedPlayers);
    if (updatedGameState) {
      setGameState(prev => prev ? { ...prev, ...updatedGameState } : prev);
    }
    
    await saveToServer(updatedPlayers, updatedGameState);
  };

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-amber-500 text-xl animate-pulse">加载中...</div>
      </div>
    );
  }

  // 错误
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">{error}</div>
          <button 
            onClick={loadSession}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  // 角色选择界面
  if (!selectedPlayerId) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-amber-500 text-center mb-2">
            {gameState?.campaignName || '选择角色'}
          </h1>
          <p className="text-slate-400 text-center text-sm mb-6">选择你要控制的角色</p>
          
          <div className="space-y-3">
            {players.map(player => (
              <button
                key={player.id}
                onClick={() => setSelectedPlayerId(player.id)}
                className="w-full flex items-center gap-4 p-4 bg-slate-900 hover:bg-slate-800 rounded-xl border-2 transition-colors"
                style={{ borderColor: player.color }}
              >
                <div 
                  className="w-16 h-16 rounded-full border-3 overflow-hidden bg-black shrink-0 relative group"
                  style={{ borderColor: player.color }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (player.roleCard) setViewingCard(player.roleCard);
                  }}
                >
                  {player.imgUrl && <img src={player.imgUrl} className="w-full h-full object-cover" />}
                  {player.roleCard && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn size={16} className="text-white"/>
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-lg font-bold" style={{ color: player.color }}>{player.name}</div>
                  <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Heart size={14} className="text-red-500" /> {player.hp}/{player.maxHp}
                    </span>
                    <span className="flex items-center gap-1">
                      <Coins size={14} className="text-yellow-500" /> {player.gold}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 玩家详情界面
  if (!currentPlayer) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-red-500">角色不存在</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      {/* 顶部栏 */}
      <div className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 p-3">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSelectedPlayerId(null)}
            className="text-slate-400 hover:text-white text-sm"
          >
            ← 切换角色
          </button>
          <div className="text-center">
            <div className="text-amber-500 font-bold text-sm">{gameState?.campaignName}</div>
            <div className={`text-[10px] flex items-center justify-center gap-1 ${isConnected ? 'text-green-500' : isReconnecting ? 'text-yellow-500' : 'text-red-500'}`}>
              {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
              {isConnected ? '已连接' : isReconnecting ? '重连中...' : '未连接'}
            </div>
          </div>
          <button 
            onClick={loadSession}
            disabled={syncing}
            className="flex items-center gap-1 text-slate-400 hover:text-white text-sm"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? '同步中' : '刷新'}
          </button>
        </div>
      </div>

      {/* 角色信息 */}
      <div className="p-4">
        {/* 头像和名称 */}
        <div className="flex items-center gap-4 mb-4">
          <div 
            className="w-20 h-20 rounded-full border-4 overflow-hidden bg-black shrink-0 relative group cursor-pointer"
            style={{ borderColor: currentPlayer.color }}
            onClick={() => currentPlayer.roleCard && setViewingCard(currentPlayer.roleCard)}
          >
            {currentPlayer.imgUrl && <img src={currentPlayer.imgUrl} className="w-full h-full object-cover" />}
            {currentPlayer.roleCard && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn size={20} className="text-white"/>
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="text-2xl font-bold" style={{ color: currentPlayer.color }}>{currentPlayer.name}</div>
            <div className="text-sm text-slate-400">{currentPlayer.roleCard?.description || '冒险者'}</div>
          </div>
        </div>

        {/* 属性栏 */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <StatBox 
            icon={<Heart className="text-red-500" />} 
            label="生命" 
            value={currentPlayer.hp} 
            max={currentPlayer.maxHp}
            color="red"
            onChange={(v) => updatePlayer({ hp: Math.max(0, Math.min(currentPlayer.maxHp, v)) })}
          />
          <StatBox 
            icon={<Shield className="text-blue-500" />} 
            label="潜行" 
            value={currentPlayer.stealth}
            color="blue"
            onChange={(v) => updatePlayer({ stealth: Math.max(0, v) })}
          />
          <StatBox 
            icon={<Utensils className="text-orange-500" />} 
            label="饥饿" 
            value={currentPlayer.hunger}
            color="orange"
            onChange={(v) => updatePlayer({ hunger: Math.max(0, v) })}
          />
          <StatBox 
            icon={<Coins className="text-yellow-500" />} 
            label="金币" 
            value={currentPlayer.gold}
            color="yellow"
            onChange={(v) => updatePlayer({ gold: Math.max(0, v) })}
          />
        </div>

        {/* 状态标签 */}
        {currentPlayer.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {currentPlayer.tags.map((tag, i) => (
              <span key={i} className="text-xs bg-red-900/50 border border-red-800 text-red-300 px-2 py-1 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 抽卡区域 */}
        <div className="mb-6">
          <div className="text-sm text-slate-500 mb-2 font-bold">抽卡</div>
          <div className="grid grid-cols-5 gap-2">
            <button 
              onClick={() => drawCard('RED')}
              disabled={!gameState?.redDeck.length}
              className="py-2.5 text-xs bg-red-900/40 hover:bg-red-900/60 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-red-400 font-bold flex flex-col items-center gap-1 border border-red-800/50"
            >
              <span>红</span>
              <span className="text-[10px] text-red-500/70">{gameState?.redDeck.length || 0}</span>
            </button>
            <button 
              onClick={() => drawCard('BLUE')}
              disabled={!gameState?.blueDeck.length}
              className="py-2.5 text-xs bg-blue-900/40 hover:bg-blue-900/60 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-blue-400 font-bold flex flex-col items-center gap-1 border border-blue-800/50"
            >
              <span>蓝</span>
              <span className="text-[10px] text-blue-500/70">{gameState?.blueDeck.length || 0}</span>
            </button>
            <button 
              onClick={() => drawCard('GREEN')}
              disabled={!gameState?.greenDeck.length}
              className="py-2.5 text-xs bg-green-900/40 hover:bg-green-900/60 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-green-400 font-bold flex flex-col items-center gap-1 border border-green-800/50"
            >
              <span>绿</span>
              <span className="text-[10px] text-green-500/70">{gameState?.greenDeck.length || 0}</span>
            </button>
            <button 
              onClick={() => drawCard('SHOP')}
              disabled={!gameState?.shopDeck?.length}
              className="py-2.5 text-xs bg-yellow-900/40 hover:bg-yellow-900/60 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-yellow-400 font-bold flex flex-col items-center gap-1 border border-yellow-800/50"
            >
              <span>商店</span>
              <span className="text-[10px] text-yellow-500/70">{gameState?.shopDeck?.length || 0}</span>
            </button>
            <button 
              onClick={() => drawCard('SKILL')}
              disabled={!currentPlayer.skillDeck?.length && !currentPlayer.discard?.filter(c => c.type === 'SKILL').length}
              className="py-2.5 text-xs bg-purple-900/40 hover:bg-purple-900/60 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-purple-400 font-bold flex flex-col items-center gap-1 border border-purple-800/50"
            >
              <Zap size={14} />
              <span className="text-[10px] text-purple-500/70">{currentPlayer.skillDeck?.length || 0}</span>
            </button>
          </div>
        </div>

        {/* 公共弃牌堆按钮 */}
        <div className="mb-6">
          <button 
            onClick={() => setShowPublicDiscardModal(true)}
            className="w-full py-3 bg-slate-800/60 hover:bg-slate-700/60 rounded-lg border border-slate-700 text-slate-300 font-bold flex items-center justify-center gap-2"
          >
            <Layers size={16} />
            <span>公共弃牌堆</span>
            <span className="text-slate-500">({gameState?.publicDiscard.length || 0})</span>
          </button>
        </div>

        {/* 技能手牌 - 滑动轮播 */}
        <CardCarousel
          cards={currentPlayer.handSkill}
          title="技能手牌"
          titleColor="text-purple-400"
          borderColor="#9333ea"
                  currentPlayer={currentPlayer}
                  allPlayers={players}
          isSkill={true}
          onPlay={(i) => playCard(i, true)}
          onDiscard={(i) => discardCard(i, true)}
          onEquip={(i) => equipCard(i, true)}
          onGift={(i) => setGiftModal({ cardIndex: i, isSkill: true })}
                />

        {/* 资源手牌 - 滑动轮播 */}
        <CardCarousel
          cards={currentPlayer.handResource}
          title="资源手牌"
          titleColor="text-amber-400"
          borderColor="#f59e0b"
                  currentPlayer={currentPlayer}
                  allPlayers={players}
          isSkill={false}
          onPlay={(i) => playCard(i, false)}
          onDiscard={(i) => discardCard(i, false)}
          onEquip={(i) => equipCard(i, false)}
          onGift={(i) => setGiftModal({ cardIndex: i, isSkill: false })}
                />

        {/* 装备栏 */}
        <div className="mb-4">
          <button 
            onClick={() => setShowEquipment(!showEquipment)}
            className="w-full flex items-center justify-between py-2 text-cyan-400 font-bold"
          >
            <span>装备栏 ({currentPlayer.equipment.length})</span>
            {showEquipment ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {showEquipment && (
            <div className="space-y-2">
              {currentPlayer.equipment.map((eq, i) => (
                <div key={i} className="flex items-center gap-3 bg-slate-900 rounded-lg p-3">
                  <div 
                    className="w-14 h-20 rounded border border-slate-700 overflow-hidden bg-slate-900 shrink-0 relative group cursor-pointer"
                    onClick={() => setViewingCard(eq.card)}
                  >
                    <img 
                      src={getCardDisplayUrl(eq.card)} 
                      alt={eq.card.name}
                      className="w-full h-full object-contain" 
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://placehold.co/56x80/1e293b/64748b?text=${eq.card.name?.charAt(0) || '?'}`;
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn size={14} className="text-white"/>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{eq.card.name}</div>
                    {eq.labels && eq.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {eq.labels.map((lbl, li) => (
                          <span key={li} className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded">{lbl}</span>
                        ))}
                      </div>
                    )}
                    {eq.ammo > 0 && (
                      <div className="text-xs text-slate-400 mt-1">弹药: {eq.ammo}</div>
                    )}
                  </div>
                  <button 
                    onClick={() => removeEquipment(i)}
                    className="p-2 bg-slate-800 hover:bg-red-600 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {currentPlayer.equipment.length === 0 && (
                <div className="text-center text-slate-600 py-8">暂无装备</div>
              )}
            </div>
          )}
        </div>

        {/* 个人弃牌堆 */}
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm text-slate-500 font-bold">个人弃牌堆 ({currentPlayer.discard.length})</div>
            {currentPlayer.discard.length > 0 && (
              <button 
                onClick={() => setShowPersonalDiscardModal(true)}
                className="text-xs text-emerald-500 hover:text-emerald-400"
              >
                查看全部 →
              </button>
            )}
          </div>
          {currentPlayer.discard.length === 0 ? (
            <div className="text-center text-slate-600 py-4 text-xs">弃牌堆为空</div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex gap-2 overflow-x-auto pb-2 flex-1">
                {currentPlayer.discard.slice(0, 4).map((card, i) => (
                  <div 
                    key={i} 
                    className="w-10 h-14 rounded border border-slate-700 overflow-hidden bg-slate-900 shrink-0 opacity-70 relative group cursor-pointer"
                    onClick={() => setViewingCard(card)}
                  >
                    <img 
                      src={getCardDisplayUrl(card)} 
                      alt={card.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://placehold.co/40x56/1e293b/64748b?text=?`;
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn size={10} className="text-white"/>
                    </div>
                  </div>
                ))}
                {currentPlayer.discard.length > 4 && (
                  <div className="w-10 h-14 rounded border border-slate-700 bg-slate-800 flex items-center justify-center shrink-0">
                    <span className="text-xs text-slate-500">+{currentPlayer.discard.length - 4}</span>
                  </div>
                )}
              </div>
              {/* 快速取回最新弃牌 */}
              <button 
                onClick={() => recoverFromDiscard(0)}
                className="px-3 py-2 text-xs bg-emerald-700 hover:bg-emerald-600 rounded-lg text-white font-medium flex items-center gap-1 shrink-0"
              >
                <RotateCcw size={12} /> 取回
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 赠送弹窗 */}
      {giftModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setGiftModal(null)}
        >
          <div 
            className="bg-slate-900 border border-pink-600 rounded-xl p-4 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-pink-400 mb-4 flex items-center gap-2">
              <Gift size={20} /> 选择赠送对象
            </h3>
            {otherPlayers.length === 0 ? (
              <div className="text-slate-500 text-center py-4">没有其他玩家</div>
            ) : (
              <div className="space-y-2">
                {otherPlayers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => giftCard(giftModal.cardIndex, giftModal.isSkill, p.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                    style={{ borderLeft: `4px solid ${p.color}` }}
                  >
                    <div className="w-10 h-10 rounded-full border-2 overflow-hidden bg-black" style={{ borderColor: p.color }}>
                      {p.imgUrl && <img src={p.imgUrl} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-bold" style={{ color: p.color }}>{p.name}</div>
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

      {/* 个人弃牌堆弹窗 */}
      {showPersonalDiscardModal && currentPlayer && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowPersonalDiscardModal(false)}
        >
          <div 
            className="bg-slate-900 border border-emerald-700 rounded-xl p-4 w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                <RotateCcw size={20} /> 个人弃牌堆 ({currentPlayer.discard.length})
              </h3>
              <button onClick={() => setShowPersonalDiscardModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            {currentPlayer.discard.length === 0 ? (
              <div className="text-slate-500 text-center py-8">弃牌堆为空</div>
            ) : (
              <div className="overflow-y-auto flex-1 grid grid-cols-3 gap-3">
                {currentPlayer.discard.map((card, i) => (
                  <div key={i} className="relative group">
                    <div 
                      className="aspect-[2/3] rounded-lg border border-slate-700 overflow-hidden bg-slate-900 cursor-pointer"
                      onClick={() => { setShowPersonalDiscardModal(false); setViewingCard(card); }}
                    >
                      <img 
                        src={getCardDisplayUrl(card)} 
                        alt={card.name}
                        className="w-full h-full object-contain" 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://placehold.co/80x120/1e293b/64748b?text=${card.name?.charAt(0) || '?'}`;
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <ZoomIn size={16} className="text-white"/>
                      </div>
                    </div>
                    <div className="text-[10px] text-center truncate mt-1 text-slate-400">{card.name}</div>
                    <div className="text-[8px] text-center text-slate-600">{card.type === 'SKILL' ? '技能' : '资源'}</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); recoverFromDiscard(i); }}
                      className="absolute bottom-8 left-0 right-0 mx-auto w-fit px-2 py-1 bg-emerald-600 rounded text-white text-xs font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <RotateCcw size={10} /> 取回
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 公共弃牌堆弹窗 */}
      {showPublicDiscardModal && gameState && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowPublicDiscardModal(false)}
        >
          <div 
            className="bg-slate-900 border border-amber-700 rounded-xl p-4 w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <Layers size={20} /> 公共弃牌堆 ({gameState.publicDiscard.length})
              </h3>
              <button onClick={() => setShowPublicDiscardModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            {gameState.publicDiscard.length === 0 ? (
              <div className="text-slate-500 text-center py-8">弃牌堆为空</div>
            ) : (
              <div className="overflow-y-auto flex-1 grid grid-cols-3 gap-3">
                {gameState.publicDiscard.map((card, i) => (
                  <div key={i} className="relative group">
                    <div 
                      className="aspect-[2/3] rounded-lg border border-slate-700 overflow-hidden bg-slate-900 cursor-pointer"
                      onClick={() => { setShowPublicDiscardModal(false); setViewingCard(card); }}
                    >
                      <img 
                        src={getCardDisplayUrl(card)} 
                        alt={card.name}
                        className="w-full h-full object-contain" 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://placehold.co/80x120/1e293b/64748b?text=${card.name?.charAt(0) || '?'}`;
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <ZoomIn size={16} className="text-white"/>
                      </div>
                    </div>
                    <div className="text-[10px] text-center truncate mt-1 text-slate-400">{card.name}</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); recoverFromPublicDiscard(i); }}
                      className="absolute bottom-6 left-0 right-0 mx-auto w-fit px-2 py-1 bg-amber-600 rounded text-white text-xs font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Plus size={10} /> 拿回
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 同步状态 */}
      {lastSync && (
        <div className="fixed bottom-4 left-4 text-xs text-slate-600">
          上次同步: {lastSync.toLocaleTimeString()}
        </div>
      )}

      {/* 卡牌放大查看模态框 */}
      {viewingCard && (
        <ImageViewerModal
          card={viewingCard}
          onClose={() => setViewingCard(null)}
        />
      )}
    </div>
  );
}

// 属性框组件
function StatBox({ icon, label, value, max, color, onChange }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  max?: number;
  color: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="bg-slate-900 rounded-lg p-2 text-center">
      <div className="flex items-center justify-center gap-1 mb-1">
        {icon}
        <span className="text-[10px] text-slate-500 uppercase">{label}</span>
      </div>
      <div className="text-lg font-black">
        {value}{max ? `/${max}` : ''}
      </div>
      <div className="flex justify-center gap-1 mt-1">
        <button 
          onClick={() => onChange(value - 1)}
          className={`w-6 h-6 rounded bg-${color}-900/30 hover:bg-${color}-900/50 text-${color}-400 text-xs font-bold`}
        >
          -
        </button>
        <button 
          onClick={() => onChange(value + 1)}
          className={`w-6 h-6 rounded bg-${color}-900/30 hover:bg-${color}-900/50 text-${color}-400 text-xs font-bold`}
        >
          +
        </button>
      </div>
    </div>
  );
}

// 导出包装了 Suspense 的组件
export default function PlayerMobilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-amber-500 text-xl animate-pulse">加载中...</div>
      </div>
    }>
      <PlayerMobilePageContent />
    </Suspense>
  );
}
