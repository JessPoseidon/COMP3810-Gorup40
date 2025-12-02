require('dotenv').config(); 

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');

const authRoutes = require('./routes/auth-routes');
const profileRoutes = require('./routes/profile-routes');
const Sentence = require('./models/Sentence'); 

const passportSetup = require('./passport'); 

const app = express();

app.use(express.urlencoded({ extended: true })); 
app.use(express.json()); 
app.use(express.static('public'));

app.set('view engine', 'ejs');
app.set('json spaces', 2);

app.use(session({
    secret: process.env.COOKIE_KEY, 
    resave: false, 
    saveUninitialized: false, 
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000, 
    }
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
    .then(() => {
        console.log('Connected to MongoDB Atlas.');
    })
    .catch(err => {
        console.error('DB Error: MongooseError: Could not connect to MongoDB Atlas.');
        console.error('Error details:', err.message);
    });

const isAuthenticatedApi = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized: You must be logged in to modify data.' });
};


app.use('/auth', authRoutes);
app.use('/profile', profileRoutes); 

app.get('/', (req, res) => {
    if (req.user) {
        res.redirect('/auth/dashboard'); 
    } else {
        res.redirect('/auth/login');
    }
});

// Removed redundant /dashboard redirect to streamline routing to /auth/dashboard

app.post('/auth/test-login', (req, res) => {
    req.login({ 
        id: '507f1f77bcf86cd799439011', 
        username: 'Tester01',
        email: 'test@test.com' 
    }, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Login failed' });
        }
        res.json({ 
            message: 'Logged in successfully',
            user: req.user 
        });
    });
});

app.get('/api/sentences', async (req, res) => {
    try {
        const { category, user, sortBy, search } = req.query;
        let filter = {};
        
        if (category && category !== 'all') { filter.category = category; }
        if (user && user !== 'all') { filter.name = user; }

        if (search && search.trim() !== '') {
            filter.$or = [
                { text: { $regex: search, $options: 'i' } }, 
                { name: { $regex: search, $options: 'i' } }  
            ];
        }

        let sort = { createdAt: -1 }; 
        if (sortBy === 'oldest') {
            sort = { createdAt: 1 };
        } else if (sortBy === 'name') {
            sort = { name: 1, createdAt: -1 }; 
        }

        const sentences = await Sentence.find(filter).sort(sort);
        res.json(sentences);
    } catch (error) {
        console.error('Failed to fetch messages:', error.message);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});


app.post('/api/sentences', isAuthenticatedApi, async (req, res) => {
    try {
        const { text, category } = req.body;
        const name = req.user.username; 
        
        if (!text || text.trim() === '') {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }
        
        const sentence = new Sentence({ 
            text: text.trim(), 
            name: name.trim(),
            category: category
        });
        await sentence.save();
        
        res.status(201).json(sentence);
    } catch (error) {
        console.error('Failed to save message:', error.message);
        res.status(500).json({ error: 'Failed to save message' });
    }
});

app.delete('/api/sentences/:id', isAuthenticatedApi, async (req, res) => {
    try {
        const { id } = req.params;
        const sentence = await Sentence.findById(id);

        if (!sentence) {
            return res.status(404).json({ error: 'Message not found' });
        }
        
        if (sentence.name !== req.user.username) {
            return res.status(403).json({ error: 'Forbidden: You can only delete your own messages.' });
        }

        await Sentence.findByIdAndDelete(id);
        res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid message ID format.' });
        }
        console.error('Failed to delete message:', error.message);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

app.put('/api/sentences/:id', isAuthenticatedApi, async (req, res) => {
  try {
    const { id } = req.params;
    const { text, category } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const sentence = await Sentence.findById(id);

    if (!sentence) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (sentence.name !== req.user.username) {
      return res.status(403).json({ error: 'Forbidden: You can only edit your own messages.' });
    }

    sentence.text = text.trim();
    if (category) sentence.category = category;
    await sentence.save();

    res.json({ message: 'Message updated successfully', sentence });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid message ID format.' });
    }
    console.error('Failed to update message:', error.message);
    res.status(500).json({ error: 'Failed to update message', details: error.message });
  }
});

app.get('/api/sentences/users', async (req, res) => {
    try {
        const users = await Sentence.distinct('name');
        res.json(users.sort());
    } catch (error) {
        console.error('Failed to fetch users:', error.message);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.get('/api/sentences/users/:name', async (req, res) => {
    try {
        const user = req.params.name;
        const sentences = await Sentence.find({ name: user });

        if (sentences.length == 0) {
            return res.status(404).json({ error: `User not found: ${user}` });
        }

        return res.status(200).json(sentences);

    } catch (error) {
        console.error('Failed to fetch user sentences:', error.message);
        res.status(500).json({ error: 'Failed to fetch user sentences' });
    }
});

const PORT = process.env.PORT || 8099;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
