const express = require('express');
const path = require('path');
const http = require('node:http');
const SocketIO = require('socket.io');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const dotenv = require('dotenv');
const nunjucks = require('nunjucks');
const bodyParser = require('body-parser');
const mysql = require('mysql');

const indexRouter = require('./routes');
const lobbyRouter = require('./routes/lobby.js');
const gameRouter = require('./routes/game.js');
const loginRouter = require('./routes/login.js');
const registerRouter = require('./routes/register.js');
const recordRouter = require('./routes/record.js');

dotenv.config();

const app = express();
const host = process.env.HOST || 'localhost';
const port = process.env.PORT || 20086;
const server = http.createServer(app);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

let connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: 'mysql'
});

connection.query('CREATE DATABASE IF NOT EXISTS expanded_rps', (err, results) => {
  if (err) {
    console.error('DB connection failed:', err);
    process.exit();
  }
});

connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: 'expanded_rps'
});

const createTableQuery = [
  `CREATE TABLE user (
    id int NOT NULL auto_increment PRIMARY KEY,
    username varchar(16) NOT NULL,
    password varchar(64) NOT NULL
  );`,
  `CREATE TABLE record (
    id int NOT NULL auto_increment PRIMARY KEY,
    timestamp bigint NOT NULL,
    left_uid int NOT NULL,
    right_uid int NOT NULL,
    left_hand varchar(16),
    right_hand varchar(16),
    score int NOT NULL
  );`
]

connection.query('SHOW TABLES LIKE "user"', (err, results) => {
  if (err) {
    console.error('DB connection failed:', err);
    process.exit();
  }
  if (results.length <= 0) {
    console.log('MySQL table not found, creating table...');
    createTable();
  }
});

function createTable() {
  for (const query of createTableQuery) {
    connection.query(query, (err, results) => {
      if (err) {
        console.error('DB table creation failed:', err);
        process.exit();
      }
    });
  }
}

const io = SocketIO(server, { path: "/socket.io/" });

const matchNamespace = io.of('/match');
const gameNamespace = io.of('/game');


app.use(cookieParser(process.env.COOKIE_SECRET));
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));
nunjucks.configure('views', {express: app, watch: true});

const sessionMiddleware = session({
  resave: false,
  saveUninitialized: false,
  secret: process.env.COOKIE_SECRET,
  cookie: {
    httpOnly: true,
    secure: false
  }
});

app.use(sessionMiddleware);

io.use((socket, next) => {
  sessionMiddleware(socket.request, socket.request.res || {}, next);
});
matchNamespace.use((socket, next) => {
  sessionMiddleware(socket.request, socket.request.res || {}, next);
});
gameNamespace.use((socket, next) => {
  sessionMiddleware(socket.request, socket.request.res || {}, next);
});

function restrict(req, res, next) {
  if (req.session.loggedin) {
    next();
  } else {
    req.session.error = '로그인이 필요합니다.';
    res.redirect('/login');
  }
}

app.use('/', express.static(path.join(__dirname, 'public')));

// 소켓 서버 시작
io.on('connection', (socket) => {

  const session = socket.request.session;

  if (session && session.username) {
    // 클라이언트 감지
    console.log(`client detected, UID ${session.id}`);
  } else {
    socket.emit('alert', {message: '로그인 정보가 유효하지 않습니다.'});
    socket.disconnect();
  }

});

class User {
  constructor(uid, sid) {
    this.user_id = uid;
    this.socket_id = sid;
  }
}

const GAME_STAGE = {
  WAIT_ANOTHER: "wait_another",
  CHOICE_HAND: "choice_hand",
  WAIT_HAND: "wait_hand",
  SHOW_RESULT: "show_result"
}

Object.freeze(GAME_STAGE);

class Room {
  constructor(users) {
    this.users = users;
    this.state = GAME_STAGE.WAIT_ANOTHER;
    this.is_ready = Array(users.length).fill(false);
    this.hands = Array(users.length);
  }

  userIndex(user) {
    for (let i = 0; i < this.users.length; i++) {
      if (this.users[i].user_id === user.user_id) return i;
    }
  }

  reMatch() {
    this.state = GAME_STAGE.CHOICE_HAND;
    this.is_ready = Array(this.users.length).fill(false);
    this.hands = Array(this.users.length);
  }
}

let matchpool = [];
let rooms = [];

// 클라이언트 매칭 namespace
matchNamespace.on('connection', (socket) => {

  const session = socket.request.session;
  let user = new User(session.uid, socket.id);

  // 클라이언트가 필요한 정보를 보내면
  socket.on('join_match', (data) => {
    console.log("매치 등록");
    
    // 클라이언트 매칭 시작
    console.log(`${socket.id} (UID ${session.uid}) joined the game.`);
    
    // 유저 ID를 매칭 풀에 등록
    if (!matchpool.includes(user)) {
      matchpool.push(user);
      console.log(`Matching pool is now: ${matchpool}`)
    }

    // 만약 1:1 매칭이 성사된다면
    if (matchpool.length === 2) {
      console.log(`Room (${matchpool}) created.`);

      // 매칭 풀을 방으로 넣고
      let room_id = rooms.length;
      let room = new Room([matchpool[0], matchpool[1]]);
      rooms.push(room);

      // 클라이언트에게 알려주기
      io.of('/match').to(matchpool[0].socket_id).emit('match_complete', {'room_id': room_id});
      io.of('/match').to(matchpool[1].socket_id).emit('match_complete', {'room_id': room_id});
      
      matchpool = [];
    }
  });
  
  // 연결이 끊기면 매칭 풀에서 삭제
  socket.on('disconnect', (data) => {
    for (let i = 0; i < matchpool.length; i++) {
      if (matchpool[i].user_id === user.user_id) matchpool.splice(i, 1);
      break;
    }
  });
});

// 소켓의 방 집합에서 게임 방 번호 찾기
function roomIndex(rooms) {
  for (const room of rooms) {
    if (room.includes("game")) return parseInt(room.substring(4));
  }
}

// 게임 namespace
gameNamespace.on('connection', (socket) => {

  const rpssl_rules = {
    'scissors': ['paper', 'lizard'],
    'rock': ['lizard', 'scissors'],
    'paper': ['rock', 'spock'],
    'lizard': ['spock', 'paper'],
    'spock': ['scissors', 'rock']
  };

  // 0은 무승부, -1이 1번 플레이어, 1이 2번 플레이어 승리
  function rpsslResult(hands) {
    if (hands[0] === hands[1]) return 0;
    if (rpssl_rules[hands[0]].includes(hands[1])) return -1;
    else return 1;
  }

  const session = socket.request.session;
  let user = new User(session.uid, socket.id);

  let room_index = undefined; 
  let user_index = undefined;
  
  for (let i = 0; i < rooms.length; i++) {
    if (rooms[i].userIndex(user) != -1) {
      // 소켓 ID 갱신
      socket.join(`game${i}`);
      room_index = roomIndex(socket.rooms);
      user_index = rooms[room_index].userIndex(user);
      rooms[room_index].users[user_index].socket_id = socket.id;
      // 준비 완료
      rooms[i].is_ready[user_index] = true;
      console.log(`Room ${i} user ${user_index} is ready.`)
      if (rooms[i].is_ready.every(value => value === true)) {
        gameNamespace.to(`game${i}`).emit('change_state', {state: GAME_STAGE.CHOICE_HAND});
        rooms[i].state = GAME_STAGE.CHOICE_HAND;
      }
      break;
    }
  }

  socket.on('choose_hand', (hand) => {
    
    const left = rooms[room_index].users[0];
    const right = rooms[room_index].users[1];

    if (rooms[room_index].state != GAME_STAGE.CHOICE_HAND) return;
    rooms[room_index].hands[user_index] = hand;
    if (!rooms[room_index].hands.includes(undefined)) {
      let result = rpsslResult(rooms[room_index].hands);
      const now = Date.now();
      const query = `INSERT INTO record 
      (timestamp, left_uid, right_uid, left_hand, right_hand, score)
      VALUES (?, ?, ?, ?, ?, ?);`;
      connection.query(query, 
        [now, 
        left.user_id,
        right.user_id,
        rooms[room_index].hands[0],
        rooms[room_index].hands[1],
        result],
        (err, results) => { if (err) throw err });

      gameNamespace.to(left.socket_id).emit('change_state',
      {state: GAME_STAGE.SHOW_RESULT,
      hands: rooms[room_index].hands,
      winner: result});
      gameNamespace.to(right.socket_id).emit('change_state',
      {state: GAME_STAGE.SHOW_RESULT,
      hands: rooms[room_index].hands.slice().reverse(),
      winner: result * -1});
      rooms[room_index].is_ready.fill(false);
      rooms[room_index].state = GAME_STAGE.SHOW_RESULT;
    }
  });

  socket.on('rematch_request', () => {
    if (rooms[room_index].state != GAME_STAGE.SHOW_RESULT) return;
    rooms[room_index].is_ready[user_index] = true;
    if (!rooms[room_index].is_ready.every(value => value === true)) {
      console.log(`Room ${room_index} user ${user_index} require rematch.`)
      gameNamespace.to(rooms[room_index].users[1-user_index]
        .socket_id).emit('rematch_request');
    } else {  
      console.log(`Room ${room_index} starting rematch.`)
      rooms[room_index].reMatch();
      gameNamespace.to(`game${room_index}`).emit('re_match');
    }
  });

  socket.on('disconnect', () => {
    gameNamespace.to(`game${room_index}`).emit('other_disconnect');
    socket.leave(`game${room_index}`);
    rooms.splice(room_index);
  });

});

app.use('/', indexRouter);

app.use('/lobby', restrict, lobbyRouter);

app.use('/game', restrict, gameRouter);

app.use('/login', loginRouter);
app.use('/register', registerRouter);
app.get('/logout', function(req, res) {
  req.session.loggedin = false;
	res.redirect('/');
});

app.use('/record', recordRouter);

app.use((req, res) => {
  res.status(404).send(`<p>404: 잘못된 주소입니다.</p><br><a href="/">메인 화면으로 돌아가기</a>`);
});

server.listen(port, () => {
  console.log(`Server is running at: http://${host}:${port}`);
  
});