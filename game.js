// js/game.js
let currentCategory = 'all';
function initGame() {
  const savedData = localStorage.getItem("myTornGame");
  if (savedData) {
    const parsed = JSON.parse(savedData);
    player = { ...defaultPlayerState, ...parsed };
    if (!player.inventory) player.inventory = {};
    if (!player.job) player.job = "none";
    if (!player.defense) player.defense = 0;
    if (!player.armor) player.armor = null;
    if (!player.weapon) player.weapon = null;
    if (player.hp === undefined) player.hp = player.max_hp;

    log("歡迎回來！", "normal");
  } else {
    log("新遊戲開始！", "normal");
  }

  renderShop();
  renderEnemies();
  renderJobs(); // ★ 新增
  updateUI();

  setInterval(gameTick, gameConfig.tickRate);
  setInterval(saveGame, 5000);
}

function saveGame() {
  localStorage.setItem("myTornGame", JSON.stringify(player));
}
function resetGame() {
  if (confirm("確定重置？")) {
    localStorage.removeItem("myTornGame");
    location.reload();
  }
}

// --- 職業系統 (Jobs) ---
function renderJobs() {
  const list = document.getElementById("job-list");
  list.innerHTML = "";

  // 更新目前職業顯示
  const currentJob = jobData[player.job];
  document.getElementById("current-job-name").innerText = currentJob.name;
  document.getElementById("current-job-desc").innerText =
    `薪水: $${currentJob.salary} / 次`;

  for (const [id, job] of Object.entries(jobData)) {
    if (id === "none") continue; // 不顯示無業

    const canApply = player.strength >= job.reqStr;
    const isCurrent = player.job === id;

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <h4>${job.name}</h4>
                <span style="color:#f1c40f">$${job.salary}</span>
            </div>
            <p style="font-size:0.8rem; color:#aaa">${job.desc}</p>
            <small>需求力量: ${job.reqStr}</small>
            <button class="action-btn" 
                style="width:100%; margin-top:5px; background:${isCurrent ? "#444" : canApply ? "#2ecc71" : "#555"}" 
                onclick="applyJob('${id}')" 
                ${isCurrent || !canApply ? "disabled" : ""}>
                ${isCurrent ? "就職中" : canApply ? "應徵" : "能力不足"}
            </button>
        `;
    list.appendChild(card);
  }
}

function applyJob(jobId) {
  const job = jobData[jobId];
  if (player.strength >= job.reqStr) {
    player.job = jobId;
    log(`錄取通知：恭喜你成為了 ${job.name}！`, "success");
    renderJobs();
    updateUI();
  } else {
    log("面試失敗：你的力量不足！", "fail");
  }
}

function work() {
  const job = jobData[player.job];
  if (player.energy >= gameConfig.workCost) {
    player.energy -= gameConfig.workCost;
    player.money += job.salary;

    // 工作也能獲得少量經驗
    gainExp(2);

    log(`工作完成：獲得薪水 $${job.salary} (Exp +2)`, "success");
    updateUI();
  } else {
    log("體力不足，無法工作！", "fail");
  }
}

// --- 升級系統 (Level Up) ---
function gainExp(amount) {
  player.exp += amount;
  if (player.exp >= player.max_exp) {
    player.level++;
    player.exp -= player.max_exp;
    player.max_exp = Math.floor(player.max_exp * 1.2); // 升級所需經驗變多

    // 升級獎勵
    player.max_hp += 10;
    player.hp = player.max_hp; // 補滿血
    player.strength += 2;
    player.speed += 2;

    log(`🎉 升級了！現在等級 ${player.level}！(全屬性提升)`, "success");
  }
}

// --- 戰鬥系統 (修改後) ---
// 計算玩家總攻擊力 (力量 + 武器)
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
    // 基礎防禦 (隨等級/力量提升) + 裝備防禦
    return (player.strength * 0.5) + armorDef; // 假設每點力量給 0.5 防禦
}

async function simulateFight(originalEnemy) {
  let enemyHp = originalEnemy.hp;
  let playerHp = player.hp;
  const battleLog = document.getElementById("battle-log");
  const addLog = (msg, style) => {
    const div = document.createElement("div");
    div.className = `log-line ${style}`;
    div.innerText = msg;
    battleLog.appendChild(div);
    battleLog.scrollTop = battleLog.scrollHeight;
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  addLog(`=== 遭遇 ${originalEnemy.name} (Lv.?) ===`, "normal");

  while (enemyHp > 0 && playerHp > 0) {
    await wait(600);

    let totalAtk = getPlayerAttack();
    let dmg = Math.floor(totalAtk * (0.8 + Math.random() * 0.4));

    let hitChance = 0.8 + (player.speed - originalEnemy.spd) * 0.01;
    if (Math.random() > hitChance) dmg = 0;

    if (dmg > 0) {
      enemyHp -= dmg;
      addLog(`> 你發動攻擊，造成 ${dmg} 點傷害！`, "log-player");
    } else {
      addLog(`> 你的攻擊揮空了！`, "log-enemy");
    }

    if (enemyHp <= 0) break;
    await wait(400);

    // --- 敵人攻擊 ---
    let totalDef = getPlayerDefense();
    enemyDmg = Math.max(1, Math.floor(enemyDmg - (totalDef * 0.5)));

    let dodgeChance = 0.1 + (player.speed - originalEnemy.spd) * 0.01;
    if (Math.random() < dodgeChance) {
            addLog(`> 你閃過了 ${originalEnemy.name} 的攻擊！`, "log-player");
        } else {
            playerHp -= enemyDmg;
            addLog(`> 對方擊中你，造成 ${enemyDmg} 點傷害。`, "log-enemy");
            updateUI();
        }
        player.hp = Math.max(0, playerHp);
        updateUI();
  }

  await wait(300);
  if (player.hp > 0) {
    player.money += originalEnemy.reward;
    // ★ 修改：獲得經驗值
    let expGain = originalEnemy.exp || 10;
    addLog(`=== 勝利 ===`, "log-win");
    addLog(`獲得: $${originalEnemy.reward}, Exp +${expGain}`, "log-win");
    gainExp(expGain);
  } else {
    addLog(`=== 敗北 ===`, "log-die");
    addLog(`你被打倒在地...`, "log-die");
  }
  updateUI();
}

// --- 裝備與背包系統 ---

function renderInventory() {
    const invList = document.getElementById('inventory-list');
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
            
            // 判斷裝備狀態
            const isEquippedWeapon = (player.weapon === id);
            const isEquippedArmor = (player.armor === id); // ★ 新增
            
            let btnText = "使用";
            let btnAction = `useItem('${id}')`;
            let btnColor = "#444"; 
            
            // 武器邏輯
            if (item.type === 'weapon') {
                if (isEquippedWeapon) {
                    btnText = "已裝備"; btnAction = ""; btnColor = "#e74c3c"; 
                } else {
                    btnText = "裝備武器"; btnAction = `equipItem('${id}')`; btnColor = "#2980b9"; 
                }
            }
            // ★ 防具邏輯
            else if (item.type === 'armor') {
                if (isEquippedArmor) {
                    btnText = "已裝備"; btnAction = ""; btnColor = "#e74c3c"; 
                } else {
                    btnText = "裝備防具"; btnAction = `equipItem('${id}')`; btnColor = "#27ae60"; // 綠色按鈕
                }
            }

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between;">
                    <h4>${item.name}</h4>
                    <span style="font-weight:bold">x${qty}</span>
                </div>
                <p style="font-size:0.8rem; color:#aaa">${item.desc}</p>
                <button class="action-btn" 
                    style="width:100%; margin-top:5px; background:${btnColor};" 
                    onclick="${btnAction}" 
                    ${(isEquippedWeapon || isEquippedArmor) ? 'disabled' : ''}>
                    ${btnText}
                </button>
            `;
            invList.appendChild(card);
        }
    });
}

// 新增：裝備道具
function equipItem(itemId) {
    const item = itemData[itemId];
    if (item.type === 'weapon') {
        player.weapon = itemId;
        log(`裝備了武器：${item.name}`, "success");
    } else if (item.type === 'armor') { // ★ 新增
        player.armor = itemId;
        log(`穿上了防具：${item.name}`, "success");
    }
    updateUI();
}

function useItem(itemId) {
    const item = itemData[itemId];
    if (item.type === 'weapon' || item.type === 'armor') return; // 不能吃

    if (!player.inventory[itemId] || player.inventory[itemId] <= 0) return;
    
    if (item.type === 'hp') { 
        player.hp += item.value; 
        if(player.hp > player.max_hp) player.hp = player.max_hp; 
        log(`使用了 ${item.name}`, "success"); 
    } 
    else if (item.type === 'energy') { 
        player.energy += item.value; 
        if(player.energy > player.max_energy) player.energy = player.max_energy; 
        log(`使用了 ${item.name}`, "success"); 
    }
    else if (item.type === 'nerve') { // ★ 支援 nerve
        player.nerve += item.value; 
        if(player.nerve > player.max_nerve) player.nerve = player.max_nerve; 
        log(`使用了 ${item.name}`, "success"); 
    }
    
    player.inventory[itemId]--;
    if (player.inventory[itemId] <= 0) delete player.inventory[itemId];
    updateUI();
}

// --- 通用功能 ---
function startCombat(enemyId) {
  /* 略，同前 */
  if (player.hp <= 0) {
    log("重傷無法戰鬥！", "fail");
    return;
  }
  if (player.energy < 5) {
    log("體力不足！", "fail");
    return;
  }
  player.energy -= 5;
  updateUI();
  document.getElementById("enemy-selection").style.display = "none";
  document.getElementById("combat-screen").style.display = "block";
  const enemy = enemyData[enemyId];
  document.getElementById("enemy-name").innerText = enemy.name;
  const battleLog = document.getElementById("battle-log");
  battleLog.innerHTML = "";
  simulateFight(enemy);
}
function endCombat() {
  document.getElementById("enemy-selection").style.display = "block";
  document.getElementById("combat-screen").style.display = "none";
}
function showPanel(panelId) {
  /* 略 */
  document
    .querySelectorAll(".panel")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById(panelId).classList.add("active");
  document
    .querySelectorAll(".nav-btn")
    .forEach((btn) => btn.classList.remove("active"));
  const activeBtn = Array.from(document.querySelectorAll(".nav-btn")).find(
    (btn) => btn.getAttribute("onclick").includes(panelId),
  );
  if (activeBtn) activeBtn.classList.add("active");
}
function buyItem(itemId) {
  /* 略 */
  const item = itemData[itemId];
  if (player.money >= item.cost) {
    player.money -= item.cost;
    if (player.inventory[itemId]) {
      player.inventory[itemId]++;
    } else {
      player.inventory[itemId] = 1;
    }
    log(`購買成功：${item.name}`, "success");
    updateUI();
  } else {
    log("金錢不足！", "fail");
  }
}
function train(stat) {
  /* 略 */
  if (player.hp <= 0) {
    log("在醫院無法訓練！", "fail");
    return;
  }
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
  if (player.hp <= 0) {
    log("在醫院無法犯罪！", "fail");
    return;
  }
  const crime = crimeData[crimeId];
  if (player.nerve >= crime.cost) {
    player.nerve -= crime.cost;
    if (Math.random() < crime.successRate) {
      player.money += crime.reward;
      gainExp(1); // 犯罪也有微薄經驗
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
  if (player.energy < player.max_energy)
    player.energy += gameConfig.energyRecover;
  if (player.nerve < player.max_nerve) player.nerve += gameConfig.nerveRecover;
  if (player.hp < player.max_hp) player.hp += gameConfig.hpRecover;
  updateUI();
}

function updateUI() {
  // 數值顯示
  document.getElementById("money").innerText = player.money;
  document.getElementById("energy").innerText = Math.floor(player.energy);
  document.getElementById("hp").innerText = Math.floor(player.hp);
  document.getElementById("level").innerText = player.level;

  // 經驗條
  const expPercent = Math.min(100, (player.exp / player.max_exp) * 100);
  document.getElementById("exp-bar").style.width = `${expPercent}%`;

  // 進度條
  const hpPercent = Math.min(100, (player.hp / player.max_hp) * 100);
  document.getElementById("hp-bar").style.width = `${hpPercent}%`;
  const energyPercent = Math.min(
    100,
    (player.energy / player.max_energy) * 100,
  );
  document.getElementById("energy-bar").style.width = `${energyPercent}%`;
  const nervePercent = Math.min(100, (player.nerve / player.max_nerve) * 100);
  document.getElementById("nerve-bar").style.width = `${nervePercent}%`;

  // 職業與攻擊力
  const job = jobData[player.job];
  document.getElementById("job-title").innerText = job
    ? `(${job.name})`
    : "(無業)";
  document.getElementById("total-atk").innerText = getPlayerAttack();

  // 武器顯示
  let weaponName = "赤手空拳";
  if (player.weapon && itemData[player.weapon]) {
    document.getElementById("weapon-display").innerText =
      itemData[player.weapon].name;
  } else {
    document.getElementById("weapon-display").innerText = "無 (徒手)";
  }
  let armorName = "裸體";
    if (player.armor && itemData[player.armor]) armorName = itemData[player.armor].name;

      document.getElementById('weapon-display').innerText = `${weaponName} / ${armorName}`;
  if (document.getElementById("gym-str"))
    document.getElementById("gym-str").innerText = player.strength;
  if (document.getElementById("gym-spd"))
    document.getElementById("gym-spd").innerText = player.speed;

  renderInventory();
}

function log(message, type) {
  
  const logArea = document.getElementById("log-area");
  const entry = document.createElement("div");
  entry.className = "log-entry";
  if (type === "success") entry.classList.add("log-success");
  if (type === "fail") entry.classList.add("log-fail");
  const time = new Date().toLocaleTimeString();
  entry.innerText = `[${time}] ${message}`;
  logArea.prepend(entry);
}
function renderShop(category = "all") {
  currentCategory = category; // 更新當前分類

  // 1. 更新按鈕樣式 (Highlight)
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    // 簡單的比對：如果按鈕文字包含分類名稱 (這是一種簡化寫法)
    // 更嚴謹的做法是給按鈕加 data-category 屬性，但這裡用 onclick 傳參比較快
    if (btn.getAttribute("onclick").includes(`'${category}'`)) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  const shopList = document.getElementById("shop-list");
  shopList.innerHTML = "";

  for (const [id, item] of Object.entries(itemData)) {
    // ★ 篩選邏輯
    if (category !== "all" && item.category !== category) {
      continue; // 如果不符合分類就跳過
    }

    const itemCard = document.createElement("div");
    itemCard.className = "card";
    itemCard.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h4>${item.name}</h4>
                <span style="color:var(--accent-green)">$${item.cost}</span>
            </div>
            <p style="font-size:0.8rem; color:#aaa">${item.desc}</p>
            <button class="action-btn" style="width:100%; margin-top:10px;" onclick="buyItem('${id}')">購買</button>
        `;
    shopList.appendChild(itemCard);
  }
}
function renderEnemies() {
  const list = document.getElementById("enemy-list");
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

initGame();
