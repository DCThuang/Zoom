'use client';

import { X } from 'lucide-react';
import { MapMarker } from '../types';

interface MapMarkersProps {
  markers: MapMarker[];
  onMarkerDragStart: (markerId: string, e: React.MouseEvent) => void;
  onRemoveMarker: (markerId: string) => void;
}

export default function MapMarkers({
  markers,
  onMarkerDragStart,
  onRemoveMarker
}: MapMarkersProps) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {markers.map(marker => {
        // 根据文字长度决定形状：2字以内用圆形，超过用长方形
        const isLongText = marker.text.length > 2;
        const displayText = isLongText ? marker.text : marker.text.slice(0, 2);
        
        return (
          <div
            key={marker.id}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMarkerDragStart(marker.id, e);
            }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 border-2 shadow-lg cursor-grab active:cursor-grabbing pointer-events-auto flex items-center justify-center text-[10px] font-bold transition-transform hover:scale-110 group ${
              isLongText 
                ? 'h-6 px-2 rounded-lg min-w-[32px]' 
                : 'w-8 h-8 rounded-full'
            }`}
            style={{ 
              left: `${marker.x}%`, 
              top: `${marker.y}%`, 
              backgroundColor: marker.color,
              borderColor: 'white'
            }}
            title={marker.text}
          >
            <span className="text-white drop-shadow-lg whitespace-nowrap">{displayText}</span>
            {/* 删除按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveMarker(marker.id);
              }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 hover:bg-red-500 rounded-full text-white text-[8px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <X size={10}/>
            </button>
          </div>
        );
      })}
    </div>
  );
}

