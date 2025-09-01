const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

const nodemailer = require("nodemailer");
const { defineString } = require("firebase-functions/params");

const mailUser = defineString("EMAIL_USER");
const mailPass = defineString("EMAIL_PASS");

const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail", // Use the built-in 'gmail' service
    auth: {
      user: mailUser.value(), // Your full Gmail address
      pass: mailPass.value(), // Your 16-character App Password
    },
  });
};



exports.handler = onCall(async (request) => {
  const { email, username, password } = request.data;
  const auth = getAuth();
  const db = getFirestore();

  if (!email || !username || !password) {
    throw new HttpsError(
      "invalid-argument",
      "Missing required fields: email, username, and password.",
    );
  }

  try {
    // 1. Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: username,
      emailVerified: false,
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
     const otpExpiration = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);

    // 2. Create corresponding user document in Firestore
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      username: username,
      email: email,
      favoriteGenres: [],
      createdAt: new Date(),
      verificationOtp: otp, 
      otpExpiration: otpExpiration,
    });

     const transporter = createTransporter();
    const mailOptions = {
      from: `"NovelNest" <${mailUser.value()}>`, // --- FIX 3: Use .value() for the 'from' email
      to: email,
      subject: "Your NovelNest Verification Code",
      html: `
        <p>Hello ${username},</p>
        <p>Thank you for signing up for NovelNest. Your verification code is:</p>
        <h2 style="text-align:center; letter-spacing: 5px;">${otp}</h2>
        <p>This code will expire in 10 minutes.</p>
      `,
    };

     await transporter.sendMail(mailOptions);

    // 3. Return the new user's UID to the client
    return {
      uid: userRecord.uid,
      message: "User created successfully. An OTP has been sent to your email.",
    };
  } catch (error) {
    console.error("Error creating user:", error);
    throw new HttpsError("unknown", "Failed to create user.", error.message);
  }
});