/**
 * 获取卡牌的显示图片 URL
 * 优先使用缩略图（thumbUrl），如果没有则使用原图（imgUrl）
 */
export function getCardDisplayUrl(card: { imgUrl?: string; thumbUrl?: string; name?: string } | null | undefined): string {
  if (!card) return 'https://placehold.co/100/222/555?text=?';
  
  // 优先使用缩略图
  if (card.thumbUrl) {
    return card.thumbUrl;
  }
  
  // 回退到原图
  if (card.imgUrl) {
    return card.imgUrl;
  }
  
  // 使用占位图
  return `https://placehold.co/100/222/555?text=${card.name?.charAt(0) || '?'}`;
}

/**
 * 获取卡牌的原图 URL（用于双击放大查看）
 */
export function getCardFullUrl(card: { imgUrl?: string; thumbUrl?: string; name?: string } | null | undefined): string {
  if (!card) return 'https://placehold.co/400/222/555?text=?';
  
  // 使用原图
  if (card.imgUrl) {
    return card.imgUrl;
  }
  
  // 回退到缩略图
  if (card.thumbUrl) {
    return card.thumbUrl;
  }
  
  // 使用占位图
  return `https://placehold.co/400/222/555?text=${card.name || '?'}`;
}

