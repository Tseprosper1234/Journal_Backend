const Journal = require('../models/journal_model');
const User = require('../models/user_model');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { generateRandomPassword } = require('../utils/helper');
const { sendMail } = require('./mail_controller');

/**
 * Add a new journal entry.
 */
const addJournal = async (req, res, next) => {
    try {
        // Validate input data
        if (!req.body.title || !req.body.description || !req.body.category) {
            throw new ApiError('Journal title, description, and category are required', 400);
        }

        const journal = new Journal({
            title: req.body.title,
            description: req.body.description,
            category: req.body.category,
            tags: req.body.tags || [],
            publicationFrequency: req.body.publicationFrequency || 'Monthly',
            openAccess: req.body.openAccess || false,
            peerReviewProcess: req.body.peerReviewProcess || 'Single-blind peer review',
            impactFactor: {
                value: req.body.impactFactor?.value || 0,
                year: req.body.impactFactor?.year || new Date().getFullYear()
            },
            metrics: {
                averageReviewTime: req.body.metrics?.averageReviewTime || '30 days',
                averageAcceptanceRate: req.body.metrics?.averageAcceptanceRate || '20%',
                timeToPublication: req.body.metrics?.timeToPublication || '60 days',
                articlesPerYear: req.body.metrics?.articlesPerYear || 100
            },
            isDeleted: false,
            editorId: null, // Initially set to null, can be updated later
            createdBy: req.user._id,
            publishedDate: new Date()
        });

        const responseData = await journal.save();

        logger.info(`Journal added successfully: ${responseData._id} by admin: ${req.user._id}`);

        res.status(201).json({
            success: true,
            message: "Journal added successfully",
            data: responseData
        });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Journal addition failed: ${error.message}`, 400));
    }
}

/**
 * Updates an existing journal entry.
 * */
const updateJournal = async (req, res, next) => {
    try {
        const journalId = req.params.journalId; // Extract journal ID from request parameters

        if (!journalId) {
            throw new ApiError('Journal ID is required', 400);
        }

        const journalData = await Journal.findById(journalId); // Find journal by ID

        if (!journalData) {
            throw new ApiError('Journal not found', 404);
        }

        // Update journal data
        const updatedJournal = await Journal.findByIdAndUpdate(journalId, req.body, { new: true });

        logger.info(`Journal updated successfully: ${updatedJournal._id} by admin: ${req.user._id}`);

        res.status(200).json({
            success: true,
            message: "Journal updated successfully",
            data: updatedJournal
        });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Journal update failed: ${error.message}`, 400));
    }
}

/**
 * Deletes a journal by its ID.
 */
const deleteJournal = async (req, res, next) => {
    try {
        const journalId = req.params.journalId;

        if (!journalId) {
            throw new ApiError('Journal ID is required', 400);
        }

        const journalData = await Journal.findById(journalId);

        if (!journalData) {
            throw new ApiError('Journal not found', 404);
        }

        // Check if the journal has an editor assigned
        if (journalData.editorId) {
            // delete the editor user
            await User.findByIdAndDelete(journalData.editorId);
            logger.info(`Editor removed: ${journalData.editorId} for journal: ${journalId} by admin: ${req.user._id}`);
        }

        // Delete the journal
        await Journal.findByIdAndDelete(journalId);

        logger.info(`Journal deleted: ${journalId} by admin: ${req.user._id}`);

        res.status(200).json({
            success: true,
            message: "Journal deleted successfully"
        });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Journal deletion failed: ${error.message}`, 400));
    }
}

/**
 * Retrieves the list of journals with pagination.
 */
const journalList = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query; // Extract page and limit from query parameters

        const journalData = await Journal.find()
            .select('_id title description category tags publishedDate createdAt updatedAt') // Exclude the __v field from the response
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit) // Skip documents for pagination
            .limit(parseInt(limit)); // Limit the number of documents returned

        const totalJournals = await Journal.countDocuments(); // Get total count of journals

        res.status(200).json({
            success: true,
            message: "Journal data retrieved successfully",
            data: {
                journals: journalData || [],
                pagination: {
                    total: totalJournals,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(totalJournals / limit)
                }
            }
        });
    } catch (error) {
        next(new ApiError(`Journal data retrieval failed: ${error.message}`, 400));
    }
}

/**
 * Retrieves the details of a specific journal by its ID.
 * */
const journalDetails = async (req, res, next) => {
    try {
        const journalId = req.params.journalId; // Extract journal ID from request parameters

        if (!journalId) {
            throw new ApiError('Journal ID is required', 400);
        }

        let journalData;

        if (req.user.role === 'admin') {
            // If the user is an admin, retrieve all journal data excluding __v and editorId fields
            journalData = await Journal.findById(journalId).select('-__v').populate('editorId', 'firstName lastName email.id phoneNumber institution');
        } else {
            journalData = await Journal.findById(journalId).select('-__v -editorId'); // Find journal by ID and exclude __v field
        } // Find journal by ID and exclude __v field

        if (!journalData) {
            throw new ApiError('Journal not found', 404);
        }

        res.status(200).json({
            success: true,
            message: "Journal data retrieved successfully",
            data: journalData
        });
    } catch (error) {
        next(new ApiError(`Journal data retrieval failed: ${error.message}`, 400));
    }
}

/**
 * Retrieves the list of distinct categories from journals.
 * */
const categories = async (req, res, next) => {
    try {
        const categories = await Journal.distinct("category"); // Get distinct categories from journals

        res.status(200).json({
            success: true,
            message: "Categories retrieved successfully",
            data: categories
        });
    } catch (error) {
        next(new ApiError(`Category retrieval failed: ${error.message}`, 400));
    }
}

/**
 * Retrieves the list of distinct tags from journals.
 * */
const tags = async (req, res, next) => {
    try {
        const tags = await Journal.distinct("tags"); // Get distinct tags from journals

        res.status(200).json({
            success: true,
            message: "Tags retrieved successfully",
            data: tags
        });
    } catch (error) {
        next(new ApiError(`Tag retrieval failed: ${error.message}`, 400));
    }
}

/**
 * Retrieves the list of journals.
 */
const journalEditorList = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query; // Extract page and limit from query parameters

        const journalData = await Journal.find()
            .select('-__v')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit) // Skip documents for pagination
            .limit(parseInt(limit)); // Limit the number of documents returned 

        const totalJournals = await Journal.countDocuments(); // Get total count of journals
        
        const formattedJournals = await Promise.all(journalData.map(async (journal) => {
            const editor = journal.editorId ? await User.findById(journal.editorId).select('firstName lastName') : null;
            return {
                ...journal.toObject(),
                editor: editor ? `${editor.firstName} ${editor.lastName}` : null
            };
        }));

        res.status(200).json({
            success: true,
            message: "Journal data retrieved successfully",
            data: {
                journals: formattedJournals || [],
                pagination: {
                    total: totalJournals,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(totalJournals / limit)
                }
            }
        });
    } catch (error) {
        next(new ApiError(`Journal data retrieval failed: ${error.message}`, 400));
    }
}

/**
 * Adds an editor to a journal.
 */
const addEditor = async (req, res, next) => {
    try {
        // Check if user with email already exists
        const user = await User.findOne({ "email.id": req.body.email });
        if (user) {
            throw new ApiError('User with this email already exists', 400);
        }

        // Check if user with phone number already exists
        const userPhone = await User.findOne({ phoneNumber: req.body.phoneNumber });
        if (userPhone) {
            throw new ApiError('User with this phone number already exists', 400);
        }

        // Generate random password and username
        const password = generateRandomPassword(12);
        const userName = req.body.firstName.toLowerCase() + Math.floor(Math.random() * 1000);

        // Create new editor user
        const editor = new User({
            firstName: req.body.firstName,
            middleName: req.body.middleName,
            lastName: req.body.lastName,
            userName: userName,
            email: {
                id: req.body.email
            },
            phoneNumber: req.body.phoneNumber,
            password: password,
            institution: req.body.institution,
            role: 'editor',
        });

        // Check if journal exists and has an editor
        const journal = await Journal.findById(req.body.journalId);
        if (!journal) {
            throw new ApiError('Journal not found', 404);
        }

        // Check if the journal has an editor assigned
        if (journal.editorId) {
            // delete the editor user
            await User.findByIdAndDelete(journal.editorId);
            logger.info(`Editor removed: ${journal.editorId} for journal: ${req.body.journalId} by admin: ${req.user._id}`);
        }

        // Save new editor and update journal
        await editor.save();
        await Journal.findByIdAndUpdate(req.body.journalId, { editorId: editor._id });

        try {
            await sendMail(
                "Editor Update",
                editor.email.id,
                "Editor Account Created",
                `<p>Your editor account has been created successfully. Your login credentials are:</p>
                <p>Username: <strong>${editor.userName}</strong></p>
                <p>Password: <strong>${password}</strong></p>
                <p>Please change your password after logging in.</p>`
            );
        } catch (error) {
            logger.error(`Failed to send email to ${editor.email.id}: ${error.message}`);
            throw new ApiError('Failed to send email to editor', 500);
        }

        logger.info(`Editor added successfully: ${editor._id} for journal: ${req.body.journalId} by admin: ${req.user._id}`);

        res.status(201).json({
            success: true,
            message: "Editor added successfully"
        });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Editor addition failed: ${error.message}`, 400));
    }
}

/**
 * Removes an editor from a journal.
 */
const removeEditor = async (req, res, next) => {
    try {
        const journalId = req.params.journalId;

        if (!journalId) {
            throw new ApiError('Journal ID is required', 400);
        }

        const journal = await Journal.findById(journalId);

        if (!journal) {
            throw new ApiError('Journal not found', 404);
        }

        if (!journal.editorId) {
            throw new ApiError('This journal has no editor assigned', 400);
        }

        // Delete the editor user
        await User.findByIdAndDelete(journal.editorId);

        // Update journal to remove editor reference
        await Journal.findByIdAndUpdate(journalId, { editorId: null });

        logger.info(`Editor removed from journal: ${journalId} by admin: ${req.user._id}`);

        res.status(200).json({
            success: true,
            message: "Editor removed successfully"
        });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Editor removal failed: ${error.message}`, 400));
    }
}

module.exports = {
    addJournal,
    updateJournal,
    deleteJournal,
    journalList,
    journalDetails,
    categories,
    tags,
    journalEditorList,
    addEditor,
    removeEditor
};
