const { onDocumentCreated } = require("firebase-functions/v2/firestore"); // Import 2nd Gen trigger
const admin = require("firebase-admin");
const { logger } = require("firebase-functions");

// Use the new onDocumentCreated trigger syntax
exports.handler = onDocumentCreated("users/{followedId}/followers/{followerId}", async (event) => {
    
    // The context parameters are now available in event.params
    const followedId = event.params.followedId;
    const followerId = event.params.followerId;

    logger.info(`User ${followerId} started following ${followedId}. Creating notification.`);

    const db = admin.firestore();

    try {
        const followerDoc = await db.collection("users").doc(followerId).get();
        if (!followerDoc.exists) {
            logger.error(`Follower user document ${followerId} not found.`);
            return null;
        }
        const followerData = followerDoc.data();
        const followerUsername = followerData.username || "A user";
        const followerProfilePic = followerData.profilePicUrl || null;

        const notificationData = {
            type: "new follower",
            message: `${followerUsername} started following you.`,
            link: { type: 'profile', id: followerId },
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            senderId: followerId,
            senderProfilePicUrl: followerProfilePic,
            storyCoverImageUrl: null,
        };
      
        await db.collection("users").doc(followedId).collection("notifications").add(notificationData);
      
        logger.info(`Successfully created 'new follower' notification for user ${followedId}.`);
        return null;

    } catch (error) {
        logger.error(`Failed to create 'new follower' notification for ${followedId}:`, error);
        return null;
    }
});