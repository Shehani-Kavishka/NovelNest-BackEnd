// functions/handlers/searchNovels.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();

exports.handler = functions.https.onCall(async (data, context) => {
  const { query, category } = data;

  try {
    let novelsRef = db.collection("novels");

    if(query) {
      const lowerCaseQuery = query.toLowerCase();
      novelsRef = novelsRef 
      .where("title", ">=", query)
        .where("title", "<=", query + '\uf8ff');
    }

    if(category){
      novelsRef = novelsRef.where("genre","==",category);
    }

    novelsRef = novelsRef.limit(20);

    const snapshot = await novelsRef.get();
    const hits = [];

    snapshot.forEach(doc => {
      hits.push({
        objectID:doc.id,
        ...doc.data()
      })
    })

    return hits;

  }

  catch (error) {
    console.error("Error searching Firestore:", error);
    throw new functions.https.HttpsError("internal", "Search failed: " + error.message);
  }
});