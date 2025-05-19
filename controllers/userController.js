const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// HELPER
const filterObj = (data, ...allowedFields) => {
  const filteredData = {};
  Object.keys(data).forEach(el => {
    if (allowedFields.includes(el)) filteredData[el] = data[el];
  });

  return filteredData;
};

// Multer config
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     // Rename the uploaded file to user-userId-timestamp
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });
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

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  // We need the req.file.filename property on updateMe handler
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1. Create error if user POSTs password data (user logged in)
  if (req.body.password || req.body.passwordConfirm)
    return next(new AppError('This url is not for password updates, please use /updateMyPassword', 400));

  // 2a. Filter out the fileds that are not allowed to be updated
  const filteredData = filterObj(req.body, 'name', 'email');

  // 2b. Add the file to the filteredData
  if (req.file) filteredData.photo = req.file.filename;

  // 3. Update user document
  const updateUser = await User.findByIdAndUpdate(req.user._id, filteredData, { new: true, runValidators: true });

  res.status(200).json({
    status: 'success',
    data: {
      user: updateUser
    }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    requestedAt: req.requestTime,
    message: 'Route not defined! Please use /signup instead!'
  });
};

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User); // Do NOT update passwords with this!
exports.deleteUser = factory.deleteOne(User);
