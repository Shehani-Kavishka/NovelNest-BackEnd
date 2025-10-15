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
      throw new functions.https.HttpsError("not-found", "Story not found.");
    }
    if (storyDoc.data().authorId !== uid) {
      throw new functions.https.HttpsError("permission-denied", "You are not the author of this story.");
    }

    const currentStatus = storyDoc.data().status;
    // We assume that if it's hidden, we want to un-hide it.
    // We'll restore it to 'ongoing' as a safe default.
    const newStatus = currentStatus === 'hidden' ? 'ongoing' : 'hidden';

    await storyRef.update({ status: newStatus });

    return { success: true, message: `Story status updated to ${newStatus}.` };

  } catch (error) {
    console.error(`Error toggling story visibility for ${storyId}:`, error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError("internal", "Could not update story status.");
  }
});