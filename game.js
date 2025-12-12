// js/game.js

// --- 全域變數 ---
let currentAnimInterval = null;
let playerFrameIndex = 0;
let playerAnimInterval = null;
let enemyAnimInterval = null;
let jobPage = 1;
const JOB_PAGE_SIZE = 4;
let currentQuestStage = 1;
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
            if (player.daily_challenges && player.daily_challenges.length > 0 && typeof player.daily_challenges[0] === 'string') {
                console.log("偵測到舊版每日任務，強制刷新...");
                generateDailyChallenges();
            }
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
            if(player.accessory === undefined) player.accessory = null; // ★ 新增
            if(player.inventory === undefined) player.inventory = {};
            if(player.time === undefined) player.time = 8;
            if (!player.daily_challenges) player.daily_challenges = [];
            if (!player.daily_progress) player.daily_progress = {};
            if (!player.daily_completed) player.daily_completed = [];
            if (!player.last_daily_reset) player.last_daily_reset = 1;
            if (!player.main_quests_completed) player.main_quests_completed = [];
            if (!player.ach_shop_purchased) player.ach_shop_purchased = [];
            if (!player.perm_buffs) player.perm_buffs = {};
            if (!player.enemyLevels) player.enemyLevels = {};
            if (!player.weather) {
                player.weather = 'sunny';
                updateWeather(); // 如果是舊存檔，隨機給一個天氣
                }
            if (!player.skills) {
                player.skills = { lockpicking: 0, hacking: 0, driving: 0, stealth: 0 };
                }
            initDailyChallenges();
            player.time = Math.floor(player.time);
            let maxCompletedStage = 0;
            player.main_quests_completed.forEach(qid => {
                const q = mainQuests.find(mq => mq.id === qid);
                if (q && q.stage > maxCompletedStage) {
                    maxCompletedStage = q.stage;
                }
            });

            // 設定當前頁面為「最大已完成章節」或「下一章」(如果該章節還沒全解完，就停在那章，如果全解完就跳下一章)
            // 這裡簡單處理：直接設定為 (最大已完成章節) 或是 1
            // 但更聰明的做法是：檢查該章節是否還有未完成的任務，如果都完成了，就跳下一章

            // 簡單邏輯：預設跳到最大已完成章節，如果為0就跳1
            currentQuestStage = maxCompletedStage === 0 ? 1 : maxCompletedStage;

            // 如果當前章節的所有任務都完成了，自動跳到下一章 (除非已經是最後一章)
            const currentStageQuests = mainQuests.filter(q => q.stage === currentQuestStage);
            const isAllDone = currentStageQuests.every(q => player.main_quests_completed.includes(q.id));
            if (isAllDone && currentQuestStage < 5) { // 假設5是最大章
                currentQuestStage++;
            }
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
// === 新手教學系統 ===

// 顯示教學彈窗
function showTutorial() {
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

// 關閉教學彈窗
function closeTutorial() {
    const overlay = document.getElementById('tutorial-overlay');
    const dontShow = document.getElementById('tutorial-dont-show');
    
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    // 如果勾選「不再顯示」，儲存到 localStorage
    if (dontShow && dontShow.checked) {
        localStorage.setItem('hideTutorial', 'true');
    }
}

// 檢查是否需要顯示教學
function checkShowTutorial() {
    const hideTutorial = localStorage.getItem('hideTutorial');
    
    // 如果沒有勾選過「不再顯示」，就顯示教學
    if (hideTutorial !== 'true') {
        // 延遲 500ms 顯示，讓遊戲介面先載入
        setTimeout(() => {
            showTutorial();
        }, 500);
    }
}
function updateWeather() {
    const keys = Object.keys(weatherData);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    player.weather = randomKey;
    
    const w = weatherData[randomKey];
    log(`氣象報告：今天天氣是【${w.name}】`, "normal");
    log(`影響：${w.desc}`, "normal");
    
    // 如果是酸雨，隨機扣點血
    if (randomKey === 'acid_rain') {
        player.hp = Math.max(1, player.hp - 5);
        log("酸雨腐蝕了你的皮膚 (HP-5)", "fail");
    }
}
function attemptEscape() {
    if (!window.currentEnemyId) { endCombat(); return; }
    
    const enemy = typeof getEnemyCurrentState === 'function' 
                  ? getEnemyCurrentState(window.currentEnemyId) 
                  : enemyData[window.currentEnemyId];
    
    // ★ 修改：使用總速度 (含裝備) vs 敵人速度
    const playerSpd = getPlayerSpeed();
    const enemySpd = enemy.spd || 10;

    // 計算成功率 (速度越快，逃跑率越高)
    let escapeChance = playerSpd / (playerSpd + enemySpd);
    
    // 限制機率 10% ~ 90%
    escapeChance = Math.min(0.9, Math.max(0.1, escapeChance));
    
    const escapeTimeCost = 0.5;
    log(`嘗試逃跑... (成功率 ${Math.floor(escapeChance*100)}%)`, "normal");

    if (Math.random() < escapeChance) {
        log("💨 你憑藉著速度甩掉了敵人！", "success");
        passTime(escapeTimeCost);
        endCombat();
    } else {
        log("🚫 逃跑失敗！敵人的速度比你快！", "fail");
        passTime(escapeTimeCost * 2);
        const damage = Math.max(1, Math.floor(enemy.str * 0.5));
        player.hp = Math.max(0, player.hp - damage);
        
        const battleLog = document.getElementById('battle-log');
        if(battleLog) {
             const div = document.createElement('div');
             div.className = 'log-line log-enemy';
             div.innerText = `逃跑失敗，受到 ${damage} 點傷害！`;
             battleLog.appendChild(div);
             battleLog.scrollTop = battleLog.scrollHeight;
        }
        
        updateUI();
        if (player.hp <= 0) {
            log("你在逃跑失敗後被擊倒了...", "fail");
            gameOver('dead');
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
function getEnemyCurrentState(id) {
    const base = enemyData[id];
    if (!base) return null;
    let lvl = 1;
    if (player && player.enemyLevels && player.enemyLevels[id]) {
        lvl = player.enemyLevels[id];
    }
    // 自己調整成你想要的成長公式
    const hp    = Math.floor(base.hp   * (1 + 0.4 * (lvl - 1)));  // 每級 +30% HP
    const str   = Math.floor(base.str  * (1 + 0.25 * (lvl - 1))); // 每級 +25% 攻
    const spd   = Math.floor(base.spd  * (1 + 0.2 * (lvl - 1)));  // 每級 +20% 速
    const dex   = Math.floor(base.dex  * (1 + 0.2 * (lvl - 1)));  // 每級 +20% 靈巧
    const reward = Math.floor(base.reward * (1 + 0.35 * (lvl - 1))); // 每級 +15% 獎金
    const exp    = Math.floor(base.exp    * (1 + 0.3 * (lvl - 1))); // 每級 +15% EXP
    
    return {
        ...base,
        lvl,
        hp,
        str,
        spd,
        dex,
        reward,
        exp
    };
}

function startCombat(enemyId) {
    if (player.hp <= 0) { log("重傷無法戰鬥！", "fail"); return; }
    if (player.energy < 5) { log("體力不足！", "fail"); return; }

    player.energy -= 5;
    updateUI();

    document.getElementById('enemy-selection').style.display = 'none';
    document.getElementById('combat-screen').style.display = 'block';
    
    // ★ 記錄當前敵人 ID (給逃跑用)
    window.currentEnemyId = enemyId;

    const enemy = getEnemyCurrentState(enemyId);
    document.getElementById('enemy-name').innerText = `${enemy.name} (Lv.${enemy.lvl})`;
    document.getElementById('battle-log').innerHTML = '';
    const leaveBtn = document.getElementById('btn-leave-fight');
    const escapeBtn = document.getElementById('btn-escape');
    if (leaveBtn) leaveBtn.style.display = 'none';
    if (leaveBtn) leaveBtn.style.display = 'none';  // 剛開始打，不能離開
    if (escapeBtn) escapeBtn.style.display = 'block'; // 剛開始打，可以逃跑
    isFighting = true;
    simulateFight(enemy, enemyId);
}
function endCombat() {
    isFighting = false;
    document.getElementById('enemy-selection').style.display = 'block';
    document.getElementById('combat-screen').style.display = 'none';
    renderEnemies();
    log("戰鬥結束。", "normal");
}

// game.js -> simulateFight (最終修復版)

async function simulateFight(originalEnemy, enemyId) {
    let enemyHp = originalEnemy.hp;
    const battleLog = document.getElementById('battle-log');
    let rounds = 0; 
    
    // 輔助函式：寫入戰鬥日誌
    const addLog = (msg, style) => {
        if (!battleLog) return;
        const div = document.createElement('div');
        div.className = `log-line ${style}`;
        div.innerText = msg;
        battleLog.appendChild(div);
        battleLog.scrollTop = battleLog.scrollHeight;
    };

    const wait = (ms) => new Promise(r => setTimeout(r, ms));

    addLog(`=== 遭遇 ${originalEnemy.name} (HP: ${enemyHp}) ===`, "normal");

    // === 戰鬥迴圈 ===
    while (enemyHp > 0 && player.hp > 0 && isFighting) {
        rounds++; 
        await wait(600); // 攻擊節奏
        if (!isFighting) break;

        // --- 1. 玩家攻擊回合 ---
        let totalAtk = getPlayerAttack();
        let dmg = Math.floor(totalAtk * (0.8 + Math.random() * 0.4)); // 浮動傷害
        
        // 命中率計算
        let hitChance = 0.8 + (player.speed - originalEnemy.spd) * 0.01;
        if (player.weather === 'fog') hitChance -= 0.2; // 濃霧天降低命中
        if (Math.random() > hitChance) dmg = 0; 

        if (dmg > 0) {
            enemyHp -= dmg;
            
            // 武器耐久損耗
            if (player.weapon) {
                player.weapon_dura--;
                if (player.weapon_dura <= 0) {
                    const wName = itemData[player.weapon]?.name || "武器";
                    addLog(`💥 你的 ${wName} 壞掉了！`, "fail");
                    
                    const brokenId = player.weapon;
                    player.weapon = null;
                    player.weapon_dura = 0;
                    
                    // 扣除背包庫存
                    if (player.inventory[brokenId]) {
                        player.inventory[brokenId]--;
                        if (player.inventory[brokenId] <= 0) delete player.inventory[brokenId];
                    }
                }
            }
            addLog(`[R${rounds}] 你造成 ${dmg} 傷害 (敵人剩: ${Math.max(0, enemyHp)})`, "log-player");
        } else {
            addLog(`[R${rounds}] 你的攻擊揮空了！`, "log-enemy");
        }

        if (enemyHp <= 0) break; // 敵人死了，跳出迴圈
        
        await wait(400);
        if (!isFighting) break;

        // --- 2. 敵人攻擊回合 ---
        let totalDef = getPlayerDefense();
        let enemyDmg = Math.floor(originalEnemy.str * (0.8 + Math.random() * 0.4));
        enemyDmg = Math.max(1, Math.floor(enemyDmg - (totalDef * 0.5))); // 扣除防禦
        
        // 閃避率計算
        let dodgeChance = 0.1 + (player.speed - originalEnemy.spd) * 0.01;
        
        if (Math.random() < dodgeChance) {
            addLog(`[R${rounds}] 你閃過了攻擊！`, "log-player");
        } else {
            player.hp = Math.max(0, player.hp - enemyDmg);
            
            // 防具耐久損耗
            if (player.armor) {
                player.armor_dura--;
                if (player.armor_dura <= 0) {
                    const aName = itemData[player.armor]?.name || "防具";
                    addLog(`💥 你的 ${aName} 被打爛了！`, "fail");
                    
                    const brokenId = player.armor;
                    player.armor = null;
                    player.armor_dura = 0;
                    
                    if (player.inventory[brokenId]) {
                        player.inventory[brokenId]--;
                        if (player.inventory[brokenId] <= 0) delete player.inventory[brokenId];
                    }
                }
            }
            addLog(`[R${rounds}] 敵人造成 ${enemyDmg} 傷害。`, "log-enemy");
            updateUI(); 
        }
    }

    // === 戰鬥結束處理 ===
    if (!isFighting) return;
    await wait(500);
    
    // 時間流逝 (每回合 0.5 小時)
    const timeCost = Math.ceil(rounds * 0.5);
    passTime(timeCost);

    // ★★★ 勝利結算 (包含防錯機制) ★★★
    if (player.hp > 0) {
        try {
            // 1. 基礎數據更新
            player.money += originalEnemy.reward;
            
            // 確保 stats 存在
            if (!player.stats) player.stats = { fights_won: 0, money_earned: 0 };
            player.stats.money_earned += originalEnemy.reward;
            player.stats.fights_won++;

            // 2. 每日任務進度更新 (★ 關鍵修復：補上 money_earned)
            if (player.daily_progress) {
                player.daily_progress.fights_won = (player.daily_progress.fights_won || 0) + 1;
                
                // 紀錄賺取的錢 (修復賺錢任務卡住的問題)
                player.daily_progress.money_earned = (player.daily_progress.money_earned || 0) + originalEnemy.reward;

                // 紀錄擊殺的敵人種類 (修復狩獵任務)
                if (!player.daily_progress.enemies_killed) player.daily_progress.enemies_killed = {};
                player.daily_progress.enemies_killed[enemyId] = (player.daily_progress.enemies_killed[enemyId] || 0) + 1;
                checkDailyChallenges(); // 檢查是否達成
            }
            
            // 3. 檢查主線任務
            try { checkMainQuests(); } catch(e) { console.error("主線檢查錯誤:", e); }

            // 4. 顯示勝利訊息
            let expGain = originalEnemy.exp || 10;
            addLog(`=== 勝利 ===`, "log-win");
            addLog(`獲得: $${originalEnemy.reward}, Exp +${expGain}`, "log-win");
            
            // 5. 敵人升級機制 (越打越強)
            if (enemyId) {
                if (!player.enemyLevels) player.enemyLevels = {};
                if (!player.enemyLevels[enemyId]) player.enemyLevels[enemyId] = 1;
                player.enemyLevels[enemyId] += 1;
            }

            // 6. 掉落物處理
            if (originalEnemy.loot && originalEnemy.loot.length > 0) {
                addLog(`--- 掉落物品 ---`, "normal");
                originalEnemy.loot.forEach(drop => {
                    if (Math.random() < drop.chance) {
                        const itemInfo = itemData[drop.item];
                        const itemName = itemInfo ? itemInfo.name : `未知物品(${drop.item})`;
                        const qty = drop.qty || 1;
                        
                        // 加入背包
                        player.inventory[drop.item] = (player.inventory[drop.item] || 0) + qty;
                        
                        addLog(`🎁 獲得：${itemName} x${qty}`, "log-win");
                        log(`戰利品：${itemName} x${qty}`, "success");
                    }
                });
            }
            
            // 7. 給予經驗與成就
            gainExp(expGain);
            
            if (enemyId === 'boss') {
                 if (!player.achievements.includes('kill_boss')) {
                     player.achievements.push('kill_boss');
                     showToast('新秩序');
                     log(`🏆 成就解鎖：新秩序`, "success");
                 }
            }

            checkAchievements();
            saveGame(); // 自動存檔

        } catch (err) {
            console.error("戰鬥結算發生錯誤:", err);
            addLog(`⚠️ 結算部分數據時發生錯誤，但戰鬥已記錄。`, "fail");
        }
        
        updateUI();

        // ★★★ 強制顯示離開按鈕 (放在 try-catch 外面保證執行) ★★★
        const leaveBtn = document.getElementById('btn-leave-fight');
        const escapeBtn = document.getElementById('btn-escape'); 
        
        if (leaveBtn) leaveBtn.style.display = 'block'; // 顯示綠色勾勾按鈕
        if (escapeBtn) escapeBtn.style.display = 'none'; // 隱藏逃跑按鈕

    } else {
        // === 戰敗處理 ===
        addLog(`=== 死亡 ===`, "log-die");
        addLog(`你被擊殺了...`, "log-die");
        await wait(2000); 
        gameOver("combat");
    }
    
    isFighting = false;
}

// --- 核心與時間 ---

function gameTick() {
    const now = Date.now();
    const timeLeft = Math.ceil((gameConfig.restCooldown - (now - player.last_rest)) / 1000);
    const restTimer = document.getElementById('rest-timer');
    
}
function triggerMorningDecay() {
    // 固定扣除數值 (可自行調整)
    const hungerDrop = 25; 
    const thirstDrop = 25;
    
    player.hunger = Math.max(0, player.hunger - hungerDrop);
    player.thirst = Math.max(0, player.thirst - thirstDrop);
    
    log(`🌅 早安！早晨 5 點生理代謝啟動 (飽食 -${hungerDrop}, 口渴 -${thirstDrop})`, "normal");
    
    // 檢查是否因為這次扣除而死掉
    checkSurvivalStatus(0); 
}
function passTime(hours) {
    // 1. === 偵測是否跨越 5 AM ===
    // 計算「絕對時間 (總小時數)」來判斷
    // 公式：(天數-1)*24 + 小時
    const startAbs = (player.day - 1) * 24 + player.time;
    const endAbs = startAbs + hours;
    
    // 計算下一次 5 AM 發生的絕對時間點
    // 邏輯：找出大於 startAbs 的第一個 (k * 24 + 5)
    let k = Math.floor((startAbs - 5) / 24) + 1;
    
    // 如果這段時間內經歷了 5 AM (可能睡很久跨過好幾天)
    while ((k * 24 + 5) <= endAbs) {
        triggerMorningDecay(); // 觸發清晨代謝
        k++;
    }

    // 2. === 原本的時間推進邏輯 ===
    player.time += hours;
    
    if (player.time >= 24) {
        player.time -= 24;
        player.day += 1;

        updateWeather();

        initDailyChallenges();
        
        // 房屋自然消耗 (如果你保留這個機制的話)
        const currentHouse = houseData[player.house] || houseData['shack'];
        const mult = currentHouse.decayMult || 1.0;
        const hungerLoss = Math.floor(gameConfig.dailyHungerDecay * mult);
        const thirstLoss = Math.floor(gameConfig.dailyThirstDecay * mult);
        player.hunger -= hungerLoss;
        player.thirst -= thirstLoss;
        
        log(`=== 第 ${player.day} 天開始 ===`, "normal");
        checkSurvivalStatus(0);
    }

    // 3. === 原本的持續消耗邏輯 (隨時間流逝) ===
    const currentWeather = weatherData[player.weather] || weatherData['sunny'];
    const wEffect = currentWeather.effect;
    
    // 基礎消耗：每小時 -2 飽食 / -3 口渴
    const baseHungerLoss = hours * 2;
    const baseThirstLoss = hours * 3;
    
    player.hunger = Math.max(0, player.hunger - (baseHungerLoss * wEffect.hunger));
    player.thirst = Math.max(0, player.thirst - (baseThirstLoss * wEffect.thirst));
    
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
        const currentSalary = getCurrentJobSalary();
        document.getElementById('current-job-name').innerText = job.name;
        document.getElementById('current-job-desc').innerText = job.desc;
        document.getElementById('current-job-salary').innerText = `$${currentSalary} (Lv.${player.level})`;
        document.getElementById('job-title').innerText = `(${job.name})`;
    }
}

function work() {
    const job = jobData[player.job];
    if (!job) return; 

    if (player.energy < gameConfig.workCost) { log("體力不足！", "fail"); return; }
    
    const currentSalary = getCurrentJobSalary();
    player.energy -= gameConfig.workCost;
    player.money += currentSalary;
    
    // 統計數據
    player.stats.times_worked++;
    player.stats.money_earned += currentSalary;

    checkAchievements(); 
    
    // ★ 修正：正確紀錄每日進度 (次數 + 金額)
    if (player.daily_progress) {
        player.daily_progress.work_count = (player.daily_progress.work_count || 0) + 1;
        player.daily_progress.money_earned = (player.daily_progress.money_earned || 0) + currentSalary;
        checkDailyChallenges();
    }
    
    checkMainQuests();
    log(`打卡上班... (經過 ${gameConfig.workTime} 小時)`, "normal");
    passTime(gameConfig.workTime);
    
    gainExp(2); 
    log(`工作完成！獲得薪水 $${currentSalary} (Lv.${player.level})`, "success");
    updateUI();
}

function train(trainingId) {
    if (player.hp <= 0) { log("在醫院無法訓練！", "fail"); return; }
    
    const training = gymData[trainingId];
    if (!training) return;

    // 檢查體力
    if (player.energy >= training.cost) {
        player.energy -= training.cost;
        
        // 消耗時間
        passTime(training.time);

        // --- 計算成長 ---
        const statName = training.stat; // strength, speed, defense
        
        // 基礎成長公式：基礎值 + (當前屬性 * 1%)
        // 這樣屬性越高，練得越快
        let gain = training.baseGain + Math.floor(player[statName] * 0.01);
        
        // --- ★ 暴擊判定 (15% 機率) ---
        const isCrit = Math.random() < 0.15;
        let critMsg = "";
        
        if (isCrit) {
            gain *= 3; // 暴擊 3 倍
            critMsg = " 🔥 突破極限！效果翻倍！";
            // 播放一個簡單的特效或震動 (這裡用 Log 呈現)
        }

        // 執行加成
        player[statName] += gain;
        
        // 顯示訊息
        const statLabel = {strength:'力量', speed:'速度', defense:'防禦'}[statName];
        if (isCrit) {
            log(`💪 ${training.name} 大成功！${statLabel} +${gain}${critMsg}`, "success");
            showToast(`突破極限！${statLabel} +${gain}`);
        } else {
            log(`${training.name} 完成。${statLabel} +${gain}`, "normal");
        }

        // --- 每日任務與成就 ---
        if (player.daily_progress) {
            player.daily_progress.train_count = (player.daily_progress.train_count || 0) + 1;
            
            // 根據屬性紀錄
            if (statName === 'strength') player.daily_progress.train_str = (player.daily_progress.train_str || 0) + 1;
            if (statName === 'speed') player.daily_progress.train_spd = (player.daily_progress.train_spd || 0) + 1;
            // 如果以後有防禦任務，這裡也可以加
            
            checkDailyChallenges();
        }
        
        // 檢查屬性成就
        checkAchievements();
        
        updateUI();
        // 如果還在拳館面板，更新數值顯示
        if (document.getElementById('gym').classList.contains('active')) {
            renderGym();
        }

    } else { 
        log("體力不足！去休息或喝瓶保力達B吧。", "fail"); 
    }
}
function renderCrimes() {
    const list = document.querySelector('.crime-list');
    if (!list) return;
    list.innerHTML = '';

    Object.entries(crimeData).forEach(([id, crime]) => {
        const btn = document.createElement('button');
        btn.className = 'crime-card';
        btn.onclick = () => commitCrime(id);

        let icon = '🔫';
        if (crime.successRate >= 0.8) icon = '🧱';
        else if (crime.successRate >= 0.5) icon = '🛵';
        else if (crime.successRate >= 0.2) icon = '💻';
        else icon = '🏦';

        const ratePercent = Math.floor(crime.successRate * 100);
        let rateColor = '#2ecc71';
        if(crime.successRate < 0.5) rateColor = '#e74c3c';
        else if(crime.successRate < 0.8) rateColor = '#f1c40f';

        // ★ 檢查技能要求
        let reqHtml = '';
        if (crime.reqSkill) {
            const myExp = player.skills[crime.reqSkill] || 0;
            const myLv = getSkillLevel(myExp);
            const isQualified = myLv >= crime.reqLevel;
            
            const color = isQualified ? '#2ecc71' : '#e74c3c'; // 綠色合格，紅色不合格
            const iconStatus = isQualified ? '✅' : '🔒';
            
            reqHtml = `<span style="color:${color}; font-size:0.85rem; margin-left:10px; border:1px solid ${color}; padding:2px 6px; border-radius:4px;">
                ${iconStatus} 需 ${skillNames[crime.reqSkill]} Lv.${crime.reqLevel}
            </span>`;
            
            // 如果資格不符，可以讓按鈕變暗或無法點擊 (這邊選擇僅提示，點擊後會報錯)
            if (!isQualified) {
                btn.style.opacity = '0.7';
            }
        }

        btn.innerHTML = `
            <div class="crime-icon">${icon}</div>
            <div class="crime-info" style="width: 100%;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h4 style="margin:0; display:inline-block;">${crime.name}</h4>
                        ${reqHtml}
                    </div>
                    <small style="color:${rateColor}">成功率 ${ratePercent}%</small>
                </div>
                <small style="color:#aaa; display:block; margin-top:4px;">${crime.desc}</small>
                <div style="margin-top:5px; font-size:0.85rem; color:#888;">
                    ⚡ -${crime.cost} 體力 ｜ 💰 可能獲利 $${crime.reward}
                </div>
            </div>
        `;
        list.appendChild(btn);
    });
}
function commitCrime(crimeId) {
    if (player.hp <= 0) { log("在醫院無法犯罪！", "fail"); return; } 

    const crime = crimeData[crimeId];
    if (crime.reqSkill) {
        const myExp = player.skills[crime.reqSkill] || 0;
        const myLv = getSkillLevel(myExp);
        
        if (myLv < crime.reqLevel) {
            log(`❌ 技能不足！此犯罪需要 ${skillNames[crime.reqSkill]} Lv.${crime.reqLevel} (你目前 Lv.${myLv})`, "fail");
            log(`💡 提示：去「城市學院」進修相關課程來提升等級。`, "normal");
            return; // 直接中斷，不扣體力
        }
    }
    // 預設每次犯罪至少花 1 小時
    const timeCost = crime.time || 1;
    
    // 每日進度：嘗試次數 (不管成敗都算嘗試)
    if (player.daily_progress) {
        player.daily_progress.crimes_count = (player.daily_progress.crimes_count || 0) + 1;
    }

    if (player.energy >= crime.cost) { 
        // 1. 先扣體力
        player.energy -= crime.cost; 
        
        // 2. ★ 關鍵：無論成敗，時間都會流逝
        passTime(timeCost); 
        
        // 計算成功率 (天氣加成)
        const wBonus = weatherData[player.weather]?.effect.crimeRate || 0;
        const finalSuccessRate = crime.successRate + wBonus;

        // 3. 判定結果
        if (Math.random() < finalSuccessRate) {
            // === 成功 ===
            player.money += crime.reward;
            
            // 統計數據
            player.stats.crimes_success++;
            player.stats.money_earned += crime.reward;
            
            gainExp(2); // 成功給比較多經驗
            
            // 顯示訊息 (加上時間提示)
            log(`犯罪成功：${crime.name} (+$${crime.reward}) [耗時 ${timeCost}hr]`, "success");
            
            // 每日進度：成功次數與金額
            if (player.daily_progress) {
                // 注意：crimes_count 在上面已經加過了，這裡不用再加
                player.daily_progress.money_earned = (player.daily_progress.money_earned || 0) + crime.reward;
                
                if (!player.daily_progress.crimes_specific) player.daily_progress.crimes_specific = {};
                player.daily_progress.crimes_specific[crimeId] = (player.daily_progress.crimes_specific[crimeId] || 0) + 1;
            }

            // 特殊成就檢查
            if (crimeId === 'rob_granny' && !player.achievements.includes('master_thief')) {
                 player.achievements.push('master_thief');
                 showToast('神偷');
                 log(`🏆 成就解鎖：神偷`, "success");
            }

        } else {
            // === 失敗 ===
            if (player.daily_progress) player.daily_progress.crime_fails = (player.daily_progress.crime_fails || 0) + 1;
            
            // 顯示訊息 (加上時間提示)
            log(`犯罪失敗：${crime.failMsg} (逃跑花了 ${timeCost}hr)`, "fail"); 
            
            // 失敗懲罰計算
            const damage = 5 + Math.floor((1 - crime.successRate) * 20);
            player.hp = Math.max(0, player.hp - damage);
            
            if (damage > 0) log(`你在逃跑過程中受了傷 (HP -${damage})`, "fail");
            
            if (player.hp <= 0) {
                setTimeout(() => gameOver("crime_death"), 1000);
            }
        }
        
        // 4. 收尾
        checkDailyChallenges();
        checkAchievements();
        updateUI();

    } else { 
        log("體力不足！無法進行犯罪。", "fail"); 
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
    checkShowTutorial();
}
function changeJobPage(direction) {
    jobPage += direction;
    renderIntroJobs();
}
function renderEnemies() {
    const list = document.getElementById('enemy-list');
    if (!list) return;
    
    list.innerHTML = '';

    for (let i = 0; i < Object.keys(enemyData).length; i++) {
        const id = Object.keys(enemyData)[i];
        const enemy = getEnemyCurrentState(id);
    let lvl = 1;
        if (player && player.enemyLevels && player.enemyLevels[id]) {
            lvl = player.enemyLevels[id];
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h4>${enemy.name} <small style="color:#666;">Lv.${enemy.lvl}</small></h4>
                <span style="color:var(--accent-red);">HP ${enemy.hp}</span>
            </div>
            <p style="font-size:0.8rem; color:#aaa;">${enemy.desc}</p>
            <div style="margin-top:10px; font-size:0.8rem;">
                攻擊: ${enemy.str} ｜ 速度: ${enemy.spd}
            </div>
            <button class="action-btn" style="width:100%; margin-top:10px; background:#e74c3c;" 
                    onclick="startCombat('${id}')">
                開始戰鬥
            </button>
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
        if (item.cost <= 0) return false; 
        if (shopCategory === 'all') return true;
        return item.category === shopCategory;
    });
    allItems.sort((a, b) => a[1].cost - b[1].cost);
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
    if (player.daily_progress) {
        player.daily_progress.items_bought++;
        checkDailyChallenges();
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
             // ★ 新增：判斷是否為可販賣物品
             if (item.type === 'sellable' && item.sell_price > 0) {
                btn.innerText = `💰 販賣 ($${item.sell_price})`;
                btn.style.background = '#f39c12';
                btn.onclick = () => sellItem(id);
            }
            else if (item.type === 'weapon') {
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
// 販賣物品
function sellItem(itemId) {
    const item = itemData[itemId];
    if (!item) return;
    
    // 檢查是否可販賣
    if (item.type !== 'sellable' || !item.sell_price) {
        log("這個物品無法販賣！", "fail");
        return;
    }
    
    // 檢查是否擁有
    if (!player.inventory[itemId] || player.inventory[itemId] <= 0) {
        log("你沒有這個物品！", "fail");
        return;
    }
    
    // 販賣
    player.money += item.sell_price;
    player.inventory[itemId]--;
    
    if (player.inventory[itemId] <= 0) {
        delete player.inventory[itemId];
    }
    
    log(`販賣 ${item.name}，獲得 $${item.sell_price}`, "success");
    updateUI();
}

function equipItem(itemId) {
    const item = itemData[itemId];
    if (!item) return;

    // 1. 檢查背包庫存 (防呆)
    if (!player.inventory[itemId] || player.inventory[itemId] <= 0) {
        log("背包裡沒有這個物品！", "fail");
        return;
    }

    // 決定裝備欄位
    let slot = 'accessory';
    if (item.type === 'weapon') slot = 'weapon';
    if (item.type === 'armor') slot = 'armor';

    // 2. 自動卸下舊裝備 (如果身上已經有穿)
    const currentEquipId = player[slot];
    if (currentEquipId) {
        // 把舊的加回背包
        player.inventory[currentEquipId] = (player.inventory[currentEquipId] || 0) + 1;
        // 舊裝備脫下來視為普通二手貨，不加回 new_stock
        log(`已替換並收起：${itemData[currentEquipId].name}`, "normal");
    }

    // 3. 決定新裝備的狀態 (全新 vs 二手)
    const maxDura = item.max_dura || 100;
    if (!player.new_stock) player.new_stock = {};
    
    let currentDura = 0;
    let isNew = false;

    // 如果有新品庫存，優先使用新品
    if (player.new_stock[itemId] && player.new_stock[itemId] > 0) {
        currentDura = maxDura;
        isNew = true;
        player.new_stock[itemId]--; // ★ 扣除新品庫存
    } else {
        // 否則視為背包裡的二手貨，耐久度隨機 (20% ~ 80%)
        currentDura = Math.floor(maxDura * (0.2 + Math.random() * 0.6));
    }

    // 4. 執行裝備
    player[slot] = itemId;
    
    // 設定耐久度
    if (slot === 'weapon') player.weapon_dura = currentDura;
    if (slot === 'armor') player.armor_dura = currentDura;

    const statusText = isNew ? "✨ 全新" : `⚠️ 二手 (${Math.floor((currentDura/maxDura)*100)}%)`;
    const typeName = {weapon:'武器', armor:'防具', accessory:'飾品'}[slot];
    
    log(`裝備了${typeName}：${item.name} [${statusText}]`, "success");

    // 5. ★★★ 關鍵修復：從背包扣除物品 ★★★
    player.inventory[itemId]--;
    if (player.inventory[itemId] <= 0) {
        delete player.inventory[itemId];
    }

    // 6. 更新介面
    updateUI();
    
    // 如果背包視窗是開著的，重整它
    const invModal = document.getElementById('inventory-modal');
    if (invModal && invModal.style.display !== 'none') {
        if (typeof renderGridInventory === 'function') renderGridInventory();
        // 隱藏詳情避免按鈕狀態錯亂
        if(document.getElementById('inv-selected-info')) 
            document.getElementById('inv-selected-info').style.display = 'none';
        if(document.getElementById('inv-empty-msg')) 
            document.getElementById('inv-empty-msg').style.display = 'block';
    }
}
function renderGym() {
    const body = document.querySelector('#gym .panel-body');
    if (!body) return;
    
    // 清空舊內容，重新建立結構
    body.innerHTML = `
        <p class="desc">付出汗水，換取力量。偶爾會突破極限 (3倍成長)！</p>
        <div class="grid-2" id="gym-list"></div>
    `;

    const list = document.getElementById('gym-list');

    // 顯示目前屬性
    const statsDiv = document.createElement('div');
    statsDiv.style.gridColumn = "1 / -1";
    statsDiv.style.display = "flex";
    statsDiv.style.justifyContent = "space-around";
    statsDiv.style.marginBottom = "20px";
    statsDiv.style.background = "#222";
    statsDiv.style.padding = "10px";
    statsDiv.style.borderRadius = "8px";
    
    statsDiv.innerHTML = `
        <div style="color:#e74c3c">💪 力量: <span id="gym-str">${player.strength}</span></div>
        <div style="color:#f1c40f">💨 速度: <span id="gym-spd">${player.speed}</span></div>
        <div style="color:#3498db">🛡️ 防禦: <span id="gym-def">${player.defense}</span></div>
    `;
    body.insertBefore(statsDiv, list);

    // 生成按鈕
    Object.entries(gymData).forEach(([id, training]) => {
        const card = document.createElement('div');
        card.className = 'card text-center';
        
        let color = '#ccc';
        if(training.stat === 'strength') color = '#e74c3c';
        if(training.stat === 'speed') color = '#f1c40f';
        if(training.stat === 'defense') color = '#3498db';

        card.innerHTML = `
            <h4 style="color:${color}">${training.name}</h4>
            <p style="font-size:0.8rem; color:#aaa; height:40px;">${training.desc}</p>
            <button class="action-btn" onclick="train('${id}')" style="background:${color}; width:100%;">
                開始訓練
            </button>
        `;
        list.appendChild(card);
    });
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
    
     if (player.daily_progress) {
        player.daily_progress.food_eaten++;
        if (!player.daily_progress.items_consumed) player.daily_progress.items_consumed = {};
        player.daily_progress.items_consumed[itemId] = (player.daily_progress.items_consumed[itemId] || 0) + 1;
        checkDailyChallenges();
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
    const weatherBonus = weatherData[player.weather]?.effect.atk || 0;
    return player.strength + weaponDmg;
}
function getCurrentJobSalary() {
    const job = jobData[player.job];
    if (!job) return 0;
    
    // ★ 基礎薪資 + 等級加成
    const baseSalary = job.salary;
    const growth = job.salary_growth || 0;
    const levelBonus = growth * (player.level - 1);
    
    return Math.floor(baseSalary + levelBonus);
}
function getPlayerDefense() {
    let armorDef = 0;
    if (player.armor && itemData[player.armor]) {
        armorDef = itemData[player.armor].value;
    }
    const weatherBonus = weatherData[player.weather]?.effect.def || 0;
    return Math.floor(player.strength * 0.5) + armorDef; 
}
function getPlayerSpeed() {
    let accessoryBonus = 0;
    if (player.accessory && itemData[player.accessory]) {
        accessoryBonus = itemData[player.accessory].value;
    }

    const weatherBonus = weatherData[player.weather]?.effect.spd || 0;
    
    // 總速度 = 基礎速度 + 天氣 + 飾品
    return Math.floor(player.speed + weatherBonus + accessoryBonus);
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
        
        // ★★★ 修正：這行必須放在最上面！先定義才能使用 ★★★
        const isSkillCourse = !!course.skillReward; 

        const card = document.createElement('div');
        
        // 按鈕文字與狀態
        let btnText = isCompleted ? '已修畢' : '報名課程';
        let btnDisabled = isCompleted;
        let btnColor = isCompleted ? '#444' : '#3498db';

        // 針對技能課程的特殊設定
        if (isSkillCourse) {
            btnText = '進修 (+EXP)';
            btnDisabled = false; // 技能課可以一直上，永遠不鎖定
            btnColor = '#9b59b6'; // 紫色按鈕區分
        }

        card.className = 'card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <h4>${course.name}</h4>
                <span style="color:var(--accent-green)">$${course.cost}</span>
            </div>
            <p style="font-size:0.8rem; color:#aaa">${course.desc}</p>
            <small>消耗體力: ${course.energyCost}</small>
            <button class="action-btn" 
                style="width:100%; margin-top:5px; background:${btnColor}" 
                onclick="takeCourse('${id}')" 
                ${btnDisabled ? 'disabled' : ''}>
                ${btnText}
            </button>
        `;
        list.appendChild(card);
    }
}

function takeCourse(courseId) {
    const course = eduData[courseId];
    // 檢查是否已修畢 (如果是技能課，可以重複修)
    if (player.completed_courses.includes(courseId) && !course.skillReward) return;
    
    if (player.money < course.cost) { log("學費不足！", "fail"); return; }
    if (player.energy < course.energyCost) { log("體力不足，讀書是很累的！", "fail"); return; }

    player.money -= course.cost;
    player.energy -= course.energyCost;
    
    // 只有非技能課才加入「已修畢」列表
    if (!course.skillReward) {
        player.completed_courses.push(courseId);
    }
    
    // 執行一般屬性獎勵
    if (course.effect) {
        course.effect(player);
    }

    // ★ 執行技能獎勵
    if (course.skillReward) {
        const sk = course.skillReward.skill;
        const xp = course.skillReward.exp;
        
        if (!player.skills[sk]) player.skills[sk] = 0;
        
        const oldLv = getSkillLevel(player.skills[sk]);
        player.skills[sk] += xp;
        const newLv = getSkillLevel(player.skills[sk]);
        
        log(`課程完成！${skillNames[sk]} 經驗 +${xp}`, "success");
        
        if (newLv > oldLv) {
            log(`🎉 ${skillNames[sk]} 升級了！目前等級 Lv.${newLv}`, "success");
            showToast(`${skillNames[sk]} 升級！`);
        }

        // ★★★ 補回這段：紀錄今日獲得的總技能經驗 (給每日任務用) ★★★
        if (player.daily_progress) {
            player.daily_progress.skill_exp_gained = (player.daily_progress.skill_exp_gained || 0) + xp;
            checkDailyChallenges();
        }

    } else {
        log(`課程完成：${course.name}！獲得了能力提升。`, "success");
    }

    renderEdu();
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
    // 1. 移除所有面板的 active
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    
    // 2. 顯示目標面板
    const targetPanel = document.getElementById(panelId);
    if(targetPanel) targetPanel.classList.add('active');
    
    // 3. 移除所有按鈕的 active
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // ★ 修改這段：使用更精確的匹配
    const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(btn => {
        const onclick = btn.getAttribute('onclick');
        if (!onclick) return false;
        
        // 提取 showPanel() 中的參數
        const match = onclick.match(/showPanel\(['"](.+?)['"]\)/);
        if (match) {
            return match[1] === panelId;  // ✓ 精確比對，不是 includes
        }
        return false;
    });
    
    if (activeBtn) activeBtn.classList.add('active');
    
    // 4. 手機版：關閉側邊欄
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
    }
    
    // 5. 如果離開戰鬥面板，停止戰鬥
    if (panelId !== 'fight' && isFighting) {
        isFighting = false;
        document.getElementById('enemy-selection').style.display = 'block';
        document.getElementById('combat-screen').style.display = 'none';
        log("戰鬥結束。", "normal");
    }
    
    // 6. 切換到對應面板時渲染內容
    if (panelId === 'achievements') renderAchievements();
    if (panelId === 'shop') renderShop();
    if (panelId === 'crimes') renderCrimes();
    if (panelId === 'panel-daily') {
        renderDailyChallenges();
        renderMainQuests();
    }
    if (panelId === 'panel-ach-shop') {
        renderAchShop();
    }
    if (panelId === 'gym') renderGym();
    if (panelId === 'skills') renderSkills();
}
// game.js

function renderMainQuests() {
    const list = document.getElementById('main-quest-list');
    if (!list) return;
    
    list.innerHTML = '';

    // 1. 自動定位：如果是第一次打開（或重整），自動跳到玩家目前還沒完成的最早章節
    // 這樣玩家一打開就能看到自己該做什麼
    // 我們只在 currentQuestStage 為 1 且還沒初始化過時做這件事，或者你可以選擇手動翻頁
    // 這裡為了方便，我們不做強制跳轉，保留玩家翻頁的狀態
    
    // 2. 篩選出當前頁數(章節)的所有任務
    const questsToShow = mainQuests.filter(q => q.stage === currentQuestStage);
    
    // 取得最大章節數 (用來控制下一頁按鈕)
    const maxStage = Math.max(...mainQuests.map(q => q.stage));

    // 3. 顯示章節標題
    const chapterTitle = document.createElement('h4');
    chapterTitle.style.textAlign = 'center';
    chapterTitle.style.margin = '0 0 15px 0';
    chapterTitle.style.color = '#f1c40f';
    chapterTitle.style.borderBottom = '1px dashed #444';
    chapterTitle.style.paddingBottom = '10px';
    
    // 根據章節給標題 (這裡簡單用數字，你也可以在 data.js 定義章節名稱)
    const chapterNames = ["", "第一章：底層求生", "第二章：街頭混混", "第三章：暴力美學", "第四章：地下秩序", "終章：傳奇", "隱藏章節"];
    chapterTitle.innerText = chapterNames[currentQuestStage] || `第 ${currentQuestStage} 章`;
    list.appendChild(chapterTitle);

    // 4. 渲染任務卡片
    if (questsToShow.length === 0) {
        list.innerHTML += '<p style="text-align:center; color:#666;">此章節沒有任務。</p>';
    } else {
        questsToShow.forEach(quest => {
            const isCompleted = player.main_quests_completed.includes(quest.id);
            
            const card = document.createElement('div');
            card.className = 'card';
            
            // 樣式調整：完成的變暗，未完成的亮顯
            if (isCompleted) {
                card.style.opacity = '0.6';
                card.style.borderLeft = '4px solid #2ecc71'; // 綠色
                card.style.background = '#1a1a1a';
            } else {
                card.style.opacity = '1';
                card.style.borderLeft = '4px solid #e74c3c'; // 紅色 (未完成)
                card.style.background = '#252525';
                card.style.boxShadow = '0 0 5px rgba(231, 76, 60, 0.2)'; // 微微發光
            }
            
            let rewardText = '';
            if (quest.reward.money) rewardText += `💰 $${quest.reward.money} `;
            if (quest.reward.exp) rewardText += `⭐ ${quest.reward.exp} EXP `;
            if (quest.reward.item) rewardText += `🎁 ${itemData[quest.reward.item]?.name || '物品'}`;
            
            card.innerHTML = `
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h4 style="margin: 0; color: ${isCompleted ? '#2ecc71' : '#fff'};">
                            ${isCompleted ? '✅' : '📜'} ${quest.name}
                        </h4>
                    </div>
                    <p style="font-size: 0.85rem; color: #aaa; margin: 5px 0 10px 0;">${quest.desc}</p>
                    <div style="font-size: 0.85rem; color: #f39c12;">
                        ${isCompleted ? '已領取獎勵' : `獎勵：${rewardText}`}
                    </div>
                </div>
            `;
            
            list.appendChild(card);
        });
    }

    // 5. 加入分頁按鈕
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination-controls';
    paginationDiv.style.marginTop = '20px';
    
    paginationDiv.innerHTML = `
        <button class="page-btn" onclick="changeQuestStage(-1)" ${currentQuestStage === 1 ? 'disabled' : ''}>◀ 上一章</button>
        <span class="page-info">第 ${currentQuestStage} / ${maxStage} 章</span>
        <button class="page-btn" onclick="changeQuestStage(1)" ${currentQuestStage >= maxStage ? 'disabled' : ''}>下一章 ▶</button>
    `;
    
    list.appendChild(paginationDiv);
}

// 翻頁功能的輔助函數
function changeQuestStage(direction) {
    currentQuestStage += direction;
    renderMainQuests();
}

function gainExp(amount) {
    const oldLevel = player.level;

    player.exp += amount;
    
    while (player.exp >= player.max_exp) {
        player.level++;
        player.exp -= player.max_exp;
        player.max_exp = Math.floor(player.max_exp * 1.2); 
        player.max_hp += 10;
        player.hp = player.max_hp;
        player.strength += 2;
        player.speed += 2;
        if (player.daily_progress && player.level > oldLevel) {
            player.daily_progress.level_ups = (player.daily_progress.level_ups || 0) + 1;
            console.log(`每日成就：升級次數 +1，現在 ${player.daily_progress.level_ups} 次`);
        }
        log(`🎉 升級了！現在等級 ${player.level}！(全屬性提升)`, "success");
    }
    updateUI(); 
}
function updateUI() {
    // 1. 基礎數值更新
    if(document.getElementById('money')) document.getElementById('money').innerText = player.money;
    if(document.getElementById('energy')) document.getElementById('energy').innerText = Math.floor(player.energy);
    if(document.getElementById('hp')) document.getElementById('hp').innerText = Math.floor(player.hp);
    if(document.getElementById('level')) document.getElementById('level').innerText = player.level;
    
    // 2. 天氣顯示 (變數改名為 weatherEl)
    const wName = weatherData[player.weather]?.name || '☀️ 晴朗';
    const wDesc = weatherData[player.weather]?.desc || '';
    
    const weatherEl = document.getElementById('weather-display');
    if (weatherEl) {
        weatherEl.innerText = wName;
        weatherEl.title = wDesc; 
        
        // 根據天氣變色
        if (player.weather === 'rain' || player.weather === 'acid_rain') weatherEl.style.color = '#3498db'; 
        else if (player.weather === 'heatwave') weatherEl.style.color = '#e74c3c'; 
        else if (player.weather === 'fog') weatherEl.style.color = '#95a5a6'; 
        else weatherEl.style.color = '#f1c40f'; 
    }

    // 3. 職業與稱號顯示 (已修正覆蓋問題)
    const job = jobData[player.job];
    const jobTitle = document.getElementById('job-title');
    if (jobTitle) {
        let text = job ? `(${job.name})` : '(未知)';
        if (player.title) {
            text = `${player.title} ${text}`;
        }
        jobTitle.innerText = text;
    }

    // 4. 戰鬥屬性
    if(document.getElementById('total-atk')) document.getElementById('total-atk').innerText = getPlayerAttack();
    if(document.getElementById('total-def')) document.getElementById('total-def').innerText = getPlayerDefense();
    // 判斷是否有 getPlayerSpeed 函數
    if(document.getElementById('total-dex')) {
         document.getElementById('total-dex').innerText = (typeof getPlayerSpeed === 'function') ? getPlayerSpeed() : player.speed;
    }

    // 5. 時間顯示
    const hours = Math.floor(player.time); 
    const minutes = Math.floor((player.time % 1) * 60);
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    document.getElementById('day-display').innerText = player.day;
    document.getElementById('time-display').innerText = timeStr;

    // 6. 狀態條 (飢餓/口渴)
    if(document.getElementById('hunger')) {
        document.getElementById('hunger').innerText = Math.floor(player.hunger);
        const hBar = document.getElementById('hunger-bar');
        hBar.style.width = `${Math.max(0, player.hunger)}%`;
        
        if (player.hunger <= 0) hBar.style.background = "#8e44ad"; 
        else if (player.hunger <= 20) hBar.style.background = "#e74c3c"; 
        else hBar.style.background = "#d35400"; 
    }
    if(document.getElementById('thirst')) {
        document.getElementById('thirst').innerText = Math.floor(player.thirst);
        const tBar = document.getElementById('thirst-bar');
        tBar.style.width = `${Math.max(0, player.thirst)}%`;

        if (player.thirst <= 0) tBar.style.background = "#8e44ad";
        else if (player.thirst <= 20) tBar.style.background = "#e74c3c"; 
        else tBar.style.background = "#3498db"; 
    }

    // 7. 裝備顯示 (耐久度防呆處理)
    let weaponName = "無 (徒手)";
    if (player.weapon && itemData[player.weapon]) {
        const max = itemData[player.weapon].max_dura || 100;
        weaponName = `${itemData[player.weapon].name} [${player.weapon_dura}/${max}]`;
    }

    let armorName = "無 (裸體)";
    if (player.armor && itemData[player.armor]) {
        const max = itemData[player.armor].max_dura || 100;
        armorName = `${itemData[player.armor].name} [${player.armor_dura}/${max}]`;
    }
    
    let accName = "無 (空)";
    if (player.accessory && itemData[player.accessory]) accName = itemData[player.accessory].name;
    
    // (變數改名為 weaponEl)
    const weaponEl = document.getElementById('weapon-display');
    if(weaponEl) weaponEl.innerText = `${weaponName} / ${armorName} / ${accName}`;
    
    // 8. 進度條 (經驗/血量/體力)
    const expPercent = Math.min(100, (player.exp / player.max_exp) * 100);
    const expBar = document.getElementById('exp-bar');
    if(expBar) expBar.style.width = `${expPercent}%`;
    
    const hpPercent = Math.min(100, (player.hp / player.max_hp) * 100);
    const hpBar = document.getElementById('hp-bar');
    if(hpBar) hpBar.style.width = `${hpPercent}%`;

    const energyPercent = Math.min(100, (player.energy / player.max_energy) * 100);
    const enBar = document.getElementById('energy-bar');
    if(enBar) enBar.style.width = `${energyPercent}%`;

    // 9. 訓練數值顯示
    if(document.getElementById('gym-str')) document.getElementById('gym-str').innerText = player.strength;
    if(document.getElementById('gym-spd')) document.getElementById('gym-spd').innerText = player.speed;
    if(document.getElementById('gym-def')) document.getElementById('gym-def').innerText = player.defense;
    // 10. 檢查成就與渲染面板
    checkAchievements();
    if (document.getElementById('achievements').classList.contains('active')) {
        renderAchievements();
    }
    
    const restBtn = document.getElementById('btn-rest');
    if (restBtn && houseData[player.house]) {
        const restore = houseData[player.house].restore;
        restBtn.innerText = `🛌 開始睡覺 (回復 ${restore} / hr)`;
    }
    if (document.getElementById('estate').classList.contains('active')) {
        renderEstate();
    }
    if (document.getElementById('gym').classList.contains('active')) {
        renderGym();
    }
}
// === 動態目標系統函數 ===

// 初始化每日挑戰（遊戲開始時呼叫）
function initDailyChallenges() {
    // 檢查是否需要重置（新的一天）
    if (player.day !== player.last_daily_reset) {
        resetDailyChallenges();
    }
    
    // 如果沒有挑戰，生成新的
    if (!player.daily_challenges || player.daily_challenges.length === 0) {
        generateDailyChallenges();
    }
}

// 生成每日挑戰（隨機3個）
function generateDailyChallenges() {
    // ★ 改用新的生成函數，直接存入物件陣列
    player.daily_challenges = generateRandomDailyMissions(player.level);
    
    // 重置每日進度
    player.daily_progress = {
        train_count: 0,
        work_count: 0,
        fights_won: 0,
        crimes_count: 0,
        food_eaten: 0,
        items_bought: 0,
        money_earned: 0,
        money_spent: 0,
        enemies_killed: {} // ★ 新增：紀錄殺了哪種敵人
    };
    
    player.daily_completed = []; // 這裡存已完成任務的 id (string)
    player.last_daily_reset = player.day;
    
    log("📋 新的隨機每日任務已派發！", "success");
}
// 重置每日挑戰
function resetDailyChallenges() {
    // 檢查未完成的挑戰
    const unfinished = player.daily_challenges.filter(id => 
        !player.daily_completed.includes(id)
    );
    
    if (unfinished.length > 0) {
        log(`⚠️ 昨日有 ${unfinished.length} 個挑戰未完成`, "fail");
    }
    
    generateDailyChallenges();
}

function checkDailyChallenges() {
    if (!player.daily_challenges || player.daily_challenges.length === 0) return;
    
    player.daily_challenges.forEach(mission => {
        // 跳過已完成的
        if (player.daily_completed.includes(mission.id)) return;
        
        let currentVal = 0;
        
        // ★ 核心修復：這裡改用 switch 判斷，而不是呼叫 mission.check()
        switch (mission.type) {
            // --- 新版隨機任務類型 ---
            case 'hunt_specific':
                currentVal = player.daily_progress.enemies_killed?.[mission.targetId] || 0;
                break;
            case 'crime_specific':
                currentVal = player.daily_progress.crimes_specific?.[mission.targetId] || 0;
                break;
            case 'consume_specific':
                currentVal = player.daily_progress.items_consumed?.[mission.targetId] || 0;
                break;
            case 'work':
                currentVal = player.daily_progress.work_count || 0;
                break;
            case 'spend':
                currentVal = player.daily_progress.money_spent || 0;
                break;
            case 'earn':
                currentVal = player.daily_progress.money_earned || 0;
                break;
            case 'gain_skill_exp':
                currentVal = player.daily_progress.skill_exp_gained || 0;
                break;
            case 'train_stat':
                const key = mission.targetStat === 'strength' ? 'train_str' : 'train_spd';
                currentVal = player.daily_progress[key] || 0;
                break;
                
            // --- 舊版任務相容 ---
            case 'combat': currentVal = player.daily_progress.fights_won || 0; break;
            case 'crime': currentVal = player.daily_progress.crimes_count || 0; break;
            case 'eat': currentVal = player.daily_progress.food_eaten || 0; break;
            case 'train': currentVal = player.daily_progress.train_count || 0; break;
        }

        // 檢查是否達標
        if (currentVal >= mission.targetVal) {
            player.daily_completed.push(mission.id);
            
            // 給予獎勵
            let msg = `💰 任務完成：${mission.name}`;
            
            if (mission.reward.money) {
                const bonus = typeof applyMoneyBoost === 'function' ? applyMoneyBoost(mission.reward.money) : mission.reward.money;
                player.money += bonus;
                msg += ` (+$${bonus})`;
            }
            if (mission.reward.exp) {
                const bonus = typeof applyExpBoost === 'function' ? applyExpBoost(mission.reward.exp) : mission.reward.exp;
                gainExp(bonus);
                msg += ` (+Exp ${bonus})`;
            }
            if (mission.reward.item) {
                player.inventory[mission.reward.item] = (player.inventory[mission.reward.item] || 0) + 1;
                const itemName = itemData[mission.reward.item]?.name || "物品";
                msg += ` (獲得 ${itemName})`;
            }
            
            log(msg, "success");
            if (typeof showToast === 'function') showToast(`達成：${mission.name}`);

            // 全解獎勵
            if (player.daily_completed.length === player.daily_challenges.length) {
                log("🎉 今日全數達成！額外獎勵 +$500", "success");
                player.money += 500;
            }
            
            updateUI(); // 更新介面以顯示綠色勾勾
        }
    });
}
// 檢查主線任務
function checkMainQuests() {
    mainQuests.forEach(quest => {
        // 跳過已完成的
        if (player.main_quests_completed.includes(quest.id)) return;
        
        // 檢查是否達成
        if (quest.check(player)) {
            player.main_quests_completed.push(quest.id);
            
            // 給予獎勵
            if (quest.reward.money) {
                player.money += quest.reward.money;
            }
            if (quest.reward.exp) {
                gainExp(quest.reward.exp);
            }
            if (quest.reward.item) {
                player.inventory[quest.reward.item] = (player.inventory[quest.reward.item] || 0) + 1;
                log(`🎁 獲得物品：${itemData[quest.reward.item].name}`, "success");
            }
            
            log(`📜 主線任務完成：${quest.name}`, "success");
            showToast(`任務完成：${quest.name}`);
        }
    });
}

// 計算成就點數
function calculateAchievementPoints() {
    let total = 0;
    player.achievements.forEach(achId => {
        total += achievementPointValues[achId] || 1; // 預設1分
    });
    return total;
}

// 購買成就商店物品
function buyAchShopItem(itemId) {
    const item = achievementShop[itemId];
    if (!item) return;
    
    // 檢查是否已購買
    if (player.ach_shop_purchased.includes(itemId)) {
        log("已經購買過此物品！", "fail");
        return;
    }
    
    const points = calculateAchievementPoints();
    
    if (points < item.cost) {
        log(`成就點數不足！需要 ${item.cost} 點`, "fail");
        return;
    }
    
    // 執行效果
    if (item.type === 'perm_buff') {
        item.effect(player);
    } else if (item.type === 'item') {
        player.inventory[item.itemId] = (player.inventory[item.itemId] || 0) + 1;
    } else if (item.type === 'title') {
        player.title = item.titleName;
    }
    
    player.ach_shop_purchased.push(itemId);
    log(`✨ 兌換成功：${item.name}`, "success");
    renderAchShop();
}

// 應用金錢加成
function applyMoneyBoost(amount) {
    if (player.perm_buffs?.money_boost) {
        return Math.floor(amount * player.perm_buffs.money_boost);
    }
    return amount;
}

// 應用經驗加成
function applyExpBoost(amount) {
    if (player.perm_buffs?.exp_boost) {
        return Math.floor(amount * player.perm_buffs.exp_boost);
    }
    return amount;
}

// 渲染主線任務
function renderDailyChallenges() {
    const list = document.getElementById('daily-challenge-list');
    if (!list) return;
    list.innerHTML = '';
    
    if (!player.daily_challenges || player.daily_challenges.length === 0) {
        list.innerHTML = '<p style="color: #666;">今日任務生成中...</p>';
        return;
    }
    
    player.daily_challenges.forEach(mission => {
        const isCompleted = player.daily_completed.includes(mission.id);
        
        // 取得當前進度 (為了顯示 3/5 這種效果)
        let currentVal = 0;
        // 根據任務類型反推進度 (這段有點 hardcode，但為了 UI 顯示很值得)
        if (mission.type === 'combat') currentVal = player.daily_progress.fights_won || 0;
        else if (mission.type === 'hunt') currentVal = player.daily_progress.enemies_killed?.[mission.targetId] || 0;
        else if (mission.type === 'work') currentVal = player.daily_progress.work_count || 0;
        else if (mission.type === 'spend') currentVal = player.daily_progress.money_spent || 0;
        else if (mission.type === 'eat') currentVal = player.daily_progress.food_eaten || 0;
        else if (mission.type === 'crime') currentVal = player.daily_progress.crimes_count || 0;
        else if (mission.type === 'train') currentVal = player.daily_progress.train_count || 0;
        
        // 防呆，不超過目標值
        if (currentVal > mission.targetVal) currentVal = mission.targetVal;

        const card = document.createElement('div');
        card.className = 'card';
        card.style.opacity = isCompleted ? '0.5' : '1';
        card.style.borderLeft = isCompleted ? '4px solid #2ecc71' : '4px solid #f1c40f';
        
        let rewardText = "";
        if(mission.reward.money) rewardText += `$${mission.reward.money} `;
        if(mission.reward.exp) rewardText += `Exp ${mission.reward.exp} `;
        if(mission.reward.item) rewardText += `🎁`;

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="width: 70%">
                    <h4 style="margin: 0;">${isCompleted ? '✅' : '🎯'} ${mission.name}</h4>
                    <p style="font-size: 0.85rem; color: #aaa; margin: 5px 0;">
                        ${mission.desc} 
                        <span style="color: #3498db">(${currentVal}/${mission.targetVal})</span>
                    </p>
                </div>
                <div style="text-align: right; font-size: 0.8rem; color: #f39c12;">
                    ${rewardText}
                </div>
            </div>
            <div style="width: 100%; height: 4px; background: #333; margin-top: 8px; border-radius: 2px;">
                <div style="height: 100%; width: ${(currentVal/mission.targetVal)*100}%; background: ${isCompleted?'#2ecc71':'#3498db'}; transition: width 0.3s;"></div>
            </div>
        `;
        list.appendChild(card);
    });
}

// 渲染成就商店
function renderAchShop() {
    const list = document.getElementById('ach-shop-list');
    if (!list) return;
    
    const points = calculateAchievementPoints();
    const display = document.getElementById('ach-points-display');
    if (display) display.innerText = points;
    
    list.innerHTML = '';
    
    Object.entries(achievementShop).forEach(([id, item]) => {
        const isPurchased = player.ach_shop_purchased.includes(id);
        const canAfford = points >= item.cost;
        
        const card = document.createElement('div');
        card.className = 'card';
        card.style.opacity = isPurchased ? '0.5' : '1';
        
        card.innerHTML = `
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="margin: 0;">${item.name}</h4>
                    <span style="color: #f39c12; font-weight: bold;">${item.cost} 點</span>
                </div>
                <p style="font-size: 0.85rem; color: #aaa; margin: 10px 0;">${item.desc}</p>
                <button class="action-btn" 
                    style="width: 100%; background: ${isPurchased ? '#444' : (canAfford ? '#3498db' : '#555')};"
                    onclick="buyAchShopItem('${id}')"
                    ${isPurchased || !canAfford ? 'disabled' : ''}>
                    ${isPurchased ? '✅ 已購買' : (canAfford ? '💎 兌換' : '🔒 點數不足')}
                </button>
            </div>
        `;
        
        list.appendChild(card);
    });
}
// game.js

let selectedItemId = null; // 當前選中的物品 ID
let selectedIsNew = false; // 當前選中的是否為新品

function openInventory() {
    const modal = document.getElementById('inventory-modal');
    if (modal) {
        modal.style.display = 'flex';
        renderGridInventory();
        // 重置右側詳情
        document.getElementById('inv-selected-info').style.display = 'none';
        document.getElementById('inv-empty-msg').style.display = 'block';
    }
}

function closeInventory() {
    const modal = document.getElementById('inventory-modal');
    if (modal) modal.style.display = 'none';
}

function renderGridInventory() {
    const grid = document.getElementById('inv-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // 1. 整理所有物品 (展開堆疊)
    // 我們要讓 5 個磚頭變成 5 個格子
    
    // 先處理裝備中的 (放在最前面)
    const equippedItems = [];
    if (player.weapon) equippedItems.push({ id: player.weapon, type: 'equipped', slot: 'weapon' });
    if (player.armor) equippedItems.push({ id: player.armor, type: 'equipped', slot: 'armor' });
    if (player.accessory) equippedItems.push({ id: player.accessory, type: 'equipped', slot: 'accessory' });

    equippedItems.forEach(obj => createSlot(obj.id, true, false));

    // 再處理背包裡的
    Object.keys(player.inventory).forEach(itemId => {
        let count = player.inventory[itemId];
        let newCount = (player.new_stock && player.new_stock[itemId]) ? player.new_stock[itemId] : 0;
        let usedCount = Math.max(0, count - newCount);

        // 先畫全新的
        for (let i = 0; i < newCount; i++) {
            createSlot(itemId, false, true);
        }
        // 再畫二手的
        for (let i = 0; i < usedCount; i++) {
            createSlot(itemId, false, false);
        }
    });
}

// 建立單個格子
function createSlot(itemId, isEquipped, isNew) {
    const item = itemData[itemId];
    if (!item) return;

    const grid = document.getElementById('inv-grid');
    const slot = document.createElement('div');
    slot.className = 'inv-slot';
    
    // 根據物品類型給予不同 Emoji (簡單分類)
    let icon = '📦';
    if (item.type === 'weapon') icon = '⚔️';
    else if (item.type === 'armor') icon = '🛡️';
    else if (item.type === 'accessory') icon = '💍';
    else if (item.category === 'food') icon = '🍗';
    else if (item.category === 'medical') icon = '💊';
    
    slot.innerHTML = icon;
    
    // 樣式標記
    if (isNew) slot.classList.add('is-new');
    if (isEquipped) slot.classList.add('is-equipped');

    // 點擊事件
    slot.onclick = () => {
        // 移除其他格子的 active 樣式
        document.querySelectorAll('.inv-slot').forEach(s => s.classList.remove('active'));
        slot.classList.add('active');
        
        showItemDetails(itemId, isEquipped, isNew);
    };

    grid.appendChild(slot);
}

// 顯示右側詳情
function showItemDetails(itemId, isEquipped, isNew) {
    const item = itemData[itemId];
    if (!item) return;

    // 更新全域變數
    selectedItemId = itemId;
    selectedIsNew = isNew;

    document.getElementById('inv-empty-msg').style.display = 'none';
    const infoPanel = document.getElementById('inv-selected-info');
    infoPanel.style.display = 'block';

    document.getElementById('sel-name').innerText = item.name;
    document.getElementById('sel-desc').innerText = item.desc;

    // 標籤顯示
    const tagsDiv = document.getElementById('sel-tags');
    tagsDiv.innerHTML = '';
    
    if (isNew) tagsDiv.innerHTML += `<span class="inv-tag new">✨ 全新</span>`;
    
    if (isEquipped) {
        tagsDiv.innerHTML += `<span class="inv-tag equipped">🔴 已裝備</span>`;
    } else if (!isNew && (item.type==='weapon' || item.type==='armor')) {
        tagsDiv.innerHTML += `<span class="inv-tag">⚠️ 二手</span>`;
    }

    const typeName = {weapon:'武器', armor:'防具', accessory:'飾品', food:'食物', medical:'藥品', loot:'戰利品'}[item.category] || '物品';
    tagsDiv.innerHTML += `<span class="inv-tag">${typeName}</span>`;

    // 按鈕元素
    const btnEquip = document.getElementById('btn-equip');
    const btnSell = document.getElementById('btn-sell');
    
    // 清除舊的批量按鈕 (防止重複堆疊)
    const oldBulkBtn = document.getElementById('btn-sell-all');
    if(oldBulkBtn) oldBulkBtn.remove();

    // === 1. 左邊按鈕 (裝備/卸下/使用) ===
    btnEquip.style.display = 'block';
    btnEquip.disabled = false;

    if (isEquipped) {
        // ★ 修改點：如果是已裝備，顯示「卸下」
        btnEquip.innerText = "🔻 卸下";
        btnEquip.style.background = "#7f8c8d"; // 灰色
        btnEquip.onclick = () => { 
            // 判斷是哪個欄位
            let slot = 'accessory';
            if (item.type === 'weapon') slot = 'weapon';
            if (item.type === 'armor') slot = 'armor';
            unequipItem(slot); 
        };
    } 
    else if (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory') {
        btnEquip.innerText = "⚔️ 裝備";
        btnEquip.style.background = "#3498db"; // 藍色
        btnEquip.onclick = () => { equipItemFromGrid(itemId, isNew); };
    } 
    else if (item.type === 'sellable') {
        btnEquip.style.display = 'none'; // 純賣品不能裝備
    } 
    else {
        btnEquip.innerText = "✨ 使用";
        btnEquip.style.background = "#2ecc71"; // 綠色
        btnEquip.onclick = () => { useItem(itemId); openInventory(); };
    }

    // === 2. 右邊按鈕 (販賣) ===
    btnSell.style.display = 'block';

    if (isEquipped) {
        btnSell.style.display = 'none'; // 裝備中不能賣
    } else if (item.sell_price > 0) {
        // 預估價格
        let estimatedPrice = item.sell_price;
        if (item.type === 'weapon' || item.type === 'armor') {
            if (isNew) estimatedPrice = Math.floor(item.sell_price * 1.5);
            else estimatedPrice = "浮動";
        }
        
        btnSell.innerText = `💰 販賣 (${estimatedPrice === "浮動" ? "估價" : "$"+estimatedPrice})`;
        btnSell.onclick = () => { sellItemFromGrid(itemId, isNew); };

        // 批量販賣按鈕
        const totalCount = player.inventory[itemId];
        if (totalCount > 1) {
            const bulkBtn = document.createElement('button');
            bulkBtn.id = 'btn-sell-all';
            bulkBtn.className = 'action-btn';
            bulkBtn.style.width = '100%';
            bulkBtn.style.marginTop = '5px';
            bulkBtn.style.background = '#d35400'; // 深橘色
            bulkBtn.innerText = `🔥 全部賣掉 (x${totalCount})`;
            bulkBtn.onclick = () => { sellAllSpecificStack(itemId); };
            btnSell.parentNode.appendChild(bulkBtn);
        }
    } else {
        btnSell.style.display = 'none';
    }
}

// 專門給格子用的裝備函數 (為了處理新品庫存扣除邏輯)
function equipItemFromGrid(itemId, isNew) {
    // 這裡我們稍微 hack 一下，呼叫原本的 equipItem
    // 但因為原本的 logic 會自動優先扣新品，這符合我們的期望
    // 如果玩家點選的是「二手格子」，我們希望他裝備二手的
    
    // 如果玩家點選「二手」但包包裡有「全新」，原本的 equipItem 會強制裝備全新的
    // 為了解決這個，我們可以暫時把 new_stock 藏起來 (這有點複雜)
    
    // 簡單解法：直接呼叫原本的 equipItem，系統邏輯是「優先用最好的」
    // 我們在 UI 上雖然分開了，但實際裝備行為讓系統自動判斷即可
    // 或者你可以提示玩家「系統將自動選擇狀況最好的裝備」
    
    equipItem(itemId);
    openInventory(); // 重整畫面
}

// 專門給格子用的販賣函數
function sellItemFromGrid(itemId, isNew) {
    const item = itemData[itemId];
    
    // 這裡需要修改原本的 sellItem 邏輯來支援「指定賣全新」或「指定賣舊貨」
    // 但為了不改壞原本的，我們用一個取巧的方法：
    
    // 如果玩家想賣「全新」的
    if (isNew) {
        // 我們手動執行賣全新的邏輯
         const finalPrice = Math.floor(item.sell_price * 1.5);
         player.money += finalPrice;
         player.inventory[itemId]--;
         player.new_stock[itemId]--; // 扣除新品
         if (player.inventory[itemId] <= 0) delete player.inventory[itemId];
         log(`你特地挑了全新的 ${item.name} 賣給老闆，獲得 $${finalPrice}`, "success");
    } 
    // 如果玩家想賣「二手」的
    else {
        // 手動執行賣舊貨邏輯
        const quality = 0.2 + Math.random() * 0.6;
        const finalPrice = Math.floor(item.sell_price * quality) || 1;
        player.money += finalPrice;
        player.inventory[itemId]--;
        // 不扣 new_stock
        if (player.inventory[itemId] <= 0) delete player.inventory[itemId];
        log(`你清掉了舊的 ${item.name}，獲得 $${finalPrice}`, "success");
    }
    
    updateUI();
    openInventory(); // 重整畫面
}
function sellAllJunk() {
    let totalMoney = 0;
    let soldCount = 0;
    let soldItemsNames = [];

    // 遍歷背包所有物品
    Object.keys(player.inventory).forEach(itemId => {
        const item = itemData[itemId];
        if (!item) return;

        // ★ 只賣「戰利品 (loot)」分類，避免誤賣裝備或藥水
        if (item.category === 'loot') {
            const count = player.inventory[itemId];
            const newCount = (player.new_stock && player.new_stock[itemId]) ? player.new_stock[itemId] : 0;
            const usedCount = Math.max(0, count - newCount);
            
            let itemTotal = 0;

            // 1. 計算舊貨價值 (隨機浮動，這裡取平均值簡化計算，或你可以跑迴圈隨機)
            // 為了方便，批量販售時舊貨我們固定算 0.5 倍價格 (平均值)
            if (usedCount > 0) {
                itemTotal += Math.floor(item.sell_price * 0.5 * usedCount);
            }

            // 2. 計算新品價值 (1.5倍)
            if (newCount > 0) {
                itemTotal += Math.floor(item.sell_price * 1.5 * newCount);
                // 扣除新品庫存
                player.new_stock[itemId] = 0;
            }

            // 結算
            totalMoney += itemTotal;
            soldCount += count;
            soldItemsNames.push(item.name);
            
            // 從背包移除
            delete player.inventory[itemId];
        }
    });

    if (soldCount > 0) {
        player.money += totalMoney;
        log(`💰 批量販售：賣掉了 ${soldCount} 件戰利品 (${soldItemsNames[0]} 等...)，共獲得 $${totalMoney}`, "success");
        updateUI();
        renderGridInventory(); // 重整背包畫面
        
        // 切換回空狀態顯示
        document.getElementById('inv-selected-info').style.display = 'none';
        document.getElementById('inv-empty-msg').style.display = 'block';
    } else {
        log("背包裡沒有可以販售的戰利品雜物！", "normal");
    }
}
// 販賣特定物品的所有庫存
function sellAllSpecificStack(itemId) {
    const item = itemData[itemId];
    const totalCount = player.inventory[itemId];
    if (!totalCount || totalCount <= 0) return;

    // 計算新品與舊品數量
    const newCount = (player.new_stock && player.new_stock[itemId]) ? player.new_stock[itemId] : 0;
    const usedCount = Math.max(0, totalCount - newCount);
    
    let totalMoney = 0;

    // 1. 賣舊品 (算平均價 0.5 或隨機)
    if (usedCount > 0) {
        // 為了讓玩家覺得賺，如果是武器防具，舊貨我們給它浮動總和
        // 這裡簡化：舊貨全部以 0.4 ~ 0.6 的浮動區間計價
        for(let i=0; i<usedCount; i++) {
            const quality = 0.3 + Math.random() * 0.7;
            totalMoney += Math.floor(item.sell_price * quality);
        }
    }

    // 2. 賣新品 (1.5倍)
    if (newCount > 0) {
        totalMoney += Math.floor(item.sell_price * 1.5 * newCount);
        player.new_stock[itemId] = 0; // 清空新品庫存
    }

    // 執行
    player.money += totalMoney;
    delete player.inventory[itemId]; // 清空背包該物品

    log(`清倉大拍賣！賣掉了 ${totalCount} 個 ${item.name}，獲得 $${totalMoney}`, "success");
    updateUI();
    openInventory(); // 重整畫面
}
// --- 技能系統 ---
// 計算技能等級 (每 100 exp 升 1 等，從 Lv.0 開始)
function getSkillLevel(exp) {
    return Math.floor(exp / 100);
}

// 技能名稱對照表
const skillNames = {
    lockpicking: "🔓 開鎖",
    hacking: "💻 駭客",
    driving: "🚗 駕駛",
    stealth: "🥷 潛行"
};

// 渲染技能面板
function renderSkills() {
    const list = document.getElementById('skill-list');
    if (!list) return;
    list.innerHTML = '';

    Object.entries(player.skills).forEach(([key, exp]) => {
        const level = getSkillLevel(exp);
        const nextLevelExp = (level + 1) * 100;
        const currentLevelBase = level * 100;
        const progress = ((exp - currentLevelBase) / 100) * 100;
        
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h4 style="margin:0; font-size:1.1rem;">${skillNames[key] || key}</h4>
                <span style="color:#00cec9; font-weight:bold; font-size:1.2rem;">Lv.${level}</span>
            </div>
            <div style="font-size:0.85rem; color:#aaa; margin-bottom:5px;">
                經驗值: ${exp} / ${nextLevelExp}
            </div>
            <div class="progress-track">
                <div class="progress-fill" style="width: ${progress}%; background: #00cec9;"></div>
            </div>
        `;
        list.appendChild(card);
    });
}
// game.js

// 卸下裝備
function unequipItem(slot) {
    // slot 可能是 'weapon', 'armor', 'accessory'
    const itemId = player[slot];
    if (!itemId) return;

    const item = itemData[itemId];

    // 1. 加回背包 (視為普通舊貨，不加回 new_stock)
    player.inventory[itemId] = (player.inventory[itemId] || 0) + 1;

    // 2. 清空身上欄位
    player[slot] = null;
    
    // 如果是武器或防具，也要清空耐久度
    if (slot === 'weapon') player.weapon_dura = 0;
    if (slot === 'armor') player.armor_dura = 0;

    log(`已卸下：${item.name}`, "success");
    
    // 3. 更新介面
    updateUI();
    
    // 如果背包視窗開著，重整背包顯示
    if (document.getElementById('inventory-modal').style.display === 'flex') {
        renderGridInventory();
        // 隱藏右側詳情，避免按鈕狀態錯誤
        document.getElementById('inv-selected-info').style.display = 'none';
        document.getElementById('inv-empty-msg').style.display = 'block';
    }
}
// === 線上對戰系統 (Socket.io) ===
let socket;
let currentRoomId = null;
let onlineEnemy = null;
let isMyTurn = false;

function initSocket() {
    // 如果已經連線過就不再連
    if (socket) return;
    
    // 嘗試連線
    try {
        socket = io(); // 自動連線到當前伺服器

        // 1. 收到等待訊息
        socket.on('waiting', (msg) => {
            document.getElementById('queue-status').innerText = msg;
        });

        // 2. 配對成功，開始戰鬥
        socket.on('match_found', (data) => {
            currentRoomId = data.roomId;
            onlineEnemy = data.opponent; // 這是對手的數據
            isMyTurn = data.isMyTurn;
            
            // 初始化對手血量 (簡單處理，使用最大血量)
            onlineEnemy.currentHp = onlineEnemy.hp;

            startOnlineCombatUI();
        });

        // 3. 收到對手動作
        socket.on('opponent_action', (data) => {
            if (data.actionType === 'attack') {
                // 我被打到了
                const dmg = data.damage;
                player.hp = Math.max(0, player.hp - dmg);
                
                logOnline(`對手造成了 ${dmg} 點傷害！`, "log-enemy");
                updateUI(); // 更新我的血條

                if (player.hp <= 0) {
                    // 我輸了
                    socket.emit('combat_action', { roomId: currentRoomId, actionType: 'win' }); // 通知對手他贏了
                    endOnlineCombat(false);
                } else {
                    // 換我攻擊
                    isMyTurn = true;
                    updateOnlineButtons();
                }
            } else if (data.actionType === 'win') {
                // 對手說他輸了 (或我贏了)
                endOnlineCombat(true);
            }
        });

    } catch (e) {
        console.log("未運行在伺服器環境，無法連線。");
        document.getElementById('queue-status').innerText = "⚠️ 請使用 Node.js 啟動伺服器以進行連線。";
    }
}

// 加入配對
function joinQueue() {
    initSocket();
    if (!socket) return;

    document.getElementById('queue-status').innerText = "連線中...";
    
    // 準備我的數據傳給伺服器
    const myData = {
        name: player.title ? `${player.title} ${jobData[player.job].name}` : jobData[player.job].name,
        hp: player.max_hp,
        str: getPlayerAttack(), // 總攻擊
        def: getPlayerDefense(), // 總防禦
        spd: getPlayerSpeed()
    };

    socket.emit('find_match', myData);
}

// 介面切換：進入戰鬥
function startOnlineCombatUI() {
    document.getElementById('online-lobby').style.display = 'none';
    document.getElementById('online-combat-screen').style.display = 'block';
    document.getElementById('online-log').innerHTML = ''; // 清空 Log

    // 顯示對手資訊
    document.getElementById('online-enemy-name').innerText = onlineEnemy.name;
    updateEnemyHpUI();

    logOnline(`配對成功！對手：${onlineEnemy.name}`, "normal");
    updateOnlineButtons();
}

// 玩家點擊攻擊
function sendAttack() {
    if (!isMyTurn) return;

    // 計算傷害 (簡單版：我的攻擊 - 對方防禦*0.5)
    // 注意：這裡其實應該由伺服器驗證，但為了簡單先在客戶端算
    let dmg = Math.floor(getPlayerAttack() * (0.8 + Math.random() * 0.4));
    dmg = Math.max(1, Math.floor(dmg - (onlineEnemy.def * 0.5)));

    // 假裝扣除對手血量 (視覺用)
    onlineEnemy.currentHp -= dmg;
    updateEnemyHpUI();
    logOnline(`你攻擊了對手，造成 ${dmg} 點傷害！`, "log-player");

    // 傳送動作給伺服器
    socket.emit('combat_action', {
        roomId: currentRoomId,
        actionType: 'attack',
        damage: dmg
    });

    // 回合結束
    isMyTurn = false;
    updateOnlineButtons();
}

// 更新按鈕狀態
function updateOnlineButtons() {
    const btn = document.getElementById('btn-online-atk');
    if (isMyTurn) {
        btn.innerText = "⚔️ 輪到你了！點擊攻擊";
        btn.disabled = false;
        btn.style.background = "#e74c3c";
    } else {
        btn.innerText = "⏳ 對手思考中...";
        btn.disabled = true;
        btn.style.background = "#555";
    }
}

// 更新對手血條
function updateEnemyHpUI() {
    const pct = Math.max(0, (onlineEnemy.currentHp / onlineEnemy.hp) * 100);
    document.getElementById('online-enemy-hp-bar').style.width = `${pct}%`;
    document.getElementById('online-enemy-hp-text').innerText = `HP: ${Math.max(0, onlineEnemy.currentHp)} / ${onlineEnemy.hp}`;
}

// 寫入線上 Log
function logOnline(msg, style) {
    const box = document.getElementById('online-log');
    const div = document.createElement('div');
    div.className = `log-line ${style}`;
    div.innerText = msg;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

// 結束戰鬥
function endOnlineCombat(isWin) {
    if (isWin) {
        logOnline("🏆 對手倒下了！你獲得了勝利！", "log-win");
        // 這裡可以加獎勵
        player.money += 500;
        log("線上對戰勝利：獲得 $500", "success");
    } else {
        logOnline("💀 你被擊敗了...", "log-die");
    }

    document.getElementById('btn-online-atk').style.display = 'none';
    
    // 3秒後回大廳
    setTimeout(() => {
        document.getElementById('online-combat-screen').style.display = 'none';
        document.getElementById('online-lobby').style.display = 'block';
        document.getElementById('queue-status').innerText = "";
        document.getElementById('btn-online-atk').style.display = 'block';
        saveGame();
        updateUI();
    }, 3000);
}
// 啟動遊戲
initGame();