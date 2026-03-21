const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    journalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Journal',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    abstract: {
        type: String,
        required: true
    },
    keywords: [
        {
            type: String,
            required: true
        }
    ],
    menuScript: {
        type: String,
        required: true
    },
    coverLetter: {
        type: String,
        required: true
    },
    supplementaryFile: {
        type: String,
        required: true
    },
    mergedScript: {
        type: String,
        required: false
    },
    authors: [{
        firstName: {
            type: String,
            required: true
        },
        lastName: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        affiliation: {
            type: String,
            required: true
        },
        correspondingAuthor: {
            type: Boolean,
            required: true
        },
        firstAuthor: {
            type: Boolean,
            required: true
        },
        otherAuthor: {
            type: Boolean,
            required: true
        }
    }],
    status: {
        type: String,
        required: true,
        default: 'submitted'
    },
    comment: {
        type: String,
        required: false,
        default: ""
    },
    reviewers: [{
        reviewerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Reviewer',
            required: true
        },
        status: {
            type: String,
            required: true,
            default: "pending"
        },
        comment: {
            type: String,
            required: false,
            default: ""
        },
        reviewDate: {
            type: Date,
            required: false,
            default: null
        },
        reviewed: {
            type: Boolean,
            required: true,
            default: false
        },
        createdAt: {
            type: Date,
            required: true,
            default: Date.now
        }
    }]
}, { timestamps: true });

const Article = mongoose.model('Article', articleSchema);
module.exports = Article;