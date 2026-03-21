const { sendMail } = require('./mail_controller');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Contact Us form submission handler.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */
const contactUs = async (req, res, next) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            throw new ApiError('All fields are required', 400);
        }

        const mailContent = `
            <h1>Contact Us Form Submission</h1>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
        `;

        await sendMail(email, process.env.CONTACT_US_EMAIL, subject, mailContent);

        res.status(200).json({
            success: true,
            message: 'Your message has been sent successfully!'
        });
    } catch (error) {
        next(error.isOperational ? error : new ApiError(`Failed to send message: ${error.message}`, 500));
    }
}

/**
 * About Us page content handler.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */
const aboutUs = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            message: 'About Us page content goes here.'
        });
    } catch (error) {
        next(new ApiError(`Failed to fetch About Us content: ${error.message}`, 500));
    }
}

exports = {
    contactUs,
    aboutUs
};