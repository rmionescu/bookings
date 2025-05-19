const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const hashToken = require('../utils/hashToken');

// name, email, photo, password, passwordConfirm
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your user!'],
    trim: true,
    minlength: [3, 'User name must have more or equal than 3 characters'],
    validate: {
      validator: function(val) {
        return /^[a-zA-Z\s]+$/.test(val);
      },
      message: 'User name must only contain characters'
    }
  },
  email: {
    type: String,
    required: [true, 'Please provide your email!'],
    trim: true,
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email address!']
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  photo: {
    type: String,
    default: 'default.jpg'
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minLength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // Works only on CREATE and SAVE and not on UPDATE
      validator: function(val) {
        return val === this.password;
      },
      message: 'Passwords are not the same'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetTokenExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false // the field will be excluded by default from query results
  },
  isVerified: {
    type: Boolean,
    default: false,
    select: false // the field will be excluded by default from query results
  },
  signupToken: String,
  signupTokenExpires: Date
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  // Encrypt the password
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;

  next();
});

// Update the passwordChangedAt propery for the user after changing the password
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Exclude the inactive users from all find queries
userSchema.pre(/^find/, function(next) {
  // Points to the current query, so chaining a .find() condition onto the existing query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.checkPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Return true if the user changed the password after the token was issued
// Return false if the user did not changed the password after the token was issued
userSchema.methods.changedPasswordAfter = function(tokenCreationTimestamp) {
  if (this.passwordChangedAt) {
    const passwordChangedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);

    return tokenCreationTimestamp < passwordChangedTimestamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = hashToken(resetToken);
  this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

userSchema.methods.createSignupToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.signupToken = hashToken(token);
  this.signupTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h

  return token;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
