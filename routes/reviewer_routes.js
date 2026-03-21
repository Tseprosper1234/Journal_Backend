const express = require('express');
const router = express.Router();
const reviewerController = require('../controllers/reviewer_controller');
const { authenticate, verifyEditor } = require('../middleware/authentication');
const validate = require('../middleware/validator');
const reviewerSchema = require('../validators/reviewerValidator');
const { uploadBuffer } = require('../middleware/multer');

// ------------------- Reviewer routes ------------------- //
// Post routes
router.post('/add-reviewer', 
    authenticate, 
    verifyEditor, 
    validate(reviewerSchema.addReviewer), 
    reviewerController.addReviewer
);
router.post('/add-bulk-reviewers', 
    authenticate, 
    verifyEditor, 
    uploadBuffer.single('file'),
    reviewerController.addBulkReviewer
);

// Get routes
router.get('/reviewer-list', authenticate, verifyEditor, reviewerController.reviewerList);

// Delete routes
router.delete('/delete-reviewer/:reviewerId', authenticate, verifyEditor, reviewerController.deleteReviewer);

module.exports = router;
