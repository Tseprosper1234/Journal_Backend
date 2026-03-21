const jwt = require('jsonwebtoken');
const Auth = require('../models/user_model');
const { ApiError } = require('./errorHandler');
// const logger = require('../utils/logger');
const fs = require('fs');

/**
 * Middleware function to authenticate user based on token.
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            throw new ApiError('No authorization token provided', 401);
        }

        const token = authHeader.startsWith('Bearer ')
            ? authHeader.substring(7)
            : authHeader.trim();

        if (!token) {
            throw new ApiError('Invalid authorization token format', 401);
        }

        try {
            const secret = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH, "utf8");
            const decoded = jwt.verify(token, secret, { algorithm: process.env.JWT_ALGORITHM });
            const user = await Auth.findOne({ _id: decoded._id });

            if (!user) {
                throw new ApiError('User not found or token expired', 401);
            }

            // Check if token exists in user's tokens array
            const tokenExists = user.tokens.some(t => t.token === token);
            if (!tokenExists) {
                throw new ApiError('Token invalidated or expired', 401);
            }

            req.token = token;
            req.user = user;
            next();
        } catch (error) {
            // Handle JWT-specific errors
            if (error.name === 'JsonWebTokenError') {
                throw new ApiError('Invalid token', 401);
            } else if (error.name === 'TokenExpiredError') {
                throw new ApiError('Token expired', 401);
            } else {
                throw error;
            }
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware function to verify if the user is an editor.
 */
const verifyEditor = (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError('User authentication required', 401);
        }

        if (req.user.role === 'editor') {
            next();
        } else {
            throw new ApiError('Access denied: Editor privileges required', 403);
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware function to verify if the user is a reviewer.
 */
const verifyReviewer = (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError('User authentication required', 401);
        }

        if (req.user.role === 'reviewer') {
            next();
        } else {
            throw new ApiError('Access denied: Reviewer privileges required', 403);
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware function to verify if the user is a super admin.
 */
const verifyAdmin = (req, res, next) => {
    try {
        if (!req.user) {
            throw new ApiError('User authentication required', 401);
        }

        if (req.user.role === 'admin') {
            next();
        } else {
            throw new ApiError('Access denied: Admin privileges required', 403);
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    authenticate,
    verifyEditor,
    verifyReviewer,
    verifyAdmin
};