'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { MapMarker } from '../types';

interface AddMarkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMarker: (marker: MapMarker) => void;
}

const MARKER_COLORS = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function AddMarkerModal({
  isOpen,
  onClose,
  onAddMarker
}: AddMarkerModalProps) {
  const [text, setText] = useState('');
  const [color, setColor] = useState('#f59e0b');

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!text.trim()) return;
    const newMarker: MapMarker = {
      id: `marker-${Date.now()}`,
      text: text.trim(),
      color,
      x: 5,  // 默认左上角
      y: 5,
    };
    onAddMarker(newMarker);
    setText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8" onClick={onClose}>
      <div className="bg-slate-900 border border-cyan-700 rounded-xl max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-cyan-400">添加地图标记</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">标记文字</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="输入标记内容..."
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
              maxLength={10}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">标记颜色</label>
            <div className="flex gap-2 flex-wrap">
              {MARKER_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'scale-125 border-white' : 'border-transparent hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={!text.trim()}
            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded flex items-center justify-center gap-2"
          >
            <Plus size={16}/> 创建标记
          </button>
        </div>
      </div>
    </div>
  );
}

