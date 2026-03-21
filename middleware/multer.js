const multer = require('multer');
const path = require('path');

// Function to define storage for Journal files
const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        if (file.fieldname === 'profile-picture') {
            callback(null, path.join(__dirname, '../public/profile-pictures'), (err) => {
                if (err) {
                    console.log(err);
                }
            });
        } else if (file.fieldname === 'menuScript') {
            callback(null, path.join(__dirname, '../public/articles/menu-script'), (err) => {
                if (err) {
                    console.log(err);
                }
            });
        } else if (file.fieldname === 'coverLetter') {
            callback(null, path.join(__dirname, '../public/articles/cover-letter'), (err) => {
                if (err) {
                    console.log(err);
                }
            });
        } else if (file.fieldname === 'supplementaryFile') {
            callback(null, path.join(__dirname, '../public/articles/supplementary-file'), (err) => {
                if (err) {
                    console.log(err);
                }
            });
        }
    },
    filename: function (req, file, callback) {
        callback(null, Date.now() + path.extname(file.originalname), (err) => {
            if (err) {
                console.log(err);
            }
        });
    }
});

// Middleware for uploading images
const upload = multer({ storage });

const bufferStorage = multer.memoryStorage(); // Store file in memory instead of disk
const uploadBuffer = multer({ storage: bufferStorage });

module.exports = { upload, uploadBuffer };