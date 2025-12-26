'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, Eye, Pencil, Trash2, Layers } from 'lucide-react';

interface CardData {
  _id: string;
  name: string;
  type: string;
  imgUrl: string;
  thumbUrl?: string;
}

interface Campaign {
  _id: string;
  name: string;
  cards: Array<{
    card: CardData;
    color?: string;
    count?: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

// 获取卡牌显示图片（优先使用缩略图）
const getCardDisplayUrl = (card: CardData): string => {
  return card.thumbUrl || card.imgUrl || `https://placehold.co/40/333/999?text=${card.name?.charAt(0) || '?'}`;
};

export default function CampaignListPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.data);
      }
    } catch (e) {
      console.error('加载战役失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除战役「${name}」吗？此操作不可恢复。`)) return;
    
    setDeleting(id);
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCampaigns(prev => prev.filter(c => c._id !== id));
      } else {
        alert('删除失败: ' + data.error);
      }
    } catch (e) {
      alert('删除战役失败');
    } finally {
      setDeleting(null);
    }
  };

  // 统计卡牌信息（过滤掉已删除的卡牌）
  const getCardStats = (campaign: Campaign) => {
    const stats = { resource: 0, map: 0, enemy: 0, total: 0 };
    campaign.cards.filter(c => c.card !== null && c.card !== undefined).forEach(c => {
      const count = c.count || 1;
      stats.total += count;
      if (c.card.type === 'RESOURCE') stats.resource += count;
      if (c.card.type === 'MAP') stats.map += count;
      if (c.card.type === 'ENEMY') stats.enemy += count;
    });
    return stats;
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-amber-500 text-xl animate-pulse">正在加载战役数据...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => router.push('/')} className="flex items-center gap-1 text-slate-400 hover:text-white mb-6">
          <ChevronLeft size={20} /> 返回首页
        </button>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-amber-500 flex items-center gap-3">
            <Layers size={32} />
            战役管理
          </h1>
          <button 
            onClick={() => router.push('/admin/campaigns/new')}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition-all"
          >
            <Plus size={20} /> 创建新战役
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
            <Layers size={48} className="mx-auto mb-4 text-slate-600" />
            <div className="text-xl text-slate-500 mb-4">暂无战役</div>
            <button 
              onClick={() => router.push('/admin/campaigns/new')}
              className="text-purple-400 hover:text-purple-300 font-medium"
            >
              点击创建第一个战役 →
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign) => {
              const stats = getCardStats(campaign);
              return (
                <div 
                  key={campaign._id}
                  className="bg-slate-900/80 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* 左侧：战役信息 */}
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-white mb-2">{campaign.name}</h2>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          资源卡: {stats.resource}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          地图卡: {stats.map}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          敌人卡: {stats.enemy}
                        </span>
                        <span className="text-slate-500">|</span>
                        <span>总计: {stats.total} 张</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        创建于: {new Date(campaign.createdAt).toLocaleString('zh-CN')}
                      </div>
                    </div>

                    {/* 右侧：卡牌预览 */}
                    <div className="flex -space-x-2">
                      {campaign.cards.filter(c => c.card).slice(0, 5).map((c, i) => (
                        <div 
                          key={i}
                          className="w-10 h-10 rounded-lg border-2 border-slate-700 overflow-hidden bg-black"
                          style={{ zIndex: 5 - i }}
                        >
                          <img 
                            src={getCardDisplayUrl(c.card)}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ))}
                      {campaign.cards.filter(c => c.card).length > 5 && (
                        <div className="w-10 h-10 rounded-lg border-2 border-slate-700 bg-slate-800 flex items-center justify-center text-xs text-slate-400 font-bold">
                          +{campaign.cards.filter(c => c.card).length - 5}
                        </div>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/admin/campaigns/${campaign._id}`)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-blue-400 hover:text-blue-300 transition-colors"
                        title="查看详情"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => router.push(`/admin/campaigns/${campaign._id}/edit`)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-amber-400 hover:text-amber-300 transition-colors"
                        title="编辑战役"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(campaign._id, campaign.name)}
                        disabled={deleting === campaign._id}
                        className="p-2 bg-slate-800 hover:bg-red-900/50 rounded-lg text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                        title="删除战役"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
