const express = require('express');
const router = express.Router();
const articleController = require('../controllers/article_controller');
const { authenticate, verifyEditor, verifyReviewer } = require('../middleware/authentication');
const { upload } = require('../middleware/multer');
const validate = require('../middleware/validator');
const articleSchema = require('../validators/articleValidator');

const articleUploadFields = [
    { name: "menuScript", maxCount: 1 },
    { name: "coverLetter", maxCount: 1 },
    { name: "supplementaryFile", maxCount: 1 }
];

// ------------------- Article routes ------------------- //
// This route handles the addition of articles, including file uploads for menu script, cover letter, and supplementary files.

// Post routes
router.post('/add-article',
    authenticate,
    upload.fields(articleUploadFields),
    validate(articleSchema.addArticle),
    articleController.addArticle
);
router.post('/add-review', authenticate, verifyReviewer, validate(articleSchema.addReview), articleController.addReview);
router.post('/add-final-review', authenticate, verifyEditor, validate(articleSchema.addReview), articleController.addFinalReview);
router.post('/create-zip', authenticate, verifyEditor, articleController.createZip);

// Put routes
router.put('/update-article/:articleId', 
    authenticate, 
    upload.fields(articleUploadFields), 
    validate(articleSchema.updateArticle), 
    articleController.updateArticle
);

// Delete routes
router.delete('/delete-article/:articleId', authenticate, articleController.deleteArticle);

// Get routes
router.get('/article-details/:articleId', authenticate, articleController.articleDetails);
router.get('/user-article-list', authenticate, articleController.userArticleList);
router.get('/article-list', authenticate, articleController.articleList);
router.get('/review-article-list', authenticate, verifyReviewer, articleController.reviewArticleList);
router.get('/download-zip/:filename', articleController.downloadZip);

// Patch routes
router.patch('/assign-reviewer', authenticate, verifyEditor, articleController.assignReviewer);
router.patch('/remove-reviewer', authenticate, verifyEditor, articleController.removeReviewer);

module.exports = router;