const util = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const hashToken = require('../utils/hashToken');
const { verifySignupEmail } = require('./emailVerificationService');

const signToken = id => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true // the cookie will not be accessed or modified by the browser
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true; // the cookie will be sent only on https connections

  // Set the cookie
  res.cookie('jwt', token, cookieOptions);

  // Remove the password from the response
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token: token,
    data: { user: user }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  // 1. Create the user (isVerified = false)
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });

  // 2. Generate the random activation token
  const signupToken = newUser.createSignupToken();
  // 2.1 Turn validation off and save the encrypted token and expiry date in DB
  await newUser.save({ validateBeforeSave: false });

  // 3. Send the activation link to the user email
  try {
    const requestURL = `${req.protocol}://${req.get('host')}/confirm-email/${signupToken}`;

    await new Email(newUser, requestURL).sendVerifyEmail();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  } catch (err) {
    newUser.signupToken = undefined;
    newUser.signupTokenExpires = undefined;
    await newUser.save({ validateBeforeSave: false });

    return next(new AppError('Something went wrong sending the email, try again later!', 500));
  }
});

exports.confirmEmail = catchAsync(async (req, res, next) => {
  const user = await verifySignupEmail(req.params.token);
  createSendToken(user, 200, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1. Check if the email and passwords exists
  if (!email || !password) return next(new AppError('Please provide email and passord!', 400));

  // 2. Check if the user exists && password is correct
  const user = await User.findOne({ email: email }).select('+password +isVerified');

  if (!user || !(await user.checkPassword(password, user.password)))
    return next(new AppError('Invalid email/password combination!', 401));

  if (!user.isVerified) return next(new AppError('Please validate your email fisrt!', 401));

  // 3. If everything ok send the jwt to the client
  createSendToken(user, 200, res);
});

exports.logout = catchAsync(async (req, res, next) => {
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  });

  res.status(200).json({ status: 'success' });
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1. Get the token and check if exists
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) return next(new AppError('You are not logged in! Please log in to get access.', 401));

  // 2. Verification of the token
  const decoded = await util.promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3. Check if the user exists
  const currentUser = await User.findById({ _id: decoded.id });
  if (!currentUser) return next(new AppError('The user belonging to this token does no longer exist!', 401));

  // 4. Check if the user changed passweord after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat))
    return next(new AppError('User recently changed password, please log in again!', 401));

  // 5. Grant access to the protected route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Only for rendered pages, there will be no errors
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  if (!req.cookies?.jwt) return next();

  // 1. Verification of the token
  const decoded = await util.promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);

  // 2. Check if the user exists
  const currentUser = await User.findById({ _id: decoded.id });
  if (!currentUser) return next();

  // 3. Check if the user changed passweord after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) return next();

  // 4. THERE IS A LOGGED IN USER
  res.locals.user = currentUser;

  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return next(new AppError("You don't have permission to perform this action!", 403));

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1. Get the user based on the received email
  const user = await User.findOne({ email: req.body.email });
  if (!user) return next(new AppError('Provided email address is not found', 404));

  // 2. Generate the random reset pass token
  const resetToken = user.createPasswordResetToken();
  // 2.1 Turn validation off and save the encrypted token and expiry date in DB
  await user.save({ validateBeforeSave: false });

  // 3. Send the reset pass link to the user email
  try {
    const requestURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, requestURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.log(err);
    return next(new AppError('Something went wrong sending the email, try again later!', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1. Get the user based on the token
  const hashedToken = hashToken(req.params.token);
  const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetTokenExpires: { $gt: Date.now() } });

  // 2. If the token has not expired and there is an user, set the new password
  if (!user) return next(new AppError('Token is invalid or has expired!', 400));
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpires = undefined;
  await user.save();

  // 3. Update the passwordChangedAt propery for the user (done via a pre save hook)
  // 4. Login the user, send the JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1. Get the user from the collection (user have to be logged in)
  const user = await User.findById(req.user._id).select('+password');

  // 2. Check if POSTed current password is correct
  const { passwordCurrent, password, passwordConfirm } = req.body;

  if (!(await user.checkPassword(passwordCurrent, user.password)))
    return next(new AppError('The current password you entered is incorrect!', 401));

  // 3. Update the password
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  // 4. Login the user, send the JWT
  createSendToken(user, 200, res);
});
