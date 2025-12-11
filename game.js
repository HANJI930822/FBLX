// js/game.js

// --- 全域變數 ---
let currentAnimInterval = null;
let playerFrameIndex = 0;
let playerAnimInterval = null;
let enemyAnimInterval = null;

const SHOP_PAGE_SIZE = 4; 
let shopPage = 1;        
let shopCategory = 'all'; 

// --- 初始化流程 ---
function initGame() {
    const savedData = localStorage.getItem('myTornGame');
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            player = { ...defaultPlayerState, ...parsed };

            // 防呆檢查
            if (!player.job || !jobData[player.job]) { forceReset(); return; }
            if (player.hp <= 0) { forceReset(); return; }

            // 補全可能缺少的屬性
            if (!player.house) player.house = 'shack';
            if (!player.completed_courses) player.completed_courses = [];
            if(!player.inventory) player.inventory = {};
            if(player.hp === undefined) player.hp = player.max_hp;
            if(player.defense === undefined) player.defense = 0;
            if(player.hunger === undefined) player.hunger = 100;
            if(player.max_hunger === undefined) player.max_hunger = 100;
            if(player.thirst === undefined) player.thirst = 100;
            if(player.max_thirst === undefined) player.max_thirst = 100;
            if(player.day === undefined) player.day = 1;
            if(player.time === undefined) player.time = 8;

            document.getElementById('intro-screen').style.display = 'none';
            document.getElementById('app-container').style.display = 'flex';
            
            log("歡迎回來！", "normal");
            startGameLoop();

        } catch (e) {
            console.error("存檔讀取錯誤", e);
            forceReset();
        }
    } else {
        renderIntroJobs();
    }
}
function passTime(hours) {
    player.time += hours;
    
    // 檢查是否換日
    if (player.time >= 24) {
        player.time -= 24;
        player.day += 1;
        
        // ★ 修改：套用房屋的消耗倍率
        // 取得目前房屋資料 (如果找不到就預設為破屋)
        const currentHouse = houseData[player.house] || houseData['shack'];
        const mult = currentHouse.decayMult || 1.0;

        // 計算實際消耗量
        const hungerLoss = Math.floor(gameConfig.dailyHungerDecay * mult);
        const thirstLoss = Math.floor(gameConfig.dailyThirstDecay * mult);

        player.hunger -= hungerLoss;
        player.thirst -= thirstLoss;
        
        log(`=== 第 ${player.day} 天開始 ===`, "normal");
        // 顯示稍微詳細一點的訊息，讓玩家知道住好房子的差別
        log(`過了一夜，飢餓 -${hungerLoss}，口渴 -${thirstLoss} (居住加成: ${mult}x)`, "fail");

        checkSurvivalStatus();
    }
    
    // 每次行動都扣一點點 (模擬代謝)
    player.hunger = Math.max(0, player.hunger - (hours * 2));
    player.thirst = Math.max(0, player.thirst - (hours * 3));
    
    updateUI();
}
function checkSurvivalStatus() {
    let penaltyMsg = "";
    
    if (player.hunger <= 0) {
        player.hunger = 0;
        player.hp -= 30; // 餓死扣血
        penaltyMsg += "你餓到頭昏眼花 (HP -30)! ";
    }
    if (player.thirst <= 0) {
        player.thirst = 0;
        player.hp -= 30; // 渴死扣血
        penaltyMsg += "你脫水了 (HP -30)! ";
    }
    
    if (penaltyMsg) {
        log(penaltyMsg, "fail");
        if (player.hp <= 0) {
            log("你死於飢餓或脫水...", "log-die");
            gameOver();
        }
    }
}
function forceReset() {
    localStorage.removeItem('myTornGame');
    player = { ...defaultPlayerState }; 
    renderIntroJobs();
}

function startGameLoop() {
    renderShop();
    renderEnemies();
    renderJobs();
    renderEstate();
    renderEdu();

    updateUI(); 
    
    if (window.gameInterval) clearInterval(window.gameInterval);
    if (window.saveInterval) clearInterval(window.saveInterval);
    window.gameInterval = setInterval(gameTick, gameConfig.tickRate);
    window.saveInterval = setInterval(saveGame, 5000);
}

function saveGame() {
    if (player.hp <= 0) return;
    localStorage.setItem('myTornGame', JSON.stringify(player));
}

function resetGame() {
    if(confirm("確定重置？這將刪除存檔並回到職業選擇畫面。")) { 
        forceReset();
        location.reload(); 
    }
}

function gameOver() {
    localStorage.removeItem('myTornGame');
    player.hp = 0;
    alert("【💀 你已經死亡】\n\n請重新選擇身分，再來一次吧。");
    location.reload();
}

// --- 開場職業選擇 ---
function renderIntroJobs() {
    const intro = document.getElementById('intro-screen');
    const app = document.getElementById('app-container');
    if(intro) intro.style.display = 'flex';
    if(app) app.style.display = 'none';
    
    const list = document.getElementById('intro-job-list');
    if (!list) return;

    list.innerHTML = '';
    
    for (const [id, job] of Object.entries(jobData)) {
        const card = document.createElement('div');
        card.className = 'job-select-card';
        card.innerHTML = `
            <h3>${job.name}</h3>
            <p style="color:#aaa; margin-bottom:10px;">${job.desc}</p>
            <p style="font-size:0.9rem;">日薪: <span style="color:#f1c40f">$${job.salary}</span></p>
            <div class="job-bonus-list">🎁 ${job.startBonus.desc}</div>
        `;
        card.onclick = () => chooseStartJob(id);
        list.appendChild(card);
    }
}

function chooseStartJob(jobId) {
    const job = jobData[jobId];
    player = { ...defaultPlayerState }; 
    player.job = jobId;
    
    if (job.startBonus) {
        if (job.startBonus.money) player.money += job.startBonus.money;
        if (job.startBonus.str) player.strength += job.startBonus.str;
        if (job.startBonus.spd) player.speed += job.startBonus.spd;
        if (job.startBonus.hp) {
            player.max_hp += job.startBonus.hp;
            player.hp = player.max_hp;
        }
        if (job.startBonus.weapon) {
            player.inventory[job.startBonus.weapon] = 1;
            player.weapon = job.startBonus.weapon;
        }
    }
    
    document.getElementById('intro-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    
    log(`新遊戲開始！你的身分是：${job.name}`, "success");
    saveGame();
    startGameLoop();
}

// --- 渲染敵人 ---
function renderEnemies() {
  const list = document.getElementById("enemy-list");
  if (!list) return;
  
  list.innerHTML = "";
  for (const [id, enemy] of Object.entries(enemyData)) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h4>${enemy.name} <small style="color:#666">(Lv.?)</small></h4>
                <span style="color:var(--accent-red)">HP: ${enemy.hp}</span>
            </div>
            <p style="font-size:0.8rem; color:#aaa">${enemy.desc}</p>
            <div style="margin-top:10px; font-size:0.8rem;">
                ⚔️ 攻: ${enemy.str} | 💨 速: ${enemy.spd}
            </div>
            <button class="action-btn" style="width:100%; margin-top:10px; background:#e74c3c;" onclick="startCombat('${id}')">攻擊</button>
        `;
    list.appendChild(card);
  }
}

// --- 商店系統 ---
function renderShop(category) {
    if (category && category !== shopCategory) {
        shopCategory = category;
        shopPage = 1; 
        document.querySelectorAll('.filter-btn').forEach(btn => {
            if(btn.getAttribute('onclick').includes(`'${category}'`)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    const shopList = document.getElementById('shop-list');
    if (!shopList) return;
    shopList.innerHTML = '';
    
    const allItems = Object.entries(itemData).filter(([id, item]) => {
        if (shopCategory === 'all') return true;
        return item.category === shopCategory;
    });

    const totalPages = Math.ceil(allItems.length / SHOP_PAGE_SIZE);
    if (shopPage > totalPages && totalPages > 0) shopPage = 1;
    if (totalPages === 0) shopPage = 1;

    const startIndex = (shopPage - 1) * SHOP_PAGE_SIZE;
    const endIndex = startIndex + SHOP_PAGE_SIZE;
    const itemsToShow = allItems.slice(startIndex, endIndex);

    if (itemsToShow.length === 0) {
        shopList.innerHTML = '<p style="color:#666; grid-column:span 2; text-align:center;">此分類沒有商品。</p>';
    } else {
        itemsToShow.forEach(([id, item]) => {
            const itemCard = document.createElement('div');
            itemCard.className = 'card';
            itemCard.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4>${item.name}</h4>
                    <span style="color:var(--accent-green)">$${item.cost}</span>
                </div>
                <p style="font-size:0.8rem; color:#aaa">${item.desc}</p>
                <button class="action-btn" style="width:100%; margin-top:10px;" onclick="buyItem('${id}')">購買</button>
            `;
            shopList.appendChild(itemCard);
        });
    }

    let paginationDiv = document.getElementById('shop-pagination');
    if (!paginationDiv) {
        paginationDiv = document.createElement('div');
        paginationDiv.id = 'shop-pagination';
        paginationDiv.className = 'pagination-controls';
        shopList.parentNode.appendChild(paginationDiv);
    }

    if (totalPages <= 1) {
        paginationDiv.style.display = 'none';
    } else {
        paginationDiv.style.display = 'flex';
        paginationDiv.innerHTML = `
            <button class="page-btn" onclick="changeShopPage(-1)" ${shopPage === 1 ? 'disabled' : ''}>◀ 上一頁</button>
            <span class="page-info">第 ${shopPage} / ${totalPages} 頁</span>
            <button class="page-btn" onclick="changeShopPage(1)" ${shopPage === totalPages ? 'disabled' : ''}>下一頁 ▶</button>
        `;
    }
}

function changeShopPage(direction) {
    shopPage += direction;
    renderShop(); 
}

function buyItem(itemId) {
    const item = itemData[itemId];
    if (player.money >= item.cost) {
        player.money -= item.cost;
        if (player.inventory[itemId]) { player.inventory[itemId]++; } else { player.inventory[itemId] = 1; }
        log(`購買成功：${item.name}`, "success");
        updateUI();
    } else { log("金錢不足！", "fail"); }
}

// --- 背包與裝備 ---
function renderInventory() {
    const invList = document.getElementById('inventory-list');
    if (!invList) return;
    invList.innerHTML = '';
    
    const itemIds = Object.keys(player.inventory);
    
    if (itemIds.length === 0) {
        invList.innerHTML = '<p style="color:#666">背包是空的。</p>';
        return;
    }
    
    itemIds.forEach(id => {
        const qty = player.inventory[id];
        if (qty > 0) {
            const item = itemData[id];
            const isEquippedWeapon = (player.weapon === id);
            const isEquippedArmor = (player.armor === id);
            
            const card = document.createElement('div');
            card.className = 'card';
            
            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.innerHTML = `<h4>${item.name}</h4><span style="font-weight:bold">x${qty}</span>`;
            
            const desc = document.createElement('p');
            desc.style.fontSize = '0.8rem';
            desc.style.color = '#aaa';
            desc.innerText = item.desc;
            
            const btn = document.createElement('button');
            btn.className = 'action-btn';
            btn.style.width = '100%';
            btn.style.marginTop = '5px';
            
            if (item.type === 'weapon') {
                if (isEquippedWeapon) {
                    btn.innerText = "已裝備";
                    btn.style.background = "#e74c3c";
                    btn.disabled = true;
                } else {
                    btn.innerText = "裝備武器";
                    btn.style.background = "#2980b9";
                    btn.onclick = () => equipItem(id);
                }
            } else if (item.type === 'armor') {
                if (isEquippedArmor) {
                    btn.innerText = "已裝備";
                    btn.style.background = "#e74c3c";
                    btn.disabled = true;
                } else {
                    btn.innerText = "裝備防具";
                    btn.style.background = "#27ae60";
                    btn.onclick = () => equipItem(id);
                }
            } else {
                btn.innerText = "使用";
                btn.style.background = "#444";
                btn.onclick = () => useItem(id);
            }

            card.appendChild(header);
            card.appendChild(desc);
            card.appendChild(btn);
            invList.appendChild(card);
        }
    });
}

function equipItem(itemId) {
    const item = itemData[itemId];
    if (item.type === 'weapon') { player.weapon = itemId; log(`裝備了武器：${item.name}`, "success"); } 
    else if (item.type === 'armor') { player.armor = itemId; log(`穿上了防具：${item.name}`, "success"); }
    updateUI();
}

function useItem(itemId) {
    const item = itemData[itemId];
    if (item.type === 'weapon' || item.type === 'armor') return; 
    
    if (!player.inventory[itemId] || player.inventory[itemId] <= 0) return;
    
    // 執行效果
    let msg = "";
    if (item.type === 'hp') { 
        player.hp = Math.min(player.max_hp, player.hp + item.value);
        msg = "回復生命";
    } 
    else if (item.type === 'energy') { 
        player.energy = Math.min(player.max_energy, player.energy + item.value);
        msg = "回復體力";
    }
    else if (item.type === 'hunger') { // ★ 新增
        player.hunger = Math.min(player.max_hunger, player.hunger + item.value);
        msg = "填飽肚子";
    }
    else if (item.type === 'thirst') { // ★ 新增
        player.thirst = Math.min(player.max_thirst, player.thirst + item.value);
        msg = "解渴";
    }

    // 處理額外效果 (例如咖啡同時補口渴和體力)
    if (item.extraEffect) {
        if(item.extraEffect.energy) player.energy = Math.min(player.max_energy, player.energy + item.extraEffect.energy);
        if(item.extraEffect.thirst) player.thirst = Math.min(player.max_thirst, player.thirst + item.extraEffect.thirst);
    }
    
    log(`使用了 ${item.name} (${msg})`, "success");
    
    player.inventory[itemId]--;
    if (player.inventory[itemId] <= 0) delete player.inventory[itemId];
    updateUI();
}

// --- 戰鬥系統 ---
function getPlayerAttack() {
    let weaponDmg = 0;
    if (player.weapon && itemData[player.weapon]) {
        weaponDmg = itemData[player.weapon].value;
    }
    return player.strength + weaponDmg;
}

function getPlayerDefense() {
    let armorDef = 0;
    if (player.armor && itemData[player.armor]) {
        armorDef = itemData[player.armor].value;
    }
    return (player.strength * 0.5) + armorDef; 
}

function startCombat(enemyId) {
    if (player.hp <= 0) { log("重傷無法戰鬥！", "fail"); return; }
    if (player.energy < 5) { log("體力不足！", "fail"); return; }

    player.energy -= 5;
    updateUI();

    document.getElementById('enemy-selection').style.display = 'none';
    document.getElementById('combat-screen').style.display = 'block';
    
    const enemy = enemyData[enemyId];
    document.getElementById('enemy-name').innerText = enemy.name;
    document.getElementById('battle-log').innerHTML = '';

    simulateFight(enemy);
}

async function simulateFight(originalEnemy) {
    let enemyHp = originalEnemy.hp;
    let playerHp = player.hp;
    const battleLog = document.getElementById('battle-log');
    
    const addLog = (msg, style) => {
        const div = document.createElement('div');
        div.className = `log-line ${style}`;
        div.innerText = msg;
        battleLog.appendChild(div);
        battleLog.scrollTop = battleLog.scrollHeight;
    };

    const wait = (ms) => new Promise(r => setTimeout(r, ms));

    addLog(`=== 遭遇 ${originalEnemy.name} ===`, "normal");

    while (enemyHp > 0 && playerHp > 0) {
        await wait(600);

        let totalAtk = getPlayerAttack();
        let dmg = Math.floor(totalAtk * (0.8 + Math.random() * 0.4));
        let hitChance = 0.8 + (player.speed - originalEnemy.spd) * 0.01;
        if (Math.random() > hitChance) dmg = 0; 

        if (dmg > 0) {
            enemyHp -= dmg;
            addLog(`> 你造成 ${dmg} 點傷害！`, "log-player");
        } else {
            addLog(`> 攻擊揮空了！`, "log-enemy");
        }

        if (enemyHp <= 0) break;
        await wait(400);

        let totalDef = getPlayerDefense();
        let enemyDmg = Math.floor(originalEnemy.str * (0.8 + Math.random() * 0.4));
        enemyDmg = Math.max(1, Math.floor(enemyDmg - (totalDef * 0.5)));
        let dodgeChance = 0.1 + (player.speed - originalEnemy.spd) * 0.01;
        
        if (Math.random() < dodgeChance) {
            addLog(`> 你閃過了攻擊！`, "log-player");
        } else {
            playerHp -= enemyDmg;
            addLog(`> 敵人造成 ${enemyDmg} 點傷害。`, "log-enemy");
            updateUI();
        }
        player.hp = Math.max(0, playerHp);
        updateUI();
    }

    await wait(500);
    
    const timeCost = originalEnemy.time || 1;
    passTime(timeCost);

    if (player.hp > 0) {
        player.money += originalEnemy.reward;
        let expGain = originalEnemy.exp || 10;
        addLog(`=== 勝利 ===`, "log-win");
        addLog(`獲得: $${originalEnemy.reward}, Exp +${expGain}`, "log-win");
        gainExp(expGain);
        updateUI();
        addLog(`戰鬥耗時 ${timeCost} 小時。`, "normal");
    } else {
        addLog(`=== 死亡 ===`, "log-die");
        addLog(`你被擊殺了...`, "log-die");
        await wait(1000); 
        gameOver();
    }
}

function endCombat() {
    document.getElementById('enemy-selection').style.display = 'block';
    document.getElementById('combat-screen').style.display = 'none';
}

// ★ 關鍵修正：升級系統 (改用 while 支援連升多級)
function gainExp(amount) {
    player.exp += amount;
    
    // 如果一次獲得大量經驗，可以連續升級
    while (player.exp >= player.max_exp) {
        player.level++;
        player.exp -= player.max_exp;
        
        // ★ 這裡控制升級難度曲線
        // * 1.2 = 每一級需要的經驗值增加 20%
        // * 1.5 = 每一級增加 50% (變難)
        player.max_exp = Math.floor(player.max_exp * 1.2); 
        
        // 升級獎勵
        player.max_hp += 10;
        player.hp = player.max_hp; // 補滿血
        player.strength += 2;
        player.speed += 2;
        
        log(`🎉 升級了！現在等級 ${player.level}！(全屬性提升)`, "success");
    }
    
    updateUI(); // 確保經驗條有更新
}

// --- UI 與雜項 ---
function renderJobs() {
    const job = jobData[player.job];
    if (job) {
        document.getElementById('current-job-name').innerText = job.name;
        document.getElementById('current-job-desc').innerText = job.desc;
        document.getElementById('current-job-salary').innerText = `$${job.salary}`;
        document.getElementById('job-title').innerText = `(${job.name})`;
    }
}

function work() {
    const job = jobData[player.job];
    if (!job) return; 

    // 檢查體力、時間
    if (player.energy < gameConfig.workCost) { log("體力不足！", "fail"); return; }
    
    // 執行工作
    player.energy -= gameConfig.workCost;
    player.money += job.salary;
    
    // ★ 推進時間 (例如工作 4 小時)
    log(`打卡上班... (經過 ${gameConfig.workTime} 小時)`, "normal");
    passTime(gameConfig.workTime);
    
    gainExp(2); 
    log(`工作完成！獲得薪水 $${job.salary}`, "success");
    updateUI();
}

function train(stat) {
    if (player.hp <= 0) { log("在醫院無法訓練！", "fail"); return; }
    
    if (player.energy >= gameConfig.trainCost) {
        player.energy -= gameConfig.trainCost;
        let gain = 1 + Math.floor(player[stat] * 0.01); 
        player[stat] += gain;
        
        // ★ 推進時間 (例如訓練 1 小時)
        passTime(gameConfig.trainTime);
        
        log(`訓練結束 (+${gain} ${stat})`, "success");
        updateUI();
    } else { log("體力不足！", "fail"); }
}
function rest() {
    const now = Date.now();
    if (now - player.last_rest < gameConfig.restCooldown) {
        log("你還不累，過一會再睡吧。", "fail");
        return;
    }

    const house = houseData[player.house];
    
    // ★ 睡覺會過很長時間 (例如 8 小時)
    passTime(8); 

    // 回復狀態
    player.hp = Math.min(player.max_hp, player.hp + house.restore);
    player.energy = Math.min(player.max_energy, player.energy + house.restore);
    
    // 睡覺也會稍微回復一點生存值 (假設有喝水吃早餐?) -> 或者不回，讓玩家起床必須吃東西
    // 這裡設定：睡覺不補飢餓口渴，反而因為過了 8 小時會變餓
    
    player.last_rest = now;
    log(`你在 ${house.name} 睡了 8 小時，精神飽滿。`, "success");
    updateUI();
}
function commitCrime(crimeId) {
    if (player.hp <= 0) { log("在醫院無法犯罪！", "fail"); return; } 

    const crime = crimeData[crimeId];
    const timeCost = crime.time || 1;

    if (player.energy >= crime.cost) { // 修正為檢查 energy
        player.energy -= crime.cost;
        if (Math.random() < crime.successRate) {
            player.money += crime.reward;
            gainExp(1);
            log(`犯罪成功：${crime.name} (+$${crime.reward})`, "success");
        } else { log(`犯罪失敗：${crime.failMsg}`, "fail"); }
        updateUI();
    } else { log("體力不足！", "fail"); }
}

function gameTick() {
    const currentHouse = houseData[player.house] || houseData['shack'];
    const mult = currentHouse.regenMult;

    // 回復量 = 基礎值 * 房屋倍率
    const energyGain = gameConfig.baseEnergyRecover * mult;
    const hpGain = gameConfig.baseHpRecover * mult;

    if (player.energy < player.max_energy) {
        player.energy = Math.min(player.max_energy, player.energy + energyGain);
    }
    if (player.hp < player.max_hp) {
        player.hp = Math.min(player.max_hp, player.hp + hpGain);
    }
    updateUI();
}
//房產
function renderEstate() {
    const list = document.getElementById('estate-list');
    if(!list) return;
    list.innerHTML = '';

    // 更新目前住處 UI
    const currentHouse = houseData[player.house];
    document.getElementById('current-house-name').innerText = currentHouse.name;
    document.getElementById('current-house-mult').innerText = currentHouse.regenMult + "x";

    for (const [id, house] of Object.entries(houseData)) {
        if (id === 'shack') continue; // 不顯示破屋

        const isOwned = player.house === id;
        
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <h4>${house.name}</h4>
                <span style="color:var(--accent-green)">$${house.cost}</span>
            </div>
            <p style="font-size:0.8rem; color:#aaa">${house.desc}</p>
            <button class="action-btn" 
                style="width:100%; margin-top:5px; background:${isOwned ? '#444' : '#2ecc71'}" 
                onclick="buyHouse('${id}')" 
                ${isOwned ? 'disabled' : ''}>
                ${isOwned ? '已居住' : '搬進去'}
            </button>
        `;
        list.appendChild(card);
    }
}
function buyHouse(houseId) {
    const house = houseData[houseId];
    if (player.money >= house.cost) {
        player.money -= house.cost;
        player.house = houseId;
        log(`搬家成功！你現在住在 ${house.name}，回復速度提升！`, "success");
        renderEstate();
        updateUI();
    } else {
        log("金錢不足，買不起這棟房子！", "fail");
    }
}
//教育
function renderEdu() {
    const list = document.getElementById('edu-list');
    if(!list) return;
    list.innerHTML = '';

    for (const [id, course] of Object.entries(eduData)) {
        const isCompleted = player.completed_courses.includes(id);
        
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <h4>${course.name}</h4>
                <span style="color:var(--accent-green)">$${course.cost}</span>
            </div>
            <p style="font-size:0.8rem; color:#aaa">${course.desc}</p>
            <small>消耗體力: ${course.energyCost}</small>
            <button class="action-btn" 
                style="width:100%; margin-top:5px; background:${isCompleted ? '#444' : '#3498db'}" 
                onclick="takeCourse('${id}')" 
                ${isCompleted ? 'disabled' : ''}>
                ${isCompleted ? '已修畢' : '報名課程'}
            </button>
        `;
        list.appendChild(card);
    }
}

function takeCourse(courseId) {
    const course = eduData[courseId];
    
    // 檢查
    if (player.completed_courses.includes(courseId)) return;
    if (player.money < course.cost) { log("學費不足！", "fail"); return; }
    if (player.energy < course.energyCost) { log("體力不足，讀書是很累的！", "fail"); return; }

    // 執行
    player.money -= course.cost;
    player.energy -= course.energyCost;
    player.completed_courses.push(courseId);
    
    // 觸發效果
    if (course.effect) {
        course.effect(player);
    }

    log(`課程完成：${course.name}！獲得了能力提升。`, "success");
    renderEdu();
    updateUI();
}
//賭場
function gambleCoinFlip() {
    const input = document.getElementById('gamble-amount');
    const resultDiv = document.getElementById('gamble-result');
    const amount = parseInt(input.value);

    if (isNaN(amount) || amount <= 0) {
        log("請輸入有效的賭注金額！", "fail");
        return;
    }
    if (player.money < amount) {
        log("你的錢不夠！", "fail");
        return;
    }

    player.money -= amount;
    const isWin = Math.random() > 0.5;

    if (isWin) {
        const winAmount = amount * 2;
        player.money += winAmount;
        resultDiv.innerText = `贏了！獲得 $${winAmount}`;
        resultDiv.style.color = "#2ecc71";
        log(`賭場：你贏了 $${amount}！`, "success");
    } else {
        resultDiv.innerText = `輸了... 失去了 $${amount}`;
        resultDiv.style.color = "#e74c3c";
        log(`賭場：你輸掉了 $${amount}。`, "fail");
    }
    updateUI();
}
function log(message, type) {
    const logArea = document.getElementById('log-area');
    if(!logArea) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    if (type === 'success') entry.classList.add('log-success');
    if (type === 'fail') entry.classList.add('log-fail');
    const time = new Date().toLocaleTimeString();
    entry.innerText = `[${time}] ${message}`;
    logArea.prepend(entry);
}

function showPanel(panelId) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const p = document.getElementById(panelId);
    if(p) p.classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(btn => btn.getAttribute('onclick').includes(panelId));
    if (activeBtn) activeBtn.classList.add('active');
}

function updateUI() {
    if(document.getElementById('money')) document.getElementById('money').innerText = player.money;
    if(document.getElementById('energy')) document.getElementById('energy').innerText = Math.floor(player.energy);
    if(document.getElementById('hp')) document.getElementById('hp').innerText = Math.floor(player.hp);
    if(document.getElementById('level')) document.getElementById('level').innerText = player.level;
    
    const job = jobData[player.job];
    const jobTitle = document.getElementById('job-title');
    if (jobTitle) jobTitle.innerText = job ? `(${job.name})` : '(未知)';

    if(document.getElementById('total-atk')) document.getElementById('total-atk').innerText = getPlayerAttack();
  
    const timeStr = player.time.toString().padStart(2, '0') + ":00";
    document.getElementById('day-display').innerText = player.day;
    document.getElementById('time-display').innerText = timeStr;

    // ★ 更新生存條
    if(document.getElementById('hunger')) {
        document.getElementById('hunger').innerText = Math.floor(player.hunger);
        document.getElementById('hunger-bar').style.width = `${player.hunger}%`;
    }
    if(document.getElementById('thirst')) {
        document.getElementById('thirst').innerText = Math.floor(player.thirst);
        document.getElementById('thirst-bar').style.width = `${player.thirst}%`;
    }
    let weaponName = "無 (徒手)";
    if (player.weapon && itemData[player.weapon]) weaponName = itemData[player.weapon].name;
    let armorName = "無 (便服)";
    if (player.armor && itemData[player.armor]) armorName = itemData[player.armor].name;

    const wDisplay = document.getElementById('weapon-display');
    if(wDisplay) wDisplay.innerText = `${weaponName} / ${armorName}`;

    // 更新進度條
    const expPercent = Math.min(100, (player.exp / player.max_exp) * 100);
    const expBar = document.getElementById('exp-bar');
    if(expBar) expBar.style.width = `${expPercent}%`;

    const hpPercent = Math.min(100, (player.hp / player.max_hp) * 100);
    const hpBar = document.getElementById('hp-bar');
    if(hpBar) hpBar.style.width = `${hpPercent}%`;

    const energyPercent = Math.min(100, (player.energy / player.max_energy) * 100);
    const enBar = document.getElementById('energy-bar');
    if(enBar) enBar.style.width = `${energyPercent}%`;

    if(document.getElementById('gym-str')) document.getElementById('gym-str').innerText = player.strength;
    if(document.getElementById('gym-spd')) document.getElementById('gym-spd').innerText = player.speed;
    
    renderInventory();
}

// 啟動遊戲
initGame();initGame