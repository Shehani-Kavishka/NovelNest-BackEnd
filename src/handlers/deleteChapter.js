const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { logger } = require("firebase-functions");

exports.handler = functions.https.onCall(async (data, context) => {
  // 1. Authentication Check
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
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

  const storyRef = db.collection("stories").doc(storyId);
  const chapterRef = storyRef.collection("chapters").doc(chapterId);
  const chapterCountRef = storyRef.collection("chapter-count").doc("counts");

  logger.info(`User ${uid} attempting to delete chapter ${chapterId} from story ${storyId}.`);

  try {
    // 3. Use a transaction to ensure all operations succeed or fail together
    return await db.runTransaction(async (transaction) => {
      const storyDoc = await transaction.get(storyRef);
      const chapterDoc = await transaction.get(chapterRef);

      // 4. Security and Existence Checks
      if (!storyDoc.exists) {
        throw new functions.https.HttpsError("not-found", "The specified story does not exist.");
      }
      if (storyDoc.data().authorId !== uid) {
        throw new functions.https.HttpsError("permission-denied", "You are not the author of this story.");
      }
      if (!chapterDoc.exists) {
        logger.warn(`Chapter ${chapterId} not found for deletion, but returning success.`);
        return { message: "Chapter already deleted." }; // Or throw an error if you prefer
      }
      
      const chapterStatus = chapterDoc.data().chapterStatus;

      // 5. Delete the chapter document
      transaction.delete(chapterRef);

      // 6. Atomically decrement the correct counter
      if (chapterStatus === 'published') {
        transaction.set(chapterCountRef, { published: admin.firestore.FieldValue.increment(-1) }, { merge: true });
      } else { // Assumes it must be a 'draft'
        transaction.set(chapterCountRef, { drafts: admin.firestore.FieldValue.increment(-1) }, { merge: true });
      }
      
      // Update the parent story's timestamp
      transaction.update(storyRef, { lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp() });

      return { message: "Chapter successfully deleted." };
    });

  } catch (error) {
    logger.error(`Error deleting chapter ${chapterId}:`, error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", "Could not delete the chapter.");
  }
});