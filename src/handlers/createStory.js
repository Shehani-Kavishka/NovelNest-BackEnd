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
const { storyTitle, description, genre, tags } = request.data;

  // 3. Validate the input
  if (!storyTitle || !description || !genre) {
    throw new HttpsError(
      "invalid-argument",
      "Story title, description, and genre are required.",
    );
  }

  try {
    // 4. Get the author's username from their Auth profile
    const userRecord = await auth.getUser(uid);
    const authorName = userRecord.displayName || "Unknown Author";

    // 5. Create a new document in the 'novels' collection
 const newStoryRef = db.collection("stories").doc(); // Let Firestore generate a unique ID

 const newStoryData = {
      storyId: newStoryRef.id, // Field name from schema
      storyTitle: storyTitle, // Field name from schema
      description: description,
      storyCoverImageUrl: "", // Field name from schema (will be updated by another function)
      status: "draft",
      genre: genre,
      tags: tags || [],
      publishedAt: null, // Field name from schema
      lastUpdatedAt: FieldValue.serverTimestamp(), // Field name from schema
      authorId: uid, // Field name from schema
      author: authorName, // Field name from schema
      readCount: 0,
      rateCount: 0, // Field name from schema
      commentCount: 0,
    };

    // 6. Save the new story document to Firestore
    await newStoryRef.set(newStoryData);

    // 7. Return the ID of the new story to the frontend
    // This is important so the app knows which story to add chapters to
    return {
      storyId: newStoryRef.id,
      message: "Story draft created successfully.",
    };
  } catch (error) {
    console.error("Error creating story:", error);
    throw new HttpsError("unknown", "Failed to create story.", error.message);
  }
});