// js/game.js
let currentAnimInterval = null;
// --- 初始化 ---
function initGame() {
    const savedData = localStorage.getItem('myTornGame');
    if (savedData) {
        // 深度合併，確保 inventory 物件存在
        const parsed = JSON.parse(savedData);
        player = { ...defaultPlayerState, ...parsed };
        if(!player.inventory) player.inventory = {}; // 修正舊存檔沒背包的問題
        if(player.hp === undefined) player.hp = player.max_hp;

        log("歡迎回來！", "normal");
    } else {
        log("新遊戲開始！", "normal");
    }
    
    renderShop(); // 初始化商店介面
    renderEnemies();
    updateUI();   // 初始化背包與數值
    
    setInterval(gameTick, gameConfig.tickRate);
    setInterval(saveGame, 5000);
}

function saveGame() {
    localStorage.setItem('myTornGame', JSON.stringify(player));
}

function resetGame() {
    if(confirm("確定重置？")) {
        localStorage.removeItem('myTornGame');
        location.reload();
    }
}

// --- 介面渲染 (Render) ---
function renderEnemies() {
    const list = document.getElementById('enemy-list');
    list.innerHTML = '';

    for (const [id, enemy] of Object.entries(enemyData)) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h4>${enemy.name}</h4>
                <span style="color:var(--accent-red)">HP: ${enemy.hp}</span>
            </div>
            <p style="font-size:0.8rem; color:var(--text-muted)">${enemy.desc}</p>
            <div style="margin-top:10px; font-size:0.8rem;">
                ⚔️ 攻: ${enemy.str} | 💨 速: ${enemy.spd}
            </div>
            <button class="action-btn" style="width:100%; margin-top:10px; background:#e74c3c;" onclick="startCombat('${id}')">攻擊</button>
        `;
        list.appendChild(card);
    }
}
// 1. 生成商店列表 HTML
function renderShop() {
    const shopList = document.getElementById('shop-list');
    shopList.innerHTML = ''; // 清空

    // 遍歷 data.js 裡的 itemData
    for (const [id, item] of Object.entries(itemData)) {
        const itemCard = document.createElement('div');
        itemCard.className = 'card';
        itemCard.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h4>${item.name}</h4>
                <span style="color:var(--accent-green)">$${item.cost}</span>
            </div>
            <p style="font-size:0.8rem; color:var(--text-muted)">${item.desc}</p>
            <button class="action-btn" style="width:100%; margin-top:10px;" onclick="buyItem('${id}')">購買</button>
        `;
        shopList.appendChild(itemCard);
    }
}

// 2. 生成背包列表 HTML
function renderInventory() {
    const invList = document.getElementById('inventory-list');
    invList.innerHTML = '';

    const itemIds = Object.keys(player.inventory);
    
    if (itemIds.length === 0) {
        invList.innerHTML = '<p style="color:#666; grid-column:span 2;">背包是空的，去商店買點東西吧。</p>';
        return;
    }

    itemIds.forEach(id => {
        const qty = player.inventory[id];
        if (qty > 0) {
            const item = itemData[id];
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <h4>${item.name}</h4>
                    <span style="font-weight:bold">x${qty}</span>
                </div>
                <p style="font-size:0.8rem; color:var(--text-muted)">${item.desc}</p>
                <button class="action-btn" style="width:100%; margin-top:5px; background:#444;" onclick="useItem('${id}')">使用</button>
            `;
            invList.appendChild(card);
        }
    });
}
// --- 戰鬥系統 (Combat System) ---

function startCombat(enemyId) {
    if (player.hp <= 0) { log("重傷無法戰鬥！", "fail"); return; }
    if (player.energy < 5) { log("體力不足！", "fail"); return; }

    player.energy -= 5;
    updateUI();

    document.getElementById('enemy-selection').style.display = 'none';
    document.getElementById('combat-screen').style.display = 'block';
    
    const enemy = enemyData[enemyId];
    document.getElementById('enemy-name').innerText = enemy.name;
    setSceneImage(enemy.img);
    // --- 新增：換成敵人的圖片 ---
    const sceneImg = document.getElementById('scene-img');
    sceneImg.src = enemy.img;
    sceneImg.className = ''; // 重置特效

    const battleLog = document.getElementById('battle-log');
    battleLog.innerHTML = '';

    // 使用 setTimeout 讓玩家看得到圖片切換，再開始打
    setTimeout(() => {
        simulateFight(enemy);
    }, 500);
}

async function simulateFight(originalEnemy) {
    let enemyHp = originalEnemy.hp;
    let playerHp = player.hp;
    const battleLog = document.getElementById('battle-log');
    
    // 取得圖片元素 (敵人)
    const sceneImg = document.getElementById('scene-img'); 
    // 取得舞台容器 (用於螢幕閃爍特效)
    const stageContainer = document.getElementById('scene-stage');

    // 輔助函數：觸發動畫 (重置 class 以便重複播放)
    const triggerAnim = (element, animClass) => {
        element.classList.remove(animClass);
        void element.offsetWidth; // 魔法：強制瀏覽器重繪 (Reflow)
        element.classList.add(animClass);
    };

    const addLog = (msg, style) => {
        const div = document.createElement('div');
        div.className = `log-line ${style}`;
        div.innerText = msg;
        battleLog.appendChild(div);
        battleLog.scrollTop = battleLog.scrollHeight;
    };

    addLog(`戰鬥開始！`, "normal");

    // 戰鬥迴圈
    while (enemyHp > 0 && playerHp > 0) {
        
        // 1. 等待一下，營造緊張感
        await new Promise(r => setTimeout(r, 800));

        // --- 玩家回合 ---
        let dmg = Math.floor(player.strength * (0.8 + Math.random() * 0.4));
        let hitChance = 0.8 + (player.speed - originalEnemy.spd) * 0.01;
        if (Math.random() > hitChance) dmg = 0; 

        if (dmg > 0) {
            enemyHp -= dmg;
            addLog(`你攻擊造成 ${dmg} 點傷害！`, "log-player");
            
            // ★ 動畫：敵人受傷震動
            triggerAnim(sceneImg, 'anim-shake');
            
            // ★ 動畫：舞台稍微放大一下 (模擬攻擊衝擊感)
            triggerAnim(stageContainer, 'anim-attack');

        } else {
            addLog(`你的攻擊被閃過了！`, "log-enemy");
        }

        if (enemyHp <= 0) break;

        // 2. 敵人反擊前的停頓
        await new Promise(r => setTimeout(r, 600));

        // --- 敵人回合 ---
        let enemyDmg = Math.floor(originalEnemy.str * (0.8 + Math.random() * 0.4));
        let dodgeChance = 0.1 + (player.speed - originalEnemy.spd) * 0.01;
        
        if (Math.random() < dodgeChance) {
            addLog(`你帥氣地閃過了攻擊！`, "log-player");
        } else {
            playerHp -= enemyDmg;
            addLog(`敵人擊中你造成 ${enemyDmg} 點傷害。`, "log-enemy");
            
            // ★ 動畫：玩家受傷 (螢幕紅光)
            triggerAnim(stageContainer, 'anim-damage');
            
            updateUI(); // 即時扣血
        }
        
        player.hp = Math.max(0, playerHp);
        updateUI();
    }

    // --- 戰鬥結束 ---
    await new Promise(r => setTimeout(r, 500));
    
    if (player.hp > 0) {
        player.money += originalEnemy.reward;
        // 機率提升屬性
        if(Math.random() > 0.5) player.strength += 1; 
        
        addLog(`勝利！獲得 $${originalEnemy.reward}`, "log-win");
        
        // ★ 動畫：敵人死亡 (變灰淡出)
        sceneImg.classList.add('anim-die'); 
    } else {
        addLog(`你被打倒了...`, "log-die");
    }
    
    updateUI();
}

function endCombat() {
    // 回到列表
    document.getElementById('enemy-selection').style.display = 'block';
    document.getElementById('combat-screen').style.display = 'none';
}
// --- 遊戲邏輯 (Logic) ---

function showPanel(panelId) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(panelId).classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(btn => btn.getAttribute('onclick').includes(panelId));
    if (activeBtn) activeBtn.classList.add('active');

    // --- 新增：切換場景圖片 ---
    const sceneImg = document.getElementById('scene-img');
    // 如果該面板有設定圖片，就換過去；否則用預設的
    if (sceneImages[panelId]) {
        setSceneImage(sceneImages[panelId]);
    }
}

function buyItem(itemId) {
    const item = itemData[itemId];
    if (player.money >= item.cost) {
        player.money -= item.cost;
        
        // 如果背包裡已經有這個東西，數量+1，否則設為1
        if (player.inventory[itemId]) {
            player.inventory[itemId]++;
        } else {
            player.inventory[itemId] = 1;
        }
        
        log(`購買成功：你買了 ${item.name}`, "success");
        updateUI();
    } else {
        log("金錢不足！", "fail");
    }
}

function useItem(itemId) {
    const item = itemData[itemId];
    // 檢查有沒有這個道具
    if (!player.inventory[itemId] || player.inventory[itemId] <= 0) return;

    // 效果邏輯
    if (item.type === 'hp') {
        player.hp += item.value;
        if(player.hp > player.max_hp) player.hp = player.max_hp;
        log(`使用了 ${item.name}，生命恢復 ${item.value}。`, "success");
    } else if (item.type === 'energy') {
        player.energy += item.value;
        if(player.energy > player.max_energy) player.energy = player.max_energy; // 不超過上限
        log(`使用了 ${item.name}，體力恢復 ${item.value}。`, "success");
    } else if (item.type === 'nerve') {
        player.nerve += item.value;
        if(player.nerve > player.max_nerve) player.nerve = player.max_nerve;
        log(`使用了 ${item.name}，勇氣恢復 ${item.value}。`, "success");
    }

    // 扣除數量
    player.inventory[itemId]--;
    if (player.inventory[itemId] <= 0) {
        delete player.inventory[itemId]; // 用完了就刪除 key
    }

    updateUI();
}

function train(stat) {
    if (player.hp <= 0) { log("你在醫院裡，無法訓練！", "fail"); return; }
    if (player.energy >= gameConfig.trainCost) {
        player.energy -= gameConfig.trainCost;
        let gain = 1 + Math.floor(player[stat] * 0.01); 
        player[stat] += gain;
        log(`訓練 ${stat} +${gain}`, "success");
        updateUI();
    } else {
        log("體力不足！", "fail");
    }
}

function commitCrime(crimeId) {
    if (player.hp <= 0) { log("你在醫院裡，無法犯罪！", "fail"); return; } 
    const crime = crimeData[crimeId];
    if (player.nerve >= crime.cost) {
        player.nerve -= crime.cost;
        if (Math.random() < crime.successRate) {
            player.money += crime.reward;
            log(`犯罪成功：${crime.name} (+$${crime.reward})`, "success");
        } else {
            log(`犯罪失敗：${crime.failMsg}`, "fail");
        }
        updateUI();
    } else {
        log("勇氣不足！", "fail");
    }
}

function gameTick() {
    if (player.energy < player.max_energy) player.energy += gameConfig.energyRecover;
    if (player.nerve < player.max_nerve) player.nerve += gameConfig.nerveRecover;
    if (player.hp < player.max_hp) player.hp += gameConfig.hpRecover;

    updateUI();
}

function updateUI() {
    // 數值更新
    document.getElementById('money').innerText = player.money;
    document.getElementById('energy').innerText = Math.floor(player.energy);
    document.getElementById('max_energy').innerText = player.max_energy;
    document.getElementById('nerve').innerText = Math.floor(player.nerve);
    document.getElementById('max_nerve').innerText = player.max_nerve;
    document.getElementById('strength').innerText = player.strength;
    document.getElementById('hp').innerText = Math.floor(player.hp);
    document.getElementById('max_hp').innerText = player.max_hp;

    if(document.getElementById('gym-str')) document.getElementById('gym-str').innerText = player.strength;
    if(document.getElementById('gym-spd')) document.getElementById('gym-spd').innerText = player.speed;

    // 進度條
    const energyPercent = Math.min(100, (player.energy / player.max_energy) * 100);
    const nervePercent = Math.min(100, (player.nerve / player.max_nerve) * 100);
    const hpPercent = Math.min(100, (player.hp / player.max_hp) * 100);
    document.getElementById('energy-bar').style.width = `${energyPercent}%`;
    document.getElementById('nerve-bar').style.width = `${nervePercent}%`;
    document.getElementById('hp-bar').style.width = `${hpPercent}%`;

    renderInventory();
    if(document.getElementById('gym-str')) document.getElementById('gym-str').innerText = player.strength;
    if(document.getElementById('gym-spd')) document.getElementById('gym-spd').innerText = player.speed;
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
function setSceneImage(imgData) {
    const sceneImg = document.getElementById('scene-img');
    
    // --- A. 先清除舊的動畫 ---
    if (currentAnimInterval) {
        clearInterval(currentAnimInterval);
        currentAnimInterval = null;
    }

    // --- B. 判斷傳進來的是 GIF 字串 還是 動畫物件 ---
    
    // 情況 1: 簡單的網址字串 (GIF 或 JPG)
    if (typeof imgData === 'string') {
        sceneImg.src = imgData;
        return;
    }

    // 情況 2: 序列幀動畫物件
    if (typeof imgData === 'object' && imgData.type === 'animation') {
        let frameIndex = 0;

        // 定義播放邏輯
        const playFrame = () => {
            // 組合路徑： images/hobo_ + 0 + .png
            sceneImg.src = `${imgData.basePath}${frameIndex}${imgData.ext}`;
            
            // 下一幀
            frameIndex++;
            // 如果超過總張數，回到 0 (循環播放)
            if (frameIndex >= imgData.count) {
                frameIndex = 0;
            }
        };

        // 馬上播放第一張
        playFrame();

        // 設定計時器循環播放
        currentAnimInterval = setInterval(playFrame, imgData.speed);
    }
}
// 啟動
initGame();