const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { verifySignupEmail } = require('./emailVerificationService');

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1) Get all tour data from collection
  const tours = await Tour.find();

  // 2) Render the template using the tour data from 1)
  res.status(200).render('overview', {
    tours: tours
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // 1) Get the tour data from collection
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user'
  });

  if (!tour) return next(new AppError('There is no excursion with that name!', 404));

  const isBooked = !!(await Booking.findOne({ tour: tour.id, user: res.locals?.user?._id }));

  res.status(200).render('tour', {
    title: `${tour.name} tour`,
    tour: tour,
    isBooked: isBooked,
    mapboxToken: process.env.MAPBOX_TOKEN
  });
});

exports.getMyBookings = catchAsync(async (req, res, next) => {
  // 1. Find all bookings
  const bookings = await Booking.find({ user: req.user.id });

  // 2. Find tours with the returned booking IDs
  const tourIds = bookings.map(booking => booking.tour.id);
  const tours = await Tour.find({ _id: { $in: tourIds } });

  // 3. render the page
  res.status(200).render('overview', {
    title: 'My Bookings',
    tours: tours
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render('login', {
    title: 'Log into your account'
  });
};

exports.getSignupForm = (req, res) => {
  res.status(200).render('signup', {
    title: 'Sign up'
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account settings'
  });
};

exports.confirmEmail = catchAsync(async (req, res, next) => {
  try {
    await verifySignupEmail(req.params.token);
    res.status(200).render('confirmEmailSuccess', {
      title: 'Email confirmation successful'
    });
  } catch (err) {
    res.status(400).render('confirmEmailFail', {
      title: 'Email confirmation failed',
      msg: err.message
    });
  }
});
