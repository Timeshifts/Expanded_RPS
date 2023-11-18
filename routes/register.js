const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');

dotenv.config();

connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'expanded_rps'
});

router.post('/', function(req, res) {
	var username = req.body.username;
	var password = req.body.password;

	console.log(`${username} trying to register`);
	const saltRounds = 12;

	if (username && password) {
		
		if (username.length > 8) {
			res.render('login', { title: '로그인',
			error_message: '이름은 최대 8자까지 가능합니다.'});
			return;
		} else if (password.length < 4) {
			res.render('login', { title: '로그인',
			error_message: '비밀번호는 4자 이상으로 설정해 주세요.'});
			return;
		}

		const makeHash = async (password, saltRounds) => {
			return await bcrypt.hash(password, saltRounds);
		}

		const register = async (req, res) => {
			const hashedPassword = await makeHash(password, saltRounds);
			console.log(`${username}'s hashed password is: ${hashedPassword}`);

			connection.query('SELECT * FROM user WHERE username = ?', [username], function(error, results, fields) {
				if (error) throw error;
				if (results.length <= 0) {

					connection.query('INSERT INTO user (username, password) VALUES(?,?)', [username, hashedPassword],
					function (error, data) {
						if (error) console.log(error);
						else console.log(data);
					});

					res.render('login', { title: '로그인',
					error_message: '등록되었습니다! 다시 로그인해 주세요.'});
				} else {
					res.render('login', { title: '로그인',
					error_message: '이미 존재하는 이름입니다!'});
				}			
			});
		}
		
		register(req, res);
		
	} else {
		res.render('login', { title: '로그인',
			error_message: '이름과 비밀번호를 입력해 주세요.'});
	}
});

module.exports = router;