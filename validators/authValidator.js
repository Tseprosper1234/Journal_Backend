const { z, date } = require('zod');

/**
 * Creates a password validation schema with standard rules
 * @returns {z.ZodString} Password validation schema
 */
const createPasswordSchema = () => {
    return z.string({ required_error: "Password is required" }).trim()
        .min(8, 'Password should be at least 8 characters long')
        .max(50, 'Password should be at most 50 characters long')
        .refine((val) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(val), {
            message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
        })
};

/**
 * Validator object for authentication related operations.
 * @type {Object}
 */
const authValidator = {
    register: z.object({
        firstName: z.string({ required_error: "First name is required" }).trim()
            .min(3, 'First name should be at least 3 characters long')
            .max(50, 'First name should be at most 50 characters long'),
        middleName: z.string().trim().optional(),
        lastName: z.string({ required_error: "Last name is required" }).trim()
            .min(2, 'Last name should be at least 2 characters long')
            .max(50, 'Last name should be at most 50 characters long'),
        userName: z.string({ required_error: "Username is required" }).trim()
            .min(5, 'Username should be at least 5 characters long')
            .max(50, 'Username should be at most 50 characters long'),
        email: z.string({ required_error: "Email is required" }).trim()
            .email("Invalid email address")
            .min(5, 'Email should be at least 5 characters long')
            .max(50, 'Email should be at most 50 characters long'),
        phoneNumber: z.string({ required_error: "Phone number is required" }).trim()
            .min(10, 'Phone number should be at least 10 characters long')
            .max(15, 'Phone number should be at most 15 characters long'),
        password: createPasswordSchema(),
        confPassword: z.string({ required_error: "Confirm password is required" }).trim()
            .min(8, 'Password should be at least 8 characters long')
            .max(50, 'Password should be at most 50 characters long'),
        institution: z.string().optional(),
        dateOfBirth: z.string().optional(),
    }).refine(data => data.password === data.confPassword, {
        message: "Password doesn't match",
        path: ["confPassword"]
    }),

    login: z.object({
        email: z.string({ requied_error: "Email is required to login" }).trim(),
        password: z.string({ required_error: "Password is required to login" }).trim()
    }),

    verifyEmail: z.object({
        email: z.string({ required_error: "Email is required" }).trim()
            .email("Invalid email address"),
        verificationCode: z.string({ required_error: "Verification code is required" }).trim()
            .min(4, 'Verification code should be at least 4 characters long')
            .max(6, 'Verification code should be at most 6 characters long'),
        verificationToken: z.string({ required_error: "Verification token is required" }).trim(),
        isResetPassword: z.boolean().optional()
    }),

    sendOtp: z.object({
        email: z.string({ required_error: "Email is required" }).trim()
            .email("Invalid email address"),
        verificationToken: z.string({ required_error: "Verification token is required" }).trim()
    }),

    forgotPassword: z.object({
        email: z.string({ required_error: "Email is required" }).trim()
            .email("Invalid email address")
    }),

    resetPassword: z.object({
        email: z.string({ required_error: "Email is required" }).email("Invalid email address").trim(),
        password: createPasswordSchema(),
        confPassword: z.string({ required_error: "Confirm password is required" }).trim(),
        resetPasswordToken: z.string({ required_error: "Reset password token is required" }).trim(),
        verificationCode: z.string({ required_error: "Verification code is required" }).trim()
            .min(4, 'Verification code should be at least 4 characters long')
            .max(6, 'Verification code should be at most 6 characters long')
    }).refine(data => data.password === data.confPassword, {
        message: "Password doesn't match",
        path: ["confPassword"]
    }),
}

module.exports = authValidator;