'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Play, Trash2, Clock, User, Map, ZoomIn } from 'lucide-react';
import ImageViewerModal from '../play/components/ImageViewerModal';

interface GameSession {
  _id: string;
  name: string;
  campaignName: string;
  roleName: string;
  roleImgUrl: string;
  gameStarted: boolean;
  createdAt: string;
  updatedAt: string;
  players?: any[];
}

export default function GameSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingImage, setViewingImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/game-sessions');
      const data = await res.json();
      if (data.success) {
        setSessions(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm('确定要删除这个存档吗？此操作无法撤销。')) return;
    
    try {
      const res = await fetch(`/api/game-sessions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSessions(prev => prev.filter(s => s._id !== id));
      } else {
        alert('删除失败: ' + data.error);
      }
    } catch (err) {
      alert('删除失败');
    }
  };

  const loadSession = (sessionId: string) => {
    router.push(`/game/play?sessionId=${sessionId}`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.push('/')} className="flex items-center gap-1 text-slate-400 hover:text-white mb-6">
          <ChevronLeft size={20} /> 返回首页
        </button>

        <h1 className="text-3xl font-bold mb-2 text-amber-500">游戏存档</h1>
        <p className="text-slate-400 mb-8">选择一个存档继续游戏</p>

        {loading ? (
          <div className="text-center py-20 text-amber-500 animate-pulse">加载存档中...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-xl border border-slate-800">
            <Map size={48} className="mx-auto text-slate-700 mb-4" />
            <p className="text-slate-500">暂无存档</p>
            <button 
              onClick={() => router.push('/game/setup')}
              className="mt-4 px-6 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white font-bold"
            >
              开始新游戏
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map(session => (
              <div 
                key={session._id}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  {/* Role Avatar */}
                  <div 
                    className="w-16 h-16 rounded-full border-2 border-amber-500/50 overflow-hidden bg-black shrink-0 relative group cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (session.roleImgUrl) {
                        setViewingImage({ url: session.roleImgUrl, title: session.roleName });
                      }
                    }}
                  >
                    {session.roleImgUrl ? (
                      <>
                        <img src={session.roleImgUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ZoomIn size={20} className="text-white"/>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <User size={24} />
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg text-white truncate">{session.campaignName}</div>
                    <div className="text-sm text-slate-400 flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1">
                        <User size={12} /> {session.roleName}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${session.gameStarted ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                        {session.gameStarted ? '游戏中' : '准备阶段'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                      <Clock size={10} /> 上次游玩: {formatDate(session.updatedAt)}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => loadSession(session._id)}
                      className="px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-lg text-white font-bold flex items-center gap-2 transition-colors"
                    >
                      <Play size={16} /> 继续
                    </button>
                    <button
                      onClick={() => deleteSession(session._id)}
                      className="px-4 py-3 bg-slate-800 hover:bg-red-900 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                      title="删除存档"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {sessions.length > 0 && (
          <div className="mt-8 text-center">
            <button 
              onClick={() => router.push('/game/setup')}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-bold"
            >
              开始新游戏
            </button>
          </div>
        )}
      </div>

      {/* 图片放大查看模态框 */}
      {viewingImage && (
        <ImageViewerModal
          imageUrl={viewingImage.url}
          title={viewingImage.title}
          onClose={() => setViewingImage(null)}
        />
      )}
    </div>
  );
}

