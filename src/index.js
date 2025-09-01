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
};
