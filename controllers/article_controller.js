const Article = require('../models/article_model');
const Journal = require('../models/journal_model');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');
const Reviewer = require('../models/reviewer_model');

/**
 * Add a new journal article.
 */
const addArticle = async (req, res, next) => {
    try {
        const article = new Article({
            userId: req.user._id,
            title: req.body.title,
            abstract: req.body.abstract,
            keywords: JSON.parse(req.body.keywords),
            menuScript: req.files.menuScript[0].filename,
            coverLetter: req.files.coverLetter[0].filename,
            supplementaryFile: req.files.supplementaryFile[0].filename,
            authors: JSON.parse(req.body.authors),
            journalId: req.body.journalId,
        });

        const responseData = await article.save();

        logger.info(`Article submitted successfully: ${responseData._id} by user: ${req.user._id}`);

        res.status(201).json({
            success: true,
            message: "Article submitted successfully",
            data: responseData
        });
    } catch (error) {
        next(new ApiError(`Article submission failed: ${error.message}`, 400));
    }
}

/**
 * Deletes a journal article.
 * */
const deleteArticle = async (req, res, next) => {
    try {
        const articleId = req.params.articleId; // Extract article ID from request parameters

        // Validate article ID
        if (!articleId) {
            throw new ApiError('Article ID is required', 400);
        }

        // Check if the article ID is a valid ObjectId
        if (articleId.length !== 24) {
            throw new ApiError('Invalid article ID', 400);
        }

        // Find and delete the article
        const deletedArticle = await Article.findByIdAndDelete(articleId);

        // Check if the article was found and deleted
        if (!deletedArticle) {
            throw new ApiError('Article not found', 404);
        }

        res.status(200).json({
            success: true,
            message: "Journal Article deleted successfully"
        });
    } catch (error) {
        next(new ApiError(`Failed to delete article: ${error.message}`, 400));
    }
}

/**
 * Retrieves details of a specific journal article.
 * */
const articleDetails = async (req, res, next) => {
    try {
        const articleId = req.params.articleId; // Extract article ID from request parameters
        let article; // Initialize article variable

        // Validate article ID
        if (!articleId) {
            throw new ApiError('Article ID is required', 400);
        }

        // Check if the article ID is a valid ObjectId
        if (articleId.length !== 24) {
            throw new ApiError('Invalid article ID', 400);
        }

        if (req.user.role === 'user') {
            // Find article - either the user is the owner or is listed as an author
            article = await Article.findOne({
                _id: articleId,
                $or: [
                    { userId: req.user._id },
                    { 'authors.email': req.user.email.id }
                ]
            }).select('-__v -reviewers')
                .populate('journalId', 'title description')
                .populate('userId', 'firstName middleName lastName email.id profilePicture');
        } else if (req.user.role === 'editor') {
            const journals = await Journal.find({ editorId: req.user._id }).select('_id'); // Get journals edited by the user
            if (!journals || journals.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: "No articles found for this editor",
                    data: null
                });
            }
            // Find article - the user is an editor of the journal
            article = await Article.findOne({
                journalId: { $in: journals },
                _id: articleId
            }).select('-__v')
                .populate('journalId', 'title description')
                .populate('userId', 'firstName middleName lastName email.id profilePicture')
                .populate('reviewers.reviewerId', 'firstName middleName lastName email.id');
        }

        // Check if article exists
        if (!article) {
            throw new ApiError('Article not found or you don\'t have permission to view it', 404);
        }

        res.status(200).json({
            success: true,
            message: "Journal Article details retrieved successfully",
            data: article
        });
    } catch (error) {
        next(new ApiError(`Failed to retrieve article details: ${error.message}`, 400));
    }
}

/**
 * Retrieves journal articles data for a user.
 */
const userArticleList = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query; // Extract page and limit from query parameters

        // Fetch articles authored by the user
        const articles = await Article.find({ userId: req.user._id })
            .select('title abstract status createdAt comment')
            .skip((page - 1) * limit) // Skip documents for pagination
            .limit(parseInt(limit)); // Limit the number of documents returned

        // Fetch articles where the user is listed as an author
        const otherArticles = await Article.find({ 'authors.email': req.user.email })
            .select('title abstract status createdAt')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        // Combine articles and remove duplicates
        const combinedArticles = articles.concat(
            otherArticles.filter(item2 => !articles.some(item1 => item1.id === item2.id))
        );

        // Get the total count of articles for pagination
        const totalArticles = await Article.countDocuments({
            $or: [{ userId: req.user._id }, { 'authors.email': req.user.email }]
        });

        res.status(200).json({
            success: true,
            message: "Journal Articles data retrieved successfully",
            data: {
                articles: combinedArticles || [],
                pagination: {
                    total: totalArticles,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(totalArticles / limit)
                }
            }
        });
    } catch (error) {
        next(new ApiError(`Failed to retrieve articles: ${error.message}`, 400));
    }
};

/**
 * Retrieves a list of journal articles based on the provided journal ID.
 */
const articleList = async (req, res, next) => {
    try {
        const { page = 1, limit = 10 } = req.query; // Extract page and limit from query parameters
        let articles = []; // Initialize articles array
        let totalArticles = 0; // Initialize total articles count

        if (req.user.role === 'editor') {
            const journals = await Journal.find({ editorId: req.user._id }).select('_id'); // Get journals edited by the user
            if (!journals || journals.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: "No articles found for this editor",
                    data: {
                        articles: [],
                        pagination: {
                            total: 0,
                            page: 1,
                            limit: 10,
                            totalPages: 0
                        }
                    }
                });
            }

            // Fetch articles for the journals edited by the user
            articles = await Article.find({ journalId: { $in: journals } })
                .select('title abstract status createdAt comment')
                .populate('journalId', 'title description')
                .skip((page - 1) * limit) // Skip documents for pagination
                .limit(parseInt(limit)); // Limit the number of documents returned

            totalArticles = await Article.countDocuments({ journalId: { $in: journals } });
        } else if (req.user.role === 'user') {
            const userArticles = await Article.find({ userId: req.user._id })
                .select('title abstract status createdAt comment')
                .skip((page - 1) * limit) // Skip documents for pagination
                .limit(parseInt(limit)); // Limit the number of documents returned

            // Fetch articles where the user is listed as an author
            const otherArticles = await Article.find({ 'authors.email': req.user.email })
                .select('title abstract status createdAt')
                .skip((page - 1) * limit)
                .limit(parseInt(limit));

            // Combine articles and remove duplicates
            articles = userArticles.concat(
                otherArticles.filter(item2 => !userArticles.some(item1 => item1.id === item2.id))
            );

            // Get the total count of articles for pagination
            totalArticles = await Article.countDocuments({
                $or: [{ userId: req.user._id }, { 'authors.email': req.user.email }]
            });
        }


        res.status(200).json({
            success: true,
            message: "Journal Articles data retrieved successfully",
            data: {
                articles: articles || [],
                pagination: {
                    total: totalArticles,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(totalArticles / limit)
                }
            }
        });
    } catch (error) {
        next(new ApiError(`Failed to retrieve article list: ${error.message}`, 400));
    }
}

/**
 * Updates a journal article.
 */
const updateArticle = async (req, res, next) => {
    try {
        // Validate article ID
        if (!req.params.articleId) {
            throw new ApiError('Article ID is required', 400);
        }
        // Check if the article ID is a valid ObjectId
        if (req.params.articleId.length !== 24) {
            throw new ApiError('Invalid article ID', 400);
        }
        // Check if the article exists
        const article = await Article.findById(req.params.articleId);
        if (!article) {
            throw new ApiError('Journal article not found', 404);
        }

        // Check if the journal exists
        const journal = await Journal.findById(req.body.journalId);
        if (!journal) {
            throw new ApiError('Journal not found', 404);
        }

        // Check if the user is the author of the article
        if (article.userId.toString() !== req.user._id.toString()) {
            throw new ApiError('You are not authorized to update this article', 403);
        }

        // Update article fields
        article.title = req.body.title || article.title;
        article.abstract = req.body.abstract || article.abstract;
        article.keywords = req.body.keywords ? JSON.parse(req.body.keywords) : article.keywords;
        article.menuScript = req.files.menuScript ? req.files.menuScript[0].filename : article.menuScript;
        article.coverLetter = req.files.coverLetter ? req.files.coverLetter[0].filename : article.coverLetter;
        article.supplementaryFile = req.files.supplementaryFile ? req.files.supplementaryFile[0].filename : article.supplementaryFile;
        article.journalId = req.body.journalId || article.journalId;
        article.authors = req.body.authors ? JSON.parse(req.body.authors) : article.authors;

        // Save the updated article
        await article.save();

        logger.info(`Article updated successfully: ${article._id} by editor: ${req.user._id}`);

        res.status(200).json({
            success: true,
            message: "Journal article updated successfully"
        });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Article update failed: ${error.message}`, 400));
    }
}

/**
 * Assign a reviewer to a journal article.
 * */
const assignReviewer = async (req, res, next) => {
    try {
        const articleId = req.query.articleId;
        const reviewerId = req.query.reviewerId;

        if (!articleId) {
            throw new ApiError('Article ID is required', 400);
        }

        if (!reviewerId) {
            throw new ApiError('Reviewer ID is required', 400);
        }

        const article = await Article.findById(articleId);
        if (!article) {
            throw new ApiError('Journal article not found', 404);
        }

        // Check if the reviewer is already assigned to the article
        const existingReviewer = article.reviewers.find(r => r.reviewerId.toString() === reviewerId);
        if (existingReviewer) {
            throw new ApiError('Reviewer already assigned to this article', 400);
        }

        article.reviewers.push({ reviewerId, reviewed: false });
        await article.save();

        logger.info(`Reviewer assigned successfully: ${reviewerId} to article: ${article._id} by editor: ${req.user._id}`);

        res.status(200).json({
            success: true,
            message: "Reviewer assigned successfully",
            data: article
        });

    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Failed to add reviewers: ${error.message}`, 400));
    }
};

/**
 * Removes a reviewer from a journal article.
 * */
const removeReviewer = async (req, res, next) => {
    try {
        // Extract article ID and reviewer ID from request query parameters
        const articleId = req.query.articleId;
        const reviewerId = req.query.reviewerId;

        if (!articleId) {
            throw new ApiError('Article ID is required', 400);
        }

        if (!reviewerId) {
            throw new ApiError('Reviewer ID is required', 400);
        }

        const article = await Article.findById(articleId);

        if (!article) {
            throw new ApiError('Journal article not found', 404);
        }

        // Check if the reviewer is assigned to the article
        const reviewerIndex = article.reviewers.findIndex(r => r.reviewerId.toString() === reviewerId);
        if (reviewerIndex === -1) {
            throw new ApiError('Reviewer not assigned to this article', 404);
        }

        // Remove the reviewer from the article
        article.reviewers.splice(reviewerIndex, 1);
        await article.save();

        logger.info(`Reviewer removed successfully: ${reviewerId} for article: ${article._id} by editor: ${req.user._id}`);

        res.status(200).json({
            success: true,
            message: "Reviewer removed successfully",
            data: article
        });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Failed to remove reviewer: ${error.message}`, 400));
    }
}

/**
 * Add a journal article review.
 */
const addReview = async (req, res, next) => {
    try {
        const { articleId, status, comment } = req.body;

        const article = await Article.findById(articleId);

        if (!article) {
            throw new ApiError('Journal article not found', 404);
        }

        // Check if the user is a reviewer
        const reviewer = await Reviewer.findOne({ email: req.user.email.id });
        if (!reviewer) {
            throw new ApiError('You are not a reviewer', 403);
        }

        // Find the reviewer in the article's reviewers array by reviewerId
        const reviewerIndex = article.reviewers.findIndex(
            r => r.reviewerId.toString() === reviewer._id.toString()
        );

        if (reviewerIndex === -1) {
            throw new ApiError('You are not assigned to review this article', 403);
        }

        // Check if the review has already been submitted
        if (article.reviewers[reviewerIndex].reviewed) {
            throw new ApiError('You have already submitted a review for this article', 400);
        }

        // Update the reviewer data
        article.reviewers[reviewerIndex].status = status || article.reviewers[reviewerIndex].status;
        article.reviewers[reviewerIndex].comment = comment || article.reviewers[reviewerIndex].comment;
        article.reviewers[reviewerIndex].reviewed = true;
        article.reviewers[reviewerIndex].reviewDate = new Date();

        await article.save();

        logger.info(`Review updated for article: ${article._id} by reviewer: ${req.user._id}`);

        res.status(200).json({
            success: true,
            message: "Review submitted successfully"
        });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Review update failed: ${error.message}`, 400));
    }
}

/**
 * Add a final review to a journal article.
 * */
const addFinalReview = async (req, res, next) => {
    try {
        const { articleId, status, comment } = req.body;

        const article = await Article.findById(articleId);

        if (!article) {
            throw new ApiError('Journal article not found', 404);
        }

        const journal = await Journal.findOne({ editorId: req.user._id });
        if (!journal) {
            throw new ApiError('You are not an editor', 403);
        }

        // Check if the article is included in the journal
        if (article.journalId.toString() !== journal._id.toString()) {
            throw new ApiError('You are not authorized to review this article', 403);
        }

        article.status = status || article.status;
        article.comment = comment || article.comment;

        article.save();

        logger.info(`Final review updated for article: ${article._id} by editor: ${req.user._id}`);

        res.status(200).json({
            success: true,
            message: "Final review updated successfully"
        });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Final review update failed: ${error.message}`, 400));
    }
}

/**
 * Retrieves review articles based on the user's email.
 */
const reviewArticleList = async (req, res, next) => {
    try {
        // Check if the user is a reviewer
        const reviewer = await Reviewer.findOne({ email: req.user.email.id });
        if (!reviewer) {
            throw new ApiError('You are not a reviewer', 403);
        }
        const totalArticles = await Article.countDocuments({ 'reviewers.reviewerId': reviewer._id }); // Get total count of articles

        if (!totalArticles || totalArticles === 0) {
            return res.status(200).json({
                success: true,
                message: "No review articles found",
                data: {
                    articles: [],
                    pagination: {
                        total: totalArticles,
                        page: 1,
                        limit: 10,
                        totalPages: 0
                    }
                }
            });
        }

        // Fetch articles assigned to the reviewer
        const { page = 1, limit = 10 } = req.query; // Extract page and limit from query parameters
        const articles = await Article.find({ 'reviewers.reviewerId': reviewer._id })
            .select('title abstract createdAt menuScript status reviewers')
            .populate('journalId', 'title description')
            .skip((page - 1) * limit) // Skip documents for pagination
            .limit(parseInt(limit)); // Limit the number of documents returned

        const filteredArticles = articles.map(article => ({
            ...article.toObject(),
            reviewers: article.reviewers.filter(e => e.reviewerId.toString() === reviewer._id.toString())
        }));

        res.status(200).json({
            success: true,
            message: "Review Articles retrieved successfully",
            data: {
                articles: filteredArticles || [],
                pagination: {
                    total: totalArticles,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(totalArticles / limit)
                }
            }
        });
    } catch (error) {
        next(new ApiError(`Failed to retrieve review articles: ${error.message}`, 400));
    }
}

/**
 * Creates a zip file containing the specified files.
 */
const createZip = async (req, res, next) => {
    const zip = new JSZip();
    const zipFilesDir = path.join(__dirname, '../public/articles/zip-files');

    try {
        // Ensure directory exists
        if (!fs.existsSync(zipFilesDir)) {
            fs.mkdirSync(zipFilesDir, { recursive: true });
        }

        const files = req.body.files;

        if (!Array.isArray(files) || files.length === 0) {
            throw new ApiError('No files specified for zip creation', 400);
        }

        for (const file of files) {
            const filePath = path.join(__dirname, '../public/articles/merged-script', file);

            if (!fs.existsSync(filePath)) {
                throw new ApiError(`File not found: ${file}`, 404);
            }

            zip.file(file, fs.readFileSync(filePath));
        }

        const filename = `${Date.now()}.zip`;
        const zipPath = path.join(zipFilesDir, filename);

        zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
            .pipe(fs.createWriteStream(zipPath))
            .on('finish', function () {
                logger.info(`Zip file created: ${filename} by user: ${req.user._id}`);

                res.status(200).json({
                    success: true,
                    message: "Zip file created successfully",
                    filename
                });

                // Auto-delete the file after 10 minutes
                setTimeout(() => {
                    if (fs.existsSync(zipPath)) {
                        fs.unlinkSync(zipPath);
                        logger.info(`Temporary zip file deleted: ${filename}`);
                    }
                }, 10 * 60 * 1000);
            })
            .on('error', (err) => {
                next(new ApiError(`Zip file creation failed: ${err.message}`, 500));
            });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Zip file creation failed: ${error.message}`, 400));
    }
}

/**
 * Downloads a zip file.
 */
const downloadZip = (req, res, next) => {
    try {
        const filename = req.params.filename;
        const zipPath = path.join(__dirname, '../public/articles/zip-files', filename);

        if (!fs.existsSync(zipPath)) {
            throw new ApiError('Zip file not found or has expired', 404);
        }

        res.download(zipPath, filename, (err) => {
            if (err) {
                next(new ApiError(`Zip file download failed: ${err.message}`, 400));
            }
        });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Zip file download failed: ${error.message}`, 400));
    }
}

module.exports = {
    addArticle,
    deleteArticle,
    userArticleList,
    articleList,
    updateArticle,
    assignReviewer,
    removeReviewer,
    reviewArticleList,
    addReview,
    addFinalReview,
    articleDetails,
    createZip,
    downloadZip
};
