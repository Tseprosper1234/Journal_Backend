const { z } = require('zod');

const reviewerValidation = {
    firstName: z.string({ required_error: "First name is required" }).trim()
        .min(2, 'First name should be at least 2 characters long')
        .max(50, 'First name should be at most 50 characters long'),
    lastName: z.string({ required_error: "Last name is required" }).trim()
        .min(2, 'Last name should be at least 2 characters long')
        .max(50, 'Last name should be at most 50 characters long'),
    email: z.string({ required_error: "Email is required" }).trim()
        .email('Invalid email format')
        .min(5, 'Email should be at least 5 characters long')
        .max(100, 'Email should be at most 100 characters long'),
    affiliation: z.string().trim()
        .min(2, 'Affiliation should be at least 2 characters long')
};

/**
 * Validator object for reviewer data.
 * @type {Object}
 */
const reviewerValidator = {
    addReviewer: z.object(reviewerValidation),

    bulkReviewers: z.object({
        reviewers: z.array(z.object(reviewerValidation))
            .min(1, 'At least one reviewer must be provided')
    })
};

module.exports = reviewerValidator;
