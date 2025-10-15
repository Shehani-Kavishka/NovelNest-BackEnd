const { onDocumentUpdated } = require("firebase-functions/v2/firestore"); // Import 2nd Gen onUpdate trigger
const admin = require("firebase-admin");
const { logger } = require("firebase-functions");

// Use the new onDocumentUpdated trigger syntax
exports.handler = onDocumentUpdated("stories/{storyId}/chapters/{chapterId}", async (event) => {
    
    // In v2, the 'change' object is inside event.data
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    if (beforeData.chapterStatus === afterData.chapterStatus || afterData.chapterStatus !== 'published') {
        logger.log(`Chapter status did not change to 'published'. No notifications sent.`);
        return null;
    }

    const storyId = event.params.storyId;
    const chapterId = event.params.chapterId;
    const chapterTitle = afterData.chapterTitle;

    logger.info(`Chapter ${chapterId} was published for story ${storyId}. Sending notifications.`);

    const db = admin.firestore();
    
    try {
        const storyDoc = await db.collection("stories").doc(storyId).get();
        if (!storyDoc.exists) {
            logger.error(`Parent story ${storyId} not found.`);
            return null;
        }
        const storyData = storyDoc.data();
        const authorId = storyData.authorId;
        // ... (rest of the logic is exactly the same)

        const followersSnapshot = await db.collection("users").doc(authorId).collection("followers").get();
        if (followersSnapshot.empty) {
            logger.info(`Author ${authorId} has no followers. No notifications sent.`);
            return null;
        }
      
        const followerIds = followersSnapshot.docs.map(doc => doc.id);
        const batch = db.batch();
        followerIds.forEach(followerId => {
            const notificationRef = db.collection("users").doc(followerId).collection("notifications").doc();
            batch.set(notificationRef, {
                type: "new chapter",
                message: `${storyData.author} published a new chapter: "${chapterTitle}" for ${storyData.storyTitle}.`,
                link: { type: 'chapter', storyId: storyId, chapterId: chapterId },
                isRead: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                senderId: authorId,
                storyCoverImageUrl: storyData.storyCoverImageUrl,
            });
        });

        await batch.commit();
        logger.info(`Successfully sent ${followerIds.length} 'new chapter' notifications.`);
        return null;

    } catch (error) {
        logger.error(`Error sending 'new chapter' notifications for story ${storyId}:`, error);
        return null;
    }
});