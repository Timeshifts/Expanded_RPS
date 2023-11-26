const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const functions = require('./functions');

dotenv.config();

connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'expanded_rps'
});

router.get('/', async (req, res, next) => {
    try {
		functions.render(req, res, 
            {page: "login", title: '로그인'});
    } catch (err) {
        console.error(err);
        next(err);
    }
});

const login_title = '로그인';

router.post('/', function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	console.log(`${username} trying to login`);

	if (!(username && password)) {
		functions.render(req, res, 
			{page: "login", title: login_title,
		error_message: '아이디와 비밀번호를 입력해 주세요.'});
		return;
	}

	const loginQuery = () => {
		connection.query('SELECT * FROM user WHERE username = ?', [username], login);
	};
	
	const checkHash = async (password, hashedPassword) => {
		return await bcrypt.compare(password, hashedPassword)
	}

	const login = async (error, results, fields) => {
		if (error) throw error;
		if (results.length <= 0) {
			functions.render(req, res, 
				{page: "login", title: login_title,
			error_message: '아이디와 비밀번호를 다시 확인해 주세요.'});
			return;
		}
		if (req.session.loggedin === true) {
			functions.render(req, res, 
				{page: "login", title: login_title,
			error_message: '이미 로그인한 계정입니다!'});
			return;
		}
		if (await checkHash(password, results[0].password)) {
			req.session.loggedin = true;
			req.session.username = username;
			req.session.uid = results[0].id;
			res.redirect('/');
			res.end();
		} else {
			functions.render(req, res, 
				{page: "login", title: login_title,
			error_message: '아이디와 비밀번호를 다시 확인해 주세요.'});
		}		
	}

	loginQuery();
		
});

module.exports = router;