const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

exports.handler = onCall(async (request) => {
  // 1. Check for Authentication
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to create a story.",
    );
  }

  const db = getFirestore();
  const auth = getAuth();
  const uid = request.auth.uid;

  // 2. Get data from the frontend
  const { title, description, genre, tags } = request.data;

  // 3. Validate the input
  if (!title || !description || !genre) {
    throw new HttpsError(
      "invalid-argument",
      "Title, description, and genre are required.",
    );
  }

  try {
    // 4. Get the author's username from their Auth profile
    const userRecord = await auth.getUser(uid);
    const authorName = userRecord.displayName || "Unknown Author";

    // 5. Create a new document in the 'novels' collection
    const newNovelRef = db.collection("novels").doc(); // Let Firestore generate a unique ID

    const newNovelData = {
      novelId: newNovelRef.id,
      title: title,
      description: description,
      coverImageUrl: "", // Will be updated later after image upload
      status: "draft", // The story starts as a draft
      genre: genre,
      tags: tags || [], // Use the provided tags or an empty array
      publishedDate: null, // Not published yet
      lastUpdated: FieldValue.serverTimestamp(), // Set current server time
      authorId: uid,
      authorName: authorName,
      readCount: 0,
      ratingCount: 0,
      commentCount: 0,
    };

    // 6. Save the new novel document to Firestore
    await newNovelRef.set(newNovelData);

    // 7. Return the ID of the new novel to the frontend
    // This is important so the app knows which story to add chapters to
    return {
      novelId: newNovelRef.id,
      message: "Story draft created successfully.",
    };
  } catch (error) {
    console.error("Error creating story:", error);
    throw new HttpsError("unknown", "Failed to create story.", error.message);
  }
});