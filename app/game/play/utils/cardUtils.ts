import { ICard, Player, GameState } from '../types';

/**
 * 统一的卡牌弃牌处理
 * 根据卡牌类型决定弃牌去向：
 * - 资源牌：始终进入公共弃牌区
 * - 技能牌：根据 role 字段回到原拥有者的弃牌堆
 */
export interface DiscardResult {
  updatedPlayers: Player[];
  updatedGameState?: Partial<GameState>;
}

/**
 * 处理卡牌弃牌逻辑
 * @param card 要弃掉的卡牌
 * @param currentPlayerId 当前持有卡牌的玩家 ID
 * @param players 所有玩家列表
 * @param gameState 游戏状态
 * @returns 更新后的玩家列表和游戏状态
 */
export function processCardDiscard(
  card: ICard,
  currentPlayerId: string,
  players: Player[],
  gameState: GameState
): DiscardResult {
  const isResourceCard = card.type === 'RESOURCE';
  
  if (isResourceCard) {
    // 资源牌始终进入公共弃牌区
    return {
      updatedPlayers: players,
      updatedGameState: {
        publicDiscard: [card, ...gameState.publicDiscard]
      }
    };
  } else {
    // 技能牌：根据 role 字段找到原拥有者
    const originalOwner = card.role ? players.find(p => p.name === card.role) : null;
    const targetPlayerId = originalOwner ? originalOwner.id : currentPlayerId;
    
    // 技能牌进入原拥有者的弃牌堆
    const updatedPlayers = players.map(p => {
      if (p.id === targetPlayerId) {
        return { ...p, discard: [card, ...p.discard] };
      }
      return p;
    });
    
    return { updatedPlayers };
  }
}

/**
 * 处理技能牌打出后的弃牌逻辑（进入技能弃牌堆而非普通弃牌堆）
 */
export function processSkillCardPlay(
  card: ICard,
  currentPlayerId: string,
  players: Player[],
  gameState: GameState
): DiscardResult {
  const isResourceCard = card.type === 'RESOURCE';
  
  if (isResourceCard) {
    // 资源牌打出后进入公共弃牌区
    return {
      updatedPlayers: players,
      updatedGameState: {
        publicDiscard: [card, ...gameState.publicDiscard]
      }
    };
  } else {
    // 技能牌：打出后进入原拥有者的技能弃牌堆（可以重新洗入牌堆）
    const originalOwner = card.role ? players.find(p => p.name === card.role) : null;
    const targetPlayerId = originalOwner ? originalOwner.id : currentPlayerId;
    
    const updatedPlayers = players.map(p => {
      if (p.id === targetPlayerId) {
        return { ...p, skillDiscard: [card, ...(p.skillDiscard || [])] };
      }
      return p;
    });
    
    return { updatedPlayers };
  }
}

/**
 * 获取卡牌的原始拥有者
 */
export function getCardOwner(card: ICard, players: Player[]): Player | null {
  if (card.role) {
    return players.find(p => p.name === card.role) || null;
  }
  return null;
}

