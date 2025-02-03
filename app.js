// Frontend JavaScript for Recipe Finder

document.getElementById('findByIngredients').addEventListener('click', async () => {
    const ingredients = document.getElementById('ingredientInput').value.split(',').map(ing => ing.trim());
    const recipes = await fetchRecipesByIngredients(ingredients);
    displayResults(recipes);
});

document.getElementById('findByDish').addEventListener('click', async () => {
    const dishName = document.getElementById('dishInput').value;
    const recipe = await fetchRecipeByDish(dishName);
    displayResults([recipe]);
});

document.getElementById('randomRecipe').addEventListener('click', async () => {
    const recipe = await fetchRandomRecipe();
    displayResults([recipe]);
});

async function fetchRecipesByIngredients(ingredients) {
    const response = await fetch('/api/recipes/ingredients', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingredients }),
    });
    return response.json();
}

async function fetchRecipeByDish(dishName) {
    const response = await fetch(`/api/recipes/dish/${dishName}`);
    return response.json();
}

async function fetchRandomRecipe() {
    const response = await fetch('/api/recipes/random');
    return response.json();
}

function displayResults(recipes) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';
    recipes.forEach(recipe => {
        const recipeElement = document.createElement('div');
        recipeElement.innerHTML = `<h3>${recipe.name}</h3><p>${recipe.instructions}</p>`;
        resultsDiv.appendChild(recipeElement);
    });
}
