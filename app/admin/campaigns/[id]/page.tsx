'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Pencil, Layers } from 'lucide-react';

type CardType = 'SKILL' | 'PLAYER' | 'ENEMY' | 'RESOURCE' | 'MAP' | 'SUPPORT' | 'BOSS' | 'DAYNIGHT' | 'SPECIAL_CHARACTER';

interface CardData {
    _id: string;
    name: string;
    type: CardType;
    imgUrl: string;
  thumbUrl?: string;  // 缩略图URL
    description?: string;
}

interface CampaignCard {
  card: CardData;
  color?: 'RED' | 'BLUE' | 'GREEN' | 'SHOP';
  count?: number;
}

// 获取卡牌显示图片（优先使用缩略图）
const getCardDisplayUrl = (card: CardData): string => {
  return card.thumbUrl || card.imgUrl || `https://placehold.co/100x100/333/999?text=${card.name?.charAt(0) || '?'}`;
};

interface Campaign {
  _id: string;
  name: string;
  cards: CampaignCard[];
  createdAt: string;
  updatedAt: string;
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const data = await res.json();
      if (data.success) {
        setCampaign(data.data);
      } else {
        alert('战役不存在');
        router.push('/admin/campaigns');
      }
    } catch (e) {
      console.error('加载战役失败:', e);
    } finally {
      setLoading(false);
    }
  };

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

  const colorLabels: Record<string, { label: string; class: string }> = {
    'RED': { label: '红', class: 'bg-red-600' },
    'BLUE': { label: '蓝', class: 'bg-blue-600' },
    'GREEN': { label: '绿', class: 'bg-green-600' },
    'SHOP': { label: '商店', class: 'bg-yellow-600' },
  };

  // 按类型分组卡牌（过滤掉已删除的卡牌）
  const validCards = campaign?.cards.filter(c => c.card !== null && c.card !== undefined) || [];
  const groupedCards: Record<CardType, CampaignCard[]> = validCards.reduce((acc, c) => {
    const type = c.card.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(c);
    return acc;
  }, {} as Record<CardType, CampaignCard[]>);

  const typeOrder: CardType[] = ['RESOURCE', 'MAP', 'ENEMY', 'SUPPORT', 'BOSS', 'DAYNIGHT', 'SPECIAL_CHARACTER'];

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-amber-500 text-xl animate-pulse">正在加载战役数据...</div>
    </div>
  );

  if (!campaign) return null;

  // 统计（使用过滤后的有效卡牌）
  const totalCards = validCards.reduce((sum, c) => sum + (c.count || 1), 0);
  const uniqueCardIds = new Set(validCards.map(c => c.card._id)).size;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => router.push('/admin/campaigns')} className="flex items-center gap-1 text-slate-400 hover:text-white mb-6">
          <ChevronLeft size={20} /> 返回战役列表
        </button>

        {/* Header */}
        <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Layers size={28} className="text-amber-500" />
                <h1 className="text-3xl font-bold text-white">{campaign.name}</h1>
              </div>
              <div className="text-sm text-slate-400 space-y-1">
                <div>创建时间: {new Date(campaign.createdAt).toLocaleString('zh-CN')}</div>
                <div>更新时间: {new Date(campaign.updatedAt).toLocaleString('zh-CN')}</div>
                <div className="mt-2">
                  包含 <span className="text-amber-400 font-bold">{uniqueCardIds}</span> 种卡牌，
                  <span className="text-amber-400 font-bold">{campaign.cards.length}</span> 条配置，
                  共 <span className="text-amber-400 font-bold">{totalCards}</span> 张
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push(`/admin/campaigns/${id}/edit`)}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-lg font-bold transition-all"
            >
              <Pencil size={18} /> 编辑战役
            </button>
          </div>
        </div>

        {/* Cards by Type */}
        <div className="space-y-10">
          {typeOrder.map((type) => {
            const typeCards = groupedCards[type] || [];
            if (typeCards.length === 0) return null;
            
            const typeTotal = typeCards.reduce((sum, c) => sum + (c.count || 1), 0);
            
            return (
              <div key={type}>
                <h2 className="text-xl font-bold mb-4 text-slate-300 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <span className={`w-2 h-6 rounded-full inline-block ${
                    type === 'RESOURCE' ? 'bg-green-500' :
                    type === 'MAP' ? 'bg-amber-500' :
                    type === 'ENEMY' ? 'bg-red-500' : 'bg-purple-500'
                  }`}></span>
                  {typeLabels[type]}
                  <span className="text-sm font-normal text-slate-500">
                    ({typeCards.length} 条配置，共 {typeTotal} 张)
                  </span>
                </h2>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {typeCards.map((c, i) => (
                    <div 
                      key={i}
                      className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 hover:border-slate-600 transition-all"
                    >
                      <div className="aspect-square bg-black rounded overflow-hidden mb-2 relative">
                        <img 
                          src={getCardDisplayUrl(c.card)} 
                          alt={c.card.name} 
                          className="w-full h-full object-contain" 
                        />
                        {/* 资源卡显示颜色标签 */}
                        {c.color && (
                          <div className={`absolute top-1 left-1 ${colorLabels[c.color]?.class} text-white text-[10px] px-1.5 py-0.5 rounded font-bold`}>
                            {colorLabels[c.color]?.label}
                          </div>
                        )}
                        {/* 张数 > 1 时显示 */}
                        {(c.count || 1) > 1 && (
                          <div className="absolute top-1 right-1 bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                            ×{c.count}
                          </div>
                        )}
                      </div>
                      <div className="font-medium text-sm text-center text-slate-300 truncate">{c.card.name}</div>
                      {c.card.description && (
                        <div className="text-xs text-slate-500 text-center mt-1 line-clamp-2">{c.card.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

