
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore"); // Import FieldValue

exports.handler = onCall(async (request) => {
  const { uid, otp } = request.data;
  const auth = getAuth();
  const db = getFirestore();

  if (!uid || !otp) {
    throw new HttpsError("invalid-argument", "UID and OTP are required.");
  }

  try {
    const userDocRef = db.collection("users").doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found.");
    }

    const userData = userDoc.data();

    // Check if OTP is correct and not expired
    if (userData.verificationOtp !== otp) {
      throw new HttpsError("invalid-argument", "Invalid OTP.");
    }
    if (userData.otpExpiration.toMillis() < Date.now()) {
      throw new HttpsError("deadline-exceeded", "OTP has expired.");
    }

    // --- SUCCESS ---
    // 1. Mark user as email verified in Firebase Auth
    await auth.updateUser(uid, { emailVerified: true });

    // 2. Remove OTP fields from Firestore document
    await userDocRef.update({
      verificationOtp: FieldValue.delete(),
      otpExpiration: FieldValue.delete(),
    });

    return { message: "Email verified successfully!" };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    if (error instanceof HttpsError) {
      throw error; // Re-throw HttpsError so client gets specific message
    }
    throw new HttpsError("unknown", "Failed to verify OTP.", error.message);
  }
});