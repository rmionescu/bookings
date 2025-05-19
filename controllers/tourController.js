const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

// Multer config
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files types are allowed!', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 6 * 1024 * 1024 } // 6 MB per file
});
// ------------------------------------- //

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files) return next();

  // 1) Cover Image
  if (req.files.imageCover?.length > 0) {
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
      .resize(2000, 1333)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`public/img/tours/${req.body.imageCover}`);
  }

  // 2) Tour images
  if (req.files.images?.length > 0) {
    req.body.images = [];

    await Promise.all(
      req.files.images.map(async (file, i) => {
        const imageFileName = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

        await sharp(file.buffer)
          .resize(2000, 1333)
          .toFormat('jpeg')
          .jpeg({ quality: 90 })
          .toFile(`public/img/tours/${imageFileName}`);

        req.body.images.push(imageFileName);
      })
    );
  }

  next();
});

exports.topTours = (req, res, next) => {
  // sort=-ratingsAverage,price&limit=5
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRating: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $min: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    }
    // { $match: { _id: { $ne: 'EASY' } } }
  ]);

  res.status(200).json({
    status: 'success',
    data: { stats: stats }
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStart: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: { _id: false }
    },
    {
      $sort: { numTourStart: -1 }
    },
    {
      $limit: 10
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: { plan: plan }
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  // tours-within/:distance/center/:latlon/unit/:unit
  const { distance, latlon, unit } = req.params;
  const [lat, lon] = latlon.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lon) return next(new AppError('Please provide the latitude and longitude in the format lat,lon', 400));

  const tours = await Tour.find({
    startLocation: {
      $geoWithin: {
        $centerSphere: [[lon, lat], radius]
      }
    }
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours: tours
    }
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  // /distances/:latlon/unit/:unit
  const { latlon, unit } = req.params;
  const [lat, lon] = latlon.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lon) return next(new AppError('Please provide the latitude and longitude in the format lat,lon', 400));

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lon * 1, lat * 1]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      distances: distances
    }
  });
});
