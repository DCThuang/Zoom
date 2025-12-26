'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Player, GameState, PlayedCard } from '../types';

interface SyncData {
  players: Player[];
  gameState: Partial<GameState>;
  activeEnemies?: any[];
}

interface UseGameSyncOptions {
  sessionId: string | null;
  onSync: (data: SyncData) => void;
  onPlayedCard?: (playedCard: PlayedCard) => void;
  clientId?: string;
}

interface UseGameSyncReturn {
  isConnected: boolean;
  isReconnecting: boolean;
  sendSync: (data: SyncData) => void;
  sendPlayedCard: (playedCard: PlayedCard) => void;
}

export function useGameSync({
  sessionId,
  onSync,
  onPlayedCard,
  clientId = 'main'
}: UseGameSyncOptions): UseGameSyncReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  // 使用 ref 存储回调，避免依赖变化导致重连
  const onSyncRef = useRef(onSync);
  const onPlayedCardRef = useRef(onPlayedCard);
  const clientIdRef = useRef(clientId);
  
  // 更新 ref 值
  useEffect(() => {
    onSyncRef.current = onSync;
    onPlayedCardRef.current = onPlayedCard;
    clientIdRef.current = clientId;
  }, [onSync, onPlayedCard, clientId]);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000; // 1秒
  const maxReconnectDelay = 30000; // 最大30秒

  // 计算重连延迟（指数退避）
  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
      maxReconnectDelay
    );
    return delay;
  }, []);

  // 连接 WebSocket - 只依赖 sessionId
  const connect = useCallback(() => {
    if (!sessionId) return;
    
    // 如果已经有连接且是打开状态，不重复连接
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }
    
    // 清理旧连接
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // 构建 WebSocket URL - 使用独立的 WebSocket 端口
    const isSecure = window.location.protocol === 'https:';
    const protocol = isSecure ? 'wss' : 'ws';
    const host = window.location.hostname;
    // WebSocket 使用独立端口 3001（开发）或环境变量指定的端口
    const wsPort = isSecure ? '443' : '3001';
    const wsUrl = `${protocol}://${host}:${wsPort}?sessionId=${sessionId}`;
    
    console.log(`[WebSocket] Connecting to ${wsUrl}...`);
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        setIsReconnecting(false);
        reconnectAttemptsRef.current = 0;

        // 启动心跳
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // 每30秒发送心跳
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'connected':
              console.log('[WebSocket] Session joined:', message.sessionId);
              break;
              
            case 'sync':
              // 忽略自己发送的消息
              if (message.from !== clientIdRef.current) {
                console.log('[WebSocket] Received sync from:', message.from);
                onSyncRef.current(message.data);
              }
              break;
              
            case 'played_card':
              if (onPlayedCardRef.current) {
                onPlayedCardRef.current(message.data);
              }
              break;
              
            case 'pong':
              // 心跳响应，不做处理
              break;
              
            default:
              console.log('[WebSocket] Unknown message type:', message.type);
          }
        } catch (err) {
          console.error('[WebSocket] Error parsing message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;
        
        // 清理心跳
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // 只有非正常关闭才重连（code 1000 是正常关闭）
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = getReconnectDelay();
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          setIsReconnecting(true);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.log('[WebSocket] Max reconnect attempts reached');
          setIsReconnecting(false);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };
    } catch (err) {
      console.error('[WebSocket] Failed to create connection:', err);
      // 尝试重连
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = getReconnectDelay();
        setIsReconnecting(true);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++;
          connect();
        }, delay);
      }
    }
  }, [sessionId, getReconnectDelay]); // 只依赖 sessionId 和 getReconnectDelay

  // 发送同步数据
  const sendSync = useCallback((data: SyncData) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'sync',
        data,
        from: clientIdRef.current
      }));
    }
  }, []);

  // 发送打出卡牌消息
  const sendPlayedCard = useCallback((playedCard: PlayedCard) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'played_card',
        data: playedCard
      }));
    }
  }, []);

  // 初始化连接 - 只在 sessionId 变化时重新连接
  useEffect(() => {
    if (sessionId) {
      connect();
    }

    return () => {
      // 清理
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
    };
  }, [sessionId, connect]);

  return {
    isConnected,
    isReconnecting,
    sendSync,
    sendPlayedCard
  };
}
