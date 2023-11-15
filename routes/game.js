const express = require('express');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        res.render('game', { title: '확장 가위바위보 게임' });
    } catch (err) {
        console.error(err);
        next(err);
    }
});

module.exports = router;