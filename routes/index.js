const express = require('express');

const functions = require('./functions');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        functions.render(req, res, {});
    } catch (err) {
        console.error(err);
        next(err);
    }
});

module.exports = router;