// js/game.js

// --- 全域變數 ---
let currentAnimInterval = null;
let playerFrameIndex = 0;
let playerAnimInterval = null;
let enemyAnimInterval = null;
let jobPage = 1;
const JOB_PAGE_SIZE = 4;
// 戰鬥狀態旗標
let isFighting = false;

// 分頁變數
const SHOP_PAGE_SIZE = 4; 
let shopPage = 1;        
let shopCategory = 'all'; 
const ACH_PAGE_SIZE = 6; 
let achPage = 1;

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

            // 補全屬性
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
            if(player.dexterity === undefined) player.dexterity = 10; // ★ 新增
            if(player.accessory === undefined) player.accessory = null; // ★ 新增
            if(player.inventory === undefined) player.inventory = {};
            if(player.time === undefined) player.time = 8;

            player.time = Math.floor(player.time);

            if (!player.stats) {
                   player.stats = { fights_won:0, crimes_success:0, times_worked:0, items_bought:0, money_earned:0, food_eaten:0, days_lived:0 };
             }
            if (!player.achievements) player.achievements = [];
            
            // 修正 NaN
            if (isNaN(player.energy)) player.energy = 100;
            if (isNaN(player.hp)) player.hp = 100;
            if (isNaN(player.hunger)) player.hunger = 100;
            if (isNaN(player.thirst)) player.thirst = 100;
            if (isNaN(player.starvation_hours)) player.starvation_hours = 0;
            if (isNaN(player.dehydration_hours)) player.dehydration_hours = 0;

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
//靈敏度
function getPlayerDexterity() {
    let bonus = 0;
    if (player.accessory && itemData[player.accessory]) {
        bonus = itemData[player.accessory].value;
    }
    return player.dexterity + bonus;
}
function attemptEscape() {
    // 1. 取得當前敵人 (我們需要知道現在在打誰)
    // 由於之前的代碼沒有存 currentEnemy，我們去 DOM 抓名字反查，或是更簡單：
    // 在 startCombat 時把 enemyId 存到全域變數
    if (!window.currentEnemyId) {
        // 防呆：如果找不到敵人，直接離開
        endCombat();
        return;
    }
    
    const enemy = enemyData[window.currentEnemyId];
    const playerDex = getPlayerDexterity();
    const enemyDex = enemy.dex || 10; // 預設 10

    // 2. 計算成功率
    // 公式：玩家靈敏 / (玩家靈敏 + 敵人靈敏)
    // 例：玩家 20, 敵人 20 -> 50%
    // 例：玩家 10, 敵人 90 -> 10%
    // 例：玩家 90, 敵人 10 -> 90%
    let escapeChance = playerDex / (playerDex + enemyDex);
    
    // 加上一點基礎運氣，並設定上下限 (至少 10% 機會，最多 90% 機會)
    escapeChance = Math.min(0.9, Math.max(0.1, escapeChance));

    log(`嘗試逃跑... (成功率: ${Math.floor(escapeChance * 100)}%)`, "normal");

    // 3. 判定
    if (Math.random() < escapeChance) {
        log("💨 你成功甩掉了敵人！", "success");
        endCombat(); // 成功：呼叫原本的結束函數
    } else {
        log("🚫 逃跑失敗！被敵人攔住了！", "fail");
        // 失敗：不呼叫 endCombat，戰鬥繼續
        // 為了懲罰，可以扣一點時間
        passTime(1); 
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
    renderAchievements();
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

function gameOver(reason) {
    localStorage.removeItem('myTornGame');
    player.hp = 0;
    isFighting = false;
    
    let msg = "【💀 你已經死亡】\n\n";
    if (reason === "starvation") {
        msg += "死因：活活餓死。\n你在飢餓狀態下撐了 7 天，但身體終究到了極限。";
    } else if (reason === "dehydration") {
        msg += "死因：嚴重脫水。\n沒有水，人類只能撐 3 天。你倒在了尋找水源的路上。";
    } else {
        msg += "死因：街頭鬥爭。\n下次出門前記得帶把槍。";
    }
    
    alert(msg);
    location.reload();
}
// --- 戰鬥系統 ---

function startCombat(enemyId) {
    if (player.hp <= 0) { log("重傷無法戰鬥！", "fail"); return; }
    if (player.energy < 5) { log("體力不足！", "fail"); return; }

    player.energy -= 5;
    updateUI();

    document.getElementById('enemy-selection').style.display = 'none';
    document.getElementById('combat-screen').style.display = 'block';
    
    // ★ 記錄當前敵人 ID (給逃跑用)
    window.currentEnemyId = enemyId;

    const enemy = enemyData[enemyId];
    document.getElementById('enemy-name').innerText = enemy.name;
    document.getElementById('battle-log').innerHTML = '';

    isFighting = true;
    simulateFight(enemy);
}
function endCombat() {
    isFighting = false;
    document.getElementById('enemy-selection').style.display = 'block';
    document.getElementById('combat-screen').style.display = 'none';
    log("你逃離了戰鬥。", "normal");
}

async function simulateFight(originalEnemy) {
    let enemyHp = originalEnemy.hp;
    const battleLog = document.getElementById('battle-log');
    
    // ★ 新增：回合計數器
    let rounds = 0; 
    
    const addLog = (msg, style) => {
        const div = document.createElement('div');
        div.className = `log-line ${style}`;
        div.innerText = msg;
        battleLog.appendChild(div);
        battleLog.scrollTop = battleLog.scrollHeight;
    };

    const wait = (ms) => new Promise(r => setTimeout(r, ms));

    addLog(`=== 遭遇 ${originalEnemy.name} (HP: ${enemyHp}) ===`, "normal");

    while (enemyHp > 0 && player.hp > 0 && isFighting) {
        
        // ★ 新增：回合開始
        rounds++; 

        await wait(600);
        if (!isFighting) break;

        // 玩家回合
        let totalAtk = getPlayerAttack();
        let dmg = Math.floor(totalAtk * (0.8 + Math.random() * 0.4));
        let hitChance = 0.8 + (player.speed - originalEnemy.spd) * 0.01;
        
        if (Math.random() > hitChance) dmg = 0; 

        if (dmg > 0) {
            enemyHp -= dmg;
            addLog(`[R${rounds}] 你造成 ${dmg} 傷害 (敵剩: ${Math.max(0, enemyHp)})`, "log-player");
        } else {
            addLog(`[R${rounds}] 你的攻擊揮空了！`, "log-enemy");
        }

        if (enemyHp <= 0) break;
        
        await wait(400);
        if (!isFighting) break;

        // 敵人回合
        let totalDef = getPlayerDefense();
        let enemyDmg = Math.floor(originalEnemy.str * (0.8 + Math.random() * 0.4));
        enemyDmg = Math.max(1, Math.floor(enemyDmg - (totalDef * 0.5)));
        let dodgeChance = 0.1 + (player.speed - originalEnemy.spd) * 0.01;
        
        if (Math.random() < dodgeChance) {
            addLog(`[R${rounds}] 你閃過了攻擊！`, "log-player");
        } else {
            player.hp = Math.max(0, player.hp - enemyDmg);
            addLog(`[R${rounds}] 敵人造成 ${enemyDmg} 傷害。`, "log-enemy");
            updateUI(); 
        }
    }

    if (!isFighting) return;

    await wait(500);
    
    // ★ 修改：時間計算 (1 回合 = 0.5 小時)
    const timeCost = Math.ceil(rounds * 0.5);
    passTime(timeCost);

    if (player.hp > 0) {
        player.stats.money_earned += originalEnemy.reward;
        player.stats.fights_won++;

        let expGain = originalEnemy.exp || 10;
        
        addLog(`=== 勝利 ===`, "log-win");
        addLog(`獲得: $${originalEnemy.reward}, Exp +${expGain}`, "log-win");
        addLog(`激戰 ${rounds} 回合，經過了 ${timeCost} 小時。`, "normal");

        gainExp(expGain);
        updateUI();

        if (window.currentEnemyId === 'boss') {
             if (!player.achievements.includes('kill_boss')) {
                 player.achievements.push('kill_boss');
                 showToast('新秩序');
                 log(`🏆 成就解鎖：新秩序`, "success");
             }
        }
        checkAchievements();

    } else {
        addLog(`=== 死亡 ===`, "log-die");
        addLog(`你被擊殺了...`, "log-die");
        await wait(1000); 
        gameOver();
    }
    
    isFighting = false;
}

// --- 核心與時間 ---

function gameTick() {
    const now = Date.now();
    const timeLeft = Math.ceil((gameConfig.restCooldown - (now - player.last_rest)) / 1000);
    const restTimer = document.getElementById('rest-timer');
    
}

function passTime(hours) {
    player.time += hours;
    
    if (player.time >= 24) {
        player.time -= 24;
        player.day += 1;
        
        const currentHouse = houseData[player.house] || houseData['shack'];
        const mult = currentHouse.decayMult || 1.0;

        const hungerLoss = Math.floor(gameConfig.dailyHungerDecay * mult);
        const thirstLoss = Math.floor(gameConfig.dailyThirstDecay * mult);

        player.hunger -= hungerLoss;
        player.thirst -= thirstLoss;
        
        log(`=== 第 ${player.day} 天開始 ===`, "normal");
        log(`過了一夜，飢餓 -${hungerLoss}，口渴 -${thirstLoss}`, "fail");

        checkSurvivalStatus();
    }
    
    player.hunger = Math.max(0, player.hunger - (hours * 2));
    player.thirst = Math.max(0, player.thirst - (hours * 3));
    
    checkSurvivalStatus(hours);

    updateUI();
}

function checkSurvivalStatus(hoursPassed) {
    // --- A. 飢餓檢查 ---
    if (player.hunger <= 0) {
        player.hunger = 0;
        player.starvation_hours += hoursPassed;
        
        // 瀕死警告 (每過一段時間提醒一次)
        let left = gameConfig.starvationLimit - player.starvation_hours;
        if (left <= 24 || player.starvation_hours % 12 === 0) {
            log(`☠️ 極度飢餓！若不進食，將在 ${left} 小時後死亡！`, "log-die");
        }
    } else {
        // 如果有吃東西，計時器歸零 (或是你可以設計成慢慢恢復)
        player.starvation_hours = 0;
        
        // 低數值警告
        if (player.hunger <= 20) {
            log("⚠️ 肚子非常餓 (低於 20)，請盡快進食！", "fail");
        }
    }

    // --- B. 口渴檢查 ---
    if (player.thirst <= 0) {
        player.thirst = 0;
        player.dehydration_hours += hoursPassed;
        
        let left = gameConfig.dehydrationLimit - player.dehydration_hours;
        if (left <= 12 || player.dehydration_hours % 6 === 0) {
            log(`☠️ 極度脫水！若不喝水，將在 ${left} 小時後死亡！`, "log-die");
        }
    } else {
        player.dehydration_hours = 0;
        
        if (player.thirst <= 20) {
            log("⚠️ 喉嚨像火燒一樣 (低於 20)，快找水喝！", "fail");
        }
    }

    // --- C. 死亡執行 ---
    if (player.starvation_hours >= gameConfig.starvationLimit) {
        gameOver("starvation");
    }
    else if (player.dehydration_hours >= gameConfig.dehydrationLimit) {
        gameOver("dehydration");
    }
}

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

    if (player.energy < gameConfig.workCost) { log("體力不足！", "fail"); return; }
    
    player.energy -= gameConfig.workCost;
    player.money += job.salary;
    player.stats.times_worked++; 
    player.stats.money_earned += job.salary;
    checkAchievements(); 
    
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
        
        passTime(gameConfig.trainTime);
        
        log(`訓練結束 (+${gain} ${stat})`, "success");
        updateUI();
    } else { log("體力不足！", "fail"); }
}

function commitCrime(crimeId) {
    if (player.hp <= 0) { log("在醫院無法犯罪！", "fail"); return; } 

    const crime = crimeData[crimeId];
    const timeCost = crime.time || 1;
    
    if (player.energy >= crime.cost) { 
        player.energy -= crime.cost; 
        
        passTime(timeCost);

        if (Math.random() < crime.successRate) {
            player.money += crime.reward;
            player.stats.crimes_success++;
            player.stats.money_earned += crime.reward;
            gainExp(1);
            log(`犯罪成功：${crime.name} (+$${crime.reward})`, "success");
            
            if (crimeId === 'rob_granny' && !player.achievements.includes('master_thief')) {
                 player.achievements.push('master_thief');
                 showToast('神偷');
                 log(`🏆 成就解鎖：神偷`, "success");
            }
        } else { 
            log(`犯罪失敗：${crime.failMsg}`, "fail"); 
        }
        
        checkAchievements();
        updateUI();
    } else { 
        log("體力不足！", "fail"); 
    }
}

// --- 其他功能 ---

function rest() {
    // 1. 取得玩家輸入的小時數
    const input = document.getElementById('rest-hours');
    let hours = parseInt(input.value);

    // 防呆：確保至少睡 1 小時，且不能輸入奇怪的數字
    if (isNaN(hours) || hours < 1) hours = 1;
    // 上限 24 小時 (避免一次睡太久直接餓死)
    if (hours > 24) hours = 24; 

    // 2. 取得房屋每小時回復量
    const house = houseData[player.house];
    const restorePerHr = house.restore; 

    // 3. 計算總回復量
    const totalRestore = restorePerHr * hours;

    // 4. 消耗時間 (這會觸發飢餓/口渴扣除)
    passTime(hours); 

    // 5. 執行回復
    player.hp = Math.min(player.max_hp, player.hp + totalRestore);
    player.energy = Math.min(player.max_energy, player.energy + totalRestore);
    
    // 顯示結果
    log(`你睡了 ${hours} 小時。 (HP+${totalRestore}, 體力+${totalRestore})`, "success");
    updateUI();
}

function renderIntroJobs() {
    const intro = document.getElementById('intro-screen');
    const app = document.getElementById('app-container');
    if(intro) intro.style.display = 'flex';
    if(app) app.style.display = 'none';
    
    const list = document.getElementById('intro-job-list');
    if (!list) return;
    list.innerHTML = '';
    
    // 1. 將物件轉為陣列以便切片
    const allJobs = Object.entries(jobData);
    const totalPages = Math.ceil(allJobs.length / JOB_PAGE_SIZE);
    
    // 防呆
    if (jobPage > totalPages) jobPage = 1;
    if (jobPage < 1) jobPage = 1;

    // 2. 計算當前頁面的範圍
    const startIndex = (jobPage - 1) * JOB_PAGE_SIZE;
    const endIndex = startIndex + JOB_PAGE_SIZE;
    const jobsToShow = allJobs.slice(startIndex, endIndex);

    // 3. 渲染職業卡片
    jobsToShow.forEach(([id, job]) => {
        const card = document.createElement('div');
        card.className = 'job-select-card';
        
        // 處理獎勵描述
        let bonusDesc = job.startBonus ? job.startBonus.desc : "無";

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; border:none;">${job.name}</h3>
                <span style="color:#f1c40f; font-weight:bold;">$${job.salary}/日</span>
            </div>
            <p style="color:#aaa; margin:10px 0; font-size:0.9rem; height:40px; overflow:hidden;">${job.desc}</p>
            <div class="job-bonus-list" style="margin-top:5px;">🎁 ${bonusDesc}</div>
        `;
        // 點擊卡片直接選擇
        card.onclick = () => chooseStartJob(id);
        list.appendChild(card);
    });

    // 4. 加入分頁按鈕 (動態產生，不需修改 HTML)
    // 先移除舊的分頁控制項 (如果有的話)
    const oldPagination = document.getElementById('intro-pagination');
    if (oldPagination) oldPagination.remove();

    if (totalPages > 1) {
        const paginationDiv = document.createElement('div');
        paginationDiv.id = 'intro-pagination';
        paginationDiv.style.cssText = "display:flex; justify-content:center; align-items:center; gap:20px; width:100%; margin-top:20px; grid-column: 1 / -1;";
        
        paginationDiv.innerHTML = `
            <button class="action-btn" onclick="changeJobPage(-1)" ${jobPage === 1 ? 'disabled style="background:#444; color:#666;"' : ''}>◀ 上一頁</button>
            <span style="color:#888;">${jobPage} / ${totalPages}</span>
            <button class="action-btn" onclick="changeJobPage(1)" ${jobPage === totalPages ? 'disabled style="background:#444; color:#666;"' : ''}>下一頁 ▶</button>
        `;
        
        // 將分頁按鈕插入到列表之後
        list.parentElement.appendChild(paginationDiv);
    }
}

function chooseStartJob(jobId) {
    const job = jobData[jobId];
    
    // 1. 重置玩家狀態 (深拷貝以避免物件參照問題)
    // 確保 inventory 是一個全新的空物件
    player = JSON.parse(JSON.stringify(defaultPlayerState)); 
    player.job = jobId;
    
    if (job.startBonus) {
        const bonus = job.startBonus;

        // --- A. 特殊裝備處理 ---
        if (bonus.weapon) {
            player.inventory[bonus.weapon] = 1;
            player.weapon = bonus.weapon;
        }
        if (bonus.armor) {
            player.inventory[bonus.armor] = 1;
            player.armor = bonus.armor;
        }
        if (bonus.accessory) {
            player.inventory[bonus.accessory] = 1;
            player.accessory = bonus.accessory;
        }

        // --- B. 道具處理 (關鍵修正) ---
        if (bonus.inventory) {
            // 情況 1: 如果是物件格式 (例如密醫: { 'first_aid_kit': 1, 'morphine': 1 })
            if (typeof bonus.inventory === 'object') {
                for (const [itemId, count] of Object.entries(bonus.inventory)) {
                    // 確保背包有這個欄位
                    player.inventory[itemId] = (player.inventory[itemId] || 0) + count;
                }
            } 
            // 情況 2: 如果是單一字串格式 (舊版相容)
            else if (typeof bonus.inventory === 'string') {
                player.inventory[bonus.inventory] = 1;
            }
        }

        // --- C. 數值屬性處理 ---
        // 自動將 bonus 中的數值加到 player 上 (排除非數值欄位)
        const excludeKeys = ['desc', 'weapon', 'armor', 'accessory', 'inventory'];
        
        for (const [key, value] of Object.entries(bonus)) {
            // 檢查 key 是否為不需處理的特殊欄位，且 value 必須是數字
            if (!excludeKeys.includes(key) && typeof value === 'number') {
                if (player.hasOwnProperty(key)) {
                    player[key] += value;
                }
            }
        }
        
        // --- D. 修正當前狀態 ---
        // 避免上限提升了(例如 max_hp)，但當前數值(hp)還是舊的
        player.hp = player.max_hp;
        player.energy = player.max_energy;
        player.hunger = player.max_hunger;
        player.thirst = player.max_thirst;
    }
    
    // 切換畫面
    document.getElementById('intro-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    
    log(`新遊戲開始！你的身分是：${job.name}`, "success");
    saveGame(); // 立即存檔
    startGameLoop();
}
function changeJobPage(direction) {
    jobPage += direction;
    renderIntroJobs();
}
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
    let finalCost = item.cost;
    if (player.completed_courses.includes('business_course')) {
        finalCost = Math.floor(finalCost * 0.9);
    }
    if (player.money >= item.cost) {
        player.money -= item.cost;
        if (player.inventory[itemId]) { player.inventory[itemId]++; } else { player.inventory[itemId] = 1; }
        let costMsg = `$${finalCost}`;
        if (finalCost < item.cost) costMsg += ` (原價$${item.cost})`;
        log(`購買成功：${item.name} 花費 ${costMsg}`, "success");
        player.stats.items_bought++; 
        checkAchievements();
        updateUI();
    } else { log("金錢不足！", "fail"); }
}

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
        const item = itemData[id];
        if (!item) {
            // 如果找不到物品資料，在 Console 顯示錯誤但不讓遊戲當掉
            console.warn(`警告：背包內有未知物品 ID [${id}]，請檢查 data.js 的 itemData`);
            return; // 跳過這個壞掉的物品，繼續畫下一個
        }
        if (qty > 0) {
           
            
            const isEquippedWeapon = (player.weapon === id);
            const isEquippedArmor = (player.armor === id);
            const isEquippedAccessory = (player.accessory === id); // ★ 新增
            
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
            
            // 按鈕邏輯
            if (item.type === 'weapon') {
                if (isEquippedWeapon) { btn.innerText = "已裝備"; btn.style.background = "#e74c3c"; btn.disabled = true; } 
                else { btn.innerText = "裝備武器"; btn.style.background = "#2980b9"; btn.onclick = () => equipItem(id); }
            } else if (item.type === 'armor') {
                if (isEquippedArmor) { btn.innerText = "已裝備"; btn.style.background = "#e74c3c"; btn.disabled = true; } 
                else { btn.innerText = "裝備防具"; btn.style.background = "#27ae60"; btn.onclick = () => equipItem(id); }
            } else if (item.type === 'accessory') { // ★ 新增飾品邏輯
                if (isEquippedAccessory) { btn.innerText = "已裝備"; btn.style.background = "#e74c3c"; btn.disabled = true; } 
                else { btn.innerText = "裝備飾品"; btn.style.background = "#9b59b6"; btn.onclick = () => equipItem(id); }
            } else {
                btn.innerText = "使用"; btn.style.background = "#444"; btn.onclick = () => useItem(id);
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
    else if (item.type === 'accessory') { player.accessory = itemId; log(`佩戴了飾品：${item.name}`, "success"); } // ★ 新增
    updateUI();
}

function useItem(itemId) {
    // ★ 防呆：不能吃飾品
    const item = itemData[itemId];
    if (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory') return; 
    
    // ... (剩下的使用邏輯保持不變) ...
    // (請直接使用原本的內容)
    if (!player.inventory[itemId] || player.inventory[itemId] <= 0) return;
    
    let msg = "";
    if (item.type === 'hp') { 
        player.hp = Math.min(player.max_hp, player.hp + item.value);
        msg = "回復生命";
    } 
    else if (item.type === 'energy') { 
        player.energy = Math.min(player.max_energy, player.energy + item.value);
        msg = "回復體力";
    }
    else if (item.type === 'hunger') {
        player.hunger = Math.min(player.max_hunger, player.hunger + item.value);
        msg = "填飽肚子";
    }
    else if (item.type === 'thirst') {
        player.thirst = Math.min(player.max_thirst, player.thirst + item.value);
        msg = "解渴";
    }
    if (item.category === 'food' || item.category === 'drink') {
        player.stats.food_eaten++;
    }
    if (item.extraEffect) {
        if(item.extraEffect.energy) player.energy = Math.min(player.max_energy, player.energy + item.extraEffect.energy);
        if(item.extraEffect.thirst) player.thirst = Math.min(player.max_thirst, player.thirst + item.extraEffect.thirst);
    }
    
    log(`使用了 ${item.name} (${msg})`, "success");
    
    player.inventory[itemId]--;
    if (player.inventory[itemId] <= 0) delete player.inventory[itemId];
    checkAchievements();
    updateUI();
}

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
    return Math.floor(player.strength * 0.5) + armorDef; 
}
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

function checkAchievements() {
    let newUnlock = false;
    achievementList.forEach(ach => {
        if (!player.achievements.includes(ach.id) && ach.check(player)) {
            player.achievements.push(ach.id);
            showToast(ach.name);
            log(`🏆 成就解鎖：${ach.name} - ${ach.desc}`, "success");
            newUnlock = true;
        }
    });
    if (newUnlock && document.getElementById('achievements').classList.contains('active')) {
        renderAchievements();
    }
}

function showToast(achName) {
    console.log(`[系統紀錄] 🏆 成就解鎖：${achName}`);
}

function renderAchievements() {
    const list = document.getElementById('achievement-list');
    if (!list) return;
    list.innerHTML = '';

    const count = player.achievements.length;
    const total = achievementList.length;
    if(document.getElementById('achievement-progress')) {
        document.getElementById('achievement-progress').innerText = `${count} / ${total}`;
        document.getElementById('achievement-bar').style.width = `${(count/total)*100}%`;
    }

    const totalPages = Math.ceil(total / ACH_PAGE_SIZE);
    if (achPage > totalPages && totalPages > 0) achPage = totalPages;
    if (achPage < 1) achPage = 1;

    const startIndex = (achPage - 1) * ACH_PAGE_SIZE;
    const endIndex = startIndex + ACH_PAGE_SIZE;
    const itemsToShow = achievementList.slice(startIndex, endIndex);

    itemsToShow.forEach(ach => {
        const isUnlocked = player.achievements.includes(ach.id);
        const card = document.createElement('div');
        card.className = `ach-card ${isUnlocked ? 'unlocked' : ''}`;
        card.innerHTML = `
            <h4>
                ${ach.name} 
                <span>${isUnlocked ? '✅' : '🔒'}</span>
            </h4>
            <p>${ach.desc}</p>
        `;
        list.appendChild(card);
    });

    let paginationDiv = document.getElementById('ach-pagination');
    if (!paginationDiv) {
        paginationDiv = document.createElement('div');
        paginationDiv.id = 'ach-pagination';
        paginationDiv.className = 'pagination-controls';
        list.parentNode.appendChild(paginationDiv);
    }

    if (totalPages <= 1) {
        paginationDiv.style.display = 'none';
    } else {
        paginationDiv.style.display = 'flex';
        paginationDiv.innerHTML = `
            <button class="page-btn" onclick="changeAchPage(-1)" ${achPage === 1 ? 'disabled' : ''}>◀</button>
            <span class="page-info">${achPage} / ${totalPages}</span>
            <button class="page-btn" onclick="changeAchPage(1)" ${achPage === totalPages ? 'disabled' : ''}>▶</button>
        `;
    }
}

function changeAchPage(direction) {
    achPage += direction;
    renderAchievements(); 
}

function renderEstate() {
    const list = document.getElementById('estate-list');
    if(!list) return;
    list.innerHTML = '';

    const currentHouse = houseData[player.house];
    document.getElementById('current-house-name').innerText = currentHouse.name;
    document.getElementById('current-house-mult').innerText = `+${currentHouse.restore}/次`; 

    for (const [id, house] of Object.entries(houseData)) {
        if (id === 'shack') continue; 

        const isOwned = player.house === id;
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <h4>${house.name}</h4>
                <span style="color:var(--accent-green)">$${house.cost}</span>
            </div>
            <p style="font-size:0.8rem; color:#aaa">${house.desc}</p>
            <p style="font-size:0.9rem; color:#3498db">回復量: ${house.restore}</p>
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
    if (player.completed_courses.includes(courseId)) return;
    if (player.money < course.cost) { log("學費不足！", "fail"); return; }
    if (player.energy < course.energyCost) { log("體力不足，讀書是很累的！", "fail"); return; }

    player.money -= course.cost;
    player.energy -= course.energyCost;
    player.completed_courses.push(courseId);
    
    if (course.effect) {
        course.effect(player);
    }

    log(`課程完成：${course.name}！獲得了能力提升。`, "success");
    renderEdu();
    updateUI();
}

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
// 1. 隱藏所有面板
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
// 2. 顯示目標面板
    const targetPanel = document.getElementById(panelId);
    if(targetPanel) targetPanel.classList.add('active');
// 3. 更新按鈕狀態
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(btn => btn.getAttribute('onclick').includes(panelId));
    if (activeBtn) activeBtn.classList.add('active');
// 4. 手機版收合選單
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
    }
// 5. 戰鬥狀態處理
    if (panelId !== 'fight' && isFighting) {
        isFighting = false;
        document.getElementById('enemy-selection').style.display = 'block';
        document.getElementById('combat-screen').style.display = 'none';
        log("你離開了戰鬥現場。", "normal");
    }
    if (panelId === 'achievements') {
        renderAchievements();
    }
    if (panelId === 'shop') {
        renderShop();
    }
}
function gainExp(amount) {
    player.exp += amount;
    while (player.exp >= player.max_exp) {
        player.level++;
        player.exp -= player.max_exp;
        player.max_exp = Math.floor(player.max_exp * 1.2); 
        player.max_hp += 10;
        player.hp = player.max_hp;
        player.strength += 2;
        player.speed += 2;
        player.dexterity += 1; // ★ 新增：升級加靈敏度
        
        log(`🎉 升級了！現在等級 ${player.level}！(全屬性提升)`, "success");
    }
    updateUI(); 
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
  if(document.getElementById('total-def')) document.getElementById('total-def').innerText = getPlayerDefense();
    if(document.getElementById('total-dex')) document.getElementById('total-dex').innerText = getPlayerDexterity();
    const hours = Math.floor(player.time); 
    const minutes = (player.time % 1) * 60; // 取小數部分 * 60
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    document.getElementById('day-display').innerText = player.day;
    document.getElementById('time-display').innerText = timeStr;

   if(document.getElementById('hunger')) {
        document.getElementById('hunger').innerText = Math.floor(player.hunger);
        const hBar = document.getElementById('hunger-bar');
        hBar.style.width = `${Math.max(0, player.hunger)}%`;
        
        // < 20 變紅， 0 變深紅
        if (player.hunger <= 0) hBar.style.background = "#8e44ad"; // 紫色 (瀕死)
        else if (player.hunger <= 20) hBar.style.background = "#e74c3c"; // 紅色 (警告)
        else hBar.style.background = "#d35400"; // 正常橘色
    }
    if(document.getElementById('thirst')) {
        document.getElementById('thirst').innerText = Math.floor(player.thirst);
        const tBar = document.getElementById('thirst-bar');
        tBar.style.width = `${Math.max(0, player.thirst)}%`;

        if (player.thirst <= 0) tBar.style.background = "#8e44ad";
        else if (player.thirst <= 20) tBar.style.background = "#e74c3c"; 
        else tBar.style.background = "#3498db"; 
    }
    let weaponName = "無 (徒手)";
    if (player.weapon && itemData[player.weapon]) weaponName = itemData[player.weapon].name;
    let armorName = "無 (裸體)";
    if (player.armor && itemData[player.armor]) armorName = itemData[player.armor].name;
    let accName = "無 (空)";
    if (player.accessory && itemData[player.accessory]) accName = itemData[player.accessory].name;
    
    const wDisplay = document.getElementById('weapon-display');
    if(wDisplay) wDisplay.innerText = `${weaponName} / ${armorName} / ${accName}`;

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
    checkAchievements();
    if (document.getElementById('achievements').classList.contains('active')) {
        renderAchievements();
    }
    renderInventory();
    const restBtn = document.getElementById('btn-rest');
    if (restBtn && houseData[player.house]) {
        const restore = houseData[player.house].restore;
        // 這裡顯示 "回復 10 / hr"
        restBtn.innerText = `🛌 開始睡覺 (回復 ${restore} / hr)`;
    }
    if (document.getElementById('estate').classList.contains('active')) {
        renderEstate();
    }
}

// 啟動遊戲
initGame();