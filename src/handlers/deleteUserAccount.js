const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { logger } = require("firebase-functions");

// This function is designed to be called from the client
exports.handler = functions.https.onCall(async (data, context) => {
  // 1. Authentication Check: Ensure a user is logged in.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to delete an account."
    );
  }

  const uid = context.auth.uid;
  const db = admin.firestore();

  const userDocRef = db.collection("users").doc(uid);
  const deletedUserDocRef = db.collection("deleted-users").doc(uid);

  logger.info(`Attempting to delete account for user: ${uid}`);

  try {
    // 2. Use a transaction to safely move the document
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userDocRef);

      if (!userDoc.exists) {
        logger.warn(`User document for ${uid} not found, but proceeding with auth deletion.`);
        return; // Nothing to move
      }

      // Get the user's data
      const userData = userDoc.data();

      // 3. Create the new document in 'deleted-users' with the deletion timestamp
      transaction.set(deletedUserDocRef, {
        ...userData,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 4. Delete the original document from the 'users' collection
      transaction.delete(userDocRef);
    });

    logger.info(`Successfully moved Firestore data for user: ${uid}`);
    return { success: true, message: "User data has been successfully archived." };

  } catch (error) {
    logger.error(`Error deleting user account for ${uid}:`, error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to delete user data. Please try again."
    );
  }
});