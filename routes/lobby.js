const express = require('express');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

dotenv.config({ path: '../.env'});

const router = express.Router();

router.use(cookieParser(process.env.COOKIE_SECRET));

router.get('/', async (req, res, next) => {
    const name = req.query.name;
    console.log(name);
    
    if (name.length > 8) {
        res.send('<script>alert("이름은 최대 8자까지 입력 가능합니다."); document.location = "../";</script>');
        return;
    } else if (name.includes(" ") || name === "") {
        res.send('<script>alert("이름에 공백을 포함할 수 없습니다."); document.location = "../";</script>');
        return;
    }

    res.cookie('username', name, { httpOnly: true });

    try {
        res.render('lobby', { title: '확장 가위바위보 로비' });
    } catch (err) {
        console.error(err);
        next(err);
    }
});

module.exports = router;