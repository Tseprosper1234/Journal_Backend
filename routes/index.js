const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth_routes');
const articleRoutes = require('./article_routes');
const journalRoutes = require('./journal_routes');
const reviewerRoutes = require('./reviewer_routes');

// Use route modules
router.use('/auth', authRoutes);
router.use('/article', articleRoutes);
router.use('/journal', journalRoutes);
router.use('/reviewer', reviewerRoutes);

module.exports = router;
