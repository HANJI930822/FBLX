// js/data.js

// 1. 玩家初始狀態 (如果沒有存檔時使用)
const defaultPlayerState = {
  money: 100,
  energy: 100,
  hp: 100,      
max_hp: 100,
  max_energy: 100,
  nerve: 20,
  max_nerve: 20,
  strength: 10,
  speed: 10,
  last_tick: Date.now(),
};

// 2. 遊戲設定數據 (Game Config)
// 這樣做的好處是：之後要調整平衡，只要改這裡的數字
const gameConfig = {
  tickRate: 1000, // 多少毫秒回一次體力
  energyRecover: 1, // 每次回多少體力
  nerveRecover: 1, // 每次回多少勇氣
  hpRecover: 5,
  trainCost: 5, // 健身房消耗
};

// 3. 犯罪資料庫 (ID, 名稱, 消耗, 成功率, 獎勵)
const crimeData = {
  search_trash: {
    name: "翻垃圾桶",
    cost: 2,
    successRate: 0.9,
    reward: 5,
    failMsg: "你翻遍了垃圾桶，只找到一條發霉的香蕉皮。",
  },
  shoplift: {
    name: "超商偷竊",
    cost: 4,
    successRate: 0.6,
    reward: 50,
    failMsg: "店員發現了你在偷巧克力，把你趕了出去！",
  },
  rob_granny: {
    name: "搶劫老奶奶",
    cost: 10,
    successRate: 0.3,
    reward: 200,
    failMsg: "老奶奶用手提包狠狠地揍了你的頭！",
  },
};
const itemData = {
 'bandage': { name: "繃帶", cost: 15, type: 'hp', value: 30, desc: "回復 30 點生命，止血用。" }, // 新增
    'small_beer': { name: "廉價啤酒", cost: 30, type: 'nerve', value: 5, desc: "回復 5 點勇氣，味道像尿。" },
    'energy_drink': { name: "蠻牛飲料", cost: 100, type: 'energy', value: 15, desc: "回復 15 點體力，心跳加速。" },
    'protein_shake': { name: "高蛋白粉", cost: 500, type: 'energy', value: 50, desc: "回復 50 點體力，練肌肉必備。" }
};
//新增：敵人資料庫
// hp: 血量, str: 攻擊力, spd: 命中/閃避, exp: 經驗(目前先用錢代替)
const enemyData = {
    'hobo': { 
        name: "喝醉的流浪漢", 
        hp: 30, str: 5, spd: 2, reward: 10, 
        desc: "他看起來站都站不穩。", 
        img: {
            type: 'animation',
            basePath: 'images/', // 圖片路徑與前綴 (不包含數字)
            ext: '.png',              // 副檔名
            count: 4,                 // 總共有幾張圖 (0~3)
            speed: 200                // 每 200 毫秒換一張 (數字越小越快)
        }
    },
    'punk': { 
        name: "街頭混混", 
        hp: 80, str: 15, spd: 10, reward: 60, 
        desc: "手裡拿著生鏽的小刀。",
        // 改換背景色區分
        img: "image\FreeKnight_v1\Colour2\NoOutline\ 120x80_gifs\ __Attack.gif"
    },
    'thug': { 
        name: "幫派打手", 
        hp: 200, str: 40, spd: 25, reward: 200, 
        desc: "受過專業的格鬥訓練。",
        // 加上墨鏡
        img: "https://api.dicebear.com/9.x/pixel-art/svg?seed=thug&scale=120&glassesProbability=100" 
    },
    'boss': { 
        name: "區域角頭", 
        hp: 1000, str: 150, spd: 100, reward: 5000, 
        desc: "傳說中沒有人能活著見到他。",
        // 特殊造型
        img: "https://api.dicebear.com/9.x/pixel-art/svg?seed=boss&scale=120&eyes=sunglasses&beardProbability=50" 
    }
};
const sceneImages = {
    // 🏠 藏身處：安靜的賽博龐克房間
    'home': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcjR5eGx4eG96M3l5bnZ6eGx4eG96M3l5bnZ6eGx4eG96M3l5biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Ld0InabOADj0Y/giphy.gif', 
    
    // 🏋️ 健身房：有人在訓練的像素圖
    'gym': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGZ4eHZnZmx4eG96M3l5bnZ6eGx4eG96M3l5bnZ6eGx4eG96M3l5biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/McZ7rQZ5ylH15W3tX2/giphy.gif',
    
    // 🏪 商店：深夜拉麵攤或販賣機
    'shop': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExazN5eGx4eG96M3l5bnZ6eGx4eG96M3l5bnZ6eGx4eG96M3l5biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/169247c7293b6924976472cf7279313b/giphy.gif',
    
    // 🔫 街頭犯罪：下雨的暗巷
    'crimes': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaTN5eGx4eG96M3l5bnZ6eGx4eG96M3l5bnZ6eGx4eG96M3l5biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/a00b40d69b309605273523f319234b6b/giphy.gif',
    
    // ⚔️ 街頭火拚：預設戰鬥背景 (當切換到戰鬥列表時顯示)
    'fight': 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbTN5eGx4eG96M3l5bnZ6eGx4eG96M3l5bnZ6eGx4eG96M3l5biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26tn33aiTi1jkl6H6/giphy.gif'
};

// 全域變數：玩家當前狀態 (會在 game.js 被修改)
let player = { ...defaultPlayerState };
