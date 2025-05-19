const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

router.route('/signup').post(authController.signup);
router.route('/login').post(authController.login);
router.route('/forgotPassword').post(authController.forgotPassword);
router.route('/resetPassword/:token').patch(authController.resetPassword);
router.route('/confirmEmail/:token').patch(authController.confirmEmail);

// PROTECT ALL THE ROUTES AFTER THIS MIDDLEWARE
router.use(authController.protect);

router.route('/logout').get(authController.logout);
router.route('/updateMyPassword').patch(authController.updatePassword);

router
  .route('/me')
  .get(userController.getMe, userController.getUser)
  .patch(userController.uploadUserPhoto, userController.resizeUserPhoto, userController.updateMe) // route('updateMe')
  .delete(userController.deleteMe); // route('deleteMe')

// RESTRICT ALL THE ROUTES AFTER THIS MIDDLEWARE ONLY TO ADMIN
router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
