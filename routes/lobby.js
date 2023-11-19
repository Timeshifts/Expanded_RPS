const express = require('express');
const dotenv = require('dotenv');
const functions = require('./functions');

dotenv.config({ path: '../.env'});

const router = express.Router();


router.get('/', async (req, res, next) => {

    try {
        functions.render(req, res, 
            {page: "lobby", title: '로비'});
    } catch (err) {
        console.error(err);
        next(err);
    }

});

module.exports = router;