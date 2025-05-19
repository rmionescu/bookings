const fs = require('fs');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

// HELPERS
const getCollectionName = Model => Model.collection.collectionName;

const getFilterObj = ({ paramName, foreignField }, req) => {
  const pName = req.params?.[paramName];
  return pName ? { [foreignField]: pName } : {};
};

// --------------------------------------------- //
exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    // Delete the associated photo from disk if it's not default.jpg
    if (doc.photo && doc.photo !== 'default.jpg') {
      const photoPath = `${__dirname}/../public/img/users/${doc.photo}`;

      // Don't need await, fire and forget
      fs.unlink(photoPath, err => {
        if (err) console.warn('Failed to delete user photo:', err.message);
        else console.log(`Deleted photo '${doc.photo}' from user '${doc.name}'`);
      });
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  });

// --------------------------------------------- //
exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { [getCollectionName(Model)]: doc }
    });
  });

// --------------------------------------------- //
exports.createOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: { [getCollectionName(Model)]: doc }
    });
  });

// --------------------------------------------- //
exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (populateOptions) query = query.populate(populateOptions);

    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        [getCollectionName(Model)]: doc
      }
    });
  });

// --------------------------------------------- //
exports.getAll = (Model, options) =>
  catchAsync(async (req, res, next) => {
    let filterObj = {};

    if (typeof options === 'object' && Object.keys(options).length) {
      filterObj = getFilterObj(options, req);
    }

    // EXECUTE THE QUERY
    const features = new APIFeatures(Model.find(filterObj), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const doc = await features.query; // .explain() for troubleshooting

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      requestedAt: req.requestTime,
      results: doc.length,
      data: {
        [getCollectionName(Model)]: doc
      }
    });
  });
