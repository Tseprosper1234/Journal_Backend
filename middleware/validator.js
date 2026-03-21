/**
 * Middleware function to validate request body against a schema.
 *
 * @param {object} schema - The schema to validate the request body against.
 * @returns {function} - The middleware function that performs the validation.
 */
const validate = (schema) => async (req, res, next) => {
    try {
        const validatedBody = await schema.parseAsync(req.body);
        req.body = validatedBody;
        next();
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.errors[0].message });
    }
};

module.exports = validate;