const defaultPlayerState = {
  money: 100,
  hp: 100, max_hp: 100,
  energy: 100, max_energy: 100,
  nerve: 20, max_nerve: 20,
  strength: 10, speed: 10, defense: 0,
  level: 1, exp: 0, max_exp: 100,
  job: 'none', 
  weapon: null, 
  armor: null,
  last_tick: Date.now(),
  inventory: {}
};

const gameConfig = {
  tickRate: 1000,
  energyRecover: 1, nerveRecover: 1, hpRecover: 5, trainCost: 5,
  workCost: 10 // 工作消耗體力
};

const jobData = {
    'none': { name: "無業遊民", salary: 0, reqStr: 0, desc: "你沒有工作，靠撿垃圾維生。" },
    'cleaner': { name: "街道清潔工", salary: 50, reqStr: 10, desc: "掃掃地，雖然薪水低但很穩定。" },
    'bouncer': { name: "夜店保鑣", salary: 200, reqStr: 50, desc: "需要一點肌肉才能勝任的工作。" },
    'hitman': { name: "職業殺手", salary: 1000, reqStr: 200, desc: "高風險高報酬，只收菁英。" }
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
    'energy_drink': { 
        name: "蠻牛飲料", cost: 100, category: 'food', type: 'energy', value: 15, 
        desc: "回復 15 體力。喝了再上。" 
    },
    'protein_shake': { 
        name: "高蛋白粉", cost: 500, category: 'food', type: 'energy', value: 50, 
        desc: "回復 50 體力。健身完喝一杯，效果更好。" 
    },
    'hamburger': { 
        name: "雙層漢堡", cost: 50, category: 'food', type: 'energy', value: 10, 
        desc: "回復 10 體力。熱量炸彈，但很好吃。" 
    },

    // --- 雜項/酒類 (category: misc) ---
    'small_beer': { 
        name: "廉價啤酒", cost: 30, category: 'misc', type: 'nerve', value: 5, 
        desc: "回復 5 勇氣。味道像尿，但能壯膽。" 
    },
    'whisky': { 
        name: "威士忌", cost: 500, category: 'misc', type: 'nerve', value: 25, 
        desc: "回復 25 勇氣。烈酒入喉，無所畏懼。" 
    }
};

const crimeData = {
  search_trash: { name: "翻垃圾桶", cost: 2, successRate: 0.9, reward: 5, failMsg: "只找到垃圾。" },
  shoplift: { name: "超商偷竊", cost: 4, successRate: 0.6, reward: 50, failMsg: "被店員趕出去了！" },
  rob_granny: { name: "搶劫老奶奶", cost: 10, successRate: 0.3, reward: 200, failMsg: "被老奶奶反殺！" }
};

const enemyData = {
    'hobo': { name: "流浪漢", hp: 30, str: 5, spd: 2, reward: 10, exp: 5, desc: "看起來很好欺負。" },
    'punk': { name: "街頭混混", hp: 80, str: 15, spd: 10, reward: 60, exp: 20, desc: "拿著小刀揮舞。" },
    'thug': { name: "幫派打手", hp: 200, str: 40, spd: 25, reward: 200, exp: 80, desc: "受過格鬥訓練。" },
    'boss': { name: "區域角頭", hp: 1000, str: 150, spd: 100, reward: 5000, exp: 500, desc: "這區的老大。" }
};

let player = { ...defaultPlayerState };