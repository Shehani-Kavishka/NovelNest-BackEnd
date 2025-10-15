// scripts/seed.js

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
// Path to your service account key
const serviceAccount = require('../serviceAccountKey.json');

// Path to your local images folder
const imagesFolderPath = path.join(__dirname, '..', 'assets');
// --- END CONFIGURATION ---


// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: `${serviceAccount.project_id}.firebasestorage.app` // Important for Storage
});

const db = admin.firestore();
const storage = admin.storage().bucket();
console.log('Firebase Admin SDK Initialized.');

// --- MOCK DATA ---
// Create some sample users (authors)
const users = [
    { uid: 'vcGibDxlpqWfC6keNxpnhCPwWnt1', username: 'Elara Vance', email: 'elara@example.com', favoriteGenres: ['Romance', 'Fantasy'] },
    { uid: 'gVya8tk0t5Oo0rhcvVwlJ3vIKtQ2', username: 'Liam Carter', email: 'liam@example.com', favoriteGenres: ['Mystery', 'Sci-Fi'] },
    { uid: 'wPDWo5LsUMZvH0gOCXlcYjqzNB42', username: 'Chloe Davis', email: 'chloe@example.com', favoriteGenres: ['Romance'] },
];

// --- MAIN SEEDING FUNCTION ---
async function seedDatabase() {
    console.log('Starting database seed process...');

    // Get a list of all your local image files
    const imageFiles = fs.readdirSync(imagesFolderPath).filter(file => 
        /\.(jpg|jpeg|png)$/i.test(file)
    );
    console.log(`Found ${imageFiles.length} images to use.`);

    // 1. Create User Documents
    console.log('\nCreating user documents...');
    for (const user of users) {
        await db.collection('users').doc(user.uid).set({
            uid: user.uid,
            email: user.email,
            username: user.username,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
            profilePicUrl: '', // You can add mock profile pics later
            role: ['author'],
            favoriteGenres: user.favoriteGenres,
            followerCount: 0,
            followingCount: 0,
        }, { merge: true });
        console.log(`- Created user: ${user.username}`);
    }

    // 2. Create Story and Chapter Documents
    console.log('\nCreating story and chapter documents...');
    for (let i = 0; i < imageFiles.length; i++) {
        const imageFileName = imageFiles[i];
        const storyTitle = path.parse(imageFileName).name.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const author = users[i % 2]; // Alternate between the two authors

        // --- Create the Story Document First ---
        const storyRef = db.collection('stories').doc();
        const storyId = storyRef.id;

        // --- Upload the Cover Image ---
        const filePath = path.join(imagesFolderPath, imageFileName);
        const destination = `stories/${storyId}/coverImage.jpg`;
        
        console.log(`- Uploading ${imageFileName} for story "${storyTitle}"...`);
        await storage.upload(filePath, { destination });
        const file = storage.file(destination);
        const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });

        // --- Now create the story document with the image URL ---
        const storyData = {
            storyId: storyId,
            storyTitle: storyTitle,
            description: `A captivating tale of ${storyTitle}.`,
            storyCoverImageUrl: url,
            status: (i % 3 === 0) ? 'completed' : 'ongoing', // Mix up statuses
            genre: author.favoriteGenres[0], // Use author's primary genre
            tags: ['popular', author.favoriteGenres[0].toLowerCase()],
            publishedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            authorId: author.uid,
            author: author.username,
            readCount: Math.floor(Math.random() * 50000),
            rateCount: Math.floor(Math.random() * 5000),
            commentCount: Math.floor(Math.random() * 500),
        };
        await storyRef.set(storyData);
        console.log(`  - Created story document for "${storyTitle}"`);
        
        // Create chapter count subcollection
        await storyRef.collection('chapter-count').doc('counts').set({
            published: 5,
            drafts: 0
        });

        // Create some sample chapters
        for (let j = 1; j <= 5; j++) {
            const chapterRef = storyRef.collection('chapters').doc();
            await chapterRef.set({
                chapterId: chapterRef.id,
                chapterTitle: `Chapter ${j}: The Beginning`,
                chapterNo: j,
                chapterContent: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
                chapterStatus: 'published',
                publishedAt: admin.firestore.FieldValue.serverTimestamp(),
                readCount: Math.floor(Math.random() * 10000),
                commentCount: Math.floor(Math.random() * 100),
                rateCount: Math.floor(Math.random() * 1000),
            });
        }
        console.log(`  - Added 5 sample chapters.`);

        // 3. Add some stories to a reader's library
        if (i < 3) { // Add the first 3 stories to the reader's library
            console.log(`  - Adding "${storyTitle}" to ${users[2].username}'s library.`);
            await db.collection('users').doc(users[2].uid).collection('library').doc(storyId).set({
                addedAt: admin.firestore.FieldValue.serverTimestamp(),
                storyTitle: storyData.storyTitle,
                storyCoverImageUrl: storyData.storyCoverImageUrl,
                author: storyData.author,
                readingStatus: 'reading'
            });
        }
    }

    console.log('\n✅ Database seeding completed successfully!');
}

// Run the main function
seedDatabase().catch(error => {
    console.error('Seeding failed:', error);
});