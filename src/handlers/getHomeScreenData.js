const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {logger} = require("firebase-functions");
const { Query } = require("firebase-admin/firestore");

const getStoriesFromQuery = async(Query, limit=10) => {
    const snapshot = await Query.limit(limit).get();
    return snapshot.docs.map(doc => ({storyId: doc.id, ...doc.data()}));
}

exports.handler = functions.https.onCall(async (data, context) => {
    // 1. Check for authentication
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'You must be logged in to get home screen data.'
        );
    }

    const uid = context.auth.uid;
    const db = admin.firestore();
    const homeScreenData = {};

    try{
        // 2. fetch the user's document
        const userDocRef = db.collection('users').doc(uid);
        const userDoc = await userDocRef.get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError(
                'not-found',
                'User document does not exist.'
            );
        }
        const userData = userDoc.data();
        homeScreenData.userProfilePicUrl = userData.profilePicUrl || null;

        // Your Reading List section
        const libraryRef = userDocRef.collection('library')
        const readingQuery = libraryRef.where('readingStatus', '==', 'reading').limit(5);
        const readingSnapshot = await readingQuery.get();

        if (!readingSnapshot.empty) {
            homeScreenData.readingList = await Promise.all(readingSnapshot.docs.map(async (libDoc) => {
                const libData = libDoc.data();
                const storyDoc = await db.collection('stories').doc(libData.storyId).get();
                if (!storyDoc.exists) return null;

                // calculate progress
                const chapterCountRef = storyDoc.ref.collection('chapter-count').doc('counts');
                const chapterCountSnap = await chapterCountRef.get();
                const totalChapters = chapterCountSnap.exists ? (chapterCountSnap.data().published || 0) : 0;

                let chaptersLeft = totalChapters;
                let progress = 0;

                if(totalChapters > 0 && libData.lastReadChapterNo){
                    chaptersLeft = totalChapters - libData.lastReadChapterNo;
                    progress = (libData.lastReadChapterNo / totalChapters) * 100;
                }

                return{
                    storyId: storyDoc.id,
                    storyTitle: storyDoc.data().storyTitle,
                    storyCoverImageUrl: storyDoc.data().storyCoverImageUrl,
                    chaptersLeft: chaptersLeft,
                    progress: progress
                }
            }))
            homeScreenData.readingList = homeScreenData.readingList.filter(item => item !== null);
        }

        // popular stories section

        const popularQuery = db.collection('stories').orderBy('readCount', 'desc');
        homeScreenData.popular = await getStoriesFromQuery(popularQuery);

        // Must Read section and top stories by favourite genre 
        if(userData.favouriteGenres && userData.favouriteGenres.length > 0){
            homeScreenData.topStoriesByGenre = {};
            const genrePromises = userData.favouriteGenres.map(async (genre) => {
                const genreQuery = db.collection('stories').where('genres', '==', genre).orderBy('rateCount', 'desc');
                const stories = await getStoriesFromQuery(genreQuery,4);
                
                return { genre, stories };
            });
            const genreResults = await Promise.all(genrePromises);
            genreResults.forEach(result => {
                homeScreenData.topStoriesByGenre[result.genre] = result.stories;
            })
    }

    // by authors you follow section
        const followingRef = userDocRef.collection('following');
        const followingSnapshot = await followingRef.limit(10).get(); // Limit to 10 followed authors
        if (!followingSnapshot.empty) {
            const followedAuthorIds = followingSnapshot.docs.map(doc => doc.id);
            const authorsYouLoveQuery = db.collection('stories')
                .where('authorId', 'in', followedAuthorIds)
                .orderBy('lastUpdatedAt', 'desc');
            homeScreenData.authorsYouLove = await getStoriesFromQuery(authorsYouLoveQuery);
        }

        // since your enjoyed section
        if (homeScreenData.readingList && homeScreenData.readingList.length > 0) {
            // Let's base this on the first story in their reading list
            const sourceStoryId = homeScreenData.readingList[0].storyId;
            const sourceStoryDoc = await db.collection('stories').doc(sourceStoryId).get();
            if (sourceStoryDoc.exists()) {
                const sourceStoryData = sourceStoryDoc.data();
                const sourceGenre = sourceStoryData.genre;
                
                const similarGenreQuery = db.collection('stories')
                    .where('genre', '==', sourceGenre)
                    .orderBy('rateCount', 'desc');
                
                let similarStories = await getStoriesFromQuery(similarGenreQuery, 5);
                // Filter out the story they are already reading
                similarStories = similarStories.filter(story => story.storyId !== sourceStoryId);
                
                homeScreenData.sinceYouEnjoyed = {
                    title: sourceStoryData.storyTitle,
                    stories: similarStories,
                };
            }
        }

        // explore different genres section
        
const userGenres = userData.favoriteGenres || [];
        const allGenresSnapshot = await db.collection('genres').get(); // Assumes you have a 'genres' collection
        if (!allGenresSnapshot.empty) {
            const allGenres = allGenresSnapshot.docs.map(doc => doc.id);
            const availableGenres = allGenres.filter(genre => !userGenres.includes(genre));
            
            if (availableGenres.length > 0) {
                // Pick a random genre from the available list
                const randomGenre = availableGenres[Math.floor(Math.random() * availableGenres.length)];
                
                const exploreQuery = db.collection('stories')
                    .where('genre', '==', randomGenre)
                    .orderBy('rateCount', 'desc');
                
                homeScreenData.exploreGenre = {
                    genre: randomGenre,
                    stories: await getStoriesFromQuery(exploreQuery),
                };
            }
        }

    return homeScreenData;
    } catch (error) {
        logger.error("Error fetching home screen data:", error);
        throw new functions.https.HttpsError(
            'internal',
            'Unable to fetch home screen data.'
        );
    }
});