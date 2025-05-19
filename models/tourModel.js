const mongoose = require('mongoose');
const slugify = require('slugify');

const GEOSPATIAL_OPERATOR_TEST = /^[$]geo[a-zA-Z]*/;

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal than 40 characters'],
      minlength: [10, 'A tour name must have more or equal than 10 characters'],
      validate: {
        validator: function(val) {
          return /^[a-zA-Z\s]+$/.test(val);
        },
        message: 'Tour name must only contain characters'
      }
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size']
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      trim: true,
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: "Difficulty is either: 'easy', 'medium', 'difficult'"
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be bellow 5.0'],
      set: val => Math.round(val * 10) / 10
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function(val) {
          // this point to the current doc only on NEW document creation
          return val < this.price;
        },
        message: `The discount price ({VALUE}) should be bellow the regular price`
      }
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image']
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false
    },
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    // Child Refferencing
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// CREATE INDEX
tourSchema.index({ price: 1, ratingsAverage: -1 }); // 1 - ascending order; -1 - descending order
tourSchema.index({ slug: 1 });
tourSchema.index({ 'startLocation.coordinates': '2dsphere' });

// VIRTUAL COLUMN
tourSchema.virtual('DurationWeeks').get(function() {
  return this.duration / 7;
});

// VIRTUAL COLUMN
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id'
});

// DOCUMENT MIDDLEWARE: runs before .save() and .create()
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// QUERY MIDDLEWARE: exclude secret tours
tourSchema.pre(/^find/, function(next) {
  this.find({ secretTour: { $ne: true } });
  this.start_t = Date.now();
  next();
});

// QUERY MIDDLEWARE: populate the guides field with User data set
tourSchema.pre(/^find/, function(next) {
  // populate method will trigger a new DB query
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt'
  });
  next();
});

tourSchema.post(/^find/, function(docs, next) {
  console.log(`Find query took ${Date.now() - this.start_t}ms..`);
  next();
});

// AGGREGATION MIDDLEWARE: exclude secret tours
tourSchema.pre('aggregate', function(next) {
  const geoAggregate = this.pipeline().filter(
    // finding if the pipeline stage name has any geo operator using the regex.
    stage => Object.keys(stage)[0].search(GEOSPATIAL_OPERATOR_TEST) !== -1
  );

  if (geoAggregate.length === 0) {
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  }
  next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
