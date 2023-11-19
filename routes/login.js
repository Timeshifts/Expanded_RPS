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

router.post('/', function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	console.log(`${username} trying to login`);

	if (username && password) {

		const checkHash = async (password, hashedPassword) => {
			return await bcrypt.compare(password, hashedPassword)
		}
		  
		const login = async (req, res) => {

			connection.query('SELECT * FROM user WHERE username = ?', [username], async function(error, results, fields) {
				if (error) throw error;
				if (results.length > 0) {
					if (await checkHash(password, results[0].password)) {
						req.session.loggedin = true;
						req.session.username = username;
						req.session.uid = results[0].id;
						res.redirect('/');
						res.end();
					} else {
						functions.render(req, res, 
							{page: "login", title: '로그인',
						error_message: '아이디와 비밀번호를 다시 확인해 주세요.'});
					}
				} else {
					functions.render(req, res, 
						{page: "login", title: '로그인',
					error_message: '아이디와 비밀번호를 다시 확인해 주세요.'});
				}			
			});
		};
		
		login(req, res);
		
	} else {
		functions.render(req, res, 
			{page: "login", title: '로그인',
		error_message: '아이디와 비밀번호를 입력해 주세요.'});
	}
});

module.exports = router;