const admin = require("firebase-admin");

admin.initializeApp();

const { handler: registerUserHandler } = require("./handlers/registerUser");
const { handler: saveUserGenresHandler } = require("./handlers/saveUserGenres");
const { handler: verifyOtpHandler } = require("./handlers/verifyOtp");
const { handler: createStoryHandler } = require("./handlers/createStory")
const { handler : addChapterHandler } = require("./handlers/addChapter")
const { handler: getSimilarStoriesHandler } = require("./handlers/getSimilarStories");
const { handler: searchNovelsHandler } = require("./handlers/searchNovels");
const { handler: deleteUserAccountHandler } = require("./handlers/deleteUserAccount"); 
const { handler: updateCommentCountHandler } = require("./handlers/updateCommentCount");
const { handler: incrementReadCountHandler } = require("./handlers/incrementReadCount");
const { handler: toggleChapterRatingHandler } = require("./handlers/toggleChapterRating");
const { handler: getHomeScreenDataHandler } = require("./handlers/getHomeScreenData");
const { handler: deleteChapterHandler } = require("./handlers/deleteChapter");
const {handler: deleteStoryHandler} = require("./handlers/deleteStory");
const {handler: hideStoryHandler} = require("./handlers/hideStory");

const {handler: onNewFollowerHandler} = require("./handlers/onNewFollower");
const {handler: onNewChapterPublishedHandler} = require("./handlers/onNewChapterPublished");

exports.user = {
  register: registerUserHandler,
  saveGenres: saveUserGenresHandler,
  verifyOtp: verifyOtpHandler,
  deleteAccount: deleteUserAccountHandler,
};

exports.story = {
  create: createStoryHandler,
  addChapter: addChapterHandler,
  getSimilar: getSimilarStoriesHandler,
  search: searchNovelsHandler,
  incrementReadCount: incrementReadCountHandler,
  toggleChapterRating: toggleChapterRatingHandler,
  getHomeScreenData: getHomeScreenDataHandler,
  deleteChapter: deleteChapterHandler,
  hide: hideStoryHandler,
  delete: deleteStoryHandler,
};

exports.onCommentCreated = updateCommentCountHandler;
exports.onNewFollower = onNewFollowerHandler;
exports.onNewChapterPublished = onNewChapterPublishedHandler;

