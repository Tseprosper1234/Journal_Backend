const { z } = require('zod');

/**
 * Validator object for article data.
 * @type {Object}
 */
const articleValidator = {
    addArticle: z.object({
        title: z.string({ required_error: "Title is required" }).trim()
            .min(5, 'Title should be at least 5 characters long')
            .max(200, 'Title should be at most 200 characters long'),
        abstract: z.string().trim()
            .min(100, 'Abstract should be at least 100 characters long')
            .max(2000, 'Abstract should be at most 2000 characters long'),
        keywords: z.string({ required_error: "Keywords are required" }).trim()
            .refine(val => {
                try {
                    const parsed = JSON.parse(val);
                    return Array.isArray(parsed) && parsed.length > 0;
                } catch {
                    return false;
                }
            }, 'Keywords must be a valid JSON array'),
        authors: z.string({ required_error: "Authors are required" }).trim()
            .refine(val => {
                try {
                    const parsed = JSON.parse(val);
                    return Array.isArray(parsed) && parsed.length > 0;
                } catch {
                    return false;
                }
            }, 'Authors must be a valid JSON array'),
        journalId: z.string({ required_error: "Journal ID is required" }).trim()
            .min(24, 'Invalid journal ID')
            .max(24, 'Invalid journal ID')
    }),

    updateArticle: z.object({
        title: z.string({ required_error: "Title is required" }).trim()
            .min(5, 'Title should be at least 5 characters long')
            .max(200, 'Title should be at most 200 characters long'),
        abstract: z.string().trim()
            .min(100, 'Abstract should be at least 100 characters long')
            .max(2000, 'Abstract should be at most 2000 characters long'),
        keywords: z.string({ required_error: "Keywords are required" }).trim()
            .refine(val => {
                try {
                    const parsed = JSON.parse(val);
                    return Array.isArray(parsed) && parsed.length > 0;
                } catch {
                    return false;
                }
            }, 'Keywords must be a valid JSON array'),
        authors: z.string({ required_error: "Authors are required" }).trim()
            .refine(val => {
                try {
                    const parsed = JSON.parse(val);
                    return Array.isArray(parsed) && parsed.length > 0;
                } catch {
                    return false;
                }
            }, 'Authors must be a valid JSON array'),
        journalId: z.string({ required_error: "Journal ID is required" }).trim()
            .min(24, 'Invalid journal ID')
            .max(24, 'Invalid journal ID'),

    }),

    addReview: z.object({
        articleId: z.string({ required_error: "Article ID is required" }).trim()
            .min(24, 'Invalid article ID')
            .max(24, 'Invalid article ID'),
        status: z.string({ required_error: "Status is required" }).trim()
            .min(3, 'Status should be at least 3 characters long')
            .max(20, 'Status should be at most 20 characters long'),
        comment: z.string({ required_error: "Review comments are required" }).trim()
            .min(10, 'Review comments should be at least 10 characters long')
            .max(1000, 'Review comments should be at most 1000 characters long')
    }),

    createZip: z.object({
        files: z.array(z.string())
            .min(1, 'At least one file must be provided')
    })
};

module.exports = articleValidator;
