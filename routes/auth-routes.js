const router = require('express').Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// --- Helper Middleware ---
const isAuthenticated = (req, res, next) => {
    // Passport adds 'isAuthenticated' to the request object
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error', 'You must be logged in to view the dashboard.');
    res.redirect('/auth/login');
};

// --- Register Route ---
router.get('/register', (req, res) => {
    // Pass error message from query (or flash if you switch to that)
    res.render('register', { errorMessage: req.query.error, user: req.user });
});

router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.redirect('/auth/register?error=' + encodeURIComponent('All fields are required.'));
    }1
    try {
        const existingUsernameUser = await User.findOne({ 
            username: new RegExp(`^${username}$`, 'i') 
        });
        if (existingUsernameUser) {
            return res.redirect('/auth/register?error=' + encodeURIComponent(`The username "${username}" is already taken.`));
        }
        const existingEmailUser = await User.findOne({ 
            email: email.toLowerCase() 
        });
        if (existingEmailUser) {
            return res.redirect('/auth/register?error=' + encodeURIComponent(`The email address "${email}" is already registered.`));
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Create new user with local credentials
        const newUser = new User({
            username: username,
            email: email.toLowerCase(),
            password: hashedPassword,
            // Generate a default thumbnail
            thumbnail: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=38bdf8&color=0f172a&bold=true`
        });

        await newUser.save();
        
        // Success flash message
        req.flash('successMessage', 'Registration successful! You can now log in.');
        
        res.redirect('/auth/login');
        
    } catch (err) {
        console.error('Registration error:', err);
        res.redirect('/auth/register?error=' + encodeURIComponent('An unexpected error occurred during registration.'));
    }
});


// --- Local Login Route ---
router.get('/login', (req, res) => {
    // Get flash messages for errors (from passport failure) and success (from register success)
    const errorMessage = req.query.error || req.flash('error')[0];
    const successMessage = req.flash('successMessage')[0];

    res.render('login', { 
        errorMessage: errorMessage, 
        successMessage: successMessage,
        user: req.user 
    });
});

router.post('/login', passport.authenticate('local-login', {
    // Redirect back to login with a flash error if failure occurs
    failureRedirect: '/auth/login',
    // Enable flash messages (used by passport-local internally)
    failureFlash: true,
    successRedirect: '/auth/dashboard',
}));

// --- Google OAuth Routes ---
router.get('/google', passport.authenticate('google', { 
    scope: ['profile', 'email'] 
}));
router.get('/google/redirect', passport.authenticate('google', { 
    failureRedirect: '/auth/login?error=' + encodeURIComponent('Google login failed.') 
}), (req, res) => { 
    res.redirect('/dashboard'); 
});
router.get('/dashboard', isAuthenticated, (req, res) => {
    res.render('dashboard', { user: req.user });
});
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        // Redirect to the login page
        res.redirect('/auth/login');
    });
});

module.exports = router;
