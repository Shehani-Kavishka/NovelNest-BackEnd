const functions = require("firebase-functions");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { logger } = require("firebase-functions");

// This function TRIGGERS when a new document is created in any 'Comments sub collection'.
exports.handler = onDocumentCreated(
  "stories/{storyId}/chapters/{chapterId}/comments/{commentId}",
  async (event) => {
    const { storyId } = event.params;
    logger.info(`New comment added. Incrementing count for story: ${storyId}`);

    const storyDocRef = admin.firestore().collection("stories").doc(storyId);

    try {
      // Use FieldValue.increment to safely and atomically update the counter.
      await storyDocRef.update({
        "comment-count": admin.firestore.FieldValue.increment(1),
      });
      logger.info(
        `Successfully incremented comment count for story: ${storyId}`
      );
    } catch (error) {
      logger.error(
        `Failed to increment comment count for story: ${storyId}`,
        error
      );
    }
  });
