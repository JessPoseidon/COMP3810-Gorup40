const router = require('express').Router();
const authCheck = (req, res, next) => {
    if (!req.user) {
        res.redirect('/auth/login');
    } else {
        next();
    }
};
router.get('/', authCheck, (req, res) => {
    res.send('Welcome to your profile! (Needs dashboard.ejs view)');
});
module.exports = router;
