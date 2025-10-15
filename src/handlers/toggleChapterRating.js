const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { logger } = require("firebase-functions");

// A callable function to rate or un-rate a chapter
exports.handler = functions.https.onCall(async (data, context) => {
  // 1. Authentication Check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to rate a chapter."
    );
  }

  // 2. Data Validation
  const { storyId, chapterId } = data;
  if (!storyId || !chapterId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with 'storyId' and 'chapterId'."
    );
  }

  const uid = context.auth.uid;
  const db = admin.firestore();

  // Create references to the documents we need to modify
  const chapterDocRef = db.collection("stories").doc(storyId)
                        .collection("chapters").doc(chapterId);

  // A subcollection to track which users have rated this chapter
  const ratingDocRef = chapterDocRef.collection("ratings").doc(uid);

  logger.info(`Toggling rating for chapter ${chapterId} by user ${uid}`);

  // 3. Use a transaction to safely read and write data
  return db.runTransaction(async (transaction) => {
    const ratingDoc = await transaction.get(ratingDocRef);

    if (ratingDoc.exists) {
      // The user has already rated, so we are UN-RATING
      logger.info(`User ${uid} is un-rating chapter ${chapterId}.`);
      transaction.delete(ratingDocRef); // Remove their rating record
      
      // Decrement the rate count by 10
      transaction.update(chapterDocRef, { 'rateCount': admin.firestore.FieldValue.increment(-10) });
      
      return { rated: false }; // Return the new state

    } else {
      // The user has not rated yet, so we are RATING
      logger.info(`User ${uid} is rating chapter ${chapterId}.`);
      transaction.set(ratingDocRef, { ratedAt: admin.firestore.FieldValue.serverTimestamp() }); // Create their rating record
      
      // Increment the rate count by 10
      transaction.update(chapterDocRef, { 'rateCount': admin.firestore.FieldValue.increment(10) });

      return { rated: true }; // Return the new state
    }
  }).catch(error => {
    logger.error("Transaction failed:", error);
    throw new functions.https.HttpsError("internal", "Could not update rating.");
  });
});