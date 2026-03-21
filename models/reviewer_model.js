const mongoose = require('mongoose');

const reviewerSchema = new mongoose.Schema({
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
        required: true,
        unique: true
    },
    affiliation: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Reviewer', reviewerSchema);