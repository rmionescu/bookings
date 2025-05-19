const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

// POST /tour/tourId/reviews
// POST /reviews
router
  .route('/')
  .get(authController.protect, reviewController.getAllReviews)
  .post(
    authController.protect,
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(authController.protect, authController.restrictTo('admin', 'user'), reviewController.updateReview)
  .delete(authController.protect, authController.restrictTo('admin', 'user'), reviewController.deleteReview);

module.exports = router;
