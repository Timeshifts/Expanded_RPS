const express = require('express');
const path = require('path');
const http = require('node:http');
const SocketIO = require('socket.io');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const nunjucks = require('nunjucks');

const indexRouter = require('./routes');
const lobbyRouter = require('./routes/lobby.js');
const gameRouter = require('./routes/game.js');

dotenv.config();

const app = express();
const host = process.env.HOST || 'localhost';
const port = process.env.PORT || 20086;
const server = http.createServer(app);
const io = SocketIO(server, { path: "/socket.io/" });

const matchNamespace = io.of('/match');
const gameNamespace = io.of('/game');

app.use(cookieParser(process.env.COOKIE_SECRET));
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));
nunjucks.configure('views', {express: app, watch: true});

// 전체 유저 id 부여용 count
let user_count = 0;
let users = [];

function findUserIdBySocketId(socket_id) {
  for (let i = 0; i < users.length; i++) {
    if (users[i].socket_id === socket_id) {
      return i;
    }
  }
  return -1;
}

class User {
  constructor(name) {
    this.id = user_count;
    this.name = name;
    this.socket_id = undefined;
    user_count++;
  }
}

// 소켓 서버 시작
io.on('connection', (socket) => {

  // 클라이언트가 감지되면 id에 등록
  console.log(`client detected, temp ID ${socket.id}`);
  const user_id = users.length;
  users.push(new User(socket.id));
  socket.emit('set_storage', {key: 'user_id', value: user_id});

  // 창이 바뀔 때 user_id - socket_id 연결
  socket.on('set_socket_id', (data) => {
    let u_id = parseInt(data.user_id);
    if (!Number.isInteger(u_id) || u_id >= users.length) return;
    users[u_id].socket_id = socket.id; 
    console.log(`UID ${u_id}'s socket_id is now ${socket.id}`);
  })

});


let matchpool = [];
let room = [];

// 클라이언트 매칭 namespace
matchNamespace.on('connection', (socket) => {

  let user_id = undefined;

  // 창이 바뀔 때 user_id - socket_id 연결
  socket.on('set_socket_id', (data) => {
    let u_id = parseInt(data.user_id);
    if (!Number.isInteger(u_id) || u_id >= users.length) return;
    users[u_id].socket_id = socket.id; 
    console.log(`UID ${u_id}'s socket_id is now ${socket.id}`);
  })

  // 클라이언트가 필요한 정보를 보내면
  socket.on('join_match', (data) => {
    console.log("매치 등록");
    
    // 클라이언트 매칭 시작
    user_id = data.user_id;
    console.log(`${socket.id} (UID ${user_id}) joined the game.`);
    
    // 유저 ID를 매칭 풀에 등록
    if (!matchpool.includes(user_id)) {
      matchpool.push(user_id);
      console.log(`Matching pool is now: ${matchpool}`)
    }

    // 만약 1:1 매칭이 성사된다면
    if (matchpool.length === 2) {
      console.log(`Room (${matchpool}) created.`);

      // 매칭 풀을 방으로 넣고
      let room_id = room.length;
      room.push(matchpool);

      // 클라이언트에게 알려주기
      io.of('/match').to(users[matchpool[0]].socket_id).emit('match_complete', {'room_id': room_id});
      io.of('/match').to(users[matchpool[1]].socket_id).emit('match_complete', {'room_id': room_id});
      
      room = [];

    }
  });
  
  // 연결이 끊기면 매칭 풀에서 삭제
  socket.on('disconnect', (data) => {
    const index = matchpool.indexOf(user_id);
    if (index != -1) matchpool.splice(index, 1);
  })

});

// 게임 namespace
gameNamespace.on('connection', (socket) => {

});

app.use('/', indexRouter);

app.use('/lobby', lobbyRouter);

app.use('/game', gameRouter);

app.get('/main.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'styles/main.css'));
});

app.use('/', express.static(path.join(__dirname, 'public')));

app.use((req, res) => {
  res.status(404).send(`<p>404: 잘못된 주소입니다.</p><br><a href="http://${host}:${port}">메인 화면으로 돌아가기</a>`);
});

server.listen(port, () => {
  console.log(`Server is running at: http://${host}:${port}`);
});