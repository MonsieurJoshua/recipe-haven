const admin = require("firebase-admin");
const csv = require("csvtojson");
const fs = require("fs");

// Initialize Firebase Admin SDK
const serviceAccount = require("./serviceAccountKey.json"); // Download this from Firebase Console
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Convert CSV to JSON and upload to Firestore
const BATCH_SIZE = 500; // Set a batch size limit

async function uploadCSV() {
  const jsonArray = await csv().fromFile("C:/Users/joshu/Desktop/recipehaven/data.csv");

  const collectionRef = db.collection("recipes");
  let batch = db.batch();
  let count = 0;

  jsonArray.forEach((data) => {
    const docRef = collectionRef.doc(); // Auto-generate document ID
    batch.set(docRef, data);
    count++;

    // Commit the batch if it reaches the specified size
    if (count === BATCH_SIZE) {
      batch.commit();
      batch = db.batch(); // Start a new batch
      count = 0; // Reset count
    }
  });

  // Commit any remaining documents in the last batch
  if (count > 0) {
    await batch.commit();
  }

  console.log("CSV data uploaded to Firestore!");
}

uploadCSV().catch(console.error);
