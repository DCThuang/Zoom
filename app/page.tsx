import Link from 'next/link';
import { Sword, Scroll, Shield, BookOpen } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600 rounded-full blur-[128px] -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-red-600 rounded-full blur-[128px] translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="z-10 text-center mb-16">
        <h1 className="text-7xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-amber-500 to-red-600 drop-shadow-lg tracking-wider">
          绝境求生
          </h1>
        <p className="text-xl text-slate-400 tracking-[0.5em] uppercase">Zoom Game Project</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl z-10 px-4">
        <MenuCard 
          href="/game/setup"
          title="开始征程"
          desc="选择战役与角色，踏入未知的地下城"
          icon={<Sword size={48} className="text-red-500 mb-4" />}
          gradient="from-red-900/50 to-slate-900/50"
          borderColor="border-red-500/30 group-hover:border-red-500"
        />

        <MenuCard 
          href="/game/sessions"
          title="继续游戏"
          desc="加载已保存的存档，继续上次的冒险"
          icon={<BookOpen size={48} className="text-green-500 mb-4" />}
          gradient="from-green-900/50 to-slate-900/50"
          borderColor="border-green-500/30 group-hover:border-green-500"
        />

        <MenuCard 
          href="/admin/cards"
          title="卡牌图鉴"
          desc="创造与管理游戏中的技能、角色与敌人"
          icon={<Shield size={48} className="text-blue-500 mb-4" />}
          gradient="from-blue-900/50 to-slate-900/50"
          borderColor="border-blue-500/30 group-hover:border-blue-500"
        />

        <MenuCard 
          href="/admin/campaigns"
          title="战役编辑器"
          desc="编织新的冒险传说与挑战"
          icon={<Scroll size={48} className="text-amber-500 mb-4" />}
          gradient="from-amber-900/50 to-slate-900/50"
          borderColor="border-amber-500/30 group-hover:border-amber-500"
        />
        </div>

      <div className="absolute bottom-4 text-slate-600 text-sm">
        Next.js Game Engine v1.0
        </div>
      </main>
  );
}

function MenuCard({ href, title, desc, icon, gradient, borderColor }: any) {
  return (
    <Link 
      href={href}
      className={`group relative p-8 rounded-xl border ${borderColor} bg-gradient-to-br ${gradient} backdrop-blur-sm transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-2xl overflow-hidden`}
    >
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="relative z-10 flex flex-col items-center text-center">
        {icon}
        <h2 className="text-2xl font-bold mb-3 text-white group-hover:text-yellow-400 transition-colors">{title}</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          {desc}
        </p>
    </div>
    </Link>
  );
}
