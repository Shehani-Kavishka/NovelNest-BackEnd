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
   const { storyId, chapterTitle, chapterContent, status } = request.data;

  // 3. Validate input
  if (!storyId || !chapterTitle || !chapterContent || !status) {
    throw new HttpsError(
      "invalid-argument",
      "Story ID, chapter title, chapter content, and status are required.",
    );
  }
  if (status !== 'published' && status !== 'draft') {
      throw new HttpsError("invalid-argument", "Status must be either 'published' or 'draft'.");
  }

  try {
    const storyRef = db.collection("stories").doc(storyId);
     return await db.runTransaction(async (transaction) => {
      const storyDoc = await transaction.get(storyRef);
    // 4. Verify that the story exists and the user is the author
    if (!storyDoc.exists) {
      throw new HttpsError("not-found", "The specified story does not exist.");
    }
    if (storyDoc.data().authorId !== uid) {
      throw new HttpsError(
        "permission-denied",
        "You are not the author of this story.",
      );
    }

    // Get the next chapter number from the chapter-count sub-collection for accuracy
      const chapterCountRef = storyRef.collection("chapter-count").doc("counts");
      const chapterCountDoc = await transaction.get(chapterCountRef);
      let draftsCount = 0;
      let publishedCount = 0;
      if (chapterCountDoc.exists) {
          draftsCount = chapterCountDoc.data().drafts || 0;
          publishedCount = chapterCountDoc.data().published || 0;
      }
      const newChapterNumber = draftsCount + publishedCount + 1;


      const chapterRef = storyRef.collection("chapters").doc();
      
      const newChapterData = {
        chapterId: chapterRef.id,
        chapterTitle: chapterTitle,
        chapterNo: newChapterNumber,
        chapterContent: chapterContent,
        chapterStatus: status,
        publishedAt: status === 'published' ? FieldValue.serverTimestamp() : null,
        readCount: 0,
        commentCount: 0,
        rateCount: 0,
      };

      transaction.set(chapterRef, newChapterData);

      // Also update the lastUpdated timestamp on the parent story
      transaction.update(storyRef, { lastUpdated: FieldValue.serverTimestamp() });

      if (status === 'published') {
        transaction.set(chapterCountRef, { published: FieldValue.increment(1) }, { merge: true });
      }
      else
      {
        transaction.set(chapterCountRef, { drafts: FieldValue.increment(1) }, { merge: true });
      }
      return {
        chapterId: chapterRef.id,
        message: `Chapter added successfully as ${status}.`,
      };
    });

  } catch (error) {
    console.error("Error adding chapter:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("unknown", "Failed to add chapter.", error.message);
  }
});