const express = require('express');
const router = express.Router();
const journalController = require('../controllers/journal_controller');
const { authenticate, verifyAdmin } = require('../middleware/authentication');
const validate = require('../middleware/validator');
const journalSchema = require('../validators/journalValidator');

// ------------------- Journal routes ------------------- //
// This route handles the addition of journals, including file uploads for menu script, cover letter, and supplementary files.
// The routes are organized into sections for better readability and maintainability.
// Each section contains routes for different HTTP methods (POST, PUT, GET, DELETE) and their corresponding handlers.

// Post routes
router.post('/add-journal',
    authenticate,
    verifyAdmin,
    journalController.addJournal
);
router.post('/add-editor', authenticate, verifyAdmin, validate(journalSchema.addEditor), journalController.addEditor);

// Put routes
router.put('/update-journal/:journalId',
    authenticate,
    verifyAdmin,
    journalController.updateJournal
);

// Get routes
router.get('/journal-list', journalController.journalList);
router.get('/journal-details/:journalId', authenticate, journalController.journalDetails);
router.get('/categories', journalController.categories);
router.get('/tags', journalController.tags);
router.get('/journal-editor-list', authenticate, verifyAdmin, journalController.journalEditorList);

// Delete routes
router.delete('/delete-journal/:journalId', authenticate, verifyAdmin, journalController.deleteJournal);
router.delete('/remove-editor/:journalId', authenticate, verifyAdmin, journalController.removeEditor);

module.exports = router;
