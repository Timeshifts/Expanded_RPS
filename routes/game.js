const express = require('express');

const render = require('./render');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        render.render(req, res, 
            {page: "game", title: '확장 가위바위보 게임!'});
    } catch (err) {
        console.error(err);
        next(err);
    }
});

module.exports = router;