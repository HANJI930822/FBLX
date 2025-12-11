const defaultPlayerState = {
  money: 0,
  hp: 100, max_hp: 100,
  energy: 100, max_energy: 100,dexterity: 10,
  strength: 10, speed: 10, defense: 0,
  level: 1, exp: 0, max_exp: 100,
  job: null, 
  weather: 'sunny',
  weapon: null, 
  waapon_dura: 0,
  accessory: null,
  armor_dura: 0,
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
  enemyLevels: {},
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
    // ★ 新增：動態目標系統
    daily_challenges: [],        // 今日挑戰（3個ID）
    daily_progress: {            // 今日進度追蹤
        train_count: 0,
        work_count: 0,
        fights_won: 0,
        crimes_count: 0,
        food_eaten: 0,
        items_bought: 0
    },
    daily_completed: [],         // 今日已完成的挑戰ID
    last_daily_reset: 1,         // 上次重置每日挑戰的日期
    
    main_quests_completed: [],   // 已完成的主線任務ID
    
    achievement_points: 0,       // 成就點數
    ach_shop_purchased: [],      // 已購買的成就商店物品
    perm_buffs: {},              // 永久Buff
    title: null,                 // 當前稱號
    
    stats: { /* ... */ },
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
  dailyHungerDecay: 0, 
  dailyThirstDecay: 0 
};

const jobData = {
    // --- 生存系 ---
    'hobo': { 
        name: "流浪漢", salary: 20, 
        desc: "命比蟑螂還硬。雖然身無分文，但生存能力極強。",
        startBonus: { 
            money: 0, 
            max_hp: 100, // 血量翻倍
            salary_growth: 10,
            defense: 5,  // 皮糙肉厚
            speed: -5,   // 長期營養不良，跑不快
            desc: "最大生命+100, 防禦+5, 速度-5" 
        }
    },
    'survivor': { // 新增：野外求生專家
        name: "拾荒者", salary: 40,
        desc: "習慣在惡劣環境尋找物資，對飢餓忍耐度高。",
        startBonus: {
            max_hunger: 50, // 飢餓上限提升
            max_thirst: 50, // 口渴上限提升
            salary_growth: 15,
            dexterity: 10,  // 翻找東西很靈活
            money: 100,
            desc: "飢餓/口渴上限+50, 靈巧+10, 存款$100"
        }
    },

    // --- 平民系 ---
    'cleaner': { 
        name: "清潔工", salary: 60, 
        desc: "每天勞動讓他保持著還不錯的體能，積蓄普通。",
        startBonus: { 
            money: 800, 
            strength: 5, 
            speed: 5, 
            salary_growth: 15,
            max_energy: 20, // 體力較好
            desc: "存款$800, 全屬性微幅提升, 體力上限+20" 
        }
    },
    'office_worker': { // 新增：社畜
        name: "上班族", salary: 100,
        desc: "長期坐辦公室，有錢但身體僵硬。",
        startBonus: {
            money: 2000,
            strength: -5,
            dexterity: -5,
            salary_growth: 20,
            max_energy: -20, // 容易累
            desc: "存款$2000, 力量-5, 靈巧-5, 體力上限-20"
        }
    },

    // --- 戰鬥系 ---
    'thug': { 
        name: "街頭混混", salary: 50, 
        desc: "街頭鬥毆的常勝軍，下手不知輕重。",
        startBonus: { 
            strength: 25, 
            defense: 5,
            dexterity: -10, // 動作大開大闔，不靈活
            salary_growth: 30,
            weapon: 'wooden_bat',
            desc: "力量+25, 防禦+5, 靈巧-10, 自帶球棒" 
        }
    },
    'bouncer': { 
        name: "夜店保鑣", salary: 90, 
        desc: "像一堵牆一樣擋在門口。極度耐打，但移動緩慢。",
        startBonus: { 
            max_hp: 150, 
            defense: 15, 
            strength: 10, 
            salary_growth: 30,
            speed: -15, // 非常慢
            desc: "最大生命+150, 防禦+15, 速度-15" 
        }
    },
    'hitman': { 
        name: "職業殺手", salary: 60, 
        desc: "追求一擊必殺的藝術，攻守極端。",
        startBonus: { 
            strength: 20, 
            speed: 20, 
            dexterity: 20,
            max_hp: -30, // 身體素質其實一般，被打很痛
            salary_growth: 60,
            defense: -5,
            weapon: 'switchblade',
            desc: "攻/速/靈+20, 最大生命-30, 自帶彈簧刀" 
        }
    },

    // --- 特殊系 ---
    'runner': { 
        name: "跑腿小弟", salary: 80, 
        desc: "逃跑是他的強項，沒人抓得住他。",
        startBonus: { 
            speed: 40, 
            dexterity: 20, 
            salary_growth: 5,
            strength: -10, // 手無縛雞之力
            accessory: 'sneakers', // 自帶鞋子
            desc: "速度+40, 靈巧+20, 力量-10, 自帶運動鞋" 
        }
    },
    'heir': { 
        name: "富二代", salary: 0, 
        desc: "含著金湯匙出生，但被斷絕了關係。身體素質極差。",
        startBonus: { 
            money: 5000, 
            strength: -10, 
            salary_growth: 0,
            speed: -10, 
            max_hp: -20, 
            defense: -5,
            desc: "存款$5000，但是一條弱雞" 
        }
    },
    'quack_doc': { 
        name: "地下密醫", salary: 150, 
        desc: "手很巧，隨身帶著藥品，但身體虛弱。",
        startBonus: { 
            dexterity: 30, // 手術快
            strength: -5,
            max_hp: -40, 
            salary_growth: 150,
            inventory: { 'first_aid_kit': 1, 'morphine': 1 }, // 攜帶多種物品
            desc: "靈巧+30, 自帶急救箱與嗎啡，長期的壓力讓他很脆弱" 
        }
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
    // --- 武器 (Weapon) ---
    // 從破爛到神器的進化史
    'brick': { 
        name: "紅磚頭", max_dura: 20,cost: 50, category: 'weapon', type: 'weapon', value: 8, 
        desc: "攻+8。隨手可得的溝通工具，丟出去還能撿回來。" 
    },
    'switchblade': { 
        name: "彈簧刀",
        max_dura: 70, 
        cost: 350, 
        category: 'weapon', 
        type: 'weapon', 
        value: 18, 
        desc: "攻+18。收納方便，彈出刀刃的聲音很嚇人。是許多剛入行殺手的最愛。" 
    },
    'brass_knuckles': { 
        name: "指虎", cost: 250,max_dura: 50, category: 'weapon', type: 'weapon', value: 12, 
        desc: "攻+12。近距離交流情感的最佳工具，方便攜帶。" 
    },
    'police_baton': { 
        name: "警棍", cost: 1500, max_dura: 100,category: 'weapon', type: 'weapon', value: 35, 
        desc: "攻+35。雖然是撿來的，但硬度保證，打在骨頭上的聲音很清脆。" 
    },
    'chainsaw': { 
        name: "燃油電鋸", cost: 4500,max_dura: 150, category: 'weapon', type: 'weapon', value: 60, 
        desc: "攻+60。雖然很重且聲音很大，但威嚇力滿點。德州特產。" 
    },
    'katana': { 
        name: "武士刀", cost: 12000, max_dura: 250,category: 'weapon', type: 'weapon', value: 90, 
        desc: "攻+90。鋒利無比，切子彈是誇張了點，但切西瓜絕對沒問題。" 
    },
    'rpg_launcher': { 
        name: "RPG火箭筒", cost: 250000,max_dura: 1, category: 'weapon', type: 'weapon', value: 500, 
        desc: "攻+500。一發入魂。對付單個敵人有點浪費，但爽度無價。" 
    },
    'laser_sword': { 
        name: "光劍玩具(改)", cost: 500000,max_dura: 500, category: 'weapon', type: 'weapon', value: 800, 
        desc: "攻+800。經過瘋狂科學家改裝的高能雷射束，這已經不是玩具了。" 
    },
    'wooden_bat': { 
        name: "木製球棒", cost: 500,max_dura: 40, category: 'weapon', type: 'weapon', value: 15, 
        desc: "攻+15。雖然有點舊，但用來講道理很有效。" 
    },
    'folding_chair': { 
        name: "好折凳", cost: 1200,max_dura: 80, category: 'weapon', type: 'weapon', value: 30, 
        desc: "攻+30。七大武器之首！隱藏殺氣於無形，坐著也能殺人。" 
    },
    'keyboard': { 
        name: "機械式鍵盤", cost: 2500,max_dura: 30, category: 'weapon', type: 'weapon', value: 45, 
        desc: "攻+45。鍵盤俠專用神器，兼具物理攻擊與精神傷害。" 
    },
    'crowbar': { 
        name: "物理學聖劍", cost: 6000,max_dura: 170, category: 'weapon', type: 'weapon', value: 65, 
        desc: "攻+65。理論上可以撬開任何東西，包括敵人的腦袋。" 
    },
    'nokia_3310': { 
        name: "Nokia 3310", cost: 15000,max_dura: 1500, category: 'weapon', type: 'weapon', value: 100, 
        desc: "攻+100。上古文明遺留的神器，據說連核彈都炸不壞。" 
    },
    'ak47': { 
        name: "AK-47", cost: 80000,max_dura: 800, category: 'weapon', type: 'weapon', value: 350, 
        desc: "攻+350。這才叫火力壓制。鄰居這下會安靜了。" 
    },

    // --- 防具 (Armor) ---
    // 充滿生活智慧的防禦
    'cardboard_box': { 
        name: "紙箱", cost: 100,max_dura: 15, category: 'armor', type: 'armor', value: 2, 
        desc: "防+2。雖然擋不住子彈，但躲在裡面很有安全感 (Snake? Snake!)。" 
    },
    'pot_lid': { 
        name: "不鏽鋼鍋蓋",max_dura: 40, cost: 800, category: 'armor', type: 'armor', value: 15, 
        desc: "防+15。低配版美國隊長盾牌，炒菜擋刀兩相宜。" 
    },
    'leather_jacket': { 
        name: "皮夾克", max_dura: 20,cost: 500, category: 'armor', type: 'armor', value: 10, 
        desc: "防+10。擋不住刀槍，但防風防刮，重點是穿起來很帥。" 
    },
    'riot_shield': { 
        name: "鎮暴盾牌",max_dura: 100, cost: 8000, category: 'armor', type: 'armor', value: 50, 
        desc: "防+50。透明聚碳酸酯製成，給你滿滿的安全感。" 
    },
    'military_vest': { 
        name: "特種戰術背心",max_dura: 200, cost: 35000, category: 'armor', type: 'armor', value: 75, 
        desc: "防+75。多口袋設計，內嵌陶瓷防彈板，職業傭兵的首選。" 
    },
    'nano_suit': { 
        name: "奈米生化裝", max_dura: 500,cost: 150000, category: 'armor', type: 'armor', value: 150, 
        desc: "防+150。來自未來的黑科技，受損會自動修復（指衣服，不是你）。" 
    },
    'bubble_wrap': { 
        name: "氣泡紙套裝", cost: 2000, max_dura: 30,category: 'armor', type: 'armor', value: 25, 
        desc: "防+25。被打的時候會發出「波波波」的聲音，極度舒壓。" 
    },
    'motorcycle_helmet': { 
        name: "全罩安全帽", cost: 5000,max_dura: 80, category: 'armor', type: 'armor', value: 40, 
        desc: "防+40。防禦力不錯，重點是沒人認得出你是誰。" 
    },
    'bulletproof_vest': { 
        name: "防彈背心", cost: 20000,max_dura: 200, category: 'armor', type: 'armor', value: 60, 
        desc: "防+60。雖然很重且不透氣，但總比身上多幾個洞好。" 
    },
    'iron_man_suit': { // Cosplay 用
        name: "鋼鐵人皮套", cost: 50000, max_dura: 100,category: 'armor', type: 'armor', value: 90, 
        desc: "防+90。其實只是高品質 Cosplay 道具，但嚇唬人很有效。" 
    },

    // --- 飾品 (Accessory) ---
    // 增加各種玄學屬性
    'tinfoil_hat': {
        name: "錫箔帽", cost: 50, category: 'accessory', type: 'accessory', value: 1,
        desc: "靈+1。防止政府與外星人讀取你的腦波。智商看起來-50。"
    },
    'sunglasses': { 
        name: "墨鏡", cost: 200, category: 'accessory', type: 'accessory', value: 3, 
        desc: "靈+3。戴上後夜晚視線變差，但帥氣度提升，閃避率似乎高了一點點？" 
    },
    'lucky_charm': { 
        name: "開運御守", cost: 888, category: 'accessory', type: 'accessory', value: 10, 
        desc: "靈+10。來自遙遠東方的神祕力量，據說能逢凶化吉。" 
    },
    'smart_watch': { 
        name: "戰術手錶", cost: 8000, category: 'accessory', type: 'accessory', value: 40, 
        desc: "靈+40。內建心率監測與敵情分析雷達（其實只是普通的GPS）。" 
    },
    'cyber_eye': { 
        name: "義眼", cost: 60000, category: 'accessory', type: 'accessory', value: 100, 
        desc: "靈+100。動態視力強化，敵人的動作在你眼中像慢動作重播。" 
    },
    'gold_chain_fake': { 
        name: "粗金項鍊(鍍金)", cost: 300, category: 'accessory', type: 'accessory', value: 5, 
        desc: "靈+5。戴上去像個大哥。流汗時脖子會黑一圈。" 
    },
    'slippers': { 
        name: "藍白拖", cost: 1000, category: 'accessory', type: 'accessory', value: 15, 
        desc: "靈+15。台灣傳奇裝備，既能跑步又能打蟑螂。" 
    },
    'sneakers': { 
        name: "運動鞋", cost: 3000, category: 'accessory', type: 'accessory', value: 25, 
        desc: "靈+25。至少逃跑時腳不會痛。" 
    },
    'ninja_boots': { 
        name: "忍者足具", cost: 20000, category: 'accessory', type: 'accessory', value: 80, 
        desc: "靈+80。走路無聲，想去哪就去哪，偷情...我是說偷襲必備。" 
    },

    // --- 醫療 (Medical) ---
    'ok_band': { 
        name: "卡通OK繃", cost: 20, category: 'medical', type: 'hp', value: 10, 
        desc: "回血+10。上面印著佩佩豬，心靈層面的安慰大於實際療效。" 
    },
    'bandage': { 
        name: "繃帶", cost: 50, category: 'medical', type: 'hp', value: 30, 
        desc: "回血+30。止血基本款。" 
    },
    'grandma_ointment': { 
        name: "阿嬤的藥膏", cost: 500, category: 'medical', type: 'hp', value: 100, 
        desc: "回血+100。綠色罐裝，據說從蚊蟲叮咬到刀槍傷都能治的萬能神藥。" 
    },
    'first_aid_kit': { 
        name: "急救箱", cost: 1500, category: 'medical', type: 'hp', value: 300, 
        desc: "回血+300。專業人士的工具。" 
    },
    'morphine': { 
        name: "嗎啡", cost: 5000, category: 'medical', type: 'hp', value: 600, 
        desc: "回血+600。打下去就感覺不到痛了，不管是肉體還是心靈。" 
    },
    'stimulant': { 
        name: "腎上腺素針", cost: 1000, category: 'medical', type: 'energy', value: 100, 
        desc: "體力+100, HP-10。透支身體極限，瞬間恢復滿體力，副作用是心悸。",
        extraEffect: { hp: -10 }
    },
    'nano_bot_injection': { 
        name: "奈米修復液", cost: 20000, category: 'medical', type: 'hp', value: 2000, 
        desc: "回血+2000。將數百萬個微型機器人注入體內修復組織，只要沒斷頭都能救。" 
    },

    // --- 食物 (Food) ---
    // 有風險的食物
    'expired_bread': { 
        name: "過期麵包", cost: 5, category: 'food', type: 'hunger', value: 15, 
        desc: "飽食+15, HP-2。有點發霉，把綠色的部分剝掉應該還能吃...吧？",
        extraEffect: { hp: -2 } 
    },
    'instant_noodles': { 
        name: "科學麵", cost: 15, category: 'food', type: 'hunger', value: 20, 
        desc: "飽食+20。捏碎乾吃才是真理，不要泡水！" 
    },
    'bento_discount': { 
        name: "乞丐超人便當", cost: 40, category: 'food', type: 'hunger', value: 60, 
        desc: "飽食+60, HP-5。貼了「六五折」貼紙的微波便當，吃了肚子會痛。",
        extraEffect: { hp: -5 }
    },
    'stinky_tofu': { 
        name: "深坑臭豆腐", cost: 80, category: 'food', type: 'hunger', value: 50, 
        desc: "飽食+50。吃完方圓十里沒人敢靠近你。",
        extraEffect: { hp: 5 } // 吃好料補點血
    },
    'steak': { 
        name: "高級牛排", cost: 500, category: 'food', type: 'hunger', value: 100, 
        desc: "飽食+100, 心靈滿足。五星級享受，吃完覺得人生充滿希望。" 
    },
    'protein_bar': { 
        name: "高蛋白棒", cost: 40, category: 'food', type: 'hunger', value: 30, 
        desc: "飽食+30, 體力+5。口感像嚼蠟，但對肌肉修復很有幫助。",
        extraEffect: { energy: 5 }
    },
    'mre_ration': { 
        name: "軍用口糧(MRE)", cost: 200, category: 'food', type: 'hunger', value: 100, 
        desc: "飽食+100, 體力+20。熱量炸彈，吃一包可以撐一整天。",
        extraEffect: { energy: 20 }
    },
    'espresso_double': { 
        name: "雙倍濃縮咖啡", cost: 50, category: 'drink', type: 'energy', value: 20, 
        desc: "體力+20, 口渴+10。苦到讓你懷疑人生，但精神馬上就來了。",
        extraEffect: { thirst: 10 }
    },
    'whiskey': { 
        name: "純麥威士忌", cost: 300, category: 'drink', type: 'thirst', value: 20, 
        desc: "口渴+20, 體力-10, HP+20。烈酒消毒，喝了就不痛了。",
        extraEffect: { energy: -10, hp: 20 }
    },
    // --- 飲料 (Drink) ---
    'tap_water': { 
        name: "公園水龍頭", cost: 0, category: 'drink', type: 'thirst', value: 10, 
        desc: "口渴+10, HP-1。免費，但有點鐵鏽味，喝多了可能會生病。",
        extraEffect: { hp: -1 } // 模擬不乾淨的水
    },
    'water': { 
        name: "瓶裝水", cost: 10, category: 'drink', type: 'thirst', value: 30, 
        desc: "口渴+30。就是水。平凡無奇。" 
    },
    'bubble_tea': { 
        name: "全糖珍奶", cost: 60, category: 'drink', type: 'thirst', value: 40, 
        desc: "口渴+40, 體力+10。台灣人的生命之水，喝了血糖飆升，戰鬥力爆表。",
        extraEffect: { energy: 10 }
    },
    'energy_drink': { 
        name: "保力達B", cost: 80, category: 'drink', type: 'energy', value: 30, 
        desc: "體力+30, 口渴+10。明天的氣力，今天給你傳便便。",
        extraEffect: { thirst: 10 }
    },
    'beer': { 
        name: "台啤", cost: 40, category: 'drink', type: 'thirst', value: 20, 
        desc: "口渴+20, 體力-5。喝了會茫，但心情會變好。",
        extraEffect: { energy: -5 }
    },

    // --- 雜項 (Misc) ---
    // 這裡可以放一些特殊道具，雖然目前沒實裝功能，但買了看了開心
    'lottery_ticket': { 
        name: "大樂透彩券", cost: 50, category: 'misc', type: 'none', value: 0, 
        desc: "一張廢紙。我是說，一個致富的夢想。" 
    },
    'magazine': {
        name: "成人雜誌", cost: 200, category: 'misc', type: 'energy', value: 5,
        desc: "體力+5。封面很精彩。看完精神百倍？"
    },
    'dirty_coin': {
    name: '髒硬幣',
    cost: 0,
    sell_price: 5,
    category: 'loot',
    type: 'sellable',
    desc: '售價 $5。沾滿污垢的硬幣，但還能用。'
},
'gold_bar': {
        name: '金條',
        cost: 0,
        sell_price: 5000,
        category: 'loot',
        type: 'sellable',
        desc: '售價 $5,000。沈甸甸的黃金，硬通貨。'
    },
    'secret_files': {
        name: '機密硬碟',
        cost: 0,
        sell_price: 2000,
        category: 'loot',
        type: 'sellable',
        desc: '售價 $2,000。裡面存著市長的性醜聞照片，報社很樂意收購。'
    },
    'diamond': {
        name: '血鑽石',
        cost: 0,
        sell_price: 15000,
        category: 'loot',
        type: 'sellable',
        desc: '售價 $15,000。極度稀有，沾滿了鮮血與貪婪。'
    },
    'guitar': { 
        name: "吉他", cost: 3000, category: 'misc', type: 'none', value: 0, 
        desc: "一把舊吉他。雖然你不會彈，但在街頭背著它感覺像個流浪藝術家。" 
    },
'stolen_wallet': {
    name: '贓物錢包',
    cost: 0,
    sell_price: 50,
    category: 'loot',
    type: 'sellable',
    desc: '售價 $50。別人的錢包，最好趕快脫手。'
},

'cheap_watch': {
    name: '廉價手錶',
    cost: 0,
    sell_price: 80,
    category: 'loot',
    type: 'sellable',
    desc: '售價 $80。山寨手錶，騙騙外行人。'
},

'cigarette_pack': {
    name: '香菸盒',
    cost: 0,
    sell_price: 30,
    category: 'loot',
    type: 'sellable',
    desc: '售價 $30。半包菸，有人會買。'
},

'dog_tag': {
    name: '狗牌',
    cost: 0,
    sell_price: 10,
    category: 'loot',
    type: 'sellable',
    desc: '售價 $10。流浪狗的項圈牌，收藏家可能有興趣。'
},

'drugs': {
    name: '違禁品',
    cost: 0,
    sell_price: 200,
    category: 'loot',
    type: 'sellable',
    desc: '售價 $200。非法物品，黑市很搶手。'
},

'dirty_money': {
    name: '黑錢',
    cost: 0,
    sell_price: 150,
    category: 'loot',
    type: 'sellable',
    desc: '售價 $150。來路不明的現金。'
},

'gang_badge': {
    name: '幫派徽章',
    cost: 0,
    sell_price: 100,
    category: 'loot',
    type: 'sellable',
    desc: '售價 $100。黑幫的身份象徵。'
},

'silencer': {
    name: '消音器',
    cost: 0,
    sell_price: 500,
    category: 'loot',
    type: 'sellable',
    desc: '售價 $500。專業殺手用的裝備。'
},

'blood_contract': {
    name: '血契',
    cost: 0,
    sell_price: 300,
    category: 'loot',
    type: 'sellable',
    desc: '售價 $300。寫著目標名字的暗殺契約。'
},

'police_badge': {
    name: '警徽',
    cost: 0,
    sell_price: 400,
    category: 'loot',
    type: 'sellable',
    desc: '售價 $400。真的警徽，很危險但很值錢。'
},

'handcuffs': {
    name: '手銬',
    cost: 0,
    sell_price: 80,
    category: 'loot',
    type: 'sellable',
    desc: '售價 $80。制式警用手銬。'
},

'confiscated_goods': {
    name: '沒收物品',
    cost: 0,
    sell_price: 250,
    category: 'loot',
    type: 'sellable',
    desc: '售價 $250。警察扣押的贓物。'
},

'gold_ring': {
    name: '金戒指',
    cost: 0,
    sell_price: 800,
    category: 'loot',
    type: 'sellable',
    desc: '售價 $800。真金打造的戒指。'
},

'gang_territory_map': {
    name: '地盤地圖',
    cost: 0,
    sell_price: 600,
    category: 'loot',
    type: 'sellable',
    desc: '售價 $600。標記著勢力範圍的機密地圖。'
},

'boss_crown': {
    name: '王者之冠',
    cost: 0,
    sell_price: 10000,
    category: 'loot',
    type: 'sellable',
    desc: '售價 $10,000。擊敗城市主宰者的證明，無價之寶。'
},

'legendary_armor': {
    name: '傳奇護甲',
    cost: 0,
    sell_price: 0,  // 不能賣，只能裝備
    category: 'armor',
    type: 'armor',
    value: 120,
    desc: '防+120。傳說中的終極防具。'
},
'achievement_sword':{
    name:'⚔️ 成就之劍',
    cost: 0,
    category: 'weapon',
    type: 'weapon',
    value: 200,
    desc: '攻+200。只有真正的成就大師才能持有的神兵。'
}
};

const crimeData = {
    // --- Lv.1 街頭小混混 (低風險) ---
    search_trash: { 
        name: "翻垃圾桶", cost: 2, time: 1, successRate: 0.95, reward: 5, 
        desc: "雖然髒，但偶爾能撿到銅板。",
        failMsg: "被清潔隊員罵了一頓。" 
    },
    vandalism: { 
        name: "破壞公物", cost: 5, time: 1, successRate: 0.85, reward: 15, 
        desc: "在牆上噴漆或是砸壞販賣機，把里面的零錢幹走。",
        failMsg: "路人報警了，快跑！" 
    },
    shoplift: { 
        name: "超商偷竊", cost: 8, time: 1, successRate: 0.7, reward: 50, 
        desc: "趁店員微波便當的時候下手。",
        failMsg: "店員抓住了你的手腕，並報了警。" 
    },

    // --- Lv.2 職業罪犯 (中風險) ---
    steal_scooter: { 
        name: "偷機車", cost: 15, time: 2, successRate: 0.5, reward: 300, 
        desc: "接線發動只需 10 秒。賣給解體工廠。",
        failMsg: "發動失敗，車主拿著球棒衝出來。" 
    },
    scam_call: { 
        name: "詐騙電話", cost: 20, time: 1, successRate: 0.45, reward: 500, 
        desc: "「喂？我是你兒子啦，我被綁架了...」",
        failMsg: "對方是警察局長...尷尬了。" 
    },
    rob_granny: { 
        name: "搶劫路人", cost: 25, time: 1, successRate: 0.4, reward: 800, 
        desc: "挑軟柿子吃。但小心，有些老奶奶是退役特種兵。",
        failMsg: "被對方的防狼噴霧噴滿臉。" 
    },

    // --- Lv.3 地下教父 (高風險) ---
    protection_fee: { 
        name: "收保護費", cost: 40, time: 3, successRate: 0.3, reward: 2000, 
        desc: "去店家「關心」一下生意。如果不給錢，就讓他們生意做不下去。",
        failMsg: "這家店有更大的幫派罩，你被打得鼻青臉腫。" 
    },
    atm_hack: { 
        name: "駭入 ATM", cost: 60, time: 3, successRate: 0.2, reward: 5000, 
        desc: "需要高超的技術。讓提款機像噴泉一樣吐錢。",
        failMsg: "觸發靜音警報，防盜柵欄落下。" 
    },
    bank_heist: { 
        name: "銀行搶案", cost: 100, time: 5, successRate: 0.1, reward: 50000, 
        desc: "人生的一把大賭注。面具、槍枝、逃亡車輛，缺一不可。",
        failMsg: "SWAT 特警隊包圍了現場，任務失敗。" 
    }
};

const enemyData = {
    // === 弱小敵人（新手區）===
    'stray_dog': {
        name: '流浪狗',
        hp: 20,
        str: 3,
        spd: 8,
        dex: 10,
        reward: 5,
        exp: 3,
        time: 1,
        desc: '飢餓的野狗，攻擊性不高。',
        loot: [
            { item: 'dog_tag', chance: 0.3, qty: 1 }
        ]
    },
    'hobo': {
        name: '流浪漢',
        hp: 30,
        str: 5,
        spd: 2,
        dex: 5,
        reward: 10,
        exp: 5,
        time: 1,
        desc: '為了爭奪地盤而打架的流浪漢。',
        loot: [
            { item: 'dirty_coin', chance: 0.5, qty: 1 },
            { item: 'expired_bread', chance: 0.2, qty: 1 }
        ]
    },
    
    'pickpocket': {
        name: '扒手',
        hp: 40,
        str: 8,
        spd: 15,
        dex: 25,
        reward: 30,
        exp: 15,
        time: 1,
        desc: '手腳很快的小偷，但打架不行。',
        loot: [
            { item: 'stolen_wallet', chance: 0.4, qty: 1 },
            { item: 'cheap_watch', chance: 0.3, qty: 1 }
        ]
    },
    
    // === 普通敵人 ===
    'punk': {
        name: '街頭小混混',
        hp: 80,
        str: 15,
        spd: 10,
        dex: 20,
        reward: 60,
        exp: 20,
        time: 2,
        desc: '愛惹事的小混混，身上有些值錢的東西。',
        loot: [
            { item: 'gold_chain_fake', chance: 0.2, qty: 1 },
            { item: 'cigarette_pack', chance: 0.5, qty: 1 },
            { item: 'switchblade', chance: 0.1, qty: 1 }
        ]
    },
    
    'drug_dealer': {
        name: '毒販',
        hp: 100,
        str: 20,
        spd: 15,
        dex: 30,
        reward: 150,
        exp: 40,
        time: 2,
        desc: '販賣違禁品的危險人物。',
        loot: [
            { item: 'drugs', chance: 0.6, qty: 1 },
            { item: 'dirty_money', chance: 0.4, qty: 1 },
            { item: 'morphine', chance: 0.15, qty: 1 }
        ]
    },
    
    'thug': {
        name: '黑幫打手',
        hp: 200,
        str: 40,
        spd: 25,
        dex: 50,
        reward: 200,
        exp: 80,
        time: 3,
        desc: '黑幫的武裝成員，身上有武器。',
        loot: [
            { item: 'wooden_bat', chance: 0.3, qty: 1 },
            { item: 'bulletproof_vest', chance: 0.1, qty: 1 },
            { item: 'gang_badge', chance: 0.5, qty: 1 }
        ]
    },
    
    // === 精英敵人 ===
    'hitman': {
        name: '職業殺手',
        hp: 250,
        str: 60,
        spd: 70,
        dex: 80,
        reward: 500,
        exp: 150,
        time: 3,
        desc: '訓練有素的殺手，非常危險。',
        loot: [
            { item: 'switchblade', chance: 0.5, qty: 1 },
            { item: 'silencer', chance: 0.2, qty: 1 },
            { item: 'blood_contract', chance: 0.3, qty: 1 }
        ]
    },
    
    'corrupt_cop': {
        name: '腐敗警察',
        hp: 300,
        str: 50,
        spd: 40,
        dex: 60,
        reward: 400,
        exp: 120,
        time: 4,
        desc: '收黑錢的警察，裝備精良。',
        loot: [
            { item: 'police_badge', chance: 0.4, qty: 1 },
            { item: 'handcuffs', chance: 0.5, qty: 1 },
            { item: 'confiscated_goods', chance: 0.3, qty: 1 }
        ]
    },
    
    'gang_leader': {
        name: '黑幫老大',
        hp: 500,
        str: 80,
        spd: 60,
        dex: 100,
        reward: 1000,
        exp: 300,
        time: 5,
        desc: '控制一方的黑幫頭目。',
        loot: [
        { item: 'ak47', chance: 0.05, qty: 1 },
        { item: 'gold_ring', chance: 0.4, qty: 1 },
        { item: 'gang_territory_map', chance: 0.5, qty: 1 },
        { item: 'gold_bar', chance: 0.1, qty: 1 } // 新增掉落金條
]
    },
    
    // === Boss 級 ===
    'boss': {
        name: '城市主宰者',
        hp: 1000,
        str: 150,
        spd: 100,
        dex: 150,
        reward: 5000,
        exp: 500,
        time: 6,
        desc: '這座城市地下世界的統治者。',
        loot: [
            { item: 'boss_crown', chance: 1.0, qty: 1 },
            { item: 'ak47', chance: 0.5, qty: 1 },
            { item: 'legendary_armor', chance: 0.3, qty: 1 }
        ]
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
// === 動態目標系統 ===

// 每日挑戰池（每天隨機抽3個）
const dailyChallengePool = [
    {
        id: 'daily_train_3',
        name: '健身狂',
        desc: '在健身房訓練 3 次',
        check: (p) => p.daily_progress?.train_count >= 3,
        reward: { money: 200, exp: 50 }
    },
    {
        id: 'daily_work_3',
        name: '勤奮工作',
        desc: '工作 3 次',
        check: (p) => p.daily_progress?.work_count >= 3,
        reward: { money: 300, exp: 30 }
    },
    {
        id: 'daily_fight_5',
        name: '街頭霸主',
        desc: '贏得 5 場戰鬥',
        check: (p) => p.daily_progress?.fights_won >= 5,
        reward: { money: 500, exp: 100 }
    },
    {
        id: 'daily_no_crime',
        name: '遵紀守法',
        desc: '今天不犯任何罪',
        check: (p) => p.daily_progress?.crimes_count === 0,
        reward: { money: 150, exp: 20 }
    },
    {
        id: 'daily_eat_5',
        name: '美食家',
        desc: '吃 5 次食物或飲品',
        check: (p) => p.daily_progress?.food_eaten >= 5,
        reward: { money: 100, exp: 30 }
    },
    {
        id: 'daily_buy_3',
        name: '購物狂',
        desc: '購買 3 件物品',
        check: (p) => p.daily_progress?.items_bought >= 3,
        reward: { money: 150, exp: 25 }
    },

    // === 新增：生存類 ===
    {
        id: 'daily_survive',
        name: '穩定生活',
        desc: '飢餓和口渴保持在 50 以上',
        check: (p) => p.hunger >= 50 && p.thirst >= 50,
        reward: { money: 100, exp: 20 }
    },
    {
        id: 'daily_hp_full',
        name: '健康第一',
        desc: '血量保持滿血狀態',
        check: (p) => p.hp >= p.max_hp,
        reward: { money: 200, exp: 40 }
    },
    {
        id: 'daily_no_damage',
        name: '無傷戰士',
        desc: '贏得戰鬥但血量不低於 80%',
        check: (p) => p.daily_progress?.fights_won >= 1 && p.hp >= p.max_hp * 0.8,
        reward: { money: 300, exp: 60 }
    },

    // === 新增：賺錢類 ===
    {
        id: 'daily_earn_1000',
        name: '小富翁',
        desc: '今天賺取 1000 元（含工作、犯罪、戰鬥）',
        check: (p) => p.daily_progress?.money_earned >= 1000,
        reward: { money: 500, exp: 50 }
    },
    {
        id: 'daily_spend_500',
        name: '消費達人',
        desc: '今天花費 500 元購物',
        check: (p) => p.daily_progress?.money_spent >= 500,
        reward: { money: 200, exp: 30 }
    },
    {
        id: 'daily_rich',
        name: '財富自由',
        desc: '持有 5000 元以上',
        check: (p) => p.money >= 5000,
        reward: { money: 300, exp: 50 }
    },

    // === 新增：戰鬥類 ===
    {
        id: 'daily_boss_fight',
        name: '挑戰強敵',
        desc: '挑戰並擊敗幫派頭目或更強敵人',
        check: (p) => p.daily_progress?.defeated_tough_enemy >= 1,
        reward: { money: 800, exp: 150 }
    },
    {
        id: 'daily_win_streak',
        name: '連勝王',
        desc: '連續贏得 3 場戰鬥',
        check: (p) => p.daily_progress?.win_streak >= 3,
        reward: { money: 400, exp: 80 }
    },
    {
        id: 'daily_no_fight',
        name: '和平主義者',
        desc: '今天不參與任何戰鬥',
        check: (p) => p.daily_progress?.fights_won === 0,
        reward: { money: 150, exp: 30 }
    },

    // === 新增：犯罪類 ===
    {
        id: 'daily_crime_3',
        name: '職業罪犯',
        desc: '成功犯罪 3 次',
        check: (p) => p.daily_progress?.crimes_count >= 3,
        reward: { money: 400, exp: 60 }
    },
    {
        id: 'daily_perfect_crime',
        name: '完美犯罪',
        desc: '犯罪成功率 100%（至少犯罪 3 次）',
        check: (p) => p.daily_progress?.crimes_count >= 3 && p.daily_progress?.crime_fails === 0,
        reward: { money: 600, exp: 100 }
    },

    // === 新增：技能類 ===
    {
        id: 'daily_train_all',
        name: '全能訓練',
        desc: '力量和速度各訓練至少 1 次',
        check: (p) => p.daily_progress?.train_str >= 1 && p.daily_progress?.train_spd >= 1,
        reward: { money: 250, exp: 50 }
    },
    {
        id: 'daily_level_up',
        name: '成長之路',
        desc: '今天升級至少 1 次',
        check: (p) => p.daily_progress?.level_ups >= 1,
        reward: { money: 300, exp: 80 }
    },

    // === 新增：時間類 ===
    {
        id: 'daily_early_bird',
        name: '早起的鳥兒',
        desc: '在早上 6 點前完成任一活動',
        check: (p) => p.daily_progress?.early_activity === true,
        reward: { money: 150, exp: 40 }
    },
    {
        id: 'daily_night_owl',
        name: '夜貓子',
        desc: '在晚上 22 點後完成任一活動',
        check: (p) => p.daily_progress?.late_activity === true,
        reward: { money: 150, exp: 40 }
    },

    // === 新增：困難挑戰 ===
    {
        id: 'daily_multitask',
        name: '多才多藝',
        desc: '工作、戰鬥、訓練、犯罪各完成至少 1 次',
        check: (p) => p.daily_progress?.work_count >= 1 && 
                      p.daily_progress?.fights_won >= 1 && 
                      p.daily_progress?.train_count >= 1 && 
                      p.daily_progress?.crimes_count >= 1,
        reward: { money: 1000, exp: 200 }
    },
    {
        id: 'daily_minimalist',
        name: '極簡主義',
        desc: '今天不購買任何物品',
        check: (p) => p.daily_progress?.items_bought === 0,
        reward: { money: 200, exp: 40 }
    },
    {
        id: 'daily_perfect_day',
        name: '完美的一天',
        desc: 'HP、飢餓、口渴都保持 80 以上',
        check: (p) => p.hp >= p.max_hp * 0.8 && p.hunger >= 80 && p.thirst >= 80,
        reward: { money: 400, exp: 80 }
    }
];
const weatherData = {
    'sunny': { 
        name: '☀️ 晴朗', 
        desc: '視野清晰，適合工作與戰鬥。',
        effect: { hunger: 1.0, thirst: 1.0, atk: 0, def: 0, spd: 0, crimeRate: 0 } 
    },
    'rain': { 
        name: '🌧️ 暴雨', 
        desc: '行動不便，移動速度下降，但大家都躲在家裡，犯罪成功率提升。',
        effect: { hunger: 1.1, thirst: 0.8, atk: 0, def: 0, spd: -10, crimeRate: 0.1 } 
    },
    'heatwave': { 
        name: '🔥 熱浪', 
        desc: '極度炎熱，口渴速度加倍！體力消耗快，不宜久戰。',
        effect: { hunger: 0.8, thirst: 2.0, atk: -5, def: -5, spd: 0, crimeRate: 0 } 
    },
    'fog': { 
        name: '🌫️ 濃霧', 
        desc: '能見度低，戰鬥命中率下降，偷竊較容易得手。',
        effect: { hunger: 1.0, thirst: 1.0, atk: 0, def: 0, spd: 0, crimeRate: 0.15 } 
        // 戰鬥命中率會在戰鬥邏輯額外處理
    },
    'cold_snap': { 
        name: '❄️ 寒流', 
        desc: '氣溫驟降，身體需要更多熱量，容易飢餓。行動變得僵硬。',
        effect: { hunger: 1.5, thirst: 0.8, atk: 0, def: 0, spd: -5, crimeRate: -0.1 } 
    },
    'acid_rain': { 
        name: '🤢 酸雨', 
        desc: '工業區特產。淋雨會受傷，防禦力變得脆弱。',
        effect: { hunger: 1.0, thirst: 1.0, atk: 0, def: -10, spd: 0, crimeRate: 0 } 
    }
};

// 主線任務（階段性目標）
const mainQuests = [
    {
        id: 'main_survive_3',
        name: '新手存活',
        desc: '存活到第 3 天',
        check: (p) => p.day >= 3,
        reward: { money: 500, exp: 100, item: 'bandage' },
        stage: 1
    },
    {
        id: 'main_level_5',
        name: '初級戰士',
        desc: '達到 Lv.5',
        check: (p) => p.level >= 5,
        reward: { money: 1000, exp: 200, item: 'wooden_bat' },
        stage: 1
    },
    {
        id: 'main_first_house',
        name: '安居樂業',
        desc: '搬離廢棄木屋',
        check: (p) => p.house !== 'shack',
        reward: { money: 2000, exp: 300 },
        stage: 1
    },
    {
        id: 'main_10k_money',
        name: '小有積蓄',
        desc: '累積 $10,000',
        check: (p) => p.money >= 10000,
        reward: { money: 0, exp: 500, item: 'first_aid_kit' },
        stage: 2
    },
    {
        id: 'main_level_15',
        name: '進階戰士',
        desc: '達到 Lv.15',
        check: (p) => p.level >= 15,
        reward: { money: 5000, exp: 1000 },
        stage: 2
    },
    {
        id: 'main_edu_1',
        name: '好學不倦',
        desc: '完成 1 門課程',
        check: (p) => p.completed_courses.length >= 1,
        reward: { money: 3000, exp: 500 },
        stage: 2
    },
    {
        id: 'main_fight_boss',
        name: '挑戰強者',
        desc: '擊敗 Boss「城市主宰者」',
        check: (p) => p.achievements.includes('kill_boss'),
        reward: { money: 10000, exp: 2000, item: 'ak47' },
        stage: 3
    },
    {
        id: 'main_villa',
        name: '地產大亨',
        desc: '搬進私人別墅',
        check: (p) => p.house === 'villa',
        reward: { money: 50000, exp: 5000 },
        stage: 3
    },
    {
        id: 'main_level_30',
        name: '傳奇人物',
        desc: '達到 Lv.30',
        check: (p) => p.level >= 30,
        reward: { money: 100000, exp: 10000 },
        stage: 3
    }
];

// 成就點數獎勵（基於現有成就系統）
const achievementPointValues = [{
    // 根據成就難度給予不同點數
    money1k: 1, money10k: 2, money100k: 3, money1m: 5, money10m: 10,
    lv5: 1, lv10: 2, lv25: 3, lv50: 5,
    fight1: 1, fight10: 2, fight50: 3, fight100: 5, kill_boss: 10,
    survive7: 2, survive30: 3, survive100: 5,
    house_apt: 2, house_pen: 3, house_vil: 5, house_isl: 10,
    full_gear: 2, weapon_master: 5, endgame: 10
    // ... 其他成就依照難度給 1-10 分
}];

// 成就商店（用點數兌換）
const achievementShop = {
    'perm_exp_boost': {
        name: '經驗加成 +10%',
        desc: '永久增加經驗獲取 10%',
        cost: 20,
        type: 'perm_buff',
        effect: (p) => { p.perm_buffs = p.perm_buffs || {}; p.perm_buffs.exp_boost = 1.1; }
    },
    'perm_money_boost': {
        name: '收入加成 +10%',
        desc: '永久增加金錢獲取 10%',
        cost: 20,
        type: 'perm_buff',
        effect: (p) => { p.perm_buffs = p.perm_buffs || {}; p.perm_buffs.money_boost = 1.1; }
    },
    'perm_hp_boost': {
        name: '生命上限 +50',
        desc: '永久增加最大生命值 50',
        cost: 30,
        type: 'perm_buff',
        effect: (p) => { p.max_hp += 50; p.hp = p.max_hp; }
    },
    'special_sword': {
        name: '成就之劍',
        desc: '特殊武器 (攻擊 +200)',
        cost: 50,
        type: 'item',
        itemId: 'achievement_sword'
    },
    'title_legend': {
        name: '稱號：傳奇',
        desc: '在狀態欄顯示稱號',
        cost: 100,
        type: 'title',
        titleName: '【傳奇】'
    }
};


let player = { ...defaultPlayerState };