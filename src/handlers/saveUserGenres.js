const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");

exports.handler = onCall(async (request) => {

 const { uid, genres } = request.data;
  const db = getFirestore();

if (!uid || !genres || genres.length < 3) {
    throw new HttpsError(
      "invalid-argument",
      "UID and at least 3 genres are required.",
    );
  }

 try {
    const userDocRef = db.collection("users").doc(uid);
    await userDocRef.update({ favoriteGenres: genres });
    return { message: "Genres saved successfully." };
  } catch (error) {
    console.error("Error saving genres:", error);
    throw new HttpsError("unknown", "Failed to save genres.", error.message);
  }
});