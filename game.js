// js/game.js

// --- 初始化與存檔系統 ---
function initGame() {
    const savedData = localStorage.getItem('myTornGame');
    if (savedData) {
        // 為了防止舊存檔缺少新屬性，我們合併預設值
        player = { ...defaultPlayerState, ...JSON.parse(savedData) };
        log("歡迎回來！讀取存檔成功。", "normal");
    } else {
        log("新遊戲開始！", "normal");
    }
    updateUI();
    
    // 啟動循環
    setInterval(gameTick, gameConfig.tickRate);
    setInterval(saveGame, 5000);
}

function saveGame() {
    localStorage.setItem('myTornGame', JSON.stringify(player));
}

function resetGame() {
    if(confirm("確定要刪除存檔並重來嗎？")) {
        localStorage.removeItem('myTornGame');
        location.reload();
    }
}

// --- 遊戲邏輯 ---

function showPanel(panelId) {
    // 切換面板顯示
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(panelId).classList.add('active');

    // 切換按鈕樣式 (讓選中的按鈕變亮)
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    // 這裡我們用一個簡單的方法：根據 onclick 的內容來找按鈕 (這不是最優雅的寫法，但目前最簡單)
    const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(btn => btn.getAttribute('onclick').includes(panelId));
    if (activeBtn) activeBtn.classList.add('active');
}

function train(stat) {
    if (player.energy >= gameConfig.trainCost) {
        player.energy -= gameConfig.trainCost;
        let gain = 1 + Math.floor(player[stat] * 0.01); 
        player[stat] += gain;
        
        log(`訓練完成！${stat} 增加了 ${gain} 點。`, "success");
        updateUI();
    } else {
        log("體力不足！去休息一下吧。", "fail");
    }
}

// 這邊改寫成讀取 data.js 的資料
function commitCrime(crimeId) {
    const crime = crimeData[crimeId]; // 從 data.js 獲取該犯罪的資訊

    if (!crime) {
        console.error("找不到這個犯罪 ID:", crimeId);
        return;
    }

    if (player.nerve >= crime.cost) {
        player.nerve -= crime.cost;
        
        if (Math.random() < crime.successRate) {
            player.money += crime.reward;
            log(`成功：你執行了 ${crime.name} 並獲得 $${crime.reward}！`, "success");
        } else {
            log(`失敗：${crime.failMsg}`, "fail");
        }
        updateUI();
    } else {
        log("勇氣不足！你的神經太緊繃了。", "fail");
    }
}

function gameTick() {
    if (player.energy < player.max_energy) player.energy += gameConfig.energyRecover;
    if (player.nerve < player.max_nerve) player.nerve += gameConfig.nerveRecover;
    updateUI();
}

// --- 介面更新與工具 ---

function updateUI() {
    // 1. 更新數值文字
    document.getElementById('money').innerText = player.money;
    document.getElementById('energy').innerText = Math.floor(player.energy); // 去掉小數點
    document.getElementById('max_energy').innerText = player.max_energy;
    document.getElementById('nerve').innerText = Math.floor(player.nerve);
    document.getElementById('max_nerve').innerText = player.max_nerve;
    document.getElementById('strength').innerText = player.strength;
    
    // 健身房的數值
    if(document.getElementById('gym-str')) document.getElementById('gym-str').innerText = player.strength;
    if(document.getElementById('gym-spd')) document.getElementById('gym-spd').innerText = player.speed;

    // 2. 更新進度條 CSS (新增的部分)
    // 計算百分比： (目前數值 / 最大數值) * 100
    const energyPercent = (player.energy / player.max_energy) * 100;
    const nervePercent = (player.nerve / player.max_nerve) * 100;

    // 修改 HTML 的 style 屬性
    document.getElementById('energy-bar').style.width = `${energyPercent}%`;
    document.getElementById('nerve-bar').style.width = `${nervePercent}%`;
}

function log(message, type) {
    const logArea = document.getElementById('log-area');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    if (type === 'success') entry.classList.add('log-success');
    if (type === 'fail') entry.classList.add('log-fail');
    
    const time = new Date().toLocaleTimeString();
    entry.innerText = `[${time}] ${message}`;
    logArea.prepend(entry);
}

// 啟動遊戲
initGame();