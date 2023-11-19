module.exports = {
    render: function (req, res, options) {
        page = options.page || 'index';
        options.title = options.title || '확장 가위바위보 로비';
        options.isloggedin = req.session.loggedin || false;
        if (options.isloggedin) {
            options.username = req.session.username;
        } else {
            options.username = '익명';
        }
        res.render(page, options);
    }
}