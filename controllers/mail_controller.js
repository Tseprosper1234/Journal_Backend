const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

/**
 * Configures and returns a nodemailer transporter.
 * @returns {Object} The configured nodemailer transporter.
 */
const getTransporter = () => {
  if (process.env.EMAIL_SERVICE === 'Hostinger') {
    return nodemailer.createTransport({
      service: 'Hostinger',
      host: 'smtp.hostinger.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_HOST,
        pass: process.env.EMAIL_HOST_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  } else {
    return nodemailer.createTransport({
      host: process.env.EMAIL_SERVICE,
      port: parseInt(process.env.EMAIL_PORT, 10),
      secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
};

/**
 * Sends an email using the nodemailer library.
 *
 * @param {string} senderId - The ID of the sender.
 * @param {string} receiverId - The ID of the receiver.
 * @param {string} subject - The subject of the email.
 * @param {string} content - The HTML content of the email.
 * @returns {Promise<Object>} - A promise that resolves with the send info when the email is sent.
 */
const sendMail = async (senderId, receiverId, subject, content) => {
  try {
    const transporter = getTransporter();

    const mailOptions = {
      from: `${senderId} <${process.env.EMAIL_HOST}>`,
      to: receiverId,
      subject: subject,
      html: content,
    };

    const info = await transporter.sendMail(mailOptions);

    logger.info(`Email sent: ${info.messageId} to ${receiverId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send email to ${receiverId}: ${error.message}`);
    throw error;
  }
};

/**
 * Handles sending email with proper error handling.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const handleSendMail = async (req, res, next) => {
  try {
    if (!req.body.mailTo || !req.body.mailSubject || !req.body.mailHtml || !req.body.mailFrom) {
      return res.status(400).json({
        success: false,
        message: "Missing required email fields"
      });
    }

    const transporter = getTransporter();

    const info = await transporter.sendMail({
      from: `${req.body.mailFrom} <${process.env.EMAIL_HOST}>`,
      to: req.body.mailTo,
      subject: req.body.mailSubject,
      html: req.body.mailHtml,
    });

    logger.info(`Email sent: ${info.messageId} to ${req.body.mailTo}`);

    res.status(200).json({
      success: true,
      message: "Mail sent successfully",
      data: info
    });
  } catch (error) {
    logger.error(`Mail sending failed: ${error}`);
    next(new Error(`Mail sending failed: ${error.message}`));
  }
};

module.exports = {
  sendMail,
  handleSendMail
};