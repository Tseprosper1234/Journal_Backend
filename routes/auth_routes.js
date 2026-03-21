const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth_controller');
const mailController = require('../controllers/mail_controller');
const { authenticate } = require('../middleware/authentication');
const authSchema = require('../validators/authValidator');
const validate = require('../middleware/validator');
const { upload } = require('../middleware/multer');

// ------------------- Auth routes ------------------- //

// Post routes
router.post('/register', validate(authSchema.register), authController.register);
router.post('/login', validate(authSchema.login), authController.login);
router.post('/verify-email', validate(authSchema.verifyEmail), authController.verifyEmail);
router.post('/send-otp', validate(authSchema.sendOtp), authController.sendOtp);
router.post('/forgot-password', validate(authSchema.forgotPassword), authController.forgotPassword);
router.post('/reset-password', validate(authSchema.resetPassword), authController.resetPassword);
router.post('/user/update-profile', authenticate, upload.single('profile-picture'), authController.updateProfile);
router.post('/mail-service/send-mail', mailController.handleSendMail);

// Get routes
router.get('/user/profile-details', authenticate, authController.profileDetails);
router.get('/logout', authenticate, authController.logout);
router.get('/user-list', authenticate, authController.userList);

module.exports = router;
