const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { logger } = require("firebase-functions");

// A callable function that the app will invoke
exports.handler = functions.https.onCall(async (data, context) => {
  // 1. Check if the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to do that."
    );
  }

  // 2. Validate the incoming data
  const { storyId, chapterId } = data;
  if (!storyId || !chapterId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with 'storyId' and 'chapterId'."
    );
  }

  logger.info(`Incrementing read count for story ${storyId}, chapter ${chapterId}`);

  const db = admin.firestore();
  const storyDocRef = db.collection("stories").doc(storyId);
  const chapterDocRef = storyDocRef.collection("chapters").doc(chapterId);

  try {
    // 3. Use a batch write to update both documents atomically
    const batch = db.batch();

    // Increment the story's total read count
    batch.update(storyDocRef, { 'readCount': admin.firestore.FieldValue.increment(1) });

    // Increment the specific chapter's read count
    batch.update(chapterDocRef, { 'readCount': admin.firestore.FieldValue.increment(1) });

    await batch.commit();

    return { success: true, message: "Read counts updated." };
  } catch (error) {
    logger.error(`Failed to increment read counts for story ${storyId}:`, error);
    throw new functions.https.HttpsError(
      "internal",
      "An error occurred while updating read counts."
    );
  }
});