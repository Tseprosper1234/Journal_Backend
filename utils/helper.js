const crypto = require("crypto");

const generateVerificationToken = () => {
  const token = crypto.createHash("sha256").update(crypto.randomBytes(32).toString("hex")).digest("hex");
  return token;
};

const generateRandomPassword = (length) => {
  const password = crypto.randomBytes(length + 4).toString("base64").slice(0, length);
  return password.toLocaleUpperCase().slice(0, length).replace(/[^A-Z0-9]/g, "S");
}

module.exports = {
  generateVerificationToken,
  generateRandomPassword,
};