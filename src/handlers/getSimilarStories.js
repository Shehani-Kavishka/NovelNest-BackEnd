const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();

exports.handler = functions.https.onCall(async (data, context) => {
    const { genre, currentNovelId } = data;

    if (!genre || !currentNovelId) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "genre" and "currentNovelId".');
    }

    try {
        const querySnapshot = await db.collection('Novels collection')
            .where('Status', '==', 'ongoing') // Or 'completed'
            .where('Genre', '==', genre)
            .where(admin.firestore.FieldPath.documentId(), '!=', currentNovelId) // Exclude the current novel
            .limit(4) // Get 4 similar stories
            .get();

        const similarStories = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return similarStories;

    } catch (error) {
        console.error("Error fetching similar stories:", error);
        throw new functions.https.HttpsError('internal', 'Unable to fetch similar stories.');
    }
});