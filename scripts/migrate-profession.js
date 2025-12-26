/**
 * 一次性迁移脚本：将技能卡的 role 字段从角色名改为职业名
 * 
 * 使用方式：
 * node scripts/migrate-profession.js
 */

const { MongoClient } = require('mongodb');

// 远程数据库连接配置
const REMOTE_URI = 'mongodb://admin:d2bdagc8aq48ats015b0@23.94.136.150:27017/zoom_game?authSource=admin';

// 角色名到职业名的映射规则
// 规则：去掉"-男"、"-女"等后缀，提取职业名
function extractProfession(roleName) {
  if (!roleName) return null;
  
  // 手动定义一些特殊的映射（如果需要）
  const specialMappings = {
    // '某某角色': '某某职业',
  };
  
  if (specialMappings[roleName]) {
    return specialMappings[roleName];
  }
  
  // 通用规则：去掉 -男、-女、-M、-F 等后缀
  const suffixes = ['-男', '-女', '-M', '-F', '（男）', '（女）', '(男)', '(女)'];
  let profession = roleName;
  
  for (const suffix of suffixes) {
    if (profession.endsWith(suffix)) {
      profession = profession.slice(0, -suffix.length);
      break;
    }
  }
  
  return profession;
}

async function migrate() {
  console.log('========================================');
  console.log('开始迁移：技能卡 role 字段 → 职业名');
  console.log('========================================\n');
  
  const client = new MongoClient(REMOTE_URI);
  
  try {
    await client.connect();
    console.log('✅ 已连接到远程数据库\n');
    
    const db = client.db('zoom_game');
    const cardsCollection = db.collection('cards');
    
    // ==========================================
    // 第一步：获取所有玩家卡，建立角色名→职业名映射
    // ==========================================
    console.log('📋 第一步：分析玩家角色卡...');
    
    const playerCards = await cardsCollection.find({ type: 'PLAYER' }).toArray();
    console.log(`   找到 ${playerCards.length} 张玩家角色卡`);
    
    // 建立映射表
    const roleToProf = {};  // 角色名 → 职业名
    const professionGroups = {};  // 职业 → [角色名列表]
    
    for (const card of playerCards) {
      const profession = extractProfession(card.name);
      roleToProf[card.name] = profession;
      
      if (!professionGroups[profession]) {
        professionGroups[profession] = [];
      }
      professionGroups[profession].push(card.name);
    }
    
    console.log('\n   职业分组结果：');
    for (const [prof, roles] of Object.entries(professionGroups)) {
      console.log(`   - ${prof}: ${roles.join(', ')}`);
    }
    
    // ==========================================
    // 第二步：更新玩家卡的 profession 字段
    // ==========================================
    console.log('\n📝 第二步：更新玩家卡的 profession 字段...');
    
    let playerUpdatedCount = 0;
    for (const card of playerCards) {
      const profession = roleToProf[card.name];
      
      if (card.profession !== profession) {
        await cardsCollection.updateOne(
          { _id: card._id },
          { $set: { profession: profession } }
        );
        console.log(`   ✓ ${card.name} → profession: "${profession}"`);
        playerUpdatedCount++;
      } else {
        console.log(`   - ${card.name} 已有 profession: "${card.profession}" (跳过)`);
      }
    }
    console.log(`   共更新 ${playerUpdatedCount} 张玩家卡`);
    
    // ==========================================
    // 第三步：更新技能卡的 role 字段
    // ==========================================
    console.log('\n🔄 第三步：更新技能卡的 role 字段...');
    
    const skillCards = await cardsCollection.find({ type: 'SKILL' }).toArray();
    console.log(`   找到 ${skillCards.length} 张技能卡`);
    
    let skillUpdatedCount = 0;
    let skillSkippedCount = 0;
    
    for (const card of skillCards) {
      const oldRole = card.role;
      
      if (!oldRole) {
        console.log(`   ⚠ ${card.name} 没有 role 字段 (跳过)`);
        skillSkippedCount++;
        continue;
      }
      
      // 检查是否需要更新
      const newRole = roleToProf[oldRole] || extractProfession(oldRole);
      
      if (oldRole !== newRole) {
        await cardsCollection.updateOne(
          { _id: card._id },
          { $set: { role: newRole } }
        );
        console.log(`   ✓ ${card.name}: role "${oldRole}" → "${newRole}"`);
        skillUpdatedCount++;
      } else {
        console.log(`   - ${card.name}: role "${oldRole}" (无需更新)`);
        skillSkippedCount++;
      }
    }
    
    console.log(`   共更新 ${skillUpdatedCount} 张技能卡，跳过 ${skillSkippedCount} 张`);
    
    // ==========================================
    // 第四步：验证结果
    // ==========================================
    console.log('\n🔍 第四步：验证迁移结果...');
    
    // 验证玩家卡
    const playerCardsAfter = await cardsCollection.find({ type: 'PLAYER' }).toArray();
    const playersWithProfession = playerCardsAfter.filter(c => c.profession);
    console.log(`   玩家卡: ${playersWithProfession.length}/${playerCardsAfter.length} 张有 profession 字段`);
    
    // 验证技能卡
    const skillCardsAfter = await cardsCollection.find({ type: 'SKILL' }).toArray();
    const uniqueRoles = [...new Set(skillCardsAfter.map(c => c.role).filter(Boolean))];
    console.log(`   技能卡 role 值列表: ${uniqueRoles.join(', ') || '(空)'}`);
    
    // 检查技能卡的 role 是否都能匹配到职业
    const professionSet = new Set(Object.values(roleToProf));
    const unmatchedRoles = uniqueRoles.filter(r => !professionSet.has(r));
    
    if (unmatchedRoles.length > 0) {
      console.log(`   ⚠ 以下 role 值无法匹配到职业: ${unmatchedRoles.join(', ')}`);
    } else {
      console.log(`   ✅ 所有技能卡的 role 值都能匹配到职业`);
    }
    
    // ==========================================
    // 完成
    // ==========================================
    console.log('\n========================================');
    console.log('✅ 迁移完成！');
    console.log('========================================');
    console.log(`   - 玩家卡更新: ${playerUpdatedCount} 张`);
    console.log(`   - 技能卡更新: ${skillUpdatedCount} 张`);
    console.log('');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    await client.close();
    console.log('已断开数据库连接');
  }
}

// 运行迁移
migrate().catch(console.error);

