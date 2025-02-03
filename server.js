const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from the public directory

// Endpoint to fetch recipes by ingredients
app.post('/api/recipes/ingredients', async (req, res) => {
    const { ingredients } = req.body;
    const recipes = [];

    for (const ingredient of ingredients) {
        const snapshot = await db.collection('recipes').where('ingredients', 'array-contains', ingredient).get();
        snapshot.forEach(doc => {
            recipes.push(doc.data());
        });
    }

    res.json(recipes);
});

// Endpoint to fetch recipe by dish name
app.get('/api/recipes/dish/:name', async (req, res) => {
    const dishName = req.params.name;
    const snapshot = await db.collection('recipes').where('name', '==', dishName).get();
    const recipes = snapshot.docs.map(doc => doc.data());

    res.json(recipes.length > 0 ? recipes[0] : { message: 'Recipe not found' });
});

// Endpoint to fetch a random recipe
app.get('/api/recipes/random', async (req, res) => {
    const snapshot = await db.collection('recipes').get();
    const recipes = snapshot.docs.map(doc => doc.data());
    const randomRecipe = recipes[Math.floor(Math.random() * recipes.length)];

    res.json(randomRecipe);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
