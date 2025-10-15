const functions = require("firebase-functions");
const admin = require("firebase-admin");

exports.handler = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in.");
  }

  const { storyId } = data;
  if (!storyId) {
    throw new functions.https.HttpsError("invalid-argument", "A 'storyId' must be provided.");
  }

  const uid = context.auth.uid;
  const db = admin.firestore();
  const storyRef = db.collection("stories").doc(storyId);

  try {
    const storyDoc = await storyRef.get();
    if (!storyDoc.exists) {
      return { success: true, message: "Story already deleted." };
    }
    if (storyDoc.data().authorId !== uid) {
      throw new functions.https.HttpsError("permission-denied", "You are not the author of this story.");
    }

    // WARNING: This deletes the main document. Subcollections will become orphaned.
    // For a full cleanup, a 'Recursive Delete' Firebase Extension is recommended.
    await storyRef.delete();

    return { success: true, message: "Story has been deleted." };

  } catch (error) {
    console.error(`Error deleting story ${storyId}:`, error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", "Could not delete the story.");
  }
});