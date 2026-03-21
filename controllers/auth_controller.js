const User = require('../models/user_model');
const bcrypt = require("bcryptjs");
const Reviewer = require('../models/reviewer_model');
const { sendMail } = require('./mail_controller');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { generateVerificationToken } = require('../utils/helper');

/**
 * Registers a new user.
 */
const register = async (req, res, next) => {
    try {
        // Check for existing email
        let userEmail = await User.findOne({ email: req.body.email.id });
        if (userEmail) {
            throw new ApiError('User with this email already exists', 400);
        }

        // Check for existing phone
        let userPhone = await User.findOne({ phoneNumber: req.body.phoneNumber });
        if (userPhone) {
            throw new ApiError('User with this phone number already exists', 400);
        }

        // Check for existing username
        let userName = await User.findOne({ userName: req.body.userName });
        if (userName) {
            throw new ApiError('Username already taken', 400);
        }

        // Check if user is already a reviewer
        const reviewer = await Reviewer.findOne({ email: req.body.email });

        // Create new user object
        const registerUser = new User({
            firstName: req.body.firstName,
            middleName: req.body.middleName,
            lastName: req.body.lastName,
            userName: req.body.userName,
            email: {
                id: req.body.email,
                verificationToken: generateVerificationToken(),
                verificationTokenExpiry: new Date(new Date().getTime() + 10 * 60000) // Token valid for 5 minutes
            },
            phoneNumber: req.body.phoneNumber,
            password: req.body.password,
            institution: req.body.institution,
            dateOfBirth: req.body.dateOfBirth || new Date(),
            role: reviewer ? "reviewer" : "user",
            otp: {
                id: Math.floor(100000 + Math.random() * 900000),
                expiredAt: new Date(new Date().getTime() + 5 * 60000), // OTP valid for 5 minutes
                verificationToken: generateVerificationToken(),
                verificationTokenExpiry: new Date(new Date().getTime() + 10 * 60000) // Token valid for 5 minutes
            }
        });

        // Save the user
        await registerUser.save();

        // Send verification email with OTP
        try {
            await sendMail(
                "Journal Submission System",
                registerUser.email.id,
                "Email Verification",
                `<h1>Hi ${registerUser.firstName},</h1>
                <p>Thank you for registering with the Journal Submission System.</p>
                <p>Your OTP for email verification is: <strong>${registerUser.otp.id}</strong></p>
                <p>This OTP will expire in 5 minutes.</p>
                <p>If you didn't register for an account, please ignore this email.</p>`
            );
            logger.info(`Verification email sent to ${registerUser.email.id},${registerUser.otp.id}`);
        } catch (emailError) {
            logger.error(`Failed to send verification email: ${emailError.message}`);
            // Continue registration process even if email fails
        }

        logger.info(`User registered successfully: ${registerUser._id}`);

        res.status(201).json({
            success: true,
            message: "User registered successfully. Please verify your email.",
            data: {
                user: {
                    firstName: registerUser.firstName,
                    middleName: registerUser.middleName,
                    lastName: registerUser.lastName,
                    email: registerUser.email.id,
                    userName: registerUser.userName
                },
                emailVerificationToken: registerUser.email.verificationToken,
                otpVerficationToken: registerUser.otp.verificationToken
            }
        });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Registration failed: ${error.message}`, 400));
    }
};

/**
 * Verifies the user's email using the provided OTP.
 */
const verifyEmail = async (req, res, next) => {
    try {
        const { email, verificationCode, verificationToken, isResetPassword } = req.body;

        if (!email || !verificationCode || !verificationToken) {
            throw new ApiError('Email, Verification Code and verification token are required', 400);
        }

        const user = await User.findOne({ "email.id": email });
        if (!user) {
            throw new ApiError('User not found', 404);
        }

        // Check if email is already verified
        if (user.email.verified && !isResetPassword) {
            logger.error(`Email already verified for user: ${user._id}`);
            throw new ApiError('Email already verified', 400);
        }

        // Check if user is in the process of resetting password
        if (isResetPassword && !user.email.verified) {
            logger.error(`Email not verified for user: ${user._id}`);
            throw new ApiError('Email not verified', 400);
        }

        // If resetting password, set the reset password token and expiry
        // This is to ensure that the user can reset their password only after verifying their email
        if (isResetPassword) {
            user.resetPassword = {
                token: verificationToken,
                expiredAt: new Date(new Date().getTime() + 5 * 60000) // Token valid for 5 minutes
            };
        }

        // Check if verification token is valid
        if (user.email.verificationToken !== req.body.verificationToken) {
            logger.error(`Invalid verification token for user: ${user._id}`);
            throw new ApiError('Email verification failed.', 400);
        } else if (user.email.verificationTokenExpiry < new Date()) {
            logger.error(`Verification token expired for user: ${user._id}`);
            throw new ApiError('The session has expired.', 400);
        }

        // Check if OTP is valid and not expired
        if (user.otp.id == verificationCode && user.otp.expiredAt > new Date()) {
            // Update user email verification status
            user.email.verified = true;
            user.otp = { id: null, expiredAt: null }; // Clear OTP after successful verification
            await user.save();

            logger.info(`Email verified for user: ${user._id}`);

            res.status(200).json({
                success: true,
                message: "Email verified successfully",
                data: isResetPassword ? {
                    resetPasswordToken: user.resetPassword.token
                } : null
            });
        } else {
            if (user.otp.expiredAt < new Date()) {
                throw new ApiError('OTP has expired. Please request a new one.', 400);
            } else {
                throw new ApiError('Invalid OTP', 400);
            }
        }
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Email verification failed: ${error.message}`, 400));
    }
};

/**
 * Sends a new OTP to the user's email for verification.
 */
const sendOtp = async (req, res, next) => {
    try {
        const { email, verificationToken } = req.body;

        if (!email) {
            throw new ApiError('Email is required', 400);
        }

        const user = await User.findOne({ "email.id": email });
        if (!user) {
            throw new ApiError('User not found', 404);
        }

        // Check if verification token is valid
        if (user.otp.verificationToken !== verificationToken) {
            logger.error(`Invalid verification token for user: ${user._id}`);
            throw new ApiError('OTP generation failed.', 400);
        } else if (user.otp.verificationTokenExpiry < new Date()) {
            logger.error(`Verification token expired for user: ${user._id}`);
            throw new ApiError('The session has expired.', 400);
        }

        // Generate new OTP
        user.otp = {
            id: Math.floor(100000 + Math.random() * 900000),
            expiredAt: new Date(new Date().getTime() + 5 * 60000), // OTP valid for 5 minutes
            verificationToken: generateVerificationToken(),
            verificationTokenExpiry: new Date(new Date().getTime() + 5 * 60000) // Token valid for 5 minutes
        };

        user.email.verificationToken = generateVerificationToken();
        user.email.verificationTokenExpiry = new Date(new Date().getTime() + 10 * 60000); // Token valid for 5 minutes

        // Send OTP via email
        try {
            await sendMail(
                "Journal Submission System",
                user.email.id,
                "Email Verification - New OTP",
                `<h1>Hi ${user.firstName},</h1>
                <p>You requested a new OTP for email verification.</p>
                <p>Your new OTP is: <strong>${user.otp.id}</strong></p>
                <p>This OTP will expire in 5 minutes.</p>
                <p>If you didn't request a new OTP, please secure your account.</p>`
            );
            await user.save();
            logger.info(`New OTP sent to ${user.email.id}`);
        } catch (emailError) {
            logger.error(`Failed to send OTP email: ${emailError.message}`);
            throw new ApiError('Failed to send OTP email', 500);
        }

        res.status(200).json({
            success: true,
            message: "OTP sent successfully",
            data: {
                otpVerificationToken: user.otp.verificationToken,
                emailVerificationToken: user.email.verificationToken
            }
        });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`OTP generation failed: ${error.message}`, 400));
    }
};

/**
 * Logs in a user with the provided username and password.
 */
const login = async (req, res, next) => {
    try {
        if (!req.body.email || !req.body.password) {
            throw new ApiError('Username and password are required', 400);
        }

        // Find user by email or username
        let user = await User.findOne({ "email.id": req.body.email });
        if (!user) {
            user = await User.findOne({ userName: req.body.email });
        }

        if (!user) {
            throw new ApiError('Invalid username or email', 401);
        }

        // Check password
        const isMatch = await bcrypt.compare(req.body.password, user.password);
        if (!isMatch) {
            throw new ApiError('Invalid password', 401);
        }

        // Check if email is verified
        if (!user.email.verified) {
            // Generate new OTP for verification
            user.otp = {
                id: Math.floor(100000 + Math.random() * 900000),
                expiredAt: new Date(new Date().getTime() + 5 * 60000),
                verificationToken: generateVerificationToken(),
                verificationTokenExpiry: new Date(new Date().getTime() + 5 * 60000) // Token valid for 5 minutes
            };
            user.email.verificationToken = generateVerificationToken();
            user.email.verificationTokenExpiry = new Date(new Date().getTime() + 10 * 60000); // Token valid for 5 minutes
            await user.save();

            // Send OTP email
            try {
                await sendMail(
                    "Journal Submission System",
                    user.email.id,
                    "Email Verification Required",
                    `<h1>Hi ${user.firstName},</h1>
                    <p>You need to verify your email before you can log in.</p>
                    <p>Your verification OTP is: <strong>${user.otp.id}</strong></p>
                    <p>This OTP will expire in 5 minutes.</p>`
                );
            } catch (emailError) {
                logger.error(`Failed to send verification email: ${emailError.message}`);
                // Continue login process even if email fails
            }

            return res.status(403).json({
                success: false,
                message: "Email not verified. Please verify your email to login.",
                data: {
                    user: {
                        firstName: user.firstName,
                        middleName: user.middleName,
                        lastName: user.lastName,
                        email: user.email.id,
                        userName: user.userName
                    },
                    otpVerificationToken: user.otp.verificationToken,
                    emailVerificationToken: user.email.verificationToken,
                    needsVerification: true
                }
            });
        }

        // Generate token
        const token = await user.generateAuthToken();

        // Remove sensitive information
        const { _id, __v, password: userPassword, otp, tokens, email, resetPassword, ...userData } = user.toObject();
        userData.email = email.id; // Keep only the email ID

        logger.info(`User logged in: ${user._id}`);

        const test = res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: userData,
                accessToken: token
            }
        });
        console.log(test);
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Login failed: ${error.message}`, 400));
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ "email.id": email });
        if (!user) {
            throw new ApiError('User not found', 404);
        }

        // Verify if the email is verified
        // if (!user.email.verified) {
        //     throw new ApiError('Email not verified', 400);
        // }

        user.otp = {
            id: Math.floor(100000 + Math.random() * 900000),
            expiredAt: new Date(new Date().getTime() + 5 * 60000), // OTP valid for 5 minutes
            verificationToken: generateVerificationToken(),
            verificationTokenExpiry: new Date(new Date().getTime() + 5 * 60000) // Token valid for 5 minutes
        };
        user.email.verificationToken = generateVerificationToken();
        user.email.verificationTokenExpiry = new Date(new Date().getTime() + 10 * 60000); // Token valid for 5 minutes
        user.resetPassword = {
            token: generateVerificationToken(),
            expiredAt: new Date(new Date().getTime() + 5 * 60000) // Token valid for 5 minutes
        };
        await user.save();

        try {
            await sendMail(
                "Journal Submission System",
                user.email.id,
                "Password Reset Request",
                `<h1>Hi ${user.firstName},</h1>
                <p>You requested a password reset.</p>
                <p>Your OTP for password reset is: <strong>${user.otp.id}</strong></p>
                <p>This OTP will expire in 5 minutes.</p>
                <p>If you didn't request a password reset, please secure your account.</p>`
            );
        } catch (error) {
            logger.error(`Failed to send password reset email: ${error.message}`);
            throw new ApiError('Failed to send password reset email', 500);
        }

        logger.info(`Password reset OTP sent to ${user.email.id}`);

        res.status(200).json({
            success: true,
            message: "Password reset OTP sent successfully",
            data: {
                otpVerificationToken: user.otp.verificationToken,
                resetPasswordToken: user.resetPassword.token
            }
        });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Password reset request failed: ${error.message}`, 400));
    }
}

/**
 * Resets the password for a user.
 */
const resetPassword = async (req, res, next) => {
    try {
        const { email, password, confPassword, resetPasswordToken, verificationCode } = req.body;

        if (!email || !password || !confPassword || !verificationCode || !resetPasswordToken) {
            throw new ApiError('Email, password, confirmation password, and OTP are required', 400);
        }

        const user = await User.findOne({ "email.id": email });

        if (!user) {
            throw new ApiError('User not found', 404);
        }

        // Check if email is verified
        // if (!user.email.verified) {
        //     logger.error(`Email not verified for user: ${user._id}`);
        //     throw new ApiError('Email not verified', 400);
        // }

        // Check if the user is in the process of resetting password
        if (!user.resetPassword.token) {
            logger.error(`No password reset token found for user: ${user._id}`);
            throw new ApiError('No password reset token found', 400);
        }


        // Check if the OTP is valid and not expired
        if (user.otp.id == verificationCode && user.otp.expiredAt > new Date()) {
            // Clear OTP after successful verification
            user.otp = { id: null, expiredAt: null };
        } else {
            if (user.otp.expiredAt < new Date()) {
                throw new ApiError('OTP has expired. Please request a new one.', 400);
            } else {
                throw new ApiError('Invalid OTP', 400);
            }
        }

        // If token is provided, verify it (for password reset links)
        if (resetPasswordToken && user.resetPassword.token !== resetPasswordToken) {
            logger.error(`Invalid password reset token for user: ${user._id}`);
            throw new ApiError('Failed to reset password.', 400);
        } else if (user.resetPassword.expiredAt < new Date()) {
            logger.error(`Password reset token expired for user: ${user._id}`);
            throw new ApiError('Failed to reset password. The session has expired.', 400);
        }

        // Update password
        user.password = password;

        // Invalidate all existing tokens to force re-login
        user.tokens = [];

        await user.save();

        // Clear reset password token and expiry
        user.resetPassword.token = null;
        user.resetPassword.expiredAt = null;

        logger.info(`Password reset for user: ${user._id}`);

        res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Password reset failed: ${error.message}`, 400));
    }
};

/**
 * Logs out the user by removing the token from the user's tokens array.
 */
const logout = async (req, res, next) => {
    try {
        // Remove the current token
        req.user.tokens = req.user.tokens.filter(tokenObj => tokenObj.token !== req.token);

        await req.user.save();

        logger.info(`User logged out: ${req.user._id}`);

        res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Logout failed: ${error.message}`, 500));
    }
};

/**
 * Fetches the profile details of the authenticated user.
 */
const profileDetails = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password -otp -tokens -__v -email.verificationToken -email.verificationTokenExpiry -resetPassword');

        if (!user) {
            throw new ApiError('User not found', 404);
        }

        res.status(200).json({
            success: true,
            message: "User profile retrieved successfully",
            data: user
        });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Failed to fetch profile: ${error.message}`, 400));
    }
};

/**
 * Updates the user profile.
 */
const updateProfile = async (req, res, next) => {
    try {
        const {
            firstName,
            middleName,
            lastName,
            userName,
            phoneNumber,
            dateOfBirth,
            institution
        } = req.body;

        // Validate userName uniqueness if changed
        if (userName !== req.user.userName) {
            const existingUserName = await User.findOne({ userName });
            if (existingUserName) {
                throw new ApiError('Username already taken', 400);
            }
        }

        // Validate phone number uniqueness if changed
        if (phoneNumber != req.user.phoneNumber) {
            const existingPhoneNumber = await User.findOne({ phoneNumber });
            if (existingPhoneNumber) {
                throw new ApiError('Phone number already taken', 400);
            }
        }

        // Find and update user
        const user = await User.findById(req.user._id);

        if (!user) {
            throw new ApiError('User not found', 404);
        }

        // Update fields
        user.firstName = firstName || user.firstName;
        user.middleName = middleName || user.middleName;
        user.lastName = lastName || user.lastName;
        user.userName = userName || user.userName;
        user.phoneNumber = phoneNumber || user.phoneNumber;
        user.dateOfBirth = dateOfBirth || user.dateOfBirth;
        user.institution = institution || user.institution;

        // Update profile picture if provided
        if (req.file) {
            user.profilePicture = req.file.filename;
            logger.info(`Profile picture updated for user: ${user._id}`);
        }

        await user.save();

        logger.info(`Profile updated for user: ${user._id}`);

        res.status(200).json({
            success: true,
            message: "Profile updated successfully"
        });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Profile update failed: ${error.message}`, 400));
    }
};

/**
 * Retrieves a list of users.
 */
const userList = async (req, res, next) => {
    try {
        // Apply filters if provided
        const filter = {};
        if (req.query.role === 'editor') filter.isEditor = true;
        if (req.query.role === 'reviewer') filter.isReviewer = true;
        if (req.query.role === 'admin') filter.isSuperAdmin = true;

        // Apply search if provided
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex },
                { userName: searchRegex }
            ];
        }

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Get users
        const users = await User.find(filter)
            .select('_id firstName middleName lastName email userName isEditor isReviewer isSuperAdmin profilePicture')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const total = await User.countDocuments(filter);

        res.status(200).json({
            success: true,
            message: "Users retrieved successfully",
            data: users,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Failed to retrieve users: ${error.message}`, 400));
    }
};

module.exports = {
    register,
    verifyEmail,
    sendOtp,
    login,
    forgotPassword,
    logout,
    profileDetails,
    resetPassword,
    updateProfile,
    userList
};