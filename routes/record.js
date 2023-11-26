const express = require('express');
const mysql = require('mysql');
const dotenv = require('dotenv');
const router = express.Router();

const functions = require('./functions');

dotenv.config();

connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'expanded_rps'
});

const recordQuery = `SELECT * 
    FROM record
    WHERE left_uid = ? or right_uid = ?`;

router.get('/', async (req, res, next) => {
    let id = undefined;
    if (!req.query.id) {
        if (!req.session.loggedin) {
            res.status(400).send('ID가 잘못되었습니다.');
            return;
        }
        id = req.session.uid;
    } else {
        id = req.query.id;
    }
    connection.query(recordQuery, [id, id], (err, results) => {
        if (err) throw err;
        console.log(`record request of ID ${id} incoming`);
        res.json({id: id, records: results});
    });
});

module.exports = router;