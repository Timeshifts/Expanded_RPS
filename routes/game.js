const express = require('express');

const functions = require('./functions');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        functions.render(req, res, 
            {page: "game", title: '확장 가위바위보 게임!'});
    } catch (err) {
        console.error(err);
        next(err);
    }
});

module.exports = router;