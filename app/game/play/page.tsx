'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Plus, X, Layers, Trash2, 
  Shuffle, RotateCcw, Save, Check, Loader2, Package, Wifi, WifiOff
} from 'lucide-react';

// Types
import { 
  ICard, ICampaignCardConfig, Equipment, Player,
  PlacedMapTile, ActiveEnemy, GameState, MapMarker, PlayedCard,
  GRID_SIZE, PLAYER_COLORS 
} from './types';

// Components
import { 
  PlayerList, PlayerDetailModal, EnemyList,
  PublicDiscardModal, MapDiscardModal, AddMarkerModal,
  EquipmentPreviewModal, PlayerDiscardModal,
  CombinedDiscardModal, SpecialCharacterModal, DeckPickModal,
  TopBar, MapMarkers, MapSetupPanel, ImageViewerModal, SkillDeckModal
} from './components';

// Utils
import { processCardDiscard } from './utils/cardUtils';
import { getCardDisplayUrl, getCardFullUrl } from './utils/imageUtils';

// Hooks
import { useGameSync } from './hooks/useGameSync';

function GamePlayPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlCampaignId = searchParams.get('campaignId');
  const roleIds = searchParams.get('roleIds'); // Comma-separated role IDs (legacy)
  const professions = searchParams.get('professions'); // Comma-separated profession names
  const sessionId = searchParams.get('sessionId');
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [campaignId, setCampaignId] = useState<string | null>(urlCampaignId); // 存储 campaignId
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null); // For detail modal
  const [viewingSkillDeckPlayerId, setViewingSkillDeckPlayerId] = useState<string | null>(null); // For skill deck modal
  
  const [gameState, setGameState] = useState<GameState>({
    campaignName: '',
    redDeck: [],
    blueDeck: [],
    greenDeck: [],
    shopDeck: [],
    publicDiscard: [],
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
    placedMap: Array(GRID_SIZE * GRID_SIZE).fill(null),
    terrainGrid: Array(GRID_SIZE * GRID_SIZE).fill(false),  // 默认全部禁用
    gameStarted: false,
    mapDiscard: [],
    mapMarkers: [],
    playedCard: null,  // 当前打出的卡牌（只保留最后一张）
  });
  
  const [terrainEditMode, setTerrainEditMode] = useState(false);  // 地形编辑模式
  
  // 地形拖拽选择状态
  const [terrainDragging, setTerrainDragging] = useState(false);
  const [terrainDragMode, setTerrainDragMode] = useState<'enable' | 'disable' | null>(null);  // 拖拽时是启用还是禁用

  // 地图视图拖拽状态
  const [mapDragging, setMapDragging] = useState(false);
  const [mapDragStart, setMapDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const mapScrollRef = useRef<HTMLDivElement>(null);

  const [draggingPlayer, setDraggingPlayer] = useState<string | null>(null);
  const [draggingMapCard, setDraggingMapCard] = useState<number | null>(null);
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const [discardModalOpen, setDiscardModalOpen] = useState(false);
  const [mapDiscardModalOpen, setMapDiscardModalOpen] = useState(false);  // 地图弃牌堆弹窗
  const [combinedDiscardModalOpen, setCombinedDiscardModalOpen] = useState(false);  // 合并弃牌区弹窗
  const [specialCharacterModalOpen, setSpecialCharacterModalOpen] = useState(false);  // 特殊人物牌弹窗
  const [bossModalOpen, setBossModalOpen] = useState(false);  // Boss牌弹窗
  const [equipmentPreview, setEquipmentPreview] = useState<{ playerId: string; equipIndex: number } | null>(null);
  const [playerDiscardModal, setPlayerDiscardModal] = useState<string | null>(null); // 玩家ID，用于显示该玩家的弃牌堆弹窗
  const [activeEnemies, setActiveEnemies] = useState<ActiveEnemy[]>([]);
  const [activeBosses, setActiveBosses] = useState<ActiveEnemy[]>([]);
  const [activeSupports, setActiveSupports] = useState<ActiveEnemy[]>([]);
  const [activeSpecialCharacters, setActiveSpecialCharacters] = useState<ActiveEnemy[]>([]);
  const [selectedEnemy, setSelectedEnemy] = useState<ActiveEnemy | null>(null);
  
  // 地图标记相关状态
  const [showMarkerModal, setShowMarkerModal] = useState(false);
  const [draggingMarker, setDraggingMarker] = useState<string | null>(null);
  const [markerOffset, setMarkerOffset] = useState({ x: 0, y: 0 });
  
  // 骰子状态
  const [diceResult, setDiceResult] = useState<{ dice1: number; dice2: number } | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [customHighlight, setCustomHighlight] = useState<number | null>(null);
  
  // 地图卡片操作相关状态
  const [movingMapTile, setMovingMapTile] = useState<number | null>(null);  // 正在移动的地图卡片索引
  const [draggingFromDiscard, setDraggingFromDiscard] = useState<number | null>(null);  // 从弃牌堆拖拽的卡片索引
  
  // 图片查看器状态（支持完整卡牌数据）
  const [viewingCard, setViewingCard] = useState<ICard | null>(null);
  
  // 地图卡牌点击延迟处理（区分单击和双击）
  const tileClickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTileClickRef = useRef<number | null>(null);
  
  // Save state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 用于防止循环同步的标志
  const isRemoteUpdateRef = useRef(false);

  // WebSocket 同步处理 - 使用智能合并策略，防止旧数据覆盖新数据
  const handleRemoteSync = useCallback((data: { players: Player[]; gameState: Partial<GameState>; activeEnemies?: any[] }) => {
    console.log('[Main] Received remote sync');
    isRemoteUpdateRef.current = true;
    
    if (data.players) {
      // 智能合并：只更新版本号更高的玩家数据
      setPlayers(prev => {
        return prev.map(localPlayer => {
          const remotePlayer = data.players.find(p => p.id === localPlayer.id);
          if (!remotePlayer) return localPlayer;
          
          // 确保版本号存在（兼容旧数据）
          const localVersion = localPlayer._version || 0;
          const remoteVersion = remotePlayer._version || 0;
          
          // 只有远程版本号更高时才更新
          if (remoteVersion > localVersion) {
            console.log(`[Sync] Updating player ${localPlayer.name}: v${localVersion} -> v${remoteVersion}`);
            return remotePlayer;
          } else {
            console.log(`[Sync] Keeping local player ${localPlayer.name}: local v${localVersion} >= remote v${remoteVersion}`);
            return localPlayer;
          }
        });
      });
    }
    if (data.gameState) {
      setGameState(prev => ({ ...prev, ...data.gameState }));
    }
    if (data.activeEnemies) {
      setActiveEnemies(data.activeEnemies);
    }
    
    // 更新 selectedPlayer - 也要用智能合并
    if (selectedPlayer && data.players) {
      const remotePlayer = data.players.find(p => p.id === selectedPlayer.id);
      if (remotePlayer) {
        const localVersion = selectedPlayer._version || 0;
        const remoteVersion = remotePlayer._version || 0;
        if (remoteVersion > localVersion) {
          setSelectedPlayer(remotePlayer);
        }
      }
    }
    
    setTimeout(() => {
      isRemoteUpdateRef.current = false;
    }, 100);
  }, [selectedPlayer]);

  const handleRemotePlayedCard = useCallback((playedCard: PlayedCard) => {
    try {
      console.log('[Main] Received played card from remote:', playedCard);
      // 验证 playedCard 数据完整性
      if (!playedCard || !playedCard.card) {
        console.warn('[Main] Invalid played card data received');
        return;
      }
      setGameState(prev => ({ ...prev, playedCard }));
    } catch (err) {
      console.error('[Main] handleRemotePlayedCard error', err);
    }
  }, []);

  // WebSocket 连接
  const { isConnected, isReconnecting, sendSync, sendPlayedCard } = useGameSync({
    sessionId: currentSessionId,
    onSync: handleRemoteSync,
    onPlayedCard: handleRemotePlayedCard,
    clientId: 'main'
  });

  // --- Initialization ---
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
      return;
    }
    if (!urlCampaignId) return;
    // 支持新的职业参数或旧的角色ID参数
    if (!professions && !roleIds) return;
    setCampaignId(urlCampaignId);
    initNewGame();
  }, [urlCampaignId, roleIds, professions, sessionId]);

  const loadSession = async (sid: string) => {
    try {
      const res = await fetch(`/api/game-sessions/${sid}`);
      const data = await res.json();
      if (!data.success) throw new Error('存档加载失败');
      
      const session = data.data;
      
      // 收集所有需要更新的卡牌 ID（从存档中的地图卡牌）
      const cardIdsToUpdate: string[] = [];
      (session.placedMap || []).forEach((tile: any) => {
        if (tile?.cardData?._id) cardIdsToUpdate.push(tile.cardData._id);
      });
      (session.unplacedMapCards || []).forEach((card: any) => {
        if (card?._id) cardIdsToUpdate.push(card._id);
      });
      (session.mapDiscard || []).forEach((card: any) => {
        if (card?._id) cardIdsToUpdate.push(card._id);
      });
      
      // 从数据库获取最新的卡牌数据（用于更新地图编号等新字段）
      let cardUpdates: Record<string, any> = {};
      if (cardIdsToUpdate.length > 0) {
        try {
          const cardRes = await fetch(`/api/cards?ids=${cardIdsToUpdate.join(',')}`);
          const cardData = await cardRes.json();
          if (cardData.cards) {
            cardData.cards.forEach((card: any) => {
              cardUpdates[card._id] = card;
            });
          }
        } catch (e) {
          console.warn('获取最新卡牌数据失败，使用存档数据', e);
        }
      }
      
      // 合并卡牌数据的辅助函数（保留存档数据，但更新新字段如 mapNumber）
      const mergeCardData = (oldCard: any) => {
        if (!oldCard?._id) return oldCard;
        const newCard = cardUpdates[oldCard._id];
        if (!newCard) return oldCard;
        return { ...oldCard, mapNumber: newCard.mapNumber, thumbUrl: newCard.thumbUrl };
      };
      
      // Restore players (确保技能牌堆字段存在，兼容旧存档)
      const restoredPlayers = (session.players || []).map((p: any) => ({
        ...p,
        skillDeck: p.skillDeck || [],
        skillDiscard: p.skillDiscard || [],
        _version: p._version || 0,  // 兼容旧存档，默认版本号为 0
      }));
      setPlayers(restoredPlayers);
      
      // Restore game state（更新地图卡牌数据）
      const restoredPlacedMap = (session.placedMap || []).map((tile: any) => {
        if (!tile) return null;
        return { card: mergeCardData(tile.cardData), revealed: tile.revealed };
      });
      
      // 更新未放置的地图卡和弃牌堆
      const restoredMapCards = (session.unplacedMapCards || []).map(mergeCardData);
      const restoredMapDiscard = (session.mapDiscard || []).map(mergeCardData);
      
      setGameState({
        campaignName: session.campaignName,
        redDeck: session.redDeck || [],
        blueDeck: session.blueDeck || [],
        greenDeck: session.greenDeck || [],
        shopDeck: session.shopDeck || [],
        publicDiscard: session.publicDiscard || [],
        enemyDeck: session.enemyDeck || [],
        enemyDiscard: session.enemyDiscard || [],
        supportDeck: session.supportDeck || [],
        supportDiscard: session.supportDiscard || [],
        bossDeck: session.bossDeck || [],
        bossDiscard: session.bossDiscard || [],
        daynightDeck: session.daynightDeck || [],
        daynightDiscard: session.daynightDiscard || [],
        specialCharacterDeck: session.specialCharacterDeck || [],
        specialCharacterDiscard: session.specialCharacterDiscard || [],
        mapCards: restoredMapCards,
        placedMap: restoredPlacedMap,
        terrainGrid: session.terrainGrid || Array(GRID_SIZE * GRID_SIZE).fill(true),
        gameStarted: session.gameStarted || false,
        mapDiscard: restoredMapDiscard,
        mapMarkers: session.mapMarkers || [],
        playedCard: null,  // 打出的卡牌不需要持久化，每次加载时清空
      });
      
      // Restore active enemies, bosses, supports, and special characters
      setActiveEnemies(session.activeEnemies || []);
      setActiveBosses(session.activeBosses || []);
      setActiveSupports(session.activeSupports || []);
      setActiveSpecialCharacters(session.activeSpecialCharacters || []);
      
      // 保存 campaignId（从存档数据中获取）
      if (session.campaignId) {
        setCampaignId(session.campaignId.toString());
      }
      
      setCurrentSessionId(sid);
    } catch (err) {
      console.error(err);
      alert('存档加载失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const initNewGame = async () => {
    try {
      // Fetch all player cards
      const allPlayersRes = await fetch('/api/cards?type=PLAYER');
      const allPlayersData = await allPlayersRes.json();
      const allPlayerCards: ICard[] = allPlayersData.success ? allPlayersData.data : [];
      
      // Fetch all skill cards from the database
      const skillCardsRes = await fetch('/api/cards?type=SKILL');
      const skillCardsData = await skillCardsRes.json();
      const allSkillCards: ICard[] = skillCardsData.success ? skillCardsData.data : [];
      
      let newPlayers: Player[] = [];
      
      // 新的职业模式
      if (professions) {
        const professionList = decodeURIComponent(professions).split(',');
        
        newPlayers = professionList.map((profession, index) => {
          // 获取该职业的所有角色卡
          const professionRoles = allPlayerCards.filter((card: ICard) => 
            (card as any).profession === profession
          );
          
          if (professionRoles.length === 0) {
            throw new Error(`职业 "${profession}" 没有对应的角色卡`);
          }
          
          // 使用第一个角色作为默认角色
          const defaultRole = professionRoles[0];
          
          // 为这个职业筛选技能卡（根据 role 字段匹配职业名）
          const professionSkillCards = allSkillCards.filter((card: ICard) => card.role === profession);
          
          // 根据技能卡的 count 字段展开成多张
          const expandedSkillCards: ICard[] = [];
          professionSkillCards.forEach((card: ICard) => {
            const count = (card as any).count || 1;
            for (let i = 0; i < count; i++) {
              expandedSkillCards.push({ ...card });
            }
          });
          
          return {
            id: `${profession}-${Date.now()}-${index}`,  // 使用职业+时间戳作为唯一ID
            roleCard: defaultRole,
            profession: profession,
            availableRoles: professionRoles,  // 存储同职业的所有角色卡
            name: defaultRole.name,
            imgUrl: defaultRole.imgUrl,
            color: PLAYER_COLORS[index % PLAYER_COLORS.length],
            hp: defaultRole.hp || 10,
            maxHp: defaultRole.hp || 10,
            stealth: defaultRole.stealth || 0,
            hunger: 0,
            gold: 0,
            tags: [],
            handResource: [],
            handSkill: [],
            skillDeck: shuffle(expandedSkillCards),  // 洗牌后放入技能牌堆
            skillDiscard: [],
            discard: [],
            equipment: [],
            x: 50 + (index - professionList.length / 2) * 5,
            y: 50,
            _version: 0,
          };
        });
      } 
      // 兼容旧的角色ID模式
      else if (roleIds) {
        const roleIdList = roleIds.split(',');
        const rolePromises = roleIdList.map(id => 
          fetch(`/api/cards/${id}`).then(res => res.json())
        );
        const roleResults = await Promise.all(rolePromises);
        
        newPlayers = roleResults.map((data, index) => {
        if (!data.success) throw new Error('角色加载失败');
        const role = data.data;
          const profession = (role as any).profession || role.name;
          
          // 获取同职业的所有角色卡
          const professionRoles = allPlayerCards.filter((card: ICard) => 
            (card as any).profession === profession
          );
        
          // 为这个职业筛选技能卡
          const professionSkillCards = allSkillCards.filter((card: ICard) => 
            card.role === profession || card.role === role.name
          );
        
          // 根据技能卡的 count 字段展开成多张
        const expandedSkillCards: ICard[] = [];
          professionSkillCards.forEach((card: ICard) => {
          const count = (card as any).count || 1;
          for (let i = 0; i < count; i++) {
            expandedSkillCards.push({ ...card });
          }
        });
        
        return {
          id: role._id,
          roleCard: role,
            profession: profession,
            availableRoles: professionRoles.length > 0 ? professionRoles : [role],
          name: role.name,
          imgUrl: role.imgUrl,
          color: PLAYER_COLORS[index % PLAYER_COLORS.length],
          hp: role.hp || 10,
          maxHp: role.hp || 10,
          stealth: role.stealth || 0,
          hunger: 0,
          gold: 0,
          tags: [],
          handResource: [],
          handSkill: [],
            skillDeck: shuffle(expandedSkillCards),
          skillDiscard: [],
          discard: [],
          equipment: [],
          x: 50 + (index - roleIdList.length / 2) * 5,
          y: 50,
            _version: 0,
        };
      });
      }
      
      setPlayers(newPlayers);

      // Fetch campaign
      const campRes = await fetch(`/api/campaigns/${urlCampaignId}`);
      const campData = await campRes.json();
      if (!campData.success) throw new Error('战役加载失败');
      const campaign = campData.data;

      // Distribute cards
      const redDeck: ICard[] = [];
      const blueDeck: ICard[] = [];
      const greenDeck: ICard[] = [];
      const shopDeck: ICard[] = [];
      const enemyDeck: ICard[] = [];
      const supportDeck: ICard[] = [];
      const bossDeck: ICard[] = [];
      const daynightDeck: ICard[] = [];
      const specialCharacterDeck: ICard[] = [];
      const mapCards: ICard[] = [];

      campaign.cards.forEach((config: ICampaignCardConfig) => {
        const cardData = { ...config.card, color: config.color };
        const count = config.count || 1; // 默认1张
        
        if (cardData.type === 'RESOURCE') {
          // 根据 count 展开成多张
          for (let i = 0; i < count; i++) {
            if (cardData.color === 'BLUE') blueDeck.push({ ...cardData });
            else if (cardData.color === 'GREEN') greenDeck.push({ ...cardData });
            else if (cardData.color === 'SHOP') shopDeck.push({ ...cardData });
            else redDeck.push({ ...cardData });
          }
        }
        // 敌人卡也根据 count 展开成多张
        if (cardData.type === 'ENEMY') {
          for (let i = 0; i < count; i++) {
            enemyDeck.push({ ...cardData });
          }
        }
        if (cardData.type === 'MAP') mapCards.push(cardData);
        if (cardData.type === 'SUPPORT') supportDeck.push(cardData);
        if (cardData.type === 'BOSS') bossDeck.push(cardData);
        if (cardData.type === 'DAYNIGHT') daynightDeck.push(cardData);
        if (cardData.type === 'SPECIAL_CHARACTER') specialCharacterDeck.push(cardData);
      });

      setGameState(prev => ({
        ...prev,
        campaignName: campaign.name,
        redDeck: shuffle(redDeck),
        blueDeck: shuffle(blueDeck),
        greenDeck: shuffle(greenDeck),
        shopDeck: shuffle(shopDeck),
        enemyDeck: shuffle(enemyDeck),
        supportDeck: shuffle(supportDeck),
        bossDeck: shuffle(bossDeck),
        daynightDeck: shuffle(daynightDeck),
        specialCharacterDeck: shuffle(specialCharacterDeck),
        mapCards: mapCards,
      }));

    } catch (err) {
      console.error(err);
      alert('游戏数据加载失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // --- Save Functions ---
  const saveSession = async (isAutoSave = false) => {
    console.log('saveSession called:', { isAutoSave, playersCount: players.length, campaignId, gameStarted: gameState.gameStarted });
    if (players.length === 0 || !campaignId) {
      console.log('saveSession aborted: no players or campaignId');
      return;
    }
    
    setSaveStatus('saving');
    
    const placedMapForStorage = gameState.placedMap.map(tile => {
      if (!tile) return null;
      return { cardId: tile.card._id, cardData: tile.card, revealed: tile.revealed };
    });
    
    const sessionData = {
      name: `${gameState.campaignName} - ${players.map(p => p.name).join(', ')} - ${new Date().toLocaleString('zh-CN')}`,
      campaignId,
      campaignName: gameState.campaignName,
      // roleId 应该是角色卡的 ObjectId，而不是玩家 ID
      roleId: players[0]?.roleCard?._id || undefined,
      roleName: players[0]?.name,
      roleImgUrl: players[0]?.imgUrl,
      players,
      placedMap: placedMapForStorage,
      terrainGrid: gameState.terrainGrid,
      unplacedMapCards: gameState.mapCards,
      redDeck: gameState.redDeck,
      blueDeck: gameState.blueDeck,
      greenDeck: gameState.greenDeck,
      shopDeck: gameState.shopDeck,
      enemyDeck: gameState.enemyDeck,
      supportDeck: gameState.supportDeck,
      bossDeck: gameState.bossDeck,
      daynightDeck: gameState.daynightDeck,
      specialCharacterDeck: gameState.specialCharacterDeck,
      publicDiscard: gameState.publicDiscard,
      enemyDiscard: gameState.enemyDiscard,
      supportDiscard: gameState.supportDiscard,
      bossDiscard: gameState.bossDiscard,
      daynightDiscard: gameState.daynightDiscard,
      specialCharacterDiscard: gameState.specialCharacterDiscard,
      mapDiscard: gameState.mapDiscard,
      mapMarkers: gameState.mapMarkers,
      activeEnemies,
      activeBosses,
      activeSupports,
      activeSpecialCharacters,
      gameStarted: gameState.gameStarted,
    };
    
    try {
      let res;
      if (currentSessionId) {
        res = await fetch(`/api/game-sessions/${currentSessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionData)
        });
      } else {
        res = await fetch('/api/game-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionData)
        });
      }
      
      const data = await res.json();
      if (data.success) {
        if (!currentSessionId) {
          setCurrentSessionId(data.data._id);
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('sessionId', data.data._id);
          window.history.replaceState({}, '', newUrl.toString());
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('error');
      if (!isAutoSave) alert('保存失败: ' + (err as Error).message);
    }
  };

  // Auto-save and WebSocket sync
  useEffect(() => {
    if (loading || !gameState.gameStarted || !campaignId) return;
    
    // 如果是远程更新，不触发同步和保存
    if (isRemoteUpdateRef.current) return;
    
    // 发送 WebSocket 同步
    if (isConnected) {
      sendSync({ players, gameState, activeEnemies });
    }
    
    // 自动保存
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveSession(true), 5000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [gameState, players, activeEnemies, loading, campaignId, isConnected, sendSync]);

  // --- Helpers ---
  const shuffle = (array: any[]) => [...array].sort(() => Math.random() - 0.5);

  // --- Player Actions ---
  // 更新玩家状态，自动增加版本号防止同步时被旧数据覆盖
  const updatePlayer = (playerId: string, updates: Partial<Player>) => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== playerId) return p;
      return { ...p, ...updates, _version: (p._version || 0) + 1 };
    }));
  };

  // 切换玩家角色（同职业）
  const switchPlayerRole = (playerId: string, newRoleCard: ICard) => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== playerId) return p;
      return {
        ...p,
        roleCard: newRoleCard,
        name: newRoleCard.name,
        imgUrl: newRoleCard.imgUrl,
        // 可以选择是否重置属性，这里保留当前属性
        // hp: newRoleCard.hp || p.hp,
        // maxHp: newRoleCard.hp || p.maxHp,
        // stealth: newRoleCard.stealth || p.stealth,
        _version: (p._version || 0) + 1
      };
    }));
    // 同步更新 selectedPlayer
    if (selectedPlayer && selectedPlayer.id === playerId) {
      setSelectedPlayer(prev => prev ? {
        ...prev,
        roleCard: newRoleCard,
        name: newRoleCard.name,
        imgUrl: newRoleCard.imgUrl,
        _version: (prev._version || 0) + 1
      } : null);
    }
  };

  const addTagToPlayer = (playerId: string) => {
    const tag = prompt("输入状态标签 (例如: 中毒):");
    if (tag) {
      setPlayers(prev => prev.map(p => 
        p.id === playerId ? { ...p, tags: [...p.tags, tag], _version: (p._version || 0) + 1 } : p
      ));
      // Also update selectedPlayer if it matches
      if (selectedPlayer && selectedPlayer.id === playerId) {
        setSelectedPlayer(prev => prev ? { ...prev, tags: [...prev.tags, tag], _version: (prev._version || 0) + 1 } : null);
      }
    }
  };

  const removeTagFromPlayer = (playerId: string, tagIndex: number) => {
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, tags: p.tags.filter((_, i) => i !== tagIndex), _version: (p._version || 0) + 1 } : p
    ));
    // Also update selectedPlayer if it matches
    if (selectedPlayer && selectedPlayer.id === playerId) {
      setSelectedPlayer(prev => prev ? { ...prev, tags: prev.tags.filter((_, i) => i !== tagIndex), _version: (prev._version || 0) + 1 } : null);
    }
  };

  const drawCardForPlayer = (playerId: string, deckType: 'RED' | 'BLUE' | 'GREEN' | 'SHOP' | 'SKILL') => {
    const currentPlayer = players.find(p => p.id === playerId);
    if (!currentPlayer) return;
    
    if (deckType === 'SKILL') {
      // 从玩家的技能牌堆抽取
      if (currentPlayer.skillDeck.length === 0) {
        // 如果技能牌堆为空，可以选择将技能弃牌堆洗回牌堆
        if (currentPlayer.skillDiscard.length > 0) {
          const reshuffled = shuffle([...currentPlayer.skillDiscard]);
          const [card, ...rest] = reshuffled;
          const updatedPlayer: Player = {
            ...currentPlayer,
            skillDeck: rest,
            skillDiscard: [],
            handSkill: [...currentPlayer.handSkill, card],
            _version: (currentPlayer._version || 0) + 1
          };
          setPlayers(prev => prev.map(p => p.id === playerId ? updatedPlayer : p));
          if (selectedPlayer && selectedPlayer.id === playerId) {
            setSelectedPlayer(updatedPlayer);
          }
        }
        return;
      }
      
      const [card, ...rest] = currentPlayer.skillDeck;
      const updatedPlayer: Player = {
        ...currentPlayer,
        skillDeck: rest,
        handSkill: [...currentPlayer.handSkill, card],
        _version: (currentPlayer._version || 0) + 1
      };
      setPlayers(prev => prev.map(p => p.id === playerId ? updatedPlayer : p));
      if (selectedPlayer && selectedPlayer.id === playerId) {
        setSelectedPlayer(updatedPlayer);
      }
      return;
    }
    
    const deckKey = deckType === 'RED' ? 'redDeck' : deckType === 'BLUE' ? 'blueDeck' : deckType === 'SHOP' ? 'shopDeck' : 'greenDeck';
    const deck = gameState[deckKey];
    if (deck.length === 0) return;

    const [card, ...rest] = deck;
    setGameState(prev => ({ ...prev, [deckKey]: rest }));
    setPlayers(prev => prev.map(p => 
      p.id === playerId ? { ...p, handResource: [...p.handResource, card], _version: (p._version || 0) + 1 } : p
    ));
  };

  const discardCardFromPlayer = (playerId: string, cardIndex: number, isSkill: boolean) => {
    // 先获取当前玩家信息进行安全检查
    const currentPlayer = players.find(p => p.id === playerId);
    if (!currentPlayer) return;
    
    const card = isSkill ? currentPlayer.handSkill[cardIndex] : currentPlayer.handResource[cardIndex];
    if (!card) return; // 安全检查：确保卡牌存在
    
    // 先从手牌移除卡牌，同时增加版本号
    const newVersion = (currentPlayer._version || 0) + 1;
    const playerWithoutCard: Player = isSkill 
      ? { ...currentPlayer, handSkill: currentPlayer.handSkill.filter((_, i) => i !== cardIndex), _version: newVersion }
      : { ...currentPlayer, handResource: currentPlayer.handResource.filter((_, i) => i !== cardIndex), _version: newVersion };
    
    // 使用统一的弃牌处理函数
    const playersWithoutCard = players.map(p => p.id === playerId ? playerWithoutCard : p);
    const { updatedPlayers, updatedGameState } = processCardDiscard(card, playerId, playersWithoutCard, gameState);
    
    setPlayers(updatedPlayers);
    if (updatedGameState) {
      setGameState(prev => ({ ...prev, ...updatedGameState }));
    }
    
    // 立即更新 selectedPlayer
    if (selectedPlayer && selectedPlayer.id === playerId) {
      const newSelectedPlayer = updatedPlayers.find(p => p.id === playerId);
      if (newSelectedPlayer) setSelectedPlayer(newSelectedPlayer);
    }
  };

  // 打出卡牌（使用卡牌后进入弃牌区，同时在顶栏显示打出的卡牌）
  const playCardFromPlayer = (playerId: string, cardIndex: number, isSkill: boolean) => {
    const currentPlayer = players.find(p => p.id === playerId);
    if (!currentPlayer) return;
    
    const card = isSkill ? currentPlayer.handSkill[cardIndex] : currentPlayer.handResource[cardIndex];
    if (!card) return;
    
    // 先从手牌移除卡牌，同时增加版本号（这是防止状态回滚的关键）
    const newVersion = (currentPlayer._version || 0) + 1;
    const playerWithoutCard: Player = isSkill 
      ? { ...currentPlayer, handSkill: currentPlayer.handSkill.filter((_, i) => i !== cardIndex), _version: newVersion }
      : { ...currentPlayer, handResource: currentPlayer.handResource.filter((_, i) => i !== cardIndex), _version: newVersion };
    
    // 统一使用弃牌处理函数（打出和弃牌都走同样的逻辑）
    const playersWithoutCard = players.map(p => p.id === playerId ? playerWithoutCard : p);
    const { updatedPlayers, updatedGameState } = processCardDiscard(card, playerId, playersWithoutCard, gameState);
    
    // 显示打出的卡牌（覆盖前一张）
    const newPlayedCard: PlayedCard = {
      card,
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      playerColor: currentPlayer.color,
      timestamp: Date.now()
    };
    
    setPlayers(updatedPlayers);
    setGameState(prev => ({ 
      ...prev, 
      ...updatedGameState,
      playedCard: newPlayedCard
    }));
    
    // 发送打出卡牌的 WebSocket 消息
    if (isConnected) {
      sendPlayedCard(newPlayedCard);
    }
    
    // 立即更新 selectedPlayer
    if (selectedPlayer && selectedPlayer.id === playerId) {
      const newSelectedPlayer = updatedPlayers.find(p => p.id === playerId);
      if (newSelectedPlayer) setSelectedPlayer(newSelectedPlayer);
    }
  };

  // 清除打出的卡牌显示
  const clearPlayedCard = () => {
    setGameState(prev => ({
      ...prev,
      playedCard: null
    }));
  };

  // Equip a card from hand to equipment slot
  const equipCardFromHand = (playerId: string, cardIndex: number, isSkill: boolean) => {
    // 先获取当前玩家信息进行安全检查
    const currentPlayer = players.find(p => p.id === playerId);
    if (!currentPlayer) return;
    
    const card = isSkill ? currentPlayer.handSkill[cardIndex] : currentPlayer.handResource[cardIndex];
    if (!card) return; // 安全检查：确保卡牌存在
    
    const newEquip: Equipment = { card, labels: [], ammo: 0 };
    const newVersion = (currentPlayer._version || 0) + 1;
    let updatedPlayer: Player;
    
    if (isSkill) {
      updatedPlayer = { 
        ...currentPlayer, 
        handSkill: currentPlayer.handSkill.filter((_, i) => i !== cardIndex), 
        equipment: [...currentPlayer.equipment, newEquip],
        _version: newVersion
      };
    } else {
      updatedPlayer = { 
        ...currentPlayer, 
        handResource: currentPlayer.handResource.filter((_, i) => i !== cardIndex), 
        equipment: [...currentPlayer.equipment, newEquip],
        _version: newVersion
      };
    }
    
    setPlayers(prev => prev.map(p => p.id === playerId ? updatedPlayer : p));
    
    // 立即更新 selectedPlayer
    if (selectedPlayer && selectedPlayer.id === playerId) {
      setSelectedPlayer(updatedPlayer);
    }
  };

  // 赠送卡牌给其他玩家
  const giftCardToPlayer = (fromPlayerId: string, cardIndex: number, isSkill: boolean, toPlayerId: string) => {
    const fromPlayer = players.find(p => p.id === fromPlayerId);
    const toPlayer = players.find(p => p.id === toPlayerId);
    if (!fromPlayer || !toPlayer) return;
    
    const card = isSkill ? fromPlayer.handSkill[cardIndex] : fromPlayer.handResource[cardIndex];
    if (!card) return;
    
    // 更新两个玩家的状态，都增加版本号
    setPlayers(prev => prev.map(p => {
      if (p.id === fromPlayerId) {
        // 从送礼者手牌移除
        const newVersion = (p._version || 0) + 1;
        return isSkill 
          ? { ...p, handSkill: p.handSkill.filter((_, i) => i !== cardIndex), _version: newVersion }
          : { ...p, handResource: p.handResource.filter((_, i) => i !== cardIndex), _version: newVersion };
      }
      if (p.id === toPlayerId) {
        // 添加到接收者手牌
        const newVersion = (p._version || 0) + 1;
        return isSkill
          ? { ...p, handSkill: [...p.handSkill, card], _version: newVersion }
          : { ...p, handResource: [...p.handResource, card], _version: newVersion };
      }
      return p;
    }));
    
    // 更新 selectedPlayer
    if (selectedPlayer && selectedPlayer.id === fromPlayerId) {
      const newVersion = (selectedPlayer._version || 0) + 1;
      const updated = isSkill
        ? { ...selectedPlayer, handSkill: selectedPlayer.handSkill.filter((_, i) => i !== cardIndex), _version: newVersion }
        : { ...selectedPlayer, handResource: selectedPlayer.handResource.filter((_, i) => i !== cardIndex), _version: newVersion };
      setSelectedPlayer(updated);
    }
  };

  // 从弃牌堆取回卡牌到手牌
  const recoverCardFromDiscard = (playerId: string, cardIndex: number) => {
    const currentPlayer = players.find(p => p.id === playerId);
    if (!currentPlayer) return;
    
    const card = currentPlayer.discard[cardIndex];
    if (!card) return;
    
    // 根据卡牌类型放回对应的手牌（资源卡或技能卡）
    const isSkillCard = card.type === 'SKILL';
    const newVersion = (currentPlayer._version || 0) + 1;
    const updatedPlayer: Player = {
      ...currentPlayer,
      discard: currentPlayer.discard.filter((_, i) => i !== cardIndex),
      _version: newVersion,
      ...(isSkillCard 
        ? { handSkill: [...currentPlayer.handSkill, card] }
        : { handResource: [...currentPlayer.handResource, card] }
      )
    };
    
    setPlayers(prev => prev.map(p => p.id === playerId ? updatedPlayer : p));
    
    if (selectedPlayer && selectedPlayer.id === playerId) {
      setSelectedPlayer(updatedPlayer);
    }
  };

  const addEquipmentLabel = (playerId: string, equipIndex: number, label: string) => {
    if (!label.trim()) return;
    setPlayers(prev => {
      const newPlayers = prev.map(p => {
        if (p.id !== playerId) return p;
        const newEquip = [...p.equipment];
        const currentLabels = newEquip[equipIndex].labels || [];
        newEquip[equipIndex] = { ...newEquip[equipIndex], labels: [...currentLabels, label.trim()] };
        return { ...p, equipment: newEquip, _version: (p._version || 0) + 1 };
      });
      const updatedPlayer = newPlayers.find(p => p.id === playerId);
      if (updatedPlayer) {
        setSelectedPlayer(current => current?.id === playerId ? updatedPlayer : current);
      }
      return newPlayers;
    });
  };

  const removeEquipmentLabel = (playerId: string, equipIndex: number, labelIndex: number) => {
    setPlayers(prev => {
      const newPlayers = prev.map(p => {
        if (p.id !== playerId) return p;
        const newEquip = [...p.equipment];
        const currentLabels = newEquip[equipIndex].labels || [];
        newEquip[equipIndex] = { ...newEquip[equipIndex], labels: currentLabels.filter((_, i) => i !== labelIndex) };
        return { ...p, equipment: newEquip, _version: (p._version || 0) + 1 };
      });
      const updatedPlayer = newPlayers.find(p => p.id === playerId);
      if (updatedPlayer) {
        setSelectedPlayer(current => current?.id === playerId ? updatedPlayer : current);
      }
      return newPlayers;
    });
  };

  const removeEquipmentFromPlayer = (playerId: string, equipIndex: number) => {
    // 先获取当前玩家信息进行安全检查
    const currentPlayer = players.find(p => p.id === playerId);
    if (!currentPlayer) return;
    
    const removedEquipment = currentPlayer.equipment[equipIndex];
    if (!removedEquipment) return;
    
    const card = removedEquipment.card;
    
    // 先从装备栏移除，增加版本号
    const newVersion = (currentPlayer._version || 0) + 1;
    const playerWithoutEquip: Player = { 
      ...currentPlayer, 
      equipment: currentPlayer.equipment.filter((_, i) => i !== equipIndex),
      _version: newVersion
    };
    
    // 使用统一的弃牌处理函数
    const playersWithoutEquip = players.map(p => p.id === playerId ? playerWithoutEquip : p);
    const { updatedPlayers, updatedGameState } = processCardDiscard(card, playerId, playersWithoutEquip, gameState);
    
    setPlayers(updatedPlayers);
    if (updatedGameState) {
      setGameState(prev => ({ ...prev, ...updatedGameState }));
    }
    
    // 立即更新 selectedPlayer
    if (selectedPlayer && selectedPlayer.id === playerId) {
      const newSelectedPlayer = updatedPlayers.find(p => p.id === playerId);
      if (newSelectedPlayer) setSelectedPlayer(newSelectedPlayer);
    }
  };

  const updateEquipmentAmmo = (playerId: string, equipIndex: number, delta: number) => {
    setPlayers(prev => {
      const newPlayers = prev.map(p => {
        if (p.id !== playerId) return p;
        const newEquip = [...p.equipment];
        const currentAmmo = newEquip[equipIndex].ammo || 0;
        newEquip[equipIndex] = { ...newEquip[equipIndex], ammo: Math.max(0, currentAmmo + delta) };
        return { ...p, equipment: newEquip, _version: (p._version || 0) + 1 };
      });
      const updatedPlayer = newPlayers.find(p => p.id === playerId);
      if (updatedPlayer) {
        setSelectedPlayer(current => current?.id === playerId ? updatedPlayer : current);
      }
      return newPlayers;
    });
  };

  // --- Enemy Actions ---
  const drawEnemy = () => {
    if (gameState.enemyDeck.length === 0) return;
    const [card, ...rest] = gameState.enemyDeck;
    const newEnemy: ActiveEnemy = {
      id: Date.now().toString(),
      card,
      currentHp: card.hp || 1,
      maxHp: card.hp || 1,
    };
    setActiveEnemies(prev => [...prev, newEnemy]);
    setGameState(prev => ({ ...prev, enemyDeck: rest }));
  };

  const updateEnemyHp = (enemyId: string, delta: number) => {
    setActiveEnemies(prev => prev.map(e => 
      e.id === enemyId ? { ...e, currentHp: Math.max(0, e.currentHp + delta) } : e
    ));
    // Also update selectedEnemy if it matches
    setSelectedEnemy(current => 
      current?.id === enemyId ? { ...current, currentHp: Math.max(0, current.currentHp + delta) } : current
    );
  };

  const bindEnemyToPlayer = (enemyId: string, playerId: string | undefined) => {
    setActiveEnemies(prev => prev.map(e => 
      e.id === enemyId ? { ...e, boundToPlayerId: playerId } : e
    ));
    setSelectedEnemy(current => 
      current?.id === enemyId ? { ...current, boundToPlayerId: playerId } : current
    );
  };

  const discardEnemy = (enemyId: string) => {
    const enemy = activeEnemies.find(e => e.id === enemyId);
    if (!enemy) return;
    setActiveEnemies(prev => prev.filter(e => e.id !== enemyId));
    setGameState(prev => ({ ...prev, enemyDiscard: [enemy.card, ...prev.enemyDiscard] }));
    setSelectedEnemy(null);
  };

  const restoreEnemyToActive = (cardIndex: number) => {
    const card = gameState.enemyDiscard[cardIndex];
    if (!card) return;
    
    const newEnemy: ActiveEnemy = {
      id: Date.now().toString(),
      card,
      currentHp: card.hp || 1,
      maxHp: card.hp || 1,
    };
    
    setActiveEnemies(prev => [...prev, newEnemy]);
    setGameState(prev => ({
      ...prev,
      enemyDiscard: prev.enemyDiscard.filter((_, i) => i !== cardIndex)
    }));
  };

  const restoreEnemyToDeck = (cardIndex: number) => {
    const card = gameState.enemyDiscard[cardIndex];
    if (!card) return;
    
    setGameState(prev => ({
      ...prev,
      enemyDeck: [...prev.enemyDeck, card], // Add to bottom of deck
      enemyDiscard: prev.enemyDiscard.filter((_, i) => i !== cardIndex)
    }));
  };

  // --- Boss Actions (Field Management) ---
  const updateBossHp = (bossId: string, delta: number) => {
    setActiveBosses(prev => prev.map(b => 
      b.id === bossId ? { ...b, currentHp: Math.max(0, b.currentHp + delta) } : b
    ));
  };

  const bindBossToPlayer = (bossId: string, playerId: string | undefined) => {
    setActiveBosses(prev => prev.map(b => 
      b.id === bossId ? { ...b, boundToPlayerId: playerId } : b
    ));
  };

  const discardBoss = (bossId: string) => {
    const boss = activeBosses.find(b => b.id === bossId);
    if (!boss) return;
    setActiveBosses(prev => prev.filter(b => b.id !== bossId));
    setGameState(prev => ({ ...prev, bossDiscard: [boss.card, ...prev.bossDiscard] }));
  };

  const restoreBossToActive = (cardIndex: number) => {
    const card = gameState.bossDiscard[cardIndex];
    if (!card) return;
    
    const newBoss: ActiveEnemy = {
      id: Date.now().toString(),
      card,
      currentHp: card.hp || 1,
      maxHp: card.hp || 1,
    };
    
    setActiveBosses(prev => [...prev, newBoss]);
    setGameState(prev => ({
      ...prev,
      bossDiscard: prev.bossDiscard.filter((_, i) => i !== cardIndex)
    }));
  };

  const restoreBossToDeck = (cardIndex: number) => {
    const card = gameState.bossDiscard[cardIndex];
    if (!card) return;
    
    setGameState(prev => ({
      ...prev,
      bossDeck: [...prev.bossDeck, card],
      bossDiscard: prev.bossDiscard.filter((_, i) => i !== cardIndex)
    }));
  };

  // --- Support Actions (like Enemy) ---
  const drawSupport = () => {
    if (gameState.supportDeck.length === 0) return;
    const [card, ...rest] = gameState.supportDeck;
    const newSupport: ActiveEnemy = {
      id: Date.now().toString(),
      card,
      currentHp: card.hp || 1,
      maxHp: card.hp || 1,
    };
    setActiveSupports(prev => [...prev, newSupport]);
    setGameState(prev => ({ ...prev, supportDeck: rest }));
  };

  const updateSupportHp = (supportId: string, delta: number) => {
    setActiveSupports(prev => prev.map(s => 
      s.id === supportId ? { ...s, currentHp: Math.max(0, s.currentHp + delta) } : s
    ));
  };

  const bindSupportToPlayer = (supportId: string, playerId: string | undefined) => {
    setActiveSupports(prev => prev.map(s => 
      s.id === supportId ? { ...s, boundToPlayerId: playerId } : s
    ));
  };

  const discardSupport = (supportId: string) => {
    const support = activeSupports.find(s => s.id === supportId);
    if (!support) return;
    setActiveSupports(prev => prev.filter(s => s.id !== supportId));
    setGameState(prev => ({ ...prev, supportDiscard: [support.card, ...prev.supportDiscard] }));
  };

  const restoreSupportToActive = (cardIndex: number) => {
    const card = gameState.supportDiscard[cardIndex];
    if (!card) return;
    
    const newSupport: ActiveEnemy = {
      id: Date.now().toString(),
      card,
      currentHp: card.hp || 1,
      maxHp: card.hp || 1,
    };
    
    setActiveSupports(prev => [...prev, newSupport]);
    setGameState(prev => ({
      ...prev,
      supportDiscard: prev.supportDiscard.filter((_, i) => i !== cardIndex)
    }));
  };

  const restoreSupportToDeck = (cardIndex: number) => {
    const card = gameState.supportDiscard[cardIndex];
    if (!card) return;
    
    setGameState(prev => ({
      ...prev,
      supportDeck: [...prev.supportDeck, card],
      supportDiscard: prev.supportDiscard.filter((_, i) => i !== cardIndex)
    }));
  };

  // --- Boss Actions (Free Pick) ---
  const giveBossToPlayer = (cardIndex: number, playerId: string) => {
    const card = gameState.bossDeck[cardIndex];
    if (!card) return;
    
    setPlayers(prev => prev.map(p => 
      p.id === playerId 
        ? { ...p, handResource: [...p.handResource, card] }
        : p
    ));
    
    setGameState(prev => ({
      ...prev,
      bossDeck: prev.bossDeck.filter((_, i) => i !== cardIndex)
    }));
  };

  const putBossToField = (cardIndex: number) => {
    const card = gameState.bossDeck[cardIndex];
    if (!card) return;
    
    const newBoss: ActiveEnemy = {
      id: Date.now().toString(),
      card,
      currentHp: card.hp || 1,
      maxHp: card.hp || 1,
    };
    
    setActiveBosses(prev => [...prev, newBoss]);
    setGameState(prev => ({
      ...prev,
      bossDeck: prev.bossDeck.filter((_, i) => i !== cardIndex)
    }));
  };

  const discardBossFromDeck = (cardIndex: number) => {
    const card = gameState.bossDeck[cardIndex];
    if (!card) return;
    
    setGameState(prev => ({
      ...prev,
      bossDeck: prev.bossDeck.filter((_, i) => i !== cardIndex),
      bossDiscard: [card, ...prev.bossDiscard]
    }));
  };

  const returnBossToDeckBottom = (cardIndex: number) => {
    const card = gameState.bossDeck[cardIndex];
    if (!card) return;
    
    setGameState(prev => ({
      ...prev,
      bossDeck: [...prev.bossDeck.filter((_, i) => i !== cardIndex), card]
    }));
  };

  // --- Day/Night Actions (display in played card area) ---
  const drawDaynight = () => {
    if (gameState.daynightDeck.length === 0) return;
    const [card, ...rest] = gameState.daynightDeck;
    
    // 显示在打出牌位置（会覆盖之前的牌）
    const daynightPlayedCard: PlayedCard = {
      card,
      playerId: 'system',
      playerName: '日夜',
      playerColor: '#6366f1', // indigo
      timestamp: Date.now(),
    };
    
    setGameState(prev => ({ 
      ...prev, 
      daynightDeck: rest,
      playedCard: daynightPlayedCard,
    }));
  };

  const restoreDaynightToDeck = (cardIndex: number) => {
    const card = gameState.daynightDiscard[cardIndex];
    if (!card) return;
    
    setGameState(prev => ({
      ...prev,
      daynightDeck: [...prev.daynightDeck, card],
      daynightDiscard: prev.daynightDiscard.filter((_, i) => i !== cardIndex)
    }));
  };

  // --- Special Character Actions ---
  const putSpecialCharacterToField = (cardIndex: number) => {
    const card = gameState.specialCharacterDeck[cardIndex];
    if (!card) return;
    
    // 放入战场（独立的特殊人物区域）
    const newCharacter: ActiveEnemy = {
      id: Date.now().toString(),
      card,
      currentHp: card.hp || 1,
      maxHp: card.hp || 1,
    };
    
    setActiveSpecialCharacters(prev => [...prev, newCharacter]);
    setGameState(prev => ({
      ...prev,
      specialCharacterDeck: prev.specialCharacterDeck.filter((_, i) => i !== cardIndex)
    }));
  };

  const updateSpecialCharacterHp = (charId: string, delta: number) => {
    setActiveSpecialCharacters(prev => prev.map(c => 
      c.id === charId ? { ...c, currentHp: Math.max(0, c.currentHp + delta) } : c
    ));
  };

  const bindSpecialCharacterToPlayer = (charId: string, playerId: string | undefined) => {
    setActiveSpecialCharacters(prev => prev.map(c => 
      c.id === charId ? { ...c, boundToPlayerId: playerId } : c
    ));
  };

  const discardSpecialCharacter = (charId: string) => {
    const character = activeSpecialCharacters.find(c => c.id === charId);
    if (!character) return;
    setActiveSpecialCharacters(prev => prev.filter(c => c.id !== charId));
    setGameState(prev => ({ ...prev, specialCharacterDiscard: [character.card, ...prev.specialCharacterDiscard] }));
  };

  const restoreSpecialCharacterToActive = (cardIndex: number) => {
    const card = gameState.specialCharacterDiscard[cardIndex];
    if (!card) return;
    
    const newCharacter: ActiveEnemy = {
      id: Date.now().toString(),
      card,
      currentHp: card.hp || 1,
      maxHp: card.hp || 1,
    };
    
    setActiveSpecialCharacters(prev => [...prev, newCharacter]);
    setGameState(prev => ({
      ...prev,
      specialCharacterDiscard: prev.specialCharacterDiscard.filter((_, i) => i !== cardIndex)
    }));
  };

  const restoreSpecialCharacterToDeck = (cardIndex: number) => {
    const card = gameState.specialCharacterDiscard[cardIndex];
    if (!card) return;
    
    setGameState(prev => ({
      ...prev,
      specialCharacterDeck: [...prev.specialCharacterDeck, card],
      specialCharacterDiscard: prev.specialCharacterDiscard.filter((_, i) => i !== cardIndex)
    }));
  };

  // --- Map Actions ---
  const handleMapCardDragStart = (index: number) => setDraggingMapCard(index);

  const handleGridDrop = (gridIndex: number) => {
    // 检查是否是从待放置区拖拽
    if (draggingMapCard !== null) {
      if (gameState.placedMap[gridIndex]) return;
      if (!gameState.terrainGrid[gridIndex]) return;  // 只能放在启用的格子上

      const card = gameState.mapCards[draggingMapCard];
      const newPlaced = [...gameState.placedMap];
      newPlaced[gridIndex] = { card, revealed: true };

      const newMapCards = [...gameState.mapCards];
      newMapCards.splice(draggingMapCard, 1);

      setGameState(prev => ({ ...prev, placedMap: newPlaced, mapCards: newMapCards }));
      setDraggingMapCard(null);
      return;
    }
    
    // 检查是否是从地图弃牌堆拖拽
    if (draggingFromDiscard !== null) {
      if (gameState.placedMap[gridIndex]) return;
      if (!gameState.terrainGrid[gridIndex]) return;  // 只能放在启用的格子上

      const card = gameState.mapDiscard[draggingFromDiscard];
      const newPlaced = [...gameState.placedMap];
      newPlaced[gridIndex] = { card, revealed: true };

      const newMapDiscard = [...gameState.mapDiscard];
      newMapDiscard.splice(draggingFromDiscard, 1);

      setGameState(prev => ({ ...prev, placedMap: newPlaced, mapDiscard: newMapDiscard }));
      setDraggingFromDiscard(null);
      setMapDiscardModalOpen(false);
      return;
    }
  };

  // 切换地形格子的启用/禁用状态
  const toggleTerrainCell = (index: number) => {
    setGameState(prev => {
      const newTerrain = [...prev.terrainGrid];
      newTerrain[index] = !newTerrain[index];
      // 如果禁用了格子，同时清空该格子上的地图卡
      const newPlaced = [...prev.placedMap];
      if (!newTerrain[index] && newPlaced[index]) {
        // 将地图卡放回未放置列表
        const removedCard = newPlaced[index]!.card;
        newPlaced[index] = null;
        return { ...prev, terrainGrid: newTerrain, placedMap: newPlaced, mapCards: [...prev.mapCards, removedCard] };
      }
      return { ...prev, terrainGrid: newTerrain, placedMap: newPlaced };
    });
  };

  const handleRandomFill = () => {
    // 只在启用的空格子上放置
    const emptySlots = gameState.placedMap
      .map((val, idx) => (val === null && gameState.terrainGrid[idx]) ? idx : -1)
      .filter(idx => idx !== -1);
    const remainingCards = [...gameState.mapCards];
    const newPlaced = [...gameState.placedMap];
    const shuffledSlots = shuffle(emptySlots);

    shuffledSlots.forEach((slotIdx, i) => {
      if (i < remainingCards.length) {
        newPlaced[slotIdx] = { card: remainingCards[i], revealed: false };
      }
    });

    const cardsPlacedCount = Math.min(remainingCards.length, shuffledSlots.length);
    remainingCards.splice(0, cardsPlacedCount);

    setGameState(prev => ({ ...prev, placedMap: newPlaced, mapCards: remainingCards }));
    setTerrainEditMode(false);
  };

  // 清空已放置的地图卡牌，将它们放回待放置区
  const handleClearMap = () => {
    const clearedCards: ICard[] = [];
    const newPlaced = gameState.placedMap.map(tile => {
      if (tile) clearedCards.push(tile.card);
      return null;
    });
    setGameState(prev => ({ 
      ...prev, 
      placedMap: newPlaced, 
      mapCards: [...prev.mapCards, ...clearedCards] 
    }));
  };

  const startGame = () => {
    // 检查是否至少有一个启用的格子放置了地图卡
    const hasPlacedTiles = gameState.placedMap.some((tile, idx) => tile && gameState.terrainGrid[idx]);
    if (!hasPlacedTiles) {
      alert('请先放置至少一张地图卡牌！');
      return;
    }
    setGameState(prev => ({ ...prev, gameStarted: true }));
  };

  const revealTile = (index: number) => {
    setGameState(prev => {
      const newPlaced = [...prev.placedMap];
      if (newPlaced[index]) newPlaced[index] = { ...newPlaced[index]!, revealed: true };
      return { ...prev, placedMap: newPlaced };
    });
    setSelectedTileIndex(null);
  };

  const handleTileClick = (index: number) => {
    const tile = gameState.placedMap[index];
    if (!tile) { setSelectedTileIndex(null); return; }
    setSelectedTileIndex(selectedTileIndex === index ? null : index);
  };

  // --- Player Token Movement ---
  const handlePlayerMouseDown = (e: React.MouseEvent, playerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingPlayer(playerId);
  };

  // 地形拖拽结束事件
  useEffect(() => {
    const handleTerrainMouseUp = () => {
      setTerrainDragging(false);
      setTerrainDragMode(null);
    };
    
    if (terrainDragging) {
      document.addEventListener('mouseup', handleTerrainMouseUp);
    }
    return () => {
      document.removeEventListener('mouseup', handleTerrainMouseUp);
    };
  }, [terrainDragging]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!draggingPlayer || !gridContainerRef.current) return;
      const rect = gridContainerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      updatePlayer(draggingPlayer, { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
    };
    const handleGlobalMouseUp = () => setDraggingPlayer(null);

    if (draggingPlayer) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingPlayer]);

  // 标记拖拽处理
  useEffect(() => {
    const handleMarkerMouseMove = (e: MouseEvent) => {
      if (!draggingMarker || !gridContainerRef.current) return;
      const rect = gridContainerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setGameState(prev => ({
        ...prev,
        mapMarkers: prev.mapMarkers.map(m => 
          m.id === draggingMarker 
            ? { ...m, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
            : m
        )
      }));
    };
    const handleMarkerMouseUp = () => setDraggingMarker(null);

    if (draggingMarker) {
      document.addEventListener('mousemove', handleMarkerMouseMove);
      document.addEventListener('mouseup', handleMarkerMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMarkerMouseMove);
      document.removeEventListener('mouseup', handleMarkerMouseUp);
    };
  }, [draggingMarker]);

  if (loading) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="text-amber-500 text-2xl font-bold animate-pulse">正在进入地下城...</div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0c] text-slate-200 overflow-hidden font-sans select-none">
      
      {/* --- Top Bar --- */}
      <TopBar
        gameState={gameState}
        playerCount={players.length}
        saveStatus={saveStatus}
        sessionId={currentSessionId}
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        onOpenDiscardModal={() => setDiscardModalOpen(true)}
        onOpenMapDiscardModal={() => setMapDiscardModalOpen(true)}
        onOpenCombinedDiscardModal={() => setCombinedDiscardModalOpen(true)}
        onOpenSpecialCharacterModal={() => setSpecialCharacterModalOpen(true)}
        onOpenBossModal={() => setBossModalOpen(true)}
        onOpenMarkerModal={() => setShowMarkerModal(true)}
        onAddMonsterMarker={() => {
          // 快速添加怪物标记（红色，左上角）
          const newMarker = {
            id: `marker-${Date.now()}`,
            text: '怪物',
            color: '#ef4444',
            x: 5,
            y: 5,
          };
          setGameState(prev => ({
            ...prev,
            mapMarkers: [...prev.mapMarkers, newMarker]
          }));
        }}
        diceResult={diceResult}
        isRolling={isRolling}
        customHighlight={customHighlight}
        onRollDice={() => {
          // 开始滚动动画
          setIsRolling(true);
          setDiceResult(null);
          setCustomHighlight(null);
          
          // 模拟滚动动画，0.8秒后显示结果
          setTimeout(() => {
            const dice1 = Math.floor(Math.random() * 6) + 1;
            const dice2 = Math.floor(Math.random() * 6) + 1;
            setDiceResult({ dice1, dice2 });
            setIsRolling(false);
          }, 800);
        }}
        onClearDice={() => {
          setDiceResult(null);
          setCustomHighlight(null);
        }}
        onSetCustomHighlight={(num) => {
          setCustomHighlight(num);
          setDiceResult(null);
        }}
        onDrawEnemy={drawEnemy}
        onDrawSupport={drawSupport}
        onDrawDaynight={drawDaynight}
        onSave={() => saveSession(false)}
        onClearPlayedCard={clearPlayedCard}
      />

      {/* --- Main Area --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Player List */}
        <PlayerList
          players={players}
          onUpdatePlayer={(playerId, updates) => updatePlayer(playerId, updates)}
          onUpdateGold={(playerId, delta) => updatePlayer(playerId, { gold: Math.max(0, players.find(p => p.id === playerId)!.gold + delta) })}
          onAddTag={(playerId) => addTagToPlayer(playerId)}
          onRemoveTag={(playerId, idx) => removeTagFromPlayer(playerId, idx)}
          onDrawCard={(playerId, deck) => drawCardForPlayer(playerId, deck)}
          onSelectPlayer={(player) => setSelectedPlayer(player)}
          onEquipmentClick={(playerId, idx) => setEquipmentPreview({ playerId, equipIndex: idx })}
          onUpdateEquipAmmo={(playerId, equipIdx, delta) => updateEquipmentAmmo(playerId, equipIdx, delta)}
          onViewSkillDeck={(playerId) => setViewingSkillDeckPlayerId(playerId)}
          onViewCard={(card) => setViewingCard(card)}
        />

        {/* Center: Map */}
        <div className="flex-1 relative overflow-hidden bg-[#050507] flex flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#151520_0%,_#000000_100%)] pointer-events-none"></div>
          
          {/* Map Setup Panel */}
          <MapSetupPanel
            gameStarted={gameState.gameStarted}
            terrainEditMode={terrainEditMode}
            terrainGrid={gameState.terrainGrid}
            mapCards={gameState.mapCards}
            placedMap={gameState.placedMap}
            draggingMapCard={draggingMapCard}
            onToggleTerrainEditMode={() => setTerrainEditMode(!terrainEditMode)}
            onMapCardDragStart={handleMapCardDragStart}
            onClearMap={handleClearMap}
            onRandomFill={handleRandomFill}
            onStartGame={startGame}
          />

          {/* Grid - 可拖拽滚动 */}
          <div 
            ref={mapScrollRef}
            className="flex-1 overflow-auto cursor-grab active:cursor-grabbing relative"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 #1e293b' }}
            onMouseDown={(e) => {
              // 只有点击空白区域或非地形编辑模式才启用地图拖拽
              if (!terrainEditMode && e.button === 0) {
                setMapDragging(true);
                setMapDragStart({
                  x: e.clientX,
                  y: e.clientY,
                  scrollLeft: mapScrollRef.current?.scrollLeft || 0,
                  scrollTop: mapScrollRef.current?.scrollTop || 0
                });
              }
            }}
            onMouseMove={(e) => {
              if (mapDragging && mapScrollRef.current) {
                const dx = e.clientX - mapDragStart.x;
                const dy = e.clientY - mapDragStart.y;
                mapScrollRef.current.scrollLeft = mapDragStart.scrollLeft - dx;
                mapScrollRef.current.scrollTop = mapDragStart.scrollTop - dy;
              }
            }}
            onMouseUp={() => setMapDragging(false)}
            onMouseLeave={() => setMapDragging(false)}
            onClick={() => !mapDragging && setSelectedTileIndex(null)}
          >
            <div className="min-w-max min-h-full flex items-center justify-center p-8">
              <div ref={gridContainerRef} className="relative" onClick={(e) => e.stopPropagation()}>
                <div 
                  className="grid gap-2 p-4 bg-slate-900/50 rounded-xl border border-slate-800 shadow-2xl"
                  style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
                >
                {gameState.placedMap.map((tile, i) => {
                  const isEnabled = gameState.terrainGrid[i];
                  
                  // 地形编辑模式 - 支持拖拽选择
                  if (terrainEditMode) {
                    return (
                      <div 
                        key={i}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setTerrainDragging(true);
                          // 根据当前格子状态决定拖拽模式：如果当前是禁用，拖拽就是启用；反之亦然
                          const newMode = isEnabled ? 'disable' : 'enable';
                          setTerrainDragMode(newMode);
                          // 立即切换当前格子
                          setGameState(prev => {
                            const newTerrain = [...prev.terrainGrid];
                            newTerrain[i] = newMode === 'enable';
                            return { ...prev, terrainGrid: newTerrain };
                          });
                        }}
                        onMouseEnter={() => {
                          // 如果正在拖拽，根据拖拽模式设置格子状态
                          if (terrainDragging && terrainDragMode) {
                            setGameState(prev => {
                              const newTerrain = [...prev.terrainGrid];
                              newTerrain[i] = terrainDragMode === 'enable';
                              return { ...prev, terrainGrid: newTerrain };
                            });
                          }
                        }}
                        className={`w-[80px] h-[80px] rounded-lg border-2 flex items-center justify-center cursor-pointer transition-colors select-none ${
                          isEnabled 
                            ? 'border-cyan-500 bg-cyan-900/30 hover:bg-cyan-800/50' 
                            : 'border-slate-700 bg-slate-950 hover:bg-slate-900'
                        }`}
                      >
                        {isEnabled ? (
                          <span className="text-cyan-400 font-bold text-lg">✓</span>
                        ) : (
                          <span className="text-slate-600 font-bold text-lg">✕</span>
                        )}
                      </div>
                    );
                  }
                  
                  // 禁用的格子（非地形编辑模式）
                  if (!isEnabled) {
                    return (
                      <div 
                        key={i}
                        className="w-[80px] h-[80px] rounded-lg border-2 border-slate-800 bg-slate-950/50 flex items-center justify-center"
                      >
                        {/* 空白禁用格子 */}
                      </div>
                    );
                  }
                  
                  // 正常的启用格子
                  const canDropHere = draggingFromDiscard !== null && !tile && isEnabled;
                  
                  // 检查是否匹配骰子结果或自定义高亮数字（地图编号 = 两颗骰子点数和 或 自定义数字）
                  const diceSum = diceResult ? diceResult.dice1 + diceResult.dice2 : null;
                  const highlightNumber = diceSum || customHighlight;
                  const matchesDice = tile?.revealed && tile?.card?.mapNumber && highlightNumber && tile.card.mapNumber === highlightNumber;
                  
                  // 处理地图卡牌的单击（延迟执行，等待可能的双击）
                  const handleTileDelayedClick = (tileIndex: number) => {
                    // 清除之前的定时器
                    if (tileClickTimerRef.current) {
                      clearTimeout(tileClickTimerRef.current);
                    }
                    // 设置延迟执行单击（250ms后执行，给双击留出时间）
                    pendingTileClickRef.current = tileIndex;
                    tileClickTimerRef.current = setTimeout(() => {
                      if (pendingTileClickRef.current === tileIndex) {
                        handleTileClick(tileIndex);
                        pendingTileClickRef.current = null;
                      }
                    }, 250);
                  };
                  
                  // 处理地图卡牌的双击（取消单击，执行双击逻辑）
                  const handleTileDoubleClick = (tileIndex: number, tileData: PlacedMapTile) => {
                    // 取消待执行的单击
                    if (tileClickTimerRef.current) {
                      clearTimeout(tileClickTimerRef.current);
                      tileClickTimerRef.current = null;
                    }
                    pendingTileClickRef.current = null;
                    
                    // 执行双击逻辑：查看卡牌详情
                    if (tileData.revealed) {
                      setViewingCard(tileData.card);
                    }
                  };
                  
                  return (
                    <div 
                      key={i}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleGridDrop(i)}
                      onClick={() => tile && handleTileDelayedClick(i)}
                      onDoubleClick={() => tile && handleTileDoubleClick(i, tile)}
                      className={`w-[80px] h-[80px] rounded-lg border-2 flex items-center justify-center relative transition-all ${
                        canDropHere
                          ? 'border-amber-400 border-solid bg-amber-900/40 ring-2 ring-amber-400/50 animate-pulse'
                          : matchesDice
                            ? 'border-yellow-400 bg-yellow-900/50 ring-4 ring-yellow-400/60 shadow-lg shadow-yellow-500/50 animate-pulse'
                          : tile 
                            ? selectedTileIndex === i 
                              ? 'border-amber-400 bg-slate-800 ring-2 ring-amber-400/50' 
                              : 'border-slate-600 bg-slate-800 cursor-pointer hover:border-slate-500' 
                            : 'border-slate-700 border-dashed bg-slate-900/30 hover:bg-slate-800/50'
                      }`}
                    >
                      {canDropHere && (
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                          <span className="text-amber-400 font-bold text-xs">放这里</span>
                        </div>
                      )}
                      {tile ? (
                        tile.revealed ? (
                          <div 
                            className={`w-full h-full relative group rounded overflow-hidden cursor-pointer ${matchesDice ? 'ring-2 ring-yellow-300 ring-inset' : ''}`}
                            title={`单击操作菜单，双击查看大图${tile.card.mapNumber ? `（编号${tile.card.mapNumber}）` : ''}`}
                          >
                            <img src={getCardDisplayUrl(tile.card)} className="w-full h-full object-cover" />
                            {/* 骰子匹配高亮覆盖 */}
                            {matchesDice && (
                              <div className="absolute inset-0 bg-yellow-400/30 pointer-events-none"></div>
                            )}
                            {/* 地图编号标识 */}
                            {tile.card.mapNumber && (
                              <div className={`absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                matchesDice ? 'bg-yellow-400 text-yellow-900' : 'bg-black/70 text-white'
                              }`}>
                                {tile.card.mapNumber}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center p-0.5 transition-opacity">
                              <span className="text-[8px] font-bold text-amber-100 text-center leading-tight">{tile.card.name}</span>
                              <span className="text-[7px] text-slate-300 mt-0.5">双击放大</span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full rounded overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                            <span className="text-slate-500 font-bold text-lg">?</span>
                          </div>
                        )
                      ) : (
                        <span className="text-slate-700 text-[10px] font-mono">{i + 1}</span>
                      )}
                      
                      {/* 地图操作菜单 */}
                      {selectedTileIndex === i && tile && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded z-10 gap-1 p-1">
                          {!tile.revealed ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); revealTile(i); }}
                              className="w-full bg-amber-600 hover:bg-amber-500 text-white px-1 py-1 rounded text-[9px] font-bold flex items-center justify-center gap-0.5"
                            >
                              <RotateCcw size={10}/> 翻开
                            </button>
                          ) : (
                            <button
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setGameState(prev => {
                                  const newPlaced = [...prev.placedMap];
                                  if (newPlaced[i]) newPlaced[i] = { ...newPlaced[i]!, revealed: false };
                                  return { ...prev, placedMap: newPlaced };
                                });
                                setSelectedTileIndex(null);
                              }}
                              className="w-full bg-slate-600 hover:bg-slate-500 text-white px-1 py-1 rounded text-[9px] font-bold flex items-center justify-center gap-0.5"
                            >
                              <RotateCcw size={10}/> 翻回
                            </button>
                          )}
                          <button
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setMovingMapTile(i);
                              setSelectedTileIndex(null);
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white px-1 py-1 rounded text-[9px] font-bold flex items-center justify-center gap-0.5"
                          >
                            <Layers size={10}/> 移动
                          </button>
                          <button
                            onClick={(e) => { 
                              e.stopPropagation();
                              // 移除地图到弃牌堆
                              setGameState(prev => {
                                const removedTile = prev.placedMap[i];
                                if (!removedTile) return prev;
                                const newPlaced = [...prev.placedMap];
                                newPlaced[i] = null;
                                return { 
                                  ...prev, 
                                  placedMap: newPlaced,
                                  mapDiscard: [removedTile.card, ...prev.mapDiscard]
                                };
                              });
                              setSelectedTileIndex(null);
                            }}
                            className="w-full bg-red-600 hover:bg-red-500 text-white px-1 py-1 rounded text-[9px] font-bold flex items-center justify-center gap-0.5"
                          >
                            <Trash2 size={10}/> 移除
                          </button>
                        </div>
                      )}
                      
                      {/* 移动目标指示 */}
                      {movingMapTile !== null && movingMapTile !== i && !tile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setGameState(prev => {
                              const newPlaced = [...prev.placedMap];
                              newPlaced[i] = prev.placedMap[movingMapTile!];
                              newPlaced[movingMapTile!] = null;
                              return { ...prev, placedMap: newPlaced };
                            });
                            setMovingMapTile(null);
                          }}
                          className="absolute inset-0 bg-blue-600/30 hover:bg-blue-600/50 rounded border-2 border-blue-400 flex items-center justify-center"
                        >
                          <span className="text-[10px] font-bold text-blue-300">移到这里</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Player Tokens */}
              <div className="absolute inset-0 pointer-events-none">
                {players.map(player => (
                  <div
                    key={player.id}
                    onMouseDown={(e) => handlePlayerMouseDown(e, player.id)}
                    className={`absolute w-10 h-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-3 shadow-lg cursor-grab active:cursor-grabbing pointer-events-auto transition-shadow ${
                      draggingPlayer === player.id ? 'shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-110 z-50' : 'hover:shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                    }`}
                    style={{ left: `${player.x}%`, top: `${player.y}%`, borderColor: player.color, backgroundColor: '#000' }}
                    title={player.name}
                  >
                    {player.imgUrl ? (
                      <img src={player.imgUrl} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full flex items-center justify-center text-xs font-bold" style={{ color: player.color }}>
                        {player.name.charAt(0)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Map Markers */}
              <MapMarkers
                markers={gameState.mapMarkers}
                onMarkerDragStart={(markerId, e) => {
                  setDraggingMarker(markerId);
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  setMarkerOffset({
                    x: e.clientX - rect.left - rect.width / 2,
                    y: e.clientY - rect.top - rect.height / 2
                  });
                }}
                onRemoveMarker={(markerId) => {
                  setGameState(prev => ({
                    ...prev,
                    mapMarkers: prev.mapMarkers.filter(m => m.id !== markerId)
                  }));
                }}
              />
            </div>
          </div>
          </div>
        </div>

        {/* Right: Enemy List */}
        <EnemyList
          activeEnemies={activeEnemies}
          activeBosses={activeBosses}
          activeSupports={activeSupports}
          activeSpecialCharacters={activeSpecialCharacters}
          players={players}
          enemyDiscard={gameState.enemyDiscard}
          onSelectEnemy={(enemy) => setSelectedEnemy(enemy)}
          onUpdateEnemyHp={(enemyId, delta) => updateEnemyHp(enemyId, delta)}
          onBindEnemyToPlayer={(enemyId, playerId) => bindEnemyToPlayer(enemyId, playerId)}
          onDiscardEnemy={(enemyId) => discardEnemy(enemyId)}
          onUpdateBossHp={(bossId, delta) => updateBossHp(bossId, delta)}
          onBindBossToPlayer={(bossId, playerId) => bindBossToPlayer(bossId, playerId)}
          onDiscardBoss={(bossId) => discardBoss(bossId)}
          onUpdateSupportHp={(supportId, delta) => updateSupportHp(supportId, delta)}
          onBindSupportToPlayer={(supportId, playerId) => bindSupportToPlayer(supportId, playerId)}
          onDiscardSupport={(supportId) => discardSupport(supportId)}
          onUpdateSpecialCharacterHp={(charId, delta) => updateSpecialCharacterHp(charId, delta)}
          onBindSpecialCharacterToPlayer={(charId, playerId) => bindSpecialCharacterToPlayer(charId, playerId)}
          onDiscardSpecialCharacter={(charId) => discardSpecialCharacter(charId)}
          onRestoreEnemyToActive={(cardIndex) => restoreEnemyToActive(cardIndex)}
          onRestoreEnemyToDeck={(cardIndex) => restoreEnemyToDeck(cardIndex)}
        />
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          allPlayers={players}
          onClose={() => setSelectedPlayer(null)}
          onUpdatePlayer={(updates: Partial<Player>) => { updatePlayer(selectedPlayer.id, updates); setSelectedPlayer({ ...selectedPlayer, ...updates }); }}
          onSwitchRole={(newRoleCard: ICard) => switchPlayerRole(selectedPlayer.id, newRoleCard)}
          onViewCard={(card: ICard) => { setSelectedPlayer(null); setViewingCard(card); }}
          onAddTag={() => addTagToPlayer(selectedPlayer.id)}
          onRemoveTag={(idx: number) => removeTagFromPlayer(selectedPlayer.id, idx)}
          onDiscardCard={(idx: number, isSkill: boolean) => discardCardFromPlayer(selectedPlayer.id, idx, isSkill)}
          onPlayCard={(idx: number, isSkill: boolean) => playCardFromPlayer(selectedPlayer.id, idx, isSkill)}
          onEquipCard={(idx: number, isSkill: boolean) => equipCardFromHand(selectedPlayer.id, idx, isSkill)}
          onGiftCard={(cardIndex: number, isSkill: boolean, toPlayerId: string) => giftCardToPlayer(selectedPlayer.id, cardIndex, isSkill, toPlayerId)}
          onEquipmentClick={(idx: number) => { setSelectedPlayer(null); setEquipmentPreview({ playerId: selectedPlayer.id, equipIndex: idx }); }}
          onRemoveEquipment={(idx: number) => removeEquipmentFromPlayer(selectedPlayer.id, idx)}
          onRecoverCard={(idx: number) => recoverCardFromDiscard(selectedPlayer.id, idx)}
          onOpenDiscardModal={() => { setPlayerDiscardModal(selectedPlayer.id); setSelectedPlayer(null); }}
        />
      )}

      {/* Skill Deck Modal */}
      {viewingSkillDeckPlayerId && (() => {
        const skillDeckPlayer = players.find(p => p.id === viewingSkillDeckPlayerId);
        if (!skillDeckPlayer) return null;
        return (
          <SkillDeckModal
            player={skillDeckPlayer}
            onClose={() => setViewingSkillDeckPlayerId(null)}
            onDrawCardFromDeck={(cardIndex: number) => {
              // 从技能牌堆指定位置取出卡牌放入手牌
              const card = skillDeckPlayer.skillDeck[cardIndex];
              if (!card) return;
              const newSkillDeck = [...skillDeckPlayer.skillDeck];
              newSkillDeck.splice(cardIndex, 1);
              const updatedPlayer: Player = {
                ...skillDeckPlayer,
                skillDeck: newSkillDeck,
                handSkill: [...skillDeckPlayer.handSkill, card],
                _version: (skillDeckPlayer._version || 0) + 1
              };
              setPlayers(prev => prev.map(p => p.id === viewingSkillDeckPlayerId ? updatedPlayer : p));
            }}
            onShuffleDeck={() => {
              // 洗混技能牌堆
              const shuffledDeck = shuffle([...skillDeckPlayer.skillDeck]);
              const updatedPlayer: Player = {
                ...skillDeckPlayer,
                skillDeck: shuffledDeck,
                _version: (skillDeckPlayer._version || 0) + 1
              };
              setPlayers(prev => prev.map(p => p.id === viewingSkillDeckPlayerId ? updatedPlayer : p));
            }}
          />
        );
      })()}

      {/* Public Discard Modal */}
      <PublicDiscardModal
        isOpen={discardModalOpen}
        onClose={() => setDiscardModalOpen(false)}
        publicDiscard={gameState.publicDiscard}
        players={players}
        onAssignCardToPlayer={(cardIndex, playerId) => {
          const card = gameState.publicDiscard[cardIndex];
          setGameState(prev => ({
            ...prev,
            publicDiscard: prev.publicDiscard.filter((_, idx) => idx !== cardIndex)
          }));
          setPlayers(prev => prev.map(p => 
            p.id === playerId 
              ? { ...p, handResource: [...p.handResource, card], _version: (p._version || 0) + 1 }
              : p
          ));
        }}
      />

      {/* Map Discard Modal */}
      <MapDiscardModal
        isOpen={mapDiscardModalOpen}
        onClose={() => setMapDiscardModalOpen(false)}
        mapDiscard={gameState.mapDiscard}
        onDragStart={(i, e) => {
          const card = gameState.mapDiscard[i];
          setDraggingFromDiscard(i);
          // 创建小的拖拽预览图
          const dragImg = document.createElement('div');
          dragImg.style.cssText = 'width:80px;height:80px;border-radius:8px;overflow:hidden;position:absolute;left:-9999px;';
          const img = document.createElement('img');
          img.src = card.imgUrl || `https://placehold.co/80/222/999?text=${card.name?.charAt(0) || '?'}`;
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
          dragImg.appendChild(img);
          document.body.appendChild(dragImg);
          e.dataTransfer.setDragImage(dragImg, 40, 40);
          setTimeout(() => {
            document.body.removeChild(dragImg);
            setMapDiscardModalOpen(false);
          }, 50);
        }}
        onDragEnd={() => setDraggingFromDiscard(null)}
      />

      {/* Add Marker Modal */}
      <AddMarkerModal
        isOpen={showMarkerModal}
        onClose={() => setShowMarkerModal(false)}
        onAddMarker={(marker) => {
          setGameState(prev => ({
            ...prev,
            mapMarkers: [...prev.mapMarkers, marker]
          }));
        }}
      />

      {/* Equipment Preview Modal */}
      {equipmentPreview && (() => {
        const player = players.find(p => p.id === equipmentPreview.playerId);
        if (!player) return null;
        return (
          <EquipmentPreviewModal
            player={player}
            equipIndex={equipmentPreview.equipIndex}
            onClose={() => setEquipmentPreview(null)}
            onAddLabel={addEquipmentLabel}
            onRemoveLabel={removeEquipmentLabel}
            onUpdateAmmo={updateEquipmentAmmo}
            onRemoveEquipment={removeEquipmentFromPlayer}
          />
        );
      })()}

      {/* Player Discard Modal */}
      {playerDiscardModal && (() => {
        const player = players.find(p => p.id === playerDiscardModal);
        if (!player) return null;
        return (
          <PlayerDiscardModal
            player={player}
            onClose={() => setPlayerDiscardModal(null)}
            onRecoverCard={recoverCardFromDiscard}
            onViewCard={(card) => { setPlayerDiscardModal(null); setViewingCard(card); }}
          />
        );
      })()}

      {/* Combined Discard Modal */}
      {combinedDiscardModalOpen && (
        <CombinedDiscardModal
          enemyDiscard={gameState.enemyDiscard}
          supportDiscard={gameState.supportDiscard}
          bossDiscard={gameState.bossDiscard}
          daynightDiscard={gameState.daynightDiscard}
          specialCharacterDiscard={gameState.specialCharacterDiscard}
          onClose={() => setCombinedDiscardModalOpen(false)}
          onRestoreEnemyToActive={restoreEnemyToActive}
          onRestoreEnemyToDeck={restoreEnemyToDeck}
          onRestoreBossToActive={restoreBossToActive}
          onRestoreBossToDeck={restoreBossToDeck}
          onRestoreSupportToActive={restoreSupportToActive}
          onRestoreSupportToDeck={restoreSupportToDeck}
          onRestoreDaynightToDeck={restoreDaynightToDeck}
          onRestoreSpecialCharacterToActive={restoreSpecialCharacterToActive}
          onRestoreSpecialCharacterToDeck={restoreSpecialCharacterToDeck}
        />
      )}

      {/* Special Character Modal */}
      {specialCharacterModalOpen && (
        <SpecialCharacterModal
          specialCharacterDeck={gameState.specialCharacterDeck}
          onClose={() => setSpecialCharacterModalOpen(false)}
          onPutToField={putSpecialCharacterToField}
        />
      )}

      {/* Boss Deck Modal */}
      {bossModalOpen && (
        <DeckPickModal
          deck={gameState.bossDeck}
          onClose={() => setBossModalOpen(false)}
          onPutToField={putBossToField}
        />
      )}

      {/* Image Viewer Modal - 卡牌详情查看 */}
      {viewingCard && (
        <ImageViewerModal
          card={viewingCard}
          onClose={() => setViewingCard(null)}
        />
      )}
    </div>
  );
}

// 导出包装了 Suspense 的组件
export default function GamePlayPage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-amber-500 text-xl animate-pulse">加载中...</div>
      </div>
    }>
      <GamePlayPageContent />
    </Suspense>
  );
}

