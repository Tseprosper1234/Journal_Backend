const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    middleName: {
        type: String,
        required: false
    },
    lastName: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        required: true,
        unique: true
    },
    profilePicture: {
        type: String,
        default: "default_profile_picture.png",
        required: false
    },
    dateOfBirth: {
        type: Date,
        required: true,
        default: Date.now
    },
    email: {
        id: {
            type: String,
            required: true,
            unique: true,
            sparse: true
        },
        verified: {
            type: Boolean,
            default: false
        },
        verificationToken: {
            type: String,
            required: false,
            default: null
        },
        verificationTokenExpiry: {
            type: Date,
            required: false,
            default: null
        }
    },
    phoneNumber: {
        type: Number,
        required: true,
        unique: true,
        sparse: true
    },
    institution: {
        type: String,
        required: false
    },
    password: {
        type: String,
        required: true
    },
    resetPassword: {
        token: {
            type: String,
            required: false
        },
        expiredAt: {
            type: Date,
            required: false
        },
    },
    role: {
        type: String,
        enum: ["admin", "editor", "reviewer", "user"],
        required: true,
        default: "user"
    },
    otp: {
        id: {
            type: Number,
            required: false
        },
        expiredAt: {
            type: Date,
            required: false
        },
        verificationToken: {
            type: String,
            required: false
        },
        verificationTokenExpiry: {
            type: Date,
            required: false
        }
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }]
}, { timestamps: true });

userSchema.methods.generateAuthToken = async function () {
    try {
        const secret = fs.readFileSync(process.env.JWT_PRIVATE_KEY_PATH, "utf8");
        const token = jwt.sign(
            {
                _id: this._id.toString(),
                firstName: this.firstName,
                middleName: this.middleName,
                lastName: this.lastName,
                userSchema: this.userName,
                email: this.email.id,
                phoneNumber: this.phoneNumber,
                institution: this.institution,
                role: this.role
            },
            secret,
            {
                expiresIn: process.env.JWT_EXPIRY,
                algorithm: process.env.JWT_ALGORITHM
            }
        );
        this.tokens = this.tokens.concat({ token: token });
        await this.save();
        return token;
    } catch (error) {
        console.log(error);
    }
}

userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

const User = new mongoose.model("User", userSchema);

module.exports = User;