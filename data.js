// js/data.js

// 1. 玩家初始狀態 (如果沒有存檔時使用)
const defaultPlayerState = {
    money: 100,
    energy: 100,
    max_energy: 100,
    nerve: 20,
    max_nerve: 20,
    strength: 10,
    speed: 10,
    last_tick: Date.now()
};

// 2. 遊戲設定數據 (Game Config)
// 這樣做的好處是：之後要調整平衡，只要改這裡的數字
const gameConfig = {
    tickRate: 1000,    // 多少毫秒回一次體力
    energyRecover: 1,  // 每次回多少體力
    nerveRecover: 1,   // 每次回多少勇氣
    trainCost: 5       // 健身房消耗
};

// 3. 犯罪資料庫 (ID, 名稱, 消耗, 成功率, 獎勵)
const crimeData = {
    'search_trash': { 
        name: "翻垃圾桶", 
        cost: 2, 
        successRate: 0.9, 
        reward: 5,
        failMsg: "你翻遍了垃圾桶，只找到一條發霉的香蕉皮。"
    },
    'shoplift': { 
        name: "超商偷竊", 
        cost: 4, 
        successRate: 0.6, 
        reward: 50,
        failMsg: "店員發現了你在偷巧克力，把你趕了出去！"
    },
    'rob_granny': {
        name: "搶劫老奶奶", 
        cost: 10, 
        successRate: 0.3, 
        reward: 200,
        failMsg: "老奶奶用手提包狠狠地揍了你的頭！"
    }
};

// 全域變數：玩家當前狀態 (會在 game.js 被修改)
let player = { ...defaultPlayerState };