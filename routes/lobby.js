const express = require('express');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env'});

const router = express.Router();


router.get('/', async (req, res, next) => {

    try {
        res.render('lobby', { title: '확장 가위바위보 로비', isloggedin: req.session.isloggedin});
    } catch (err) {
        console.error(err);
        next(err);
    }

});

module.exports = router;