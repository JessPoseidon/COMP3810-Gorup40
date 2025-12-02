const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Local Authentication Fields
    username: { 
        type: String, 
        required: false, 
    },
    email: { 
        type: String, 
        required: false,
        lowercase: true,
    },
    password: { 
        type: String, 
        required: false 
    },

    googleId: { 
        type: String, 
        required: false,
    },
    
    thumbnail: {
        type: String,
        default: 'https://ui-avatars.com/api/?name=User'
    },
    
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('user', userSchema);

module.exports = User;
