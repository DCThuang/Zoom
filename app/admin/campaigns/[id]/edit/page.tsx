'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Check, X, Plus, Pencil, Save, ChevronDown, ChevronRight, Search } from 'lucide-react';

const CARDS_PER_PAGE = 20;

type CardType = 'SKILL' | 'PLAYER' | 'ENEMY' | 'RESOURCE' | 'MAP' | 'SUPPORT' | 'BOSS' | 'DAYNIGHT' | 'SPECIAL_CHARACTER';

interface Card {
  _id: string;
  name: string;
  type: CardType;
  imgUrl: string;
  thumbUrl?: string;  // 缩略图URL
  edition?: string;
}

// 获取卡牌显示图片（优先使用缩略图）
const getCardDisplayUrl = (card: Card): string => {
  return card.thumbUrl || card.imgUrl || `https://placehold.co/100x100/333/999?text=${card.name?.charAt(0) || '?'}`;
};

interface CardConfig {
  configId: string;
  cardId: string;
  color?: 'RED' | 'BLUE' | 'GREEN' | 'SHOP';
  count: number;
}

interface Campaign {
  _id: string;
  name: string;
  cards: Array<{
    card: Card;
    color?: string;
    count?: number;
  }>;
}

export default function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [cardConfigs, setCardConfigs] = useState<CardConfig[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  
  // 已选卡牌区域展开状态
  const [resourceConfigExpanded, setResourceConfigExpanded] = useState(false);
  const [enemyConfigExpanded, setEnemyConfigExpanded] = useState(false);
  
  // 版本展开状态
  const [expandedEditions, setExpandedEditions] = useState<Record<string, boolean>>({});
  
  // 分页状态 (key: "type" or "type-edition", value: page number)
  const [pageStates, setPageStates] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [cardsRes, campaignRes] = await Promise.all([
        fetch('/api/cards'),
        fetch(`/api/campaigns/${id}`)
      ]);
      
      const cardsData = await cardsRes.json();
      const campaignData = await campaignRes.json();
      
      if (cardsData.success) {
        setCards(cardsData.data);
        // 默认展开所有版本
        const editions: Record<string, boolean> = {};
        cardsData.data.forEach((card: Card) => {
          if (card.type === 'ENEMY' || card.type === 'MAP') {
            const key = `${card.type}-${card.edition || '未分类'}`;
            editions[key] = true;
          }
        });
        setExpandedEditions(editions);
      }
      
      if (campaignData.success) {
        const campaign: Campaign = campaignData.data;
        setCampaignName(campaign.name);
        
        // 过滤掉已删除的卡牌（card 为 null 的情况）
        const configs: CardConfig[] = campaign.cards
          .filter(c => c.card !== null && c.card !== undefined)
          .map((c, index) => ({
            configId: `${c.card._id}-${c.color || 'none'}-${index}`,
            cardId: c.card._id,
            color: c.color as any,
            count: c.count || 1
          }));
        setCardConfigs(configs);
      } else {
        alert('战役不存在');
        router.push('/admin/campaigns');
      }
    } catch (e) {
      console.error('加载数据失败:', e);
    } finally {
      setLoading(false);
    }
  };

  // 版本展开控制
  const toggleEdition = (type: CardType, edition: string) => {
    const key = `${type}-${edition}`;
    setExpandedEditions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllEditions = (type: CardType, expand: boolean) => {
    const editions = getEditionsForType(type);
    const newState = { ...expandedEditions };
    editions.forEach(edition => {
      newState[`${type}-${edition}`] = expand;
    });
    setExpandedEditions(newState);
  };

  const getEditionsForType = (type: CardType): string[] => {
    const typeCards = cards.filter(c => c.type === type);
    const editions = new Set<string>();
    typeCards.forEach(c => editions.add(c.edition || '未分类'));
    return Array.from(editions).sort();
  };

  const getCardsByEdition = (type: CardType): Record<string, Card[]> => {
    const typeCards = cards.filter(c => c.type === type);
    const grouped: Record<string, Card[]> = {};
    typeCards.forEach(card => {
      const edition = card.edition || '未分类';
      if (!grouped[edition]) grouped[edition] = [];
      grouped[edition].push(card);
    });
    return grouped;
  };

  const filterCardsBySearch = (cardList: Card[]): Card[] => {
    if (!searchQuery.trim()) return cardList;
    const query = searchQuery.toLowerCase();
    return cardList.filter(c => c.name.toLowerCase().includes(query));
  };

  // 卡牌配置操作
  const addCardConfig = (card: Card, color?: 'RED' | 'BLUE' | 'GREEN' | 'SHOP') => {
    const configId = `${card._id}-${color || 'none'}-${Date.now()}`;
    setCardConfigs(prev => [...prev, {
      configId,
      cardId: card._id,
      color: card.type === 'RESOURCE' ? (color || 'RED') : undefined,
      count: 1
    }]);
  };

  const removeCardConfig = (configId: string) => {
    setCardConfigs(prev => prev.filter(c => c.configId !== configId));
  };

  const updateConfigColor = (configId: string, color: 'RED' | 'BLUE' | 'GREEN' | 'SHOP') => {
    setCardConfigs(prev => prev.map(c => 
      c.configId === configId ? { ...c, color } : c
    ));
  };

  const updateConfigCount = (configId: string, count: number) => {
    setCardConfigs(prev => prev.map(c => 
      c.configId === configId ? { ...c, count: Math.max(1, count) } : c
    ));
  };

  const isCardAdded = (cardId: string) => {
    return cardConfigs.some(c => c.cardId === cardId);
  };

  const toggleNonResourceCard = (card: Card) => {
    if (isCardAdded(card._id)) {
      setCardConfigs(prev => prev.filter(c => c.cardId !== card._id));
    } else {
      addCardConfig(card);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName) return alert('请输入战役名称');
    if (cardConfigs.length === 0) return alert('请至少选择一张卡牌');

    setSubmitting(true);
    
    const cardsPayload = cardConfigs.map(config => ({
       card: config.cardId,
       color: config.color,
       count: config.count
    }));

    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          cards: cardsPayload,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('战役更新成功！');
        router.push(`/admin/campaigns/${id}`);
      } else {
        alert('错误: ' + data.error);
      }
    } catch (e) {
      alert('保存战役失败');
    } finally {
      setSubmitting(false);
    }
  };

  const groupedCards = cards.reduce((acc, card) => {
    if (!acc[card.type]) acc[card.type] = [];
    acc[card.type].push(card);
    return acc;
  }, {
    'RESOURCE': [],
    'MAP': [],
    'ENEMY': [],
    'PLAYER': [],
    'SKILL': [],
    'SUPPORT': [],
    'BOSS': [],
    'DAYNIGHT': [],
    'SPECIAL_CHARACTER': []
  } as Record<CardType, Card[]>);

  const typeLabels: Record<CardType, string> = {
    'SKILL': '技能卡',
    'PLAYER': '玩家角色',
    'ENEMY': '敌人卡',
    'RESOURCE': '资源卡',
    'MAP': '地图卡',
    'SUPPORT': '支援牌',
    'BOSS': 'Boss牌',
    'DAYNIGHT': '日夜牌',
    'SPECIAL_CHARACTER': '特殊人物牌'
  };

  const colorLabels: Record<string, { label: string; class: string; border: string }> = {
    'RED': { label: '红', class: 'bg-red-600', border: 'border-red-500' },
    'BLUE': { label: '蓝', class: 'bg-blue-600', border: 'border-blue-500' },
    'GREEN': { label: '绿', class: 'bg-green-600', border: 'border-green-500' },
    'SHOP': { label: '商店', class: 'bg-yellow-600', border: 'border-yellow-500' },
  };

  // 版本标签颜色列表
  const editionColors = [
    { bg: 'bg-purple-600', text: 'text-purple-400', border: 'border-purple-500' },
    { bg: 'bg-blue-600', text: 'text-blue-400', border: 'border-blue-500' },
    { bg: 'bg-green-600', text: 'text-green-400', border: 'border-green-500' },
    { bg: 'bg-amber-600', text: 'text-amber-400', border: 'border-amber-500' },
    { bg: 'bg-red-600', text: 'text-red-400', border: 'border-red-500' },
    { bg: 'bg-pink-600', text: 'text-pink-400', border: 'border-pink-500' },
    { bg: 'bg-cyan-600', text: 'text-cyan-400', border: 'border-cyan-500' },
    { bg: 'bg-indigo-600', text: 'text-indigo-400', border: 'border-indigo-500' },
    { bg: 'bg-teal-600', text: 'text-teal-400', border: 'border-teal-500' },
    { bg: 'bg-orange-600', text: 'text-orange-400', border: 'border-orange-500' },
  ];

  // 根据版本名称获取颜色
  const getEditionColor = (editionName: string) => {
    let hash = 0;
    for (let i = 0; i < editionName.length; i++) {
      hash = editionName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % editionColors.length;
    return editionColors[index];
  };

  const typeOrder: CardType[] = ['RESOURCE', 'MAP', 'ENEMY', 'SUPPORT', 'BOSS', 'DAYNIGHT', 'SPECIAL_CHARACTER'];

  const getResourceConfigs = () => {
    return cardConfigs.filter(c => {
      const card = cards.find(card => card._id === c.cardId);
      return card?.type === 'RESOURCE';
    });
  };
  
  const getEnemyConfigs = () => {
    return cardConfigs.filter(c => {
      const card = cards.find(card => card._id === c.cardId);
      return card?.type === 'ENEMY';
    });
  };

  const totalCards = cardConfigs.reduce((sum, c) => sum + c.count, 0);
  const uniqueCards = new Set(cardConfigs.map(c => c.cardId)).size;

  // 获取分页辅助函数
  const getPageKey = (type: CardType, edition?: string) => edition ? `${type}-${edition}` : type;
  const getCurrentPage = (type: CardType, edition?: string) => pageStates[getPageKey(type, edition)] || 1;
  const setCurrentPage = (type: CardType, page: number, edition?: string) => {
    setPageStates(prev => ({ ...prev, [getPageKey(type, edition)]: page }));
  };

  // 渲染分页控件
  const renderPagination = (totalItems: number, type: CardType, edition?: string) => {
    const totalPages = Math.ceil(totalItems / CARDS_PER_PAGE);
    if (totalPages <= 1) return null;
    
    const currentPage = getCurrentPage(type, edition);
    
    return (
      <div className="flex items-center justify-center gap-2 mt-3">
        <button 
          onClick={() => setCurrentPage(type, Math.max(1, currentPage - 1), edition)}
          disabled={currentPage === 1}
          className="px-2 py-1 bg-slate-800 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center gap-1"
        >
          <ChevronLeft size={14} /> 上一页
        </button>
        <span className="text-slate-500 text-xs">
          {currentPage} / {totalPages}
        </span>
        <button 
          onClick={() => setCurrentPage(type, Math.min(totalPages, currentPage + 1), edition)}
          disabled={currentPage === totalPages}
          className="px-2 py-1 bg-slate-800 rounded text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center gap-1"
        >
          下一页 <ChevronRight size={14} />
        </button>
      </div>
    );
  };

  // 渲染卡牌网格
  const renderCardGrid = (cardList: Card[], type: CardType, edition?: string) => {
    const filteredCards = filterCardsBySearch(cardList);
    
    if (filteredCards.length === 0) {
      return (
        <div className="text-center py-4 text-slate-600 text-sm">
          {searchQuery ? '没有匹配的卡牌' : '暂无卡牌'}
        </div>
      );
    }

    // 分页
    const currentPage = getCurrentPage(type, edition);
    const startIndex = (currentPage - 1) * CARDS_PER_PAGE;
    const paginatedCards = filteredCards.slice(startIndex, startIndex + CARDS_PER_PAGE);

    return (
      <>
        {filteredCards.length > CARDS_PER_PAGE && (
          <div className="text-xs text-slate-500 mb-2">
            显示 {startIndex + 1} - {Math.min(startIndex + CARDS_PER_PAGE, filteredCards.length)} / {filteredCards.length} 张
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {paginatedCards.map((card) => {
          const isSelected = isCardAdded(card._id);
          
          if (type === 'RESOURCE') {
            const cardConfsList = cardConfigs.filter(c => c.cardId === card._id);
            return (
              <div 
                key={card._id}
                className={`border-2 rounded-lg p-2 transition-all duration-200 group relative ${
                  cardConfsList.length > 0
                    ? 'border-amber-500 bg-amber-900/20' 
                    : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="aspect-square bg-black rounded overflow-hidden mb-2 relative">
                  <img 
                    src={getCardDisplayUrl(card)} 
                    alt={card.name} 
                    className="w-full h-full object-contain transition-transform group-hover:scale-110" 
                  />
                  {cardConfsList.length > 0 && (
                    <div className="absolute top-1 right-1 bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                      {cardConfsList.length}色
                    </div>
                  )}
                </div>
                <div className="font-medium text-xs truncate text-center text-slate-300 mb-2">{card.name}</div>
                <div className="flex justify-center gap-1 flex-wrap">
                  {(['RED', 'BLUE', 'GREEN', 'SHOP'] as const).map(color => {
                    const hasThisColor = cardConfsList.some(c => c.color === color);
                    return (
                      <button
                        key={color}
                        onClick={() => addCardConfig(card, color)}
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                          hasThisColor 
                            ? `${colorLabels[color].class} border-white shadow-lg` 
                            : `bg-slate-800 ${colorLabels[color].border} hover:${colorLabels[color].class} opacity-60 hover:opacity-100`
                        }`}
                        title={`添加${colorLabels[color].label}色`}
                      >
                        <Plus size={14} className="text-white" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }
          
          // 敌人卡 - 支持数量选择
          if (type === 'ENEMY') {
            const enemyConfig = cardConfigs.find(c => c.cardId === card._id);
            return (
              <div 
                key={card._id}
                className={`border-2 rounded-lg p-2 transition-all duration-200 group relative ${
                  enemyConfig
                    ? 'border-red-500 bg-red-900/20' 
                    : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="aspect-square bg-black rounded overflow-hidden mb-2 relative">
                  <img 
                    src={getCardDisplayUrl(card)} 
                    alt={card.name} 
                    className="w-full h-full object-contain transition-transform group-hover:scale-110" 
                  />
                  {enemyConfig && (
                    <div className="absolute top-1 right-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                      ×{enemyConfig.count}
                    </div>
                  )}
                </div>
                <div className="font-medium text-xs truncate text-center text-slate-300 mb-2">{card.name}</div>
                <div className="flex justify-center">
                  {enemyConfig ? (
                    <div className="flex items-center gap-1 bg-slate-900 rounded px-1.5 py-0.5">
                      <button 
                        onClick={() => {
                          if (enemyConfig.count <= 1) {
                            removeCardConfig(enemyConfig.configId);
                          } else {
                            updateConfigCount(enemyConfig.configId, enemyConfig.count - 1);
                          }
                        }}
                        className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center font-bold text-xs"
                      >−</button>
                      <span className="w-5 text-center font-bold text-red-400 text-xs">{enemyConfig.count}</span>
                      <button 
                        onClick={() => updateConfigCount(enemyConfig.configId, enemyConfig.count + 1)}
                        className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center font-bold text-xs"
                      >+</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addCardConfig(card)}
                      className="w-7 h-7 rounded-full border-2 bg-slate-800 border-red-500 hover:bg-red-600 flex items-center justify-center transition-all opacity-60 hover:opacity-100"
                      title="添加敌人"
                    >
                      <Plus size={14} className="text-white" />
                    </button>
                  )}
                </div>
              </div>
            );
          }
          
          return (
            <div 
              key={card._id}
              className={`
              border-2 rounded-lg p-2 cursor-pointer transition-all duration-200 group relative
              ${isSelected
                  ? 'border-amber-500 bg-amber-900/20 shadow-[0_0_15px_rgba(245,158,11,0.3)] scale-105 z-10' 
                  : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800 hover:border-slate-600 opacity-80 hover:opacity-100'}
              `}
              onClick={() => toggleNonResourceCard(card)}
            >
              <div className="aspect-square bg-black rounded overflow-hidden mb-2 relative">
                <img 
                  src={getCardDisplayUrl(card)} 
                  alt={card.name} 
                  className="w-full h-full object-contain transition-transform group-hover:scale-110" 
                />
                {isSelected && (
                  <div className="absolute top-1 right-1 bg-amber-600 rounded-full p-1 shadow-lg">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </div>
              <div className="font-medium text-xs truncate text-center text-slate-300">{card.name}</div>
            </div>
          );
        })}
      </div>
      {renderPagination(filteredCards.length, type, edition)}
      </>
    );
  };

  // 渲染版本分组
  const renderEditionGroups = (type: CardType) => {
    const cardsByEdition = getCardsByEdition(type);
    const editions = Object.keys(cardsByEdition).sort();
    
    if (editions.length === 0) {
      return (
        <div className="text-center py-8 bg-slate-900/30 rounded-xl border border-dashed border-slate-800 text-slate-600">
          暂无{typeLabels[type]}，请先在卡牌图鉴中录入
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => toggleAllEditions(type, true)}
            className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 bg-slate-800 rounded"
          >
            展开全部
          </button>
          <button
            onClick={() => toggleAllEditions(type, false)}
            className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 bg-slate-800 rounded"
          >
            折叠全部
          </button>
        </div>

        {editions.map(edition => {
          const key = `${type}-${edition}`;
          const isExpanded = expandedEditions[key] !== false;
          const editionCards = cardsByEdition[edition];
          const filteredCards = filterCardsBySearch(editionCards);
          const selectedCount = editionCards.filter(c => isCardAdded(c._id)).length;
          const editionColor = getEditionColor(edition);
          
          return (
            <div key={edition} className={`bg-slate-900/30 rounded-lg border ${editionColor.border} overflow-hidden`}>
              <button
                onClick={() => toggleEdition(type, edition)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <span className={`${editionColor.bg} px-2 py-0.5 rounded text-xs text-white font-bold`}>{edition}</span>
                  <span className="text-xs text-slate-500">
                    ({filteredCards.length}/{editionCards.length} 张)
                  </span>
                  {selectedCount > 0 && (
                    <span className={`text-xs ${editionColor.bg} text-white px-2 py-0.5 rounded-full`}>
                      已选 {selectedCount}
                    </span>
                  )}
                </div>
              </button>
              
              {isExpanded && (
                <div className="px-4 pb-4">
                  {renderCardGrid(editionCards, type, edition)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-amber-500 animate-pulse">正在加载战役数据...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <div className="max-w-7xl mx-auto">
        <button onClick={() => router.push(`/admin/campaigns/${id}`)} className="flex items-center gap-1 text-slate-400 hover:text-white mb-6">
          <ChevronLeft size={20} /> 返回战役详情
        </button>

        <h1 className="text-3xl font-bold mb-8 text-amber-500 flex items-center gap-3">
          <Pencil size={32} />
          编辑战役
        </h1>
        
        {/* 顶部控制面板 */}
        <div className="mb-8 bg-slate-900/80 backdrop-blur-md p-6 rounded-xl border border-slate-700 shadow-xl sticky top-4 z-20">
          <div className="flex gap-6 items-end mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2 text-slate-400">战役名称</label>
              <input 
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded p-3 text-white focus:ring-2 focus:ring-amber-500 outline-none placeholder-slate-600"
                placeholder="例如: 黑暗森林第一章"
              />
            </div>
            
            {/* 搜索框 */}
            <div className="w-64">
              <label className="block text-sm font-medium mb-2 text-slate-400">搜索卡牌</label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded p-3 pl-10 text-white focus:ring-2 focus:ring-amber-500 outline-none placeholder-slate-600"
                  placeholder="输入卡牌名称..."
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
            
            <button 
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-amber-600 text-white px-8 py-3 rounded-lg hover:bg-amber-500 disabled:opacity-50 font-bold shadow-lg hover:shadow-amber-900/50 transition-all flex items-center gap-2"
            >
              <Save size={18} />
              {submitting ? '保存中...' : '保存修改'}
            </button>
          </div>
          
          {/* 已选资源卡配置 */}
          {getResourceConfigs().length > 0 && (() => {
             const configs = getResourceConfigs();
             const ITEMS_PER_ROW = 3;
             const lastRowStart = Math.floor((configs.length - 1) / ITEMS_PER_ROW) * ITEMS_PER_ROW;
             const displayConfigs = resourceConfigExpanded ? configs : configs.slice(lastRowStart);
             const hasMore = configs.length > ITEMS_PER_ROW;
             
             return (
               <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-bold text-slate-400">
                      已选资源卡配置: <span className="text-amber-400">({configs.length})</span>
                    </div>
                    {hasMore && (
                      <button 
                        onClick={() => setResourceConfigExpanded(!resourceConfigExpanded)}
                        className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                      >
                        {resourceConfigExpanded ? (
                          <><ChevronDown size={14} /> 收起</>
                        ) : (
                          <><ChevronRight size={14} /> 展开全部 ({configs.length - displayConfigs.length} 隐藏)</>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                      {displayConfigs.map(config => {
                          const card = cards.find(c => c._id === config.cardId);
                          if (!card) return null;
                          const colorInfo = colorLabels[config.color || 'RED'];
                          return (
                              <div key={config.configId} className={`flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border ${colorInfo.border} text-xs`}>
                                  <span className={`w-2 h-2 rounded-full ${colorInfo.class}`}></span>
                                  <span className="font-medium">{card.name}</span>
                                  <div className="flex items-center gap-1 bg-slate-900 rounded px-1.5 py-0.5">
                                      <button 
                                          onClick={() => updateConfigCount(config.configId, config.count - 1)}
                                          className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center font-bold"
                                      >−</button>
                                      <span className="w-6 text-center font-bold text-amber-400">{config.count}</span>
                                      <button 
                                          onClick={() => updateConfigCount(config.configId, config.count + 1)}
                                          className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center font-bold"
                                      >+</button>
                                  </div>
                                  <select 
                                      value={config.color} 
                                      onChange={(e) => updateConfigColor(config.configId, e.target.value as any)}
                                      className={`bg-slate-900 rounded px-1 py-0.5 border-none outline-none font-bold ${
                                          config.color === 'RED' ? 'text-red-500' : 
                                          config.color === 'BLUE' ? 'text-blue-500' : 
                                          config.color === 'SHOP' ? 'text-yellow-500' : 'text-green-500'
                                      }`}
                                  >
                                      <option value="RED">红</option>
                                      <option value="BLUE">蓝</option>
                                      <option value="GREEN">绿</option>
                                      <option value="SHOP">商店</option>
                                  </select>
                                  <X 
                                      size={14} 
                                      className="cursor-pointer hover:text-red-500" 
                                      onClick={() => removeCardConfig(config.configId)}
                                  />
                              </div>
                          )
                      })}
                  </div>
               </div>
             );
          })()}
          
          {/* 已选敌人卡配置 */}
          {getEnemyConfigs().length > 0 && (() => {
             const configs = getEnemyConfigs();
             const ITEMS_PER_ROW = 3;
             const lastRowStart = Math.floor((configs.length - 1) / ITEMS_PER_ROW) * ITEMS_PER_ROW;
             const displayConfigs = enemyConfigExpanded ? configs : configs.slice(lastRowStart);
             const hasMore = configs.length > ITEMS_PER_ROW;
             
             return (
               <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-bold text-slate-400">
                      已选敌人卡配置: <span className="text-red-400">({configs.length})</span>
                    </div>
                    {hasMore && (
                      <button 
                        onClick={() => setEnemyConfigExpanded(!enemyConfigExpanded)}
                        className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                      >
                        {enemyConfigExpanded ? (
                          <><ChevronDown size={14} /> 收起</>
                        ) : (
                          <><ChevronRight size={14} /> 展开全部 ({configs.length - displayConfigs.length} 隐藏)</>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                      {displayConfigs.map(config => {
                          const card = cards.find(c => c._id === config.cardId);
                          if (!card) return null;
                          return (
                              <div key={config.configId} className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-red-700 text-xs">
                                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                  <span className="font-medium">{card.name}</span>
                                  {card.edition && <span className="text-slate-500">({card.edition})</span>}
                                  <div className="flex items-center gap-1 bg-slate-900 rounded px-1.5 py-0.5">
                                      <button 
                                          onClick={() => {
                                            if (config.count <= 1) {
                                              removeCardConfig(config.configId);
                                            } else {
                                              updateConfigCount(config.configId, config.count - 1);
                                            }
                                          }}
                                          className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center font-bold"
                                      >−</button>
                                      <span className="w-6 text-center font-bold text-red-400">{config.count}</span>
                                      <button 
                                          onClick={() => updateConfigCount(config.configId, config.count + 1)}
                                          className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center font-bold"
                                      >+</button>
                                  </div>
                                  <X 
                                      size={14} 
                                      className="cursor-pointer hover:text-red-500" 
                                      onClick={() => removeCardConfig(config.configId)}
                                  />
                              </div>
                          )
                      })}
                  </div>
               </div>
             );
          })()}
          
          {cardConfigs.length > 0 && (
            <div className="mt-2 text-xs text-slate-500">
              总计已选: {uniqueCards} 种卡牌，共 {totalCards} 张
            </div>
          )}
        </div>

        {/* 卡牌选择区域 */}
        <div className="space-y-12">
          {typeOrder.map((type) => (
            <div key={type}>
              <h2 className="text-2xl font-bold mb-6 text-slate-300 border-b border-slate-800 pb-2 flex items-center gap-2">
                <span className={`w-2 h-8 rounded-full inline-block ${
                  type === 'RESOURCE' ? 'bg-green-500' :
                  type === 'MAP' ? 'bg-amber-500' :
                  type === 'ENEMY' ? 'bg-red-500' : 'bg-purple-500'
                }`}></span>
                {typeLabels[type]}
                <span className="text-sm font-normal text-slate-500">({groupedCards[type].length})</span>
                {type === 'RESOURCE' && (
                  <span className="text-xs font-normal text-slate-600 ml-2">（点击颜色按钮添加，同一张卡可添加多种颜色）</span>
                )}
              </h2>
              
              {type === 'RESOURCE' ? (
                groupedCards[type].length === 0 ? (
                  <div className="text-center py-8 bg-slate-900/30 rounded-xl border border-dashed border-slate-800 text-slate-600">
                    暂无{typeLabels[type]}，请先在卡牌图鉴中录入
                  </div>
                ) : (
                  renderCardGrid(groupedCards[type], type)
                )
              ) : (
                renderEditionGroups(type)
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
