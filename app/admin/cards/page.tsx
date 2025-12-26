'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Upload, Edit, Trash2, Plus, X, Layers, ChevronRight } from 'lucide-react';

const CARDS_PER_PAGE = 20;

type CardType = 'SKILL' | 'PLAYER' | 'ENEMY' | 'RESOURCE' | 'MAP' | 'SUPPORT' | 'BOSS' | 'DAYNIGHT' | 'SPECIAL_CHARACTER';

interface Card {
    _id: string;
    name: string;
    type: CardType;
    imgUrl: string;
    thumbUrl?: string;  // 缩略图URL
    description?: string;
    [key: string]: any;
}

// 获取卡牌显示图片（优先使用缩略图）
const getCardDisplayUrl = (card: Card): string => {
    return card.thumbUrl || card.imgUrl || `https://placehold.co/300x400/222/999?text=${card.name?.charAt(0) || '?'}`;
};

interface Edition {
    _id: string;
    name: string;
    description?: string;
    color?: string;
}

export default function CardAdminPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'LIST' | 'EDIT' | 'CREATE'>('LIST');
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedType, setSelectedType] = useState<CardType | 'ALL'>('ALL');
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  
  // 存储所有玩家角色卡（用于技能卡的角色选择）
  const [playerRoles, setPlayerRoles] = useState<Card[]>([]);
  
  // 版本管理
  const [editions, setEditions] = useState<Edition[]>([]);
  const [editionModalOpen, setEditionModalOpen] = useState(false);
  const [newEditionName, setNewEditionName] = useState('');
  const [newEditionDesc, setNewEditionDesc] = useState('');
  const [editingEdition, setEditingEdition] = useState<Edition | null>(null);
  
  // File input ref for resetting
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Cards
  const fetchCards = async () => {
      setLoading(true);
      try {
          const url = selectedType === 'ALL' ? '/api/cards' : `/api/cards?type=${selectedType}`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.success) {
              setCards(data.data);
          }
      } catch (err) {
          console.error(err);
      } finally {
          setLoading(false);
      }
  };

  // Fetch Editions
  const fetchEditions = async () => {
      try {
          const res = await fetch('/api/editions');
          const data = await res.json();
          if (data.success) {
              setEditions(data.data);
          }
      } catch (err) {
          console.error('获取版本失败:', err);
      }
  };

  useEffect(() => {
      if (viewMode === 'LIST') {
          fetchCards();
          setCurrentPage(1); // 切换类型时重置分页
      }
  }, [viewMode, selectedType]);

  // 分页计算
  const totalPages = Math.ceil(cards.length / CARDS_PER_PAGE);
  const paginatedCards = useMemo(() => {
    const startIndex = (currentPage - 1) * CARDS_PER_PAGE;
    return cards.slice(startIndex, startIndex + CARDS_PER_PAGE);
  }, [cards, currentPage]);

  // 获取所有玩家角色卡和版本
  useEffect(() => {
      const fetchPlayerRoles = async () => {
          try {
              const res = await fetch('/api/cards?type=PLAYER');
              const data = await res.json();
              if (data.success) {
                  setPlayerRoles(data.data);
              }
          } catch (err) {
              console.error('获取玩家角色失败:', err);
          }
      };
      fetchPlayerRoles();
      fetchEditions();
  }, []);

  // 版本管理操作
  const handleCreateEdition = async () => {
      if (!newEditionName.trim()) return alert('请输入版本名称');
      
      try {
          const res = await fetch('/api/editions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: newEditionName.trim(), description: newEditionDesc.trim() })
          });
          const data = await res.json();
          if (data.success) {
              setEditions(prev => [...prev, data.data].sort((a, b) => a.name.localeCompare(b.name)));
              setNewEditionName('');
              setNewEditionDesc('');
          } else {
              alert('错误: ' + data.error);
          }
      } catch (e) {
          alert('创建版本失败');
      }
  };

  const handleUpdateEdition = async () => {
      if (!editingEdition || !newEditionName.trim()) return;
      
      try {
          const res = await fetch(`/api/editions/${editingEdition._id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: newEditionName.trim(), description: newEditionDesc.trim() })
          });
          const data = await res.json();
          if (data.success) {
              setEditions(prev => prev.map(e => e._id === editingEdition._id ? data.data : e).sort((a, b) => a.name.localeCompare(b.name)));
              setEditingEdition(null);
              setNewEditionName('');
              setNewEditionDesc('');
          } else {
              alert('错误: ' + data.error);
          }
      } catch (e) {
          alert('更新版本失败');
      }
  };

  const handleDeleteEdition = async (id: string, name: string) => {
      if (!confirm(`确定要删除版本「${name}」吗？`)) return;
      
      try {
          const res = await fetch(`/api/editions/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
              setEditions(prev => prev.filter(e => e._id !== id));
          } else {
              alert('删除失败: ' + data.error);
          }
      } catch (e) {
          alert('删除版本失败');
      }
  };

  const startEditEdition = (edition: Edition) => {
      setEditingEdition(edition);
      setNewEditionName(edition.name);
      setNewEditionDesc(edition.description || '');
  };

  const cancelEditEdition = () => {
      setEditingEdition(null);
      setNewEditionName('');
      setNewEditionDesc('');
  };

  // Card Handlers
  const handleEdit = (card: Card) => {
      setEditingId(card._id);
      setFormData(card);
      setPreviewUrl(card.imgUrl);
      setImageFile(null);
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
      setViewMode('EDIT');
      setMessage('');
  };

  const handleDelete = async (id: string) => {
      if (!confirm('确定要删除这张卡牌吗？此操作无法撤销。')) return;
      
      try {
          const res = await fetch(`/api/cards/${id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
              setCards(cards.filter(c => c._id !== id));
          } else {
              alert('删除失败: ' + data.error);
          }
      } catch (err) {
          alert('删除失败');
      }
  };

  const handleCreateNew = () => {
      setEditingId(null);
      setFormData({
          type: 'SKILL',
          name: '',
          description: '',
          count: 1
      });
      setPreviewUrl('');
      setImageFile(null);
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
      setViewMode('CREATE');
      setMessage('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 创建模式下必须上传图片
    if (viewMode === 'CREATE' && !imageFile) {
      setMessage('错误: 请上传卡牌图片');
      return;
    }
    
    setLoading(true);
    setMessage('');

    try {
      const formPayload = new FormData();
      if (imageFile) formPayload.append('image', imageFile);
      
      Object.keys(formData).forEach(key => {
        if (key !== '_id' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt' && formData[key] !== undefined && formData[key] !== null) {
            formPayload.append(key, formData[key]);
        }
      });

      const url = viewMode === 'CREATE' ? '/api/cards' : `/api/cards/${editingId}`;
      const method = viewMode === 'CREATE' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method: method,
        body: formPayload,
      });

      const data = await res.json();
      if (data.success) {
        setMessage(viewMode === 'CREATE' ? '卡牌创建成功！' : '卡牌更新成功！');
        if (viewMode === 'CREATE') {
            setFormData({ type: formData.type, name: '', description: '', count: 1 });
            setImageFile(null);
            setPreviewUrl('');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } else {
            setTimeout(() => setViewMode('LIST'), 1000);
        }
      } else {
        setMessage(`错误: ${data.error}`);
      }
    } catch (error) {
      setMessage('发生未知错误');
    } finally {
      setLoading(false);
    }
  };

  const typeLabels: Record<string, string> = {
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

  // 版本标签颜色列表
  const editionColors = [
    'bg-purple-600',
    'bg-blue-600',
    'bg-green-600',
    'bg-amber-600',
    'bg-red-600',
    'bg-pink-600',
    'bg-cyan-600',
    'bg-indigo-600',
    'bg-teal-600',
    'bg-orange-600',
  ];

  // 根据版本名称获取颜色
  const getEditionColor = (editionName: string): string => {
    let hash = 0;
    for (let i = 0; i < editionName.length; i++) {
      hash = editionName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % editionColors.length;
    return editionColors[index];
  };

  // Render List View
  if (viewMode === 'LIST') {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <button onClick={() => router.push('/')} className="flex items-center gap-1 text-slate-400 hover:text-white">
                        <ChevronLeft size={20} /> 返回首页
                    </button>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setEditionModalOpen(true)}
                            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold"
                        >
                            <Layers size={18} /> 版本管理
                        </button>
                        <button 
                            onClick={handleCreateNew}
                            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-lg shadow-green-900/20"
                        >
                            <Upload size={18} /> 录入新卡牌
                        </button>
                    </div>
                </div>

                <h1 className="text-3xl font-bold mb-6 text-amber-500">卡牌管理图鉴</h1>

                <div className="flex flex-wrap gap-2 mb-8 bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <button
                        onClick={() => setSelectedType('ALL')}
                        className={`px-4 py-2 rounded font-bold whitespace-nowrap transition-colors ${
                            selectedType === 'ALL' 
                            ? 'bg-slate-700 text-white' 
                            : 'bg-transparent text-slate-400 hover:text-white'
                        }`}
                    >
                        全部
                    </button>
                    {(['SKILL', 'PLAYER', 'ENEMY', 'RESOURCE', 'MAP', 'SUPPORT', 'BOSS', 'DAYNIGHT', 'SPECIAL_CHARACTER'] as CardType[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => setSelectedType(type)}
                            className={`px-4 py-2 rounded font-bold whitespace-nowrap transition-colors ${
                                selectedType === type 
                                ? 'bg-amber-600 text-white' 
                                : 'bg-transparent text-slate-400 hover:text-white'
                            }`}
                        >
                            {typeLabels[type]}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="text-center py-20 text-slate-500 animate-pulse">加载中...</div>
                ) : (
                    <>
                        {/* 分页信息 */}
                        {cards.length > 0 && (
                            <div className="mb-4 flex items-center justify-between">
                                <div className="text-sm text-slate-500">
                                    共 {cards.length} 张卡牌，当前显示 {(currentPage - 1) * CARDS_PER_PAGE + 1} - {Math.min(currentPage * CARDS_PER_PAGE, cards.length)} 张
                                </div>
                                {totalPages > 1 && (
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1.5 bg-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                        >
                                            <ChevronLeft size={16} /> 上一页
                                        </button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                                                // 只显示当前页附近的页码
                                                if (page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)) {
                                                    return (
                                                        <button
                                                            key={page}
                                                            onClick={() => setCurrentPage(page)}
                                                            className={`w-8 h-8 rounded-lg font-bold text-sm ${
                                                                page === currentPage 
                                                                    ? 'bg-amber-600 text-white' 
                                                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                                            }`}
                                                        >
                                                            {page}
                                                        </button>
                                                    );
                                                } else if (page === currentPage - 3 || page === currentPage + 3) {
                                                    return <span key={page} className="text-slate-600">...</span>;
                                                }
                                                return null;
                                            })}
                                        </div>
                                        <button 
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1.5 bg-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                        >
                                            下一页 <ChevronRight size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {paginatedCards.map(card => (
                                <div key={card._id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group hover:border-amber-500/50 transition-colors shadow-lg relative">
                                    <div className="aspect-[3/4] relative bg-black/50">
                                        <img 
                                            src={getCardDisplayUrl(card)} 
                                            className="w-full h-full object-contain" 
                                        />
                                        <div className="absolute top-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] text-white uppercase font-bold border border-white/10">
                                            {typeLabels[card.type]}
                                        </div>
                                        {card.edition && (
                                            <div className={`absolute top-2 right-2 ${getEditionColor(card.edition)} px-2 py-0.5 rounded text-[10px] text-white font-bold`}>
                                                {card.edition}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                            <button 
                                                onClick={() => handleEdit(card)}
                                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold"
                                            >
                                                <Edit size={14}/> 编辑
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(card._id)}
                                                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold"
                                            >
                                                <Trash2 size={14}/> 删除
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <div className="font-bold text-slate-200 truncate">{card.name}</div>
                                        <div className="text-xs text-slate-500 truncate mt-1">
                                            {card.description || '暂无描述'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {cards.length === 0 && (
                                <div className="col-span-full text-center py-20 text-slate-600 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                                    暂无卡牌数据
                                </div>
                            )}
                        </div>

                        {/* 底部分页 */}
                        {totalPages > 1 && (
                            <div className="mt-6 flex justify-center">
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 bg-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                    >
                                        <ChevronLeft size={16} /> 上一页
                                    </button>
                                    <span className="text-slate-500 text-sm px-4">
                                        第 {currentPage} / {totalPages} 页
                                    </span>
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 bg-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                    >
                                        下一页 <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* 版本管理弹窗 */}
            {editionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setEditionModalOpen(false)}>
                    <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Layers size={20} className="text-purple-400" />
                                版本管理
                            </h3>
                            <button onClick={() => setEditionModalOpen(false)} className="text-slate-400 hover:text-white"><X size={24}/></button>
                        </div>
                        
                        <div className="p-4 border-b border-slate-700">
                            <div className="text-sm text-slate-400 mb-3">
                                {editingEdition ? '编辑版本' : '创建新版本'}
                            </div>
                            <div className="space-y-3">
                                <input 
                                    value={newEditionName}
                                    onChange={(e) => setNewEditionName(e.target.value)}
                                    placeholder="版本名称（如：狂热、瘟疫）"
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white placeholder-slate-500"
                                />
                                <input 
                                    value={newEditionDesc}
                                    onChange={(e) => setNewEditionDesc(e.target.value)}
                                    placeholder="版本描述（可选）"
                                    className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white placeholder-slate-500"
                                />
                                <div className="flex gap-2">
                                    {editingEdition ? (
                                        <>
                                            <button 
                                                onClick={handleUpdateEdition}
                                                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded font-bold"
                                            >
                                                保存修改
                                            </button>
                                            <button 
                                                onClick={cancelEditEdition}
                                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold"
                                            >
                                                取消
                                            </button>
                                        </>
                                    ) : (
                                        <button 
                                            onClick={handleCreateEdition}
                                            className="w-full bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded font-bold flex items-center justify-center gap-2"
                                        >
                                            <Plus size={18} /> 添加版本
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 overflow-y-auto flex-1">
                            <div className="text-sm text-slate-400 mb-3">已有版本 ({editions.length})</div>
                            {editions.length === 0 ? (
                                <div className="text-center py-8 text-slate-600">暂无版本，请先创建</div>
                            ) : (
                                <div className="space-y-2">
                                    {editions.map(edition => (
                                        <div key={edition._id} className="flex items-center justify-between bg-slate-800 px-4 py-3 rounded-lg border border-slate-700">
                                            <div>
                                                <div className="font-bold text-white">{edition.name}</div>
                                                {edition.description && (
                                                    <div className="text-xs text-slate-500">{edition.description}</div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => startEditEdition(edition)}
                                                    className="text-blue-400 hover:text-blue-300 text-sm"
                                                >
                                                    编辑
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteEdition(edition._id, edition.name)}
                                                    className="text-red-400 hover:text-red-300 text-sm"
                                                >
                                                    删除
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
      );
  }

  // Render Edit/Create View
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => setViewMode('LIST')} className="flex items-center gap-1 text-slate-400 hover:text-white mb-6">
          <ChevronLeft size={20} /> 返回列表
        </button>

        <h1 className="text-3xl font-bold mb-8 text-amber-500">
            {viewMode === 'CREATE' ? '录入新卡牌' : `编辑卡牌: ${formData.name}`}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6 bg-slate-900/50 p-8 rounded-xl border border-slate-800 shadow-xl backdrop-blur-sm">
            
            {/* Type Selector (Only in Create Mode) */}
            {viewMode === 'CREATE' && (
                 <div className="mb-6">
                    <label className="block text-sm font-medium mb-2 text-slate-400">卡牌类型</label>
                    <div className="flex flex-wrap gap-2">
                        {(['SKILL', 'PLAYER', 'ENEMY', 'RESOURCE', 'MAP', 'SUPPORT', 'BOSS', 'DAYNIGHT', 'SPECIAL_CHARACTER'] as CardType[]).map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setFormData((prev: any) => ({ ...prev, type }))}
                                className={`px-4 py-2 rounded font-bold transition-colors text-sm ${
                                    formData.type === type 
                                    ? 'bg-amber-600 text-white' 
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                            >
                                {typeLabels[type]}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Common Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                <label className="block text-sm font-medium mb-2 text-slate-400">名称</label>
                <input 
                    name="name" 
                    value={formData.name || ''} 
                    onChange={handleChange} 
                    className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white focus:ring-2 focus:ring-amber-500 outline-none" 
                    required 
                />
                </div>
                
                {/* Image Upload */}
                <div>
                <label className="block text-sm font-medium mb-2 text-slate-400">卡牌图片</label>
                <div className="flex gap-4 items-center">
                    <div className="flex-1">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer bg-slate-800 hover:bg-slate-700 transition-colors relative overflow-hidden group">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 relative z-10">
                                <Upload className="w-8 h-8 mb-2 text-slate-400 group-hover:text-white" />
                                <p className="text-sm text-slate-400 group-hover:text-white">
                                    {imageFile ? '点击更换图片' : (viewMode === 'EDIT' ? '点击修改图片' : '点击上传图片')}
                                </p>
                            </div>
                            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                        </label>
                    </div>
                    {previewUrl && (
                        <div className="w-24 h-32 border border-slate-600 rounded overflow-hidden shrink-0 bg-black relative">
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                        </div>
                    )}
                </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-2 text-slate-400">描述说明</label>
                <textarea 
                name="description" 
                value={formData.description || ''} 
                onChange={handleChange} 
                className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-white focus:ring-2 focus:ring-amber-500 outline-none h-32" 
                />
            </div>

            {/* Dynamic Specific Fields based on formData.type */}
            {formData.type === 'SKILL' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">所属角色 <span className="text-red-500">*</span></label>
                        <select 
                            name="role" 
                            value={formData.role||''} 
                            onChange={handleChange} 
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                            required
                        >
                            <option value="">-- 请选择角色 --</option>
                            {playerRoles.map(role => (
                                <option key={role._id} value={role.name}>{role.name}</option>
                            ))}
                        </select>
                        {playerRoles.length === 0 && (
                            <p className="text-xs text-amber-500 mt-1">请先创建玩家角色卡</p>
                        )}
                    </div>
                    <div><label className="block text-xs text-slate-500 mb-1">技能类型</label><input name="skillType" value={formData.skillType||''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" /></div>
                    <div><label className="block text-xs text-slate-500 mb-1">等级</label><input type="number" name="level" value={formData.level||''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" /></div>
                    <div><label className="block text-xs text-slate-500 mb-1">费用</label><input type="number" name="cost" value={formData.cost||''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" /></div>
                    <div><label className="block text-xs text-slate-500 mb-1">总张数</label><input type="number" name="count" value={formData.count||1} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" /></div>
                </div>
            )}

            {formData.type === 'PLAYER' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                    <div><label className="block text-xs text-slate-500 mb-1">角色职业名</label><input name="role" value={formData.role||''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" /></div>
                    <div><label className="block text-xs text-slate-500 mb-1">初始HP</label><input type="number" name="hp" value={formData.hp||''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" /></div>
                    <div><label className="block text-xs text-slate-500 mb-1">初始潜行</label><input type="number" name="stealth" value={formData.stealth||''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" /></div>
                </div>
            )}

            {formData.type === 'ENEMY' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">版本 <span className="text-red-500">*</span></label>
                        <select 
                            name="edition" 
                            value={formData.edition||''} 
                            onChange={handleChange} 
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                            required
                        >
                            <option value="">-- 请选择版本 --</option>
                            {editions.map(edition => (
                                <option key={edition._id} value={edition.name}>{edition.name}</option>
                            ))}
                        </select>
                        {editions.length === 0 && (
                            <p className="text-xs text-amber-500 mt-1">请先在版本管理中创建版本</p>
                        )}
                    </div>
                    <div><label className="block text-xs text-slate-500 mb-1">敌人名称 (Role)</label><input name="role" value={formData.role||''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" /></div>
                    <div><label className="block text-xs text-slate-500 mb-1">HP</label><input type="number" name="hp" value={formData.hp||''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" /></div>
                    <div><label className="block text-xs text-slate-500 mb-1">攻击力</label><input type="number" name="attack" value={formData.attack||''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" /></div>
                </div>
            )}

            {formData.type === 'RESOURCE' && (
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                    <label className="block text-xs text-slate-500 mb-1">资源类型</label>
                    <input name="resourceType" value={formData.resourceType||''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" />
                </div>
            )}

            {formData.type === 'MAP' && (
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 space-y-4">
                    <div>
                    <label className="block text-xs text-slate-500 mb-1">版本 <span className="text-red-500">*</span></label>
                    <select 
                        name="edition" 
                        value={formData.edition||''} 
                        onChange={handleChange} 
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                        required
                    >
                        <option value="">-- 请选择版本 --</option>
                        {editions.map(edition => (
                            <option key={edition._id} value={edition.name}>{edition.name}</option>
                        ))}
                    </select>
                    {editions.length === 0 && (
                        <p className="text-xs text-amber-500 mt-1">请先在版本管理中创建版本</p>
                    )}
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">地图编号</label>
                        <input 
                            type="number" 
                            name="mapNumber" 
                            value={formData.mapNumber || ''} 
                            onChange={handleChange} 
                            placeholder="输入2-12的数字（骰子点数和）"
                            min={2}
                            max={12}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" 
                        />
                        <p className="text-xs text-slate-600 mt-1">用于骰子定位功能（两颗六面骰点数和为2-12）</p>
                    </div>
                </div>
            )}

            {formData.type === 'BOSS' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">版本</label>
                        <select 
                            name="edition" 
                            value={formData.edition||''} 
                            onChange={handleChange} 
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                        >
                            <option value="">-- 请选择版本 --</option>
                            {editions.map(edition => (
                                <option key={edition._id} value={edition.name}>{edition.name}</option>
                            ))}
                        </select>
                    </div>
                    <div><label className="block text-xs text-slate-500 mb-1">HP</label><input type="number" name="hp" value={formData.hp||''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" /></div>
                    <div><label className="block text-xs text-slate-500 mb-1">攻击力</label><input type="number" name="attack" value={formData.attack||''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" /></div>
                </div>
            )}

            {(formData.type === 'SUPPORT' || formData.type === 'DAYNIGHT' || formData.type === 'SPECIAL_CHARACTER') && (
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                    <div className="text-xs text-slate-500">此类型卡牌无特殊字段，填写基本信息即可</div>
                </div>
            )}
            
            <div className="flex gap-4">
                <button 
                    type="submit" 
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-4 rounded-lg hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 transition-all shadow-lg hover:shadow-green-900/50 flex items-center justify-center gap-2"
                >
                    {loading ? '保存中...' : (viewMode === 'EDIT' ? '保存修改' : '录入卡牌')}
                </button>
                {viewMode === 'EDIT' && (
                     <button 
                        type="button"
                        onClick={() => handleDelete(editingId!)}
                        className="px-6 bg-red-900/30 text-red-500 border border-red-900/50 rounded-lg hover:bg-red-900/50 font-bold"
                    >
                        删除
                    </button>
                )}
            </div>

            {message && (
                <div className={`p-4 rounded text-center font-bold ${message.startsWith('错误') ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                    {message}
                </div>
            )}
        </form>
      </div>
    </div>
  );
}
