const mongoose = require("mongoose");

const journalSchema = new mongoose.Schema({
    editorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        default: 'N/A'
    },
    tags: {
        type: [String],
        required: false 
    },
    publishedDate: {
        type: Date,
        default: Date.now
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    publicationFrequency: {
        type: String,
        required: true,
        enum: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually'],
        default: 'Monthly'
    },
    openAccess: {
        type: Boolean,
        required: false,
        default: false
    },
    peerReviewProcess: {
        type: String,
        required: false,
        default: 'Single-blind peer review'
    },
    impactFactor: {
        value: {
            type: Number,
            required: false,
            default: 0
        },
        year: {
            type: Number,
            required: false,
            default: new Date().getFullYear()
        }
    },
    metrics: {
        averageReviewTime: {
            type: String,
            required: false,
            default: '30 days'
        },
        acceptanceRate: {
            type: String,
            required: false,
            default: '50%'
        },
        timeToPublication: {
            type: String,
            required: false,
            default: '60 days'
        },
        articlesPerYear: {
            type: Number,
            required: false,
            default: 100
        }
    },
    submissionGuidelines: {
        type: [String],
        required: false,
        default: [
            'Manuscripts must be original and not published elsewhere',
            'Research must follow ethical standards appropriate to the field',
            'Formatting should follow journal-specific requirements',
            'Citations should use appropriate referencing style',
            'All data should be accessible and transparent'
        ]
    },
}, { timestamps: true });

module.exports = mongoose.model('Journal', journalSchema);

// {
//     "_id": "681467c579a576e18609301f",
//     "title": "Nature: International Journal of Science",
//     "description": "A weekly international journal publishing the finest peer-reviewed research in all fields of science and technology.",
//     "category": "science",
//     "publishedDate": "2025-05-02T06:35:49.207Z",
//     "createdAt": "2025-05-02T06:35:49.208Z",
//     "updatedAt": "2025-05-02T06:35:49.208Z",
//     "tags": ["Science", "Biology", "Technology", "Physics"],
//     "isDeleted": false,
//     "publicationFrequency": "Weekly",
//     "openAccess": true,
//     "peerReviewProcess": "Double-blind peer review",
//     "impactFactor": {
//       "value": 8.24,
//       "year": 2024
//     },
//     "metrics": {
//       "averageReviewTime": "14 days",
//       "acceptanceRate": "65%",
//       "timeToPublication": "30 days",
//       "articlesPerYear": 500
//     },
//     "editorialBoard": {
//       "chiefEditor": {
//         "name": "Prof. Sarah Johnson",
//         "title": "PhD",
//         "institution": "University of Cambridge"
//       },
//       "associateEditors": [
//         {
//           "name": "Dr. Michael Chen",
//           "title": "PhD",
//           "institution": "Stanford University"
//         },
//         {
//           "name": "Dr. Emily Rodriguez",
//           "title": "PhD",
//           "institution": "MIT"
//         }
//       ]
//     },
//     "submissionGuidelines": [
//       "Manuscripts must be original and not published elsewhere",
//       "Research must follow ethical standards appropriate to the field",
//       "Formatting should follow journal-specific requirements",
//       "Citations should use appropriate referencing style",
//       "All data should be accessible and transparent"
//     ]
//   }