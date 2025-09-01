const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

exports.handler = onCall(async (request) => {
  // 1. Check for authentication
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to add a chapter.",
    );
  }

  const db = getFirestore();
  const uid = request.auth.uid;

  // 2. Get data from the frontend
  const { novelId, title, content } = request.data;

  // 3. Validate input
  if (!novelId || !title || !content) {
    throw new HttpsError(
      "invalid-argument",
      "Novel ID, title, and content are required.",
    );
  }

  try {
    const novelRef = db.collection("novels").doc(novelId);
    const novelDoc = await novelRef.get();

    // 4. Verify that the novel exists and the user is the author
    if (!novelDoc.exists) {
      throw new HttpsError("not-found", "The specified novel does not exist.");
    }
    if (novelDoc.data().authorId !== uid) {
      throw new HttpsError(
        "permission-denied",
        "You are not the author of this novel.",
      );
    }

    // --- Transaction to safely get the next chapter number ---
    const newChapterRef = await db.runTransaction(async (transaction) => {
      const chaptersSubcollectionRef = novelRef.collection("Chapters");
      
      // Get the current count of chapters to determine the new chapter number
      const chaptersSnapshot = await transaction.get(chaptersSubcollectionRef);
      const newChapterNumber = chaptersSnapshot.size + 1;

      // Create a new chapter document reference
      const chapterRef = chaptersSubcollectionRef.doc(); // Auto-generate chapterId
      
      const newChapterData = {
        chapterId: chapterRef.id,
        chapterTitle: title,
        chapterNumber: newChapterNumber,
        chapterContent: content,
        status: "draft", // New chapters are always drafts first
        publishedDate: null,
        readCount: 0,
        commentCount: 0,
        rateCount: 0,
      };

      transaction.set(chapterRef, newChapterData);
      
      // Also update the lastUpdated timestamp on the parent novel
      transaction.update(novelRef, { lastUpdated: FieldValue.serverTimestamp() });

      return chapterRef;
    });

    // 6. Return the ID of the new chapter
    return {
      chapterId: newChapterRef.id,
      message: "Chapter draft saved successfully.",
    };
  } catch (error) {
    console.error("Error adding chapter:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("unknown", "Failed to add chapter.", error.message);
  }
});