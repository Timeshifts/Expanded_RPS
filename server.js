const express = require('express');
const path = require('path');
const http = require('node:http');
const SocketIO = require('socket.io');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const dotenv = require('dotenv');
const nunjucks = require('nunjucks');
const bodyParser = require('body-parser');

const indexRouter = require('./routes');
const lobbyRouter = require('./routes/lobby.js');
const gameRouter = require('./routes/game.js');
const loginRouter = require('./routes/login.js');
const registerRouter = require('./routes/register.js');
const e = require('express');

dotenv.config();

const app = express();
const host = process.env.HOST || 'localhost';
const port = process.env.PORT || 20086;
const server = http.createServer(app);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


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

let matchpool = [];
let room = [];

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
      let room_id = room.length;
      room.push(matchpool);

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
  })

});

// 게임 namespace
gameNamespace.on('connection', (socket) => {

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

app.use((req, res) => {
  res.status(404).send(`<p>404: 잘못된 주소입니다.</p><br><a href="http://${host}:${port}">메인 화면으로 돌아가기</a>`);
});

server.listen(port, () => {
  console.log(`Server is running at: http://${host}:${port}`);
  
});