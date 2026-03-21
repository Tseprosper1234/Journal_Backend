const Reviewer = require('../models/reviewer_model');
const User = require('../models/user_model');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Add a new reviewer.
 */
const addReviewer = async (req, res, next) => {
    try {
        // Check if reviewer already exists
        const reviewerData = await Reviewer.findOne({ email: req.body.email });
        if (reviewerData) {
            throw new ApiError('Reviewer already exists', 400);
        }

        // Validate required fields
        if (!req.body.firstName || !req.body.lastName || !req.body.email || !req.body.affiliation) {
            throw new ApiError('Missing required fields for reviewer creation', 400);
        }

        // Create new reviewer
        const reviewer = new Reviewer({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            affiliation: req.body.affiliation,
        });

        const responseData = await reviewer.save();

        // Update user if exists
        await User.findOneAndUpdate(
            { "email.id": req.body.email },
            { $set: { role: "reviewer" } },
            { new: true }
        );

        logger.info(`Reviewer added successfully: ${responseData._id} by editor: ${req.user._id}`);

        res.status(201).json({
            success: true,
            message: "Reviewer added successfully"
        });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Reviewer addition failed: ${error.message}`, 400));
    }
}

/**
 * Add bulk reviewers to the system.
 */
const addBulkReviewer = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new ApiError('CSV file is required', 400);
        }

        // Check if the uploaded file is a CSV
        if (req.file.mimetype !== 'text/csv' && req.file.mimetype !== 'application/vnd.ms-excel') {
            throw new ApiError('Invalid file type. Only CSV files are allowed.', 400);
        }

        const reviewers = [];
        const existingEmails = (await Reviewer.find({}, 'email')).map(r => r.email); // Fetch existing reviewer emails

        const fileContent = req.file.buffer.toString('utf-8'); // Extract data directly from the file object

        const rows = fileContent.split('\n').filter(row => row.trim() !== ''); // Remove empty rows
        const headers = rows[0]
            .split(',')
            .map(header => header.replace(/[\s_]+/g, '').toLowerCase()); // Normalize headers

        rows.slice(1).forEach(row => {
            const values = row.split(',');
            const normalizedRow = {};

            headers.forEach((header, index) => {
                normalizedRow[header] = values[index]?.trim(); // Trim values to remove extra spaces
            });

            // Check if the row has valid data
            if (
                normalizedRow['firstname'] &&
                normalizedRow['lastname'] &&
                normalizedRow['email'] &&
                normalizedRow['affiliation'] &&
                !existingEmails.includes(normalizedRow['email']) // Check if email already exists
            ) {
                reviewers.push({
                    firstName: normalizedRow['firstname'],
                    lastName: normalizedRow['lastname'],
                    email: normalizedRow['email'],
                    affiliation: normalizedRow['affiliation'].replace(/\r$/, '') // Remove trailing '\r'
                });
            }
        });

        if (reviewers.length > 0) {
            await Reviewer.insertMany(reviewers);
        } else {
            throw new ApiError('No valid reviewers found in the CSV file', 400);
        }

        res.status(201).json({
            success: true,
            message: 'Reviewers added successfully',
            data: reviewers
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get list of all reviewers with pagination.
 */
const reviewerList = async (req, res, next) => {
    try {
        if (!req.query.page || !req.query.limit) {
            const reviewerData = await Reviewer.find()
                .select('-__v')
                .sort({ createdAt: -1 });

            res.status(200).json({
                success: true,
                message: "Reviewer data retrieved successfully",
                data: {
                    reviewers: reviewerData || [],
                    pagination: null
                }
            });
        } else {
            const { page = 1, limit = 10 } = req.query; // Extract page and limit from query parameters

            const reviewerData = await Reviewer.find()
                .select('-__v')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit) // Skip documents for pagination
                .limit(parseInt(limit)); // Limit the number of documents returned

            const totalReviewers = await Reviewer.countDocuments(); // Get total count of reviewers

            res.status(200).json({
                success: true,
                message: "Reviewer data retrieved successfully",
                data: {
                    reviewers: reviewerData || [],
                    pagination: {
                        total: totalReviewers,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(totalReviewers / limit)
                    }
                }
            });
        }
    } catch (error) {
        next(new ApiError(`Reviewer data retrieval failed: ${error.message}`, 400));
    }
};

/**
 * Delete a reviewer by ID.
 */
const deleteReviewer = async (req, res, next) => {
    try {
        const reviewerId = req.params.reviewerId;

        if (!reviewerId) {
            throw new ApiError('Reviewer ID is required', 400);
        }

        const reviewerData = await Reviewer.findById(reviewerId);

        if (!reviewerData) {
            throw new ApiError('Reviewer not found', 404);
        }

        // Remove reviewer
        await Reviewer.findByIdAndDelete(reviewerId);

        // Update user if exists
        await User.findOneAndUpdate(
            { email: reviewerData.email },
            { $set: { isReviewer: false } },
            { new: true }
        );

        logger.info(`Reviewer deleted: ${reviewerId} by editor: ${req.user._id}`);

        res.status(200).json({
            success: true,
            message: "Reviewer deleted successfully"
        });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Reviewer deletion failed: ${error.message}`, 400));
    }
}


module.exports = {
    addReviewer,
    addBulkReviewer,
    reviewerList,
    deleteReviewer
};
