const express = require('express');
const mysql = require('mysql');
const dotenv = require('dotenv');
const router = express.Router();

dotenv.config();

connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'expanded_rps'
});

const recordQuery = `SELECT * 
    FROM record
    WHERE left_uid = ? or right_uid = ?
    ORDER BY id DESC`;

function flipRecord(record) {
        record.score *= -1;
        const temp = record.left_hand;
        record.left_hand = record.right_hand;
        record.right_hand = temp;
    }

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

    let page = parseInt(req.query.page);
    if (isNaN(page) || page < 0) page = 1;

    connection.query(recordQuery, [id, id], (err, results) => {
        if (err) throw err;
        console.log(`record request of ID ${id} at page ${page} incoming`);
        const response = results.slice(10*(page-1), 10*page);
        
        let data = [0, 0, 0];

        for (const record of results) {
            if (record.left_uid != id) flipRecord(record);
            let score = record.score;
            score = parseInt(score) + 1; data[score] += 1;
        }
        res.json({id: id, total_length: results.length, score: data, records: response});
    });
});

module.exports = router;