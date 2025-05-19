const User = require('../models/userModel');
const hashToken = require('../utils/hashToken');
const AppError = require('../utils/appError');

exports.verifySignupEmail = async token => {
  // 1. Get the user based on the token
  const hashedToken = hashToken(token);
  const user = await User.findOne({
    signupToken: hashedToken,
    signupTokenExpires: { $gt: Date.now() }
  });

  // 2. If the token has not expired and there is an user, activate it
  if (!user) throw new AppError('Token is invalid or has expired!', 400);

  // Activate logic
  user.isVerified = true;
  user.signupToken = undefined;
  user.signupTokenExpires = undefined;
  await user.save({ validateBeforeSave: false });

  return user;
};
