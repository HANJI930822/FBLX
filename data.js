const defaultPlayerState = {
  money: 0,
  hp: 100, max_hp: 100,
  energy: 100, max_energy: 100,
  strength: 10, speed: 10, defense: 0,
  level: 1, exp: 0, max_exp: 100,
  job: null, 
  weapon: null, 
  armor: null,
  hunger: 100, max_hunger: 100,
  thirst: 100, max_thirst: 100,
  day: 1,
  time: 8,
  house: 'shack', 
  completed_courses: [], 
  last_tick: Date.now(),
  inventory: {}
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
        desc: "雖然硬得像石頭，但能填飽肚子 (飽食度+20)。" 
    },
    'hamburger': { 
        name: "雙層漢堡", cost: 50, category: 'food', type: 'hunger', value: 50, 
        desc: "熱量炸彈，美味又飽足 (飽食度+50)。" 
    },
    'steak': { 
        name: "高級牛排", cost: 200, category: 'food', type: 'hunger', value: 100, 
        desc: "五星級享受 (飽食度全滿)。" 
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
};

const crimeData = {
    search_trash: { name: "翻垃圾桶", cost: 2, time: 1, successRate: 0.9, reward: 5, failMsg: "無收穫。" },
    shoplift: { name: "超商偷竊", cost: 5, time: 1, successRate: 0.6, reward: 50, failMsg: "被抓。" },
    rob_granny: { name: "搶劫老奶奶", cost: 15, time: 1, successRate: 0.3, reward: 200, failMsg: "失敗。" }
};

const enemyData = {
    'hobo': { 
        name: "流浪漢", hp: 30, str: 5, spd: 2, reward: 10, exp: 5, 
        time: 1, // ★ 新增：打他只需 1 小時
        desc: "看起來很好欺負。" 
    },
    'punk': { 
        name: "街頭混混", hp: 80, str: 15, spd: 10, reward: 60, exp: 20, 
        time: 2, // ★ 稍微花點時間
        desc: "拿著小刀揮舞。" 
    },
    'thug': { 
        name: "幫派打手", hp: 200, str: 40, spd: 25, reward: 200, exp: 80, 
        time: 3, // ★ 一場苦戰
        desc: "受過專業的格鬥訓練。" 
    },
    'boss': { 
        name: "區域角頭", hp: 1000, str: 150, spd: 100, reward: 5000, exp: 500, 
        time: 6, // ★ 打完天都黑了
        desc: "這片街區的老大。" 
    }
};

let player = { ...defaultPlayerState };