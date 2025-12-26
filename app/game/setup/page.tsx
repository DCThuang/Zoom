'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, User, Map, Swords, Check, X } from 'lucide-react';

export default function GameSetupPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]); // Multi-select
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/campaigns').then(res => res.json()),
      fetch('/api/cards?type=PLAYER').then(res => res.json())
    ]).then(([campaignData, roleData]) => {
      if (campaignData.success) setCampaigns(campaignData.data);
      if (roleData.success) setRoles(roleData.data);
      setLoading(false);
    });
  }, []);

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleStart = () => {
    if (!selectedCampaign || selectedRoles.length === 0) return;
    // Pass multiple role IDs
    const roleIds = selectedRoles.join(',');
    router.push(`/game/play?campaignId=${selectedCampaign}&roleIds=${roleIds}`);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500 font-bold text-xl animate-pulse">
      正在加载数据...
    </div>
  );

  return (
    <div className="min-h-screen bg-[url('https://placehold.co/1920x1080/0f172a/1e293b?text=Background')] bg-cover bg-center text-white p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto backdrop-blur-md bg-slate-900/80 rounded-2xl border border-slate-700 p-8 shadow-2xl">
        <header className="mb-10 border-b border-slate-700 pb-6 flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-red-600 rounded-lg shadow-lg">
            <Swords size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500">
              战前准备
            </h1>
            <p className="text-slate-400">配置你的冒险旅程</p>
          </div>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Campaign Selection */}
          <section>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-400">
              <Map size={20} />
              <span className="tracking-widest uppercase">选择战役</span>
            </h2>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {campaigns.length === 0 ? (
                <div className="text-center py-8 text-slate-500">暂无战役，请先创建</div>
              ) : campaigns.map((camp) => (
                <div 
                  key={camp._id}
                  onClick={() => setSelectedCampaign(camp._id)}
                  className={`p-5 border-l-4 rounded-r-lg cursor-pointer transition-all duration-200 group relative overflow-hidden ${
                    selectedCampaign === camp._id 
                      ? 'border-blue-500 bg-blue-900/30 pl-6 shadow-[0_0_20px_rgba(59,130,246,0.2)]' 
                      : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-500'
                  }`}
                >
                  <div className="flex justify-between items-center relative z-10">
                    <div>
                      <div className="font-bold text-lg group-hover:text-blue-300 transition-colors">{camp.name}</div>
                      <div className="text-xs text-slate-400 mt-1">包含 {camp.cards?.length || 0} 张卡牌</div>
                    </div>
                    {selectedCampaign === camp._id && <div className="text-blue-400 font-bold">已选择</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Role Selection - Multi-select */}
          <section>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-green-400">
              <User size={20} />
              <span className="tracking-widest uppercase">选择玩家</span>
              <span className="text-sm font-normal text-slate-400 ml-2">(可多选)</span>
            </h2>
            
            {/* Selected Players Summary */}
            {selectedRoles.length > 0 && (
              <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="text-xs text-slate-400 mb-2">已选择 {selectedRoles.length} 名玩家:</div>
                <div className="flex flex-wrap gap-2">
                  {selectedRoles.map(roleId => {
                    const role = roles.find(r => r._id === roleId);
                    if (!role) return null;
                    return (
                      <div key={roleId} className="flex items-center gap-2 bg-green-900/30 border border-green-700 px-3 py-1 rounded-full text-sm">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-black">
                          {role.imgUrl && <img src={role.imgUrl} className="w-full h-full object-cover"/>}
                        </div>
                        <span className="text-green-300">{role.name}</span>
                        <X size={14} className="cursor-pointer hover:text-red-400" onClick={(e) => { e.stopPropagation(); toggleRole(roleId); }}/>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {roles.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-slate-500">暂无角色，请先在卡牌图鉴中录入</div>
              ) : roles.map((role) => {
                const isSelected = selectedRoles.includes(role._id);
                return (
                  <div 
                    key={role._id}
                    onClick={() => toggleRole(role._id)}
                    className={`border-2 rounded-xl cursor-pointer transition-all duration-200 overflow-hidden relative group ${
                      isSelected 
                        ? 'border-green-500 ring-2 ring-green-500/30 shadow-[0_0_25px_rgba(34,197,94,0.3)]' 
                        : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Selection Badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 z-20 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                        <Check size={18} className="text-white" />
                      </div>
                    )}
                    
                    <div className="aspect-[3/4] bg-black relative">
                      <img 
                        src={role.imgUrl || `https://placehold.co/300x400/222/999?text=${role.name}`} 
                        alt={role.name} 
                        className={`w-full h-full object-cover transition-all ${isSelected ? 'brightness-110' : 'group-hover:scale-110'}`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="font-bold text-xl text-white mb-1">{role.name}</div>
                        <div className="flex gap-2 text-xs font-mono text-green-300">
                          <span className="bg-green-900/80 px-2 py-0.5 rounded">HP: {role.hp}</span>
                          <span className="bg-blue-900/80 px-2 py-0.5 rounded">潜行: {role.stealth}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="mt-12 flex justify-between items-center">
          <div className="text-slate-400">
            {selectedCampaign && selectedRoles.length > 0 && (
              <span>准备开始: <span className="text-white">{selectedRoles.length}</span> 名玩家的冒险</span>
            )}
          </div>
          <button 
            onClick={handleStart}
            disabled={!selectedCampaign || selectedRoles.length === 0}
            className="group relative px-8 py-4 bg-gradient-to-r from-amber-600 to-red-700 rounded-lg font-bold text-xl text-white shadow-lg transition-all hover:shadow-red-900/50 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              开始冒险 <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
        </div>
      </div>
    </div>
  );
}
