const passport = require('passport');
const LocalStrategy = require('passport-local');
const GoogleStrategy = require('passport-google-oauth20');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id).then((user) => {
        done(null, user);
    }).catch(err => {
        console.error("Error during deserialization:", err);
        done(err);
    });
});

passport.use('local-login', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
}, (username, password, done) => {
    User.findOne({
        $or: [
            { username: new RegExp(`^${username}$`, 'i') }, 
            { email: new RegExp(`^${username}$`, 'i') } 
        ]
    }).then(async (user) => {
        if (!user) {
            return done(null, false, { message: 'Incorrect username or password.' });
        }
        if (!user.password) {
            return done(null, false, { message: 'This account was created via OAuth and requires Google login.' });
        }
        
        try { 
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                return done(null, user);
            } else {
                return done(null, false, { message: 'Incorrect username or password.' });
            }
        } catch (err) {
            console.error("Bcrypt comparison error:", err);
            return done(err); 
        }

    }).catch(err => {
        console.error("Database error during local login:", err);
        return done(err);
    });
}));


passport.use(
    new GoogleStrategy({
        callbackURL: '/auth/google/redirect',
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        proxy: true
    }, (accessToken, refreshToken, profile, done) => {
        
        User.findOne({ googleId: profile.id }).then((currentUser) => {
            if (currentUser) {
                done(null, currentUser);
            } else {
                new User({
                    googleId: profile.id,
                    username: profile.displayName,
                    email: profile.emails ? profile.emails[0].value : null, 
                    thumbnail: profile.photos[0].value
                }).save().then((newUser) => {
                    done(null, newUser);
                }).catch(err => { 
                    console.error("Database error during new user creation (Google):", err);
                    done(err);
                });
            }
        }).catch(err => { 
            console.error("Database error during findOne (Google):", err);
            done(err);
        });
    })
);
