const defaultPlayerState = {
  money: 0,
  hp: 100, max_hp: 100,
  energy: 100, max_energy: 100,dexterity: 10,
  strength: 10, speed: 10, defense: 0,
  level: 1, exp: 0, max_exp: 100,
  job: null, 
  weapon: null, 
  accessory: null,
  armor: null,
  hunger: 100, max_hunger: 100,
  thirst: 100, max_thirst: 100,
  day: 1,
  time: 8,
  starvation_hours: 0,
  dehydration_hours: 0,
  house: 'shack', 
  completed_courses: [], 
  last_tick: Date.now(),
  inventory: {},
  // ★ 新增：統計數據 (用來判斷成就)
  stats: {
      fights_won: 0,      // 戰鬥勝利次數
      crimes_success: 0,  // 犯罪成功次數
      times_worked: 0,    // 工作次數
      items_bought: 0,    // 購買物品次數
      money_earned: 0,    // 總賺取金錢 (累積)
      food_eaten: 0,      // 吃食物次數
      days_lived: 0       // 存活天數 (跟 day 連動)
  },
  achievements: []
};

const gameConfig = {
  tickRate: 1000,
  restCooldown: 5000,
  
  // ★ 新增：消耗設定
  workCost: 20,      // 工作消耗體力
  workTime: 4,       // 工作消耗時間 (小時)
  trainCost: 5,
  trainTime: 1,      // 訓練消耗時間 (小時)
  crimeCost: 10,     // 犯罪消耗體力 (依難度不同，此為基礎)
  crimeTime: 1,      // 犯罪消耗時間
  starvationLimit: 168, 
  dehydrationLimit: 72,
  // 每天結束時扣除的生存值
  dailyHungerDecay: 40, 
  dailyThirstDecay: 60 
};

const jobData = {
    'hobo': { 
        name: "流浪漢", salary: 20, 
        desc: "一無所有的開局，生活艱難，但適應力強。",
        startBonus: { money: 0, hp: 50, desc: "最大生命 +100 (命很硬)" }
    },
    'cleaner': { 
        name: "清潔工", salary: 60, 
        desc: "平凡的市民，有一點微薄的積蓄。",
        startBonus: { money: 500, desc: "獲得存款 $500" }
    },
    'thug': { 
        name: "街頭混混", salary: 50, 
        desc: "習慣用拳頭解決問題，力量較大。",
        startBonus: { str: 10, desc: "獲得力量 +10" }
    },
    'runner': { 
        name: "跑腿小弟", salary: 80, 
        desc: "動作靈活，擅長逃跑與閃避。",
        startBonus: { spd: 15, desc: "獲得速度 +15" }
    },
    'heir': { 
        name: "富二代", salary: 0, 
        desc: "家裡很有錢，但被斷絕關係了，這是最後的零用錢。完全沒有戰鬥力。",
        startBonus: { money: 2000, str: -10, desc: "獲得存款 $2000，但手無縛雞之力" }
    }
};
const houseData = {
    'shack': { 
        name: "廢棄木屋", cost: 0, restore: 10, 
        decayMult: 1.2, // ★ 新增：環境惡劣，消耗更快 (1.2倍)
        desc: "免費。環境髒亂，容易肚子餓。" 
    },
    'apartment': { 
        name: "老公寓", cost: 5000, restore: 30, 
        decayMult: 1.0, // ★ 標準消耗
        desc: "普通的家。有基本的廚房。" 
    },
    'penthouse': { 
        name: "豪華頂樓", cost: 50000, restore: 60, 
        decayMult: 0.8, // ★ 消耗打 8 折
        desc: "高級家電，食物保存良好。" 
    },
    'villa': { 
        name: "私人別墅", cost: 500000, restore: 100, 
        decayMult: 0.6, // ★ 消耗打 6 折
        desc: "有專屬廚師與管家，生活無憂。" 
    },
    'island': { 
        name: "私人島嶼", cost: 1000000000000, restore: 999999999, 
        decayMult: 0.1, // ★ 幾乎不消耗
        desc: "這裡就像天堂，不需要擔心凡人的問題。" 
    }
};
const eduData = {
    'gym_course': { 
        name: "運動科學證書", cost: 2000, energyCost: 50,
        desc: "學習正確發力。永久增加 10% 力量。",
        effect: (p) => { p.strength = Math.floor(p.strength * 1.1); }
    },
    'business_course': { 
        name: "商業管理學位", cost: 5000, energyCost: 50,
        desc: "學習談判技巧。所有商店商品打 9 折 (此功能需在購買邏輯實作，這裡先給屬性獎勵示意)。永久獲得 $1000 獎金。",
        effect: (p) => { p.money += 1000; } 
    },
    'biology_course': { 
        name: "人體解剖學", cost: 10000, energyCost: 100,
        desc: "了解人體弱點。永久增加 20 點速度與攻擊。",
        effect: (p) => { p.speed += 20; p.strength += 20; }
    },
    'combat_course': {
        name: "格鬥大師班", cost: 50000, energyCost: 200,
        desc: "傳說中的殺手訓練。全屬性提升 20%。",
        effect: (p) => { 
            p.strength = Math.floor(p.strength * 1.2);
            p.speed = Math.floor(p.speed * 1.2);
            p.max_hp = Math.floor(p.max_hp * 1.2);
        }
    }
};
const itemData = {
    // --- 武器 (category: weapon) ---
    'wooden_bat': { 
        name: "木製球棒", cost: 500, category: 'weapon', type: 'weapon', value: 10, 
        desc: "攻+10。雖然有點舊，但打人很痛。" 
    },
    'switchblade': { 
        name: "彈簧刀", cost: 2000, category: 'weapon', type: 'weapon', value: 35, 
        desc: "攻+35。街頭鬥毆的神器，出刀速度快。" 
    },
    'crowbar': { 
        name: "鐵撬", cost: 5000, category: 'weapon', type: 'weapon', value: 55, 
        desc: "攻+55。物理學聖劍，破壞力驚人。" 
    },
    'glock': { 
        name: "格洛克手槍", cost: 15000, category: 'weapon', type: 'weapon', value: 120, 
        desc: "攻+120。以前是不會輕易拿出來的。" 
    },
    'ak47': { 
        name: "AK-47", cost: 80000, category: 'weapon', type: 'weapon', value: 350, 
        desc: "攻+350。火力壓制，沒人敢靠近你。" 
    },

    // --- 防具 (category: armor) ★ 新增分類 ---
    'leather_jacket': { 
        name: "皮夾克", cost: 1000, category: 'armor', type: 'armor', value: 10, 
        desc: "防+10。多少能擋點刀傷，看起來也很酷。" 
    },
    'bulletproof_vest': { 
        name: "防彈背心", cost: 20000, category: 'armor', type: 'armor', value: 50, 
        desc: "防+50。警用規格，保命要緊。" 
    },

    // --- 醫療 (category: medical) ---
    'bandage': { 
        name: "繃帶", cost: 15, category: 'medical', type: 'hp', value: 30, 
        desc: "回復 30 生命。止血用，最基本的醫療品。" 
    },
    'first_aid_kit': { 
        name: "急救箱", cost: 300, category: 'medical', type: 'hp', value: 100, 
        desc: "回復 100 生命。內含各種緊急處理工具。" 
    },
    'morphine': { 
        name: "嗎啡", cost: 2000, category: 'medical', type: 'hp', value: 500, 
        desc: "回復 500 生命。戰場上救命用的強效藥。" 
    },

    // --- 食品/能量 (category: food) ---
    'bread': { 
        name: "乾麵包", cost: 10, category: 'food', type: 'hunger', value: 20, 
        desc: "雖然硬得像石頭，但還能果腹。" 
    },
    'hamburger': { 
        name: "雙層漢堡", cost: 80, category: 'food', type: 'hunger', value: 50, 
        desc: "熱量炸彈，美味又飽足 (飽食度+50)。" 
    },
    'steak': { 
        name: "發霉夜市牛排", cost: 120, category: 'food', type: 'hunger', value: 70, 
        desc: "牛排吃到飽 (飽食度全滿)。" 
    },

    // --- 飲料 (category: drink) - 原本 food 的飲料移過來 ---
    'water': { 
        name: "瓶裝水", cost: 5, category: 'drink', type: 'thirst', value: 30, 
        desc: "單純的水 (口渴度+30)。" 
    },
    'coffee': { 
        name: "黑咖啡", cost: 20, category: 'drink', type: 'thirst', value: 20, 
        desc: "提神醒腦，但也利尿 (口渴度+20, 體力+5)。", extraEffect: { energy: 5 }
    },
    'energy_drink': { 
        name: "蠻牛飲料", cost: 100, category: 'drink', type: 'energy', value: 15, 
        desc: "專補體力，對口渴幫助不大 (口渴+5, 體力+15)。", extraEffect: { thirst: 5 }
    },
    // --- 醫療 (medical) ---
    'bandage': { name: "繃帶", cost: 15, category: 'medical', type: 'hp', value: 30, desc: "回復 30 生命。" },
    //飾品
    'sneakers': { 
        name: "運動鞋", cost: 800, category: 'accessory', type: 'accessory', value: 10, 
        desc: "輕便好穿。靈敏度 +10 (提升逃跑機率)。" 
    },
    'running_shoes': { 
        name: "專業跑鞋", cost: 3000, category: 'accessory', type: 'accessory', value: 30, 
        desc: "抓地力極佳。靈敏度 +30。" 
    },
    'ninja_boots': { 
        name: "忍者足具", cost: 20000, category: 'accessory', type: 'accessory', value: 80, 
        desc: "走路無聲。靈敏度 +80 (想去哪就去哪)。" 
    },
    'lucky_charm': {
        name: "幸運符", cost: 5000, category: 'accessory', type: 'accessory', value: 5,
        desc: "雖不能跑更快，但心理感覺良好。靈敏度 +5。"
    }
};

const crimeData = {
    search_trash: { name: "翻垃圾桶", cost: 2, time: 1, successRate: 0.9, reward: 5, failMsg: "無收穫。" },
    shoplift: { name: "超商偷竊", cost: 5, time: 1, successRate: 0.6, reward: 50, failMsg: "被抓。" },
    rob_granny: { name: "搶劫老奶奶", cost: 15, time: 1, successRate: 0.3, reward: 200, failMsg: "失敗。" }
};

const enemyData = {
    'hobo': { 
        name: "流浪漢", hp: 30, str: 5, spd: 2, dex: 5, // 靈敏低，容易逃
        reward: 10, exp: 5, time: 1, desc: "看起來很好欺負。" 
    },
    'punk': { 
        name: "街頭混混", hp: 80, str: 15, spd: 10, dex: 20, 
        reward: 60, exp: 20, time: 2, desc: "拿著小刀揮舞。" 
    },
    'thug': { 
        name: "幫派打手", hp: 200, str: 40, spd: 25, dex: 50, // 靈敏高，難逃
        reward: 200, exp: 80, time: 3, desc: "受過格鬥訓練。" 
    },
    'boss': { 
        name: "區域角頭", hp: 1000, str: 150, spd: 100, dex: 150, // 極高，幾乎無法逃
        reward: 5000, exp: 500, time: 6, desc: "這片街區的老大。" 
    }
};
const achievementList = [
    // --- 財富類 (5) ---
    { id: 'money_1k', name: '第一桶金', desc: '持有 $1,000', check: p => p.money >= 1000 },
    { id: 'money_10k', name: '小資族', desc: '持有 $10,000', check: p => p.money >= 10000 },
    { id: 'money_100k', name: '中產階級', desc: '持有 $100,000', check: p => p.money >= 100000 },
    { id: 'money_1m', name: '百萬富翁', desc: '持有 $1,000,000', check: p => p.money >= 1000000 },
    { id: 'money_10m', name: '千萬富豪', desc: '持有 $10,000,000', check: p => p.money >= 10000000 },

    // --- 等級與屬性 (10) ---
    { id: 'lv_5', name: '初出茅廬', desc: '達到等級 5', check: p => p.level >= 5 },
    { id: 'lv_10', name: '街頭小有名氣', desc: '達到等級 10', check: p => p.level >= 10 },
    { id: 'lv_25', name: '區域強者', desc: '達到等級 25', check: p => p.level >= 25 },
    { id: 'lv_50', name: '傳說人物', desc: '達到等級 50', check: p => p.level >= 50 },
    { id: 'str_50', name: '大力士', desc: '力量達到 50', check: p => p.strength >= 50 },
    { id: 'str_200', name: '一拳超人', desc: '力量達到 200', check: p => p.strength >= 200 },
    { id: 'spd_50', name: '飛毛腿', desc: '速度達到 50', check: p => p.speed >= 50 },
    { id: 'spd_200', name: '閃電俠', desc: '速度達到 200', check: p => p.speed >= 200 },
    { id: 'def_50', name: '銅牆鐵壁', desc: '防禦力達到 50', check: p => (p.strength*0.5 + (p.armor ? itemData[p.armor].value : 0)) >= 50 },
    { id: 'balanced', name: '文武雙全', desc: '力量與速度都達到 100', check: p => p.strength >= 100 && p.speed >= 100 },

    // --- 戰鬥類 (5) ---
    { id: 'fight_1', name: '街頭霸王', desc: '贏得 1 場戰鬥', check: p => p.stats.fights_won >= 1 },
    { id: 'fight_10', name: '格鬥家', desc: '贏得 10 場戰鬥', check: p => p.stats.fights_won >= 10 },
    { id: 'fight_50', name: '戰神', desc: '贏得 50 場戰鬥', check: p => p.stats.fights_won >= 50 },
    { id: 'fight_100', name: '百人斬', desc: '贏得 100 場戰鬥', check: p => p.stats.fights_won >= 100 },
    { id: 'kill_boss', name: '新秩序', desc: '擊敗區域角頭 (Boss)', check: p => false /*需在戰鬥邏輯額外判斷*/ },

    // --- 犯罪類 (5) ---
    { id: 'crime_1', name: '手髒了', desc: '犯罪成功 1 次', check: p => p.stats.crimes_success >= 1 },
    { id: 'crime_10', name: '慣犯', desc: '犯罪成功 10 次', check: p => p.stats.crimes_success >= 10 },
    { id: 'crime_50', name: '通緝犯', desc: '犯罪成功 50 次', check: p => p.stats.crimes_success >= 50 },
    { id: 'crime_100', name: '犯罪首腦', desc: '犯罪成功 100 次', check: p => p.stats.crimes_success >= 100 },
    { id: 'master_thief', name: '神偷', desc: '成功搶劫老奶奶而不被抓', check: p => false /* 特殊觸發 */ },

    // --- 工作類 (5) ---
    { id: 'work_1', name: '打工仔', desc: '工作 1 次', check: p => p.stats.times_worked >= 1 },
    { id: 'work_10', name: '社畜', desc: '工作 10 次', check: p => p.stats.times_worked >= 10 },
    { id: 'work_50', name: '模範員工', desc: '工作 50 次', check: p => p.stats.times_worked >= 50 },
    { id: 'work_100', name: '勞動楷模', desc: '工作 100 次', check: p => p.stats.times_worked >= 100 },
    { id: 'high_salary', name: '高薪一族', desc: '從事日薪 >= $80 的工作', check: p => jobData[p.job] && jobData[p.job].salary > 80 },

    // --- 生存與生活 (10) ---
    { id: 'survive_7', name: '倖存者', desc: '存活 7 天', check: p => p.day >= 7 },
    { id: 'survive_30', name: '老練生存者', desc: '存活 30 天', check: p => p.day >= 30 },
    { id: 'survive_100', name: '百日傳奇', desc: '存活 100 天', check: p => p.day >= 100 },
    { id: 'eat_10', name: '吃貨', desc: '吃下 10 個食物', check: p => p.stats.food_eaten >= 10 },
    { id: 'eat_50', name: '大胃王', desc: '吃下 50 個食物', check: p => p.stats.food_eaten >= 50 },
    { id: 'house_apt', name: '有家可歸', desc: '搬進老公寓', check: p => p.house === 'apartment' },
    { id: 'house_pen', name: '人生勝利組', desc: '搬進豪華頂樓', check: p => p.house === 'penthouse' },
    { id: 'house_vil', name: '豪宅主人', desc: '搬進私人別墅', check: p => p.house === 'villa' },
    { id: 'house_isl', name: '島主', desc: '搬進私人島嶼', check: p => p.house === 'island' },
    { id: 'full_gear', name: '全副武裝', desc: '同時裝備武器和防具', check: p => p.weapon && p.armor },

    // --- 消費與其他 (10) ---
    { id: 'shop_1', name: '消費者', desc: '購買 1 次物品', check: p => p.stats.items_bought >= 1 },
    { id: 'shop_50', name: '購物狂', desc: '購買 50 次物品', check: p => p.stats.items_bought >= 50 },
    { id: 'edu_1', name: '好學', desc: '完成 1 門課程', check: p => p.completed_courses.length >= 1 },
    { id: 'edu_3', name: '學霸', desc: '完成 3 門課程', check: p => p.completed_courses.length >= 3 },
    { id: 'weapon_master', name: '武器大師', desc: '擁有 AK-47', check: p => p.inventory['ak47'] > 0 || p.weapon === 'ak47' },
    { id: 'rich_kid', name: '含著金湯匙', desc: '選擇「富二代」開局', check: p => p.job === 'heir' },
    { id: 'tough_guy', name: '硬漢', desc: '選擇「流浪漢」開局', check: p => p.job === 'hobo' },
    { id: 'survive_danger', name: '命懸一線', desc: '在 HP < 5 的狀態下存活', check: p => p.hp > 0 && p.hp < 5 },
    { id: 'max_stats', name: '人類極限', desc: '飽食與口渴都維持 100', check: p => p.hunger >= 100 && p.thirst >= 100 },
    { id: 'endgame', name: '地下秩序', desc: '等級20 + 住別墅 + 持有AK47', check: p => p.level >= 20 && p.house === 'villa' && (p.weapon === 'ak47' || (p.inventory['ak47'] && p.inventory['ak47'] > 0)) }
];
let player = { ...defaultPlayerState };