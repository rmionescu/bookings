const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

router.route('/signup').get(viewsController.getSignupForm);
router.route('/confirm-email/:token').get(viewsController.confirmEmail);

router.route('/').get(authController.isLoggedIn, bookingController.createBookingCheckout, viewsController.getOverview);
router.route('/tour/:slug').get(authController.isLoggedIn, viewsController.getTour);
router.route('/login').get(authController.isLoggedIn, viewsController.getLoginForm);

router.route('/me').get(authController.protect, viewsController.getAccount);
router.route('/my-bookings').get(authController.protect, viewsController.getMyBookings);

router.route('/submit-review/:tourId', authController.isLoggedIn); // TODO: a modal form for review

module.exports = router;
