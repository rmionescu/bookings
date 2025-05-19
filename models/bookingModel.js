const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Booking must belong to a Tour']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Booking must belong to an User']
    },
    price: {
      type: Number,
      require: [true, 'Booking must have a price'],
      min: [0, 'Booking price cannot be negative']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    paid: {
      type: Boolean,
      default: true
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// QUERY MIDDLEWARE: automatically populate user and tour fields on find queries
bookingSchema.pre(/^find/, function(next) {
  // populate method will trigger a new DB query
  this.populate('user').populate({
    path: 'tour',
    select: 'name'
  });
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
