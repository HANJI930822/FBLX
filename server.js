// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 設定靜態檔案 (讓瀏覽器讀得到你的 html/css/js)
app.use(express.static(__dirname));

// 玩家配對隊列
let waitingPlayer = null;

io.on('connection', (socket) => {
    console.log('一位玩家連線了: ' + socket.id);

    // 1. 玩家請求配對
    socket.on('find_match', (playerData) => {
        // 將玩家數據暫存在 socket 物件中
        socket.playerData = playerData;

        if (waitingPlayer) {
            // === 配對成功 ===
            const roomName = `room_${waitingPlayer.id}_${socket.id}`;
            
            // 兩人加入房間
            socket.join(roomName);
            waitingPlayer.join(roomName);

            // 通知雙方遊戲開始
            // 對手是對方
            io.to(waitingPlayer.id).emit('match_found', { 
                roomId: roomName, 
                opponent: socket.playerData, // 給等待者看新來者的數據
                isMyTurn: true // 等待者先攻
            });
            
            socket.emit('match_found', { 
                roomId: roomName, 
                opponent: waitingPlayer.playerData, // 給新來者看等待者的數據
                isMyTurn: false // 新來者後攻
            });

            console.log(`配對成功: ${waitingPlayer.id} vs ${socket.id}`);
            waitingPlayer = null; // 清空隊列

        } else {
            // === 無人等待，進入隊列 ===
            waitingPlayer = socket;
            socket.emit('waiting', '正在尋找對手...');
        }
    });
    // 2. 戰鬥動作轉發
    socket.on('combat_action', (data) => {
        // data 包含: { roomId, damage, actionType }
        // 廣播給房間內的其他人 (除了自己)
        socket.to(data.roomId).emit('opponent_action', data);
    });

    // 3. 斷線處理
    socket.on('disconnect', () => {
        if (waitingPlayer === socket) {
            waitingPlayer = null;
        }
        console.log('玩家斷線');
        // 實際專案中這裡要處理對手斷線判勝
    });
});

server.listen(3000, () => {
    console.log('伺服器啟動中: http://localhost:3000');
});