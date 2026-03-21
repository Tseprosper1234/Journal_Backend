const { z } = require('zod');

/**
 * Validator object for journal data.
 * @type {Object}
 */
const journalValidator = {
    addJournal: z.object({
        title: z.string({ required_error: "Title is required" }).trim()
            .min(3, 'Title should be at least 3 characters long')
            .max(50, 'Title should be at most 50 characters long'),
        description: z.string({ required_error: "Description is required" }).trim()
            .min(10, 'Content should be at least 10 characters long')
            .max(1000, 'Content should be at most 1000 characters long'),
        category: z.string({ required_error: "Category is required" }).trim()
            .min(3, 'Category should be at least 3 characters long')
            .max(50, 'Category should be at most 50 characters long'),
        tags: z.array(z.string()).optional(),
    }),

    addEditor: z.object({
        firstName: z.string({ required_error: "First name is required" }).trim()
            .min(3, 'First name should be at least 3 characters long')
            .max(50, 'First name should be at most 50 characters long'),
        middleName: z.string().trim().optional(),
        lastName: z.string({ required_error: "Last name is required" }).trim()
            .min(2, 'Last name should be at least 2 characters long')
            .max(50, 'Last name should be at most 50 characters long'),
        email: z.string({ required_error: "Email is required" }).trim()
            .email("Invalid email address"),
        phoneNumber: z.string({ required_error: "Phone number is required" }).trim()
            .min(10, 'Phone number should be at least 10 characters long')
            .max(15, 'Phone number should be at most 15 characters long'),
        institution: z.string({ required_error: "Institution is required" }).trim()
            .min(2, 'Institution should be at least 2 characters long')
            .max(50, 'Institution should be at most 50 characters long'),
        journalId: z.string({ required_error: "Journal ID is required" }).trim()
    }),
};

module.exports = journalValidator;