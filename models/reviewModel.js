const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      maxlength: [10000, 'Max review length exceeded'],
      trim: true
    },
    rating: {
      type: Number,
      required: [true, 'A review must have a rating'],
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a Tour']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a User']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// INDEX: Ensure a user can write only one review per tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// STATIC METHOD: calculate average ratings and quantity for a specific tour
reviewSchema.statics.calcAverageRatings = async function(tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].nRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: 4.5, // default
      ratingsQuantity: 0 // default
    });
  }
};

// QUERY MIDDLEWARE: automatically populate user fields on find queries
reviewSchema.pre(/^find/, function(next) {
  // populate method will trigger a new DB query
  this.populate({
    path: 'user',
    select: 'name photo'
  });
  next();
});

// DOCUMENT MIDDLEWARE: update average ratings after saving a review
reviewSchema.post('save', function() {
  // `this` points to the document that was just saved
  this.constructor.calcAverageRatings(this.tour);
});

// QUERY MIDDLEWARE: update average ratings after updating or deleting a review
reviewSchema.post(/^findOneAnd/, function(doc) {
  // `doc` is the document that was updated or deleted
  if (doc) {
    doc.constructor.calcAverageRatings(doc.tour);
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
