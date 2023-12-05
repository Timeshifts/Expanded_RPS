const express = require('express');
const render = require('./render');

const router = express.Router();


router.get('/', async (req, res, next) => {

    try {
        render.render(req, res, 
            {page: "lobby", title: '로비'});
    } catch (err) {
        console.error(err);
        next(err);
    }

});

module.exports = router;