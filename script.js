// Login button functionality (only for pages with login button)
if (document.getElementById('loginBtn')) {
    document.addEventListener('DOMContentLoaded', () => {
        const loginBtn = document.getElementById('loginBtn');
        loginBtn.addEventListener('click', () => {
            console.log('Login button clicked');
            window.location.href = 'login.html';
        });
    });
}

if (document.getElementById('suggestDishLink')) {
    document.addEventListener('DOMContentLoaded', () => {
        const suggestDishLink = document.getElementById('suggestDishLink');
        suggestDishLink.addEventListener('click', () => {
            console.log('Suggest-Dish button clicked');
            window.location.href = 'suggest.html';
        });
    });
}

// Cache management with size limits
const CACHE_KEY = 'recipeHavenData';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const imageCache = new Map();

// Load the dataset with caching
let recipes = [];
let recipesPromise = null;

// Modify fetchRecipes to handle storage limits
async function fetchRecipes() {
    try {
        // Try to get cached data
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
            const { data, timestamp } = JSON.parse(cachedData);
            if (Date.now() - timestamp < CACHE_DURATION) {
                recipes = data;
                setTimeout(() => preloadImages(recipes), 0);
                return recipes;
            }
            localStorage.removeItem(CACHE_KEY); // Clear expired cache
        }

        // Fetch fresh data if no cache or expired
        if (!recipesPromise) {
            recipesPromise = fetch('Food Ingredients and Recipe Dataset with Image Name Mapping.json')
                .then(response => response.json())
                .then(data => {
                    recipes = data.results;
                    // Try to cache with error handling
                    try {
                        // Store only essential data
                        const minimalData = recipes.map(recipe => ({
                            Title: recipe.Title,
                            Image_Name: recipe.Image_Name,
                            Ingredients: recipe.Ingredients,
                            Instructions: recipe.Instructions
                        }));
                        
                        localStorage.setItem(CACHE_KEY, JSON.stringify({
                            data: minimalData,
                            timestamp: Date.now()
                        }));
                    } catch (storageError) {
                        console.warn('Cache storage failed:', storageError);
                        // Clear old cache to make space
                        clearOldCache();
                    }
                    
                    setTimeout(() => preloadImages(recipes), 0);
                    return recipes;
                })
                .catch(error => {
                    console.error('Failed to load recipes:', error);
                    recipesPromise = null;
                    return [];
                });
        }
        return recipesPromise;
    } catch (error) {
        console.error('Error in fetchRecipes:', error);
        return [];
    }
}

// Helper function to clear old cache entries
function clearOldCache() {
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('recipeHaven')) {
                localStorage.removeItem(key);
            }
        }
    } catch (error) {
        console.warn('Error clearing cache:', error);
    }
}

// Helper function to handle image paths and fallbacks
function getImagePath(imageName) {
    try {
        if (!imageName) return 'placeholder.jpg';
        
        // Clean up the image name and ensure proper path
        const cleanName = imageName.split('.')[0].toLowerCase().trim();
        const path = `Food Images/${cleanName}.jpg`;
        
        // Test if image exists
        const img = new Image();
        img.src = path;
        img.onerror = () => img.src = 'placeholder.jpg';
        
        return path;
    } catch (error) {
        console.error('Error getting image path:', error);
        return 'placeholder.jpg';
    }
}

// Simplified image preloading
function preloadImages(recipes) {
    if (!recipes || !Array.isArray(recipes)) return;
    
    const preloadCount = Math.min(recipes.length, 8);
    for (let i = 0; i < preloadCount; i++) {
        if (recipes[i] && recipes[i].Image_Name) {
            const img = new Image();
            img.src = getImagePath(recipes[i].Image_Name);
        }
    }
}

// Add image loading optimization
const imageLoadQueue = new Set();
const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
                loadImage(img);
            }
        }
    });
}, { rootMargin: '50px' });

function loadImage(img) {
    if (imageLoadQueue.has(img.dataset.src)) return;
    
    imageLoadQueue.add(img.dataset.src);
    
    const tempImage = new Image();
    tempImage.onload = () => {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        imageLoadQueue.delete(img.dataset.src);
        img.parentElement.classList.add('loaded');
    };
    tempImage.src = img.dataset.src;
}

// Updated recipe card generation
function generateRecipeCard(recipe) {
    const isSuggestPage = window.location.pathname.includes('suggest.html');
    const imagePath = getImagePath(recipe.Image_Name);
    
    return `
        <div class="recipe-card${isSuggestPage ? ' single-card' : ''}"${!isSuggestPage ? ' onclick="toggleRecipeDetails(this)"' : ''}>
            <div class="recipe-card-preview">
                <div class="image-container">
                    <div class="loading-spinner"></div>
                    <img src="${imagePath}" 
                         alt="${recipe.Title}" 
                         class="recipe-image"
                         loading="${isSuggestPage ? 'eager' : 'lazy'}"
                         decoding="async"
                         onerror="this.src='placeholder.jpg'; this.parentElement.classList.add('loaded')"
                         onload="this.parentElement.classList.add('loaded')"
                         width="400"
                         height="300">
                </div>
                <h2>${recipe.Title}</h2>
                ${!isSuggestPage ? '<div class="expand-icon">✕</div>' : ''}
            </div>
            <div class="recipe-details">
                <h3>Ingredients:</h3>
                <p>${convertToBulletPoints(recipe.Ingredients)}</p>
                <h3>Instructions:</h3>
                <p>${convertInstructionsToBullets(recipe.Instructions)}</p>
            </div>
        </div>
    `;
}

// Remove the IntersectionObserver as we're using native lazy loading
function displayResults(results) {
    const resultsDiv = document.getElementById('results');
    if (!resultsDiv) return;
    
    if (!results || results.length === 0) {
        resultsDiv.innerHTML = `
            <div class="recipe-card">
                <h2>No recipes found</h2>
                <p>Try different search terms or check your spelling.</p>
            </div>
        `;
        return;
    }
    
    resultsDiv.innerHTML = results.map(recipe => generateRecipeCard(recipe)).join('');
    
    // Initialize image observers
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Update the convertToBulletPoints function
function convertToBulletPoints(ingredients) {
    if (!ingredients) {
        return 'Ingredients not available for this recipe.';
    }
    
    try {
        // If ingredients is a string
        if (typeof ingredients === 'string') {
            // First, preserve both single and double quoted phrases
            let quotedPhrases = [];
            let processedIngredients = ingredients
                // Handle double quotes first
                .replace(/"([^"]*)"/g, (match, group) => {
                    quotedPhrases.push(group);
                    return `{{QUOTE${quotedPhrases.length - 1}}}`;
                })
                // Then handle single quotes
                .replace(/'([^']*)'/g, (match, group) => {
                    quotedPhrases.push(group);
                    return `{{QUOTE${quotedPhrases.length - 1}}}`;
                });
            
            let cleanIngredients = processedIngredients
                .replace(/[\[\]]/g, '') // Remove brackets but keep single quotes for later processing
                .split(',') // Split by commas
                .map(ingredient => ingredient.trim())
                .filter(item => item.length > 0)
                .map(item => {
                    // Restore quoted phrases
                    return item.replace(/{{QUOTE(\d+)}}/g, (match, index) => {
                        return quotedPhrases[parseInt(index)];
                    });
                })
                .filter(item => item.length > 0)
                .map(item => `<span class="bullet">•</span> ${item}`)
                .join('<br>');
            
            return cleanIngredients;
        }
        
        // If ingredients is an array
        if (Array.isArray(ingredients)) {
            return ingredients
                .map(ingredient => {
                    if (typeof ingredient === 'string') {
                        // Handle both single and double quoted phrases in array items
                        let quotedPhrases = [];
                        let processed = ingredient
                            // Handle double quotes
                            .replace(/"([^"]*)"/g, (match, group) => {
                                quotedPhrases.push(group);
                                return `{{QUOTE${quotedPhrases.length - 1}}}`;
                            })
                            // Handle single quotes
                            .replace(/'([^']*)'/g, (match, group) => {
                                quotedPhrases.push(group);
                                return `{{QUOTE${quotedPhrases.length - 1}}}`;
                            });
                        
                        processed = processed
                            .replace(/[\[\]]/g, '')
                            .trim();
                            
                        processed = processed.replace(/{{QUOTE(\d+)}}/g, (match, index) => {
                            return quotedPhrases[parseInt(index)];
                        });
                        
                        return `<span class="bullet">•</span> ${processed}`;
                    }
                    const ingredientText = ingredient.original || 
                                         ingredient.originalString || 
                                         ingredient.originalName || 
                                         ingredient.name || 
                                         'Unknown ingredient';
                    return `<span class="bullet">•</span> ${ingredientText}`;
                })
                .join('<br>');
        }
        
        return 'Ingredients format not supported.';
    } catch (error) {
        console.error('Error formatting ingredients:', error);
        return 'Error displaying ingredients. Please try another recipe.';
    }
}

// Helper function to format instructions
function convertInstructionsToBullets(instructions) {
    if (!instructions) {
        return 'Instructions not available for this recipe.';
    }
    
    try {
        // If instructions is a string
        if (typeof instructions === 'string') {
            return instructions
                .split('.')
                .map(step => step.trim())
                .filter(step => step.length > 0)
                .map((step, index) => `<span class="number">${index + 1}.</span> ${step}`)
                .join('<br>');
        }
        
        // If instructions is an array
        if (Array.isArray(instructions)) {
            return instructions
                .map((step, index) => {
                    const stepText = typeof step === 'object' ? step.step : step;
                    return `<span class="number">${index + 1}.</span> ${stepText}`;
                })
                .join('<br>');
        }
        
        return 'Instructions format not supported.';
    } catch (error) {
        console.error('Error formatting instructions:', error);
        return 'Error displaying instructions. Please try another recipe.';
    }
}

// Update toggle function to ignore clicks on single cards
function toggleRecipeDetails(card) {
    // Don't toggle if it's a single card (on suggest page)
    if (card.classList.contains('single-card')) {
        return;
    }

    card.classList.toggle('expanded');
    
    if (card.classList.contains('expanded')) {
        document.body.style.overflow = 'hidden';
        document.body.classList.add('recipe-expanded');
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        document.body.style.overflow = '';
        document.body.classList.remove('recipe-expanded');
    }

    // Close when clicking outside or on close button
    if (card.classList.contains('expanded')) {
        document.addEventListener('click', function closeCard(e) {
            if (!card.contains(e.target) || e.target.closest('.expand-icon')) {
                card.classList.remove('expanded');
                document.body.style.overflow = '';
                document.body.classList.remove('recipe-expanded');
                document.removeEventListener('click', closeCard);
            }
        });
    }
}

// Find recipes by ingredients
async function findRecipesByIngredients() {
    try {
    const input = document.getElementById('ingredients').value.toLowerCase();
        if (!input) {
            alert('Please enter at least one ingredient');
            return;
        }

    const ingredientsList = input
        .split(',')
        .map(ingredient => ingredient.trim())
        .filter(ingredient => ingredient !== '');

    const recipes = await fetchRecipes();
    const results = recipes.filter(recipe => {
        const recipeIngredients = recipe.Ingredients.toLowerCase();
        return ingredientsList.every(ingredient => recipeIngredients.includes(ingredient));
    });

        if (results.length === 0) {
            showNoResults();
            return;
        }

        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = results.map(recipe => generateRecipeCard(recipe)).join('');
        resultsDiv.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error searching for recipes:', error);
        showError('Failed to search recipes');
    }
}

// Find recipes by name
async function findRecipeByName() {
    try {
        const input = document.getElementById('dish-name').value.toLowerCase().trim();
        if (!input) {
            alert('Please enter a dish name');
            return;
        }

    const recipes = await fetchRecipes();
    const results = recipes.filter(recipe =>
        recipe.Title.toLowerCase().includes(input)
    );

        if (results.length === 0) {
            showNoResults();
            return;
        }

        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = results.map(recipe => generateRecipeCard(recipe)).join('');
        resultsDiv.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error searching for recipes:', error);
        showError('Failed to search recipes');
    }
}

// Update suggestRandomRecipe function to not trigger expansion
async function suggestRandomRecipe() {
    try {
        const recipes = await fetchRecipes();
        const randomRecipe = recipes[Math.floor(Math.random() * recipes.length)];
        
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = generateRecipeCard(randomRecipe);
        resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        console.error('Error suggesting random recipe:', error);
        showError('Failed to load random recipe');
    }
}

// Helper functions for error handling
function showError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
        <div class="recipe-card error">
            <h2>Error</h2>
            <p>${message}. Please try again later.</p>
        </div>
    `;
}

function showNoResults() {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
        <div class="recipe-card">
            <h2>No recipes found</h2>
            <p>Try different search terms or check your spelling.</p>
        </div>
    `;
}

// Simple script to set the current year automatically in the footer
document.addEventListener("DOMContentLoaded", function() {
    const yearSpan = document.getElementById("current-year");
    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }
  });
  
// Simple script to confirm that your JavaScript is linked and working
document.addEventListener("DOMContentLoaded", function() {
    console.log("Page script loaded successfully!");
    
    // Example of a simple interaction (toggle grayscale on images when clicked)
    const images = document.querySelectorAll('img');
    if (images.length > 0) {
        images.forEach(img => {
            img.addEventListener('click', () => {
                if (img.style.filter === 'grayscale(100%)') {
                    img.style.filter = 'none';
                } else {
                    img.style.filter = 'grayscale(100%)';
                }
            });
        });
    }
});
  
// Add event listener for the Learn More button in aboutus.html
document.addEventListener('DOMContentLoaded', () => {
    const learnMoreBtn = document.querySelector('.au-learn');
    if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', () => {
            const detailsSection = document.querySelector('.details');
            if (detailsSection) {
                // Calculate scroll position to show just the top of the details section
                const position = detailsSection.offsetTop - 60; // Adjust the 50px offset as needed
                window.scrollTo({
                    top: position,
                    behavior: 'smooth'
                });
            }
        });
    }
});
  
// Attach the random recipe function to the button and link clicks
if (document.getElementById('randomRecipeBtn')) {
    document.getElementById('randomRecipeBtn').addEventListener('click', suggestRandomRecipe);
}

// Add event listeners when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // For dish name search
    const dishNameInput = document.getElementById('dish-name');
    if (dishNameInput) {
        dishNameInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                findRecipeByName();
            }
        });
    }

    // For ingredients search
    const ingredientsInput = document.getElementById('ingredients');
    if (ingredientsInput) {
        ingredientsInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                findRecipesByIngredients();
            }
        });
    }
});

function initializeDarkMode() {
    // Look for an existing dark mode toggle; create one if not found.
    let darkModeButton = document.querySelector('.dark-mode-toggle');
    if (!darkModeButton) {
      const nav = document.querySelector('.nav-links');
      if (nav) {
        darkModeButton = document.createElement('button');
        darkModeButton.className = 'dark-mode-toggle';
        darkModeButton.title = 'Toggle Dark Mode';
        // Optionally style the button via CSS rather than inline styles.
        nav.appendChild(darkModeButton);
      }
    }
    
    // Check localStorage for the saved mode and apply it.
    const darkMode = localStorage.getItem('darkMode') === 'enabled';
    applyDarkMode(darkMode);
    
    if (darkModeButton) {
      darkModeButton.textContent = darkMode ? '☀️' : '🌙';
      darkModeButton.addEventListener('click', () => {
        const newDarkMode = !document.documentElement.classList.contains('dark-mode');
        applyDarkMode(newDarkMode);
        darkModeButton.textContent = newDarkMode ? '☀️' : '🌙';
        localStorage.setItem('darkMode', newDarkMode ? 'enabled' : 'disabled');
      });
    }
  }
  
  function applyDarkMode(enable) {
    if (enable) {
      document.documentElement.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.body.classList.remove('dark-mode');
    }
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    initializeDarkMode();
  });
  

// Ensure dark mode is applied immediately when the page loads
(function() {
    const darkMode = localStorage.getItem('darkMode') === 'enabled';
    applyDarkMode(darkMode);
})();

// Authentication Functions

// Email validation function
function isValidEmail(email) {
    // Regular expression for email validation
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    // List of allowed email domains
    const allowedDomains = [
        'gmail.com',
        'yahoo.com',
        'outlook.com',
        'hotmail.com',
        'icloud.com',
        'aol.com',
        'protonmail.com',
        'zoho.com'
        // Add more domains as needed
    ];

    if (!emailRegex.test(email)) {
        return {
            isValid: false,
            message: 'Please enter a valid email address'
        };
    }

    const domain = email.split('@')[1].toLowerCase();
    if (!allowedDomains.includes(domain)) {
        return {
            isValid: false,
            message: 'Please use a valid email provider'
        };
    }

    return {
        isValid: true,
        message: ''
    };
}

// Password validation function
function isValidPassword(password) {
    // Password must be at least 8 characters long and contain:
    // - At least one uppercase letter
    // - At least one lowercase letter
    // - At least one number
    // - At least one special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(password)) {
        return {
            isValid: false,
            message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
        };
    }

    return {
        isValid: true,
        message: ''
    };
}

// Updated signup handler with validation
window.handleSignup = async function(event) {
    event.preventDefault();
    const messageDiv = document.getElementById('message');
    messageDiv.className = 'message';
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Email validation
    const emailValidation = isValidEmail(email);
    if (!emailValidation.isValid) {
        messageDiv.classList.add('error');
        messageDiv.textContent = emailValidation.message;
        return;
    }

    // Password validation
    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.isValid) {
        messageDiv.classList.add('error');
        messageDiv.textContent = passwordValidation.message;
        return;
    }

    // Password match validation
    if (password !== confirmPassword) {
        messageDiv.classList.add('error');
        messageDiv.textContent = 'Passwords do not match!';
        return;
    }

    try {
        // Check if email already exists
        const userCredential = await window.createUserWithEmailAndPassword(window.auth, email, password);
        const user = userCredential.user;

        try {
            // Store additional user data in Realtime Database
            await window.dbSet(window.dbRef(window.database, 'users/' + user.uid), {
                email: email,
                createdAt: new Date().toISOString(),
                isGoogleUser: false,
                lastLogin: new Date().toISOString()
            });

            // Show success message with email verification info
            messageDiv.classList.add('success');
            messageDiv.textContent = 'Signup successful! Redirecting to login...';
            
            // Redirect to login page after delay
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);

        } catch (dbError) {
            console.error('Database error:', dbError);
            messageDiv.classList.add('warning');
            messageDiv.textContent = 'Account created but some features may be limited. Redirecting...';
            
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        }

    } catch (error) {
        console.error('Signup error:', error);
        messageDiv.classList.add('error');
        
        switch(error.code) {
            case 'auth/email-already-in-use':
                messageDiv.textContent = 'This email is already registered. Please try logging in instead.';
                break;
            case 'auth/invalid-email':
                messageDiv.textContent = 'Please enter a valid email address.';
                break;
            case 'auth/operation-not-allowed':
                messageDiv.textContent = 'Email/password accounts are not enabled. Please contact support.';
                break;
            case 'auth/weak-password':
                messageDiv.textContent = 'Please choose a stronger password.';
                break;
            default:
                messageDiv.textContent = error.message || 'An error occurred during signup. Please try again.';
        }
    }
};

// Login handler
window.handleLogin = async function(event) {
    event.preventDefault();
    const messageDiv = document.getElementById('message');
    messageDiv.className = 'message';
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // Use the new firebaseAuth object
        const userCredential = await window.firebaseAuth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Store user session
        localStorage.setItem('userEmail', email);
        
        messageDiv.classList.add('success');
        messageDiv.textContent = 'Login successful! Redirecting...';
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);

    } catch (error) {
        console.error('Login error:', error);
        messageDiv.classList.add('error');
        
        switch(error.code) {
            case 'auth/user-not-found':
                messageDiv.textContent = 'No account found with this email.';
                break;
            case 'auth/wrong-password':
                messageDiv.textContent = 'Incorrect password.';
                break;
            case 'auth/invalid-email':
                messageDiv.textContent = 'Please enter a valid email address.';
                break;
            default:
                messageDiv.textContent = error.message || 'Login failed. Please try again.';
        }
    }
};

// Update Google Sign-In initialization with new client ID
function initializeGoogleSignIn() {
    const googleProvider = new window.GoogleAuthProvider();
    
    // Configure Google Sign-in
    google.accounts.id.initialize({
        client_id: '60664855423-k8slt2ktt1uhvrm6174qb0epokmgi5da.apps.googleusercontent.com',
        callback: handleGoogleSignInCallback,
        auto_select: false
    });

    // Render Google Sign-in button
    const googleBtn = document.getElementById('googleSignIn');
    if (googleBtn) {
        googleBtn.onclick = function(e) {
            e.preventDefault();
            handleGoogleSignIn();
        };
    }
}

// Update Google Sign-In handler
window.handleGoogleSignIn = async function() {
    try {
        const provider = new window.firebaseAuth.GoogleAuthProvider();
        const result = await window.firebaseAuth.auth.signInWithPopup(provider);
        const user = result.user;

        // Store user data in Realtime Database
        await window.dbSet(window.dbRef(window.database, 'users/' + user.uid), {
            email: user.email,
            name: user.displayName,
            picture: user.photoURL,
            isGoogleUser: true,
            lastLogin: new Date().toISOString()
        });

        // Store user info in localStorage
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userName', user.displayName);
        localStorage.setItem('userPicture', user.photoURL);

        const messageDiv = document.getElementById('message');
        if (messageDiv) {
            messageDiv.className = 'message success';
            messageDiv.textContent = 'Google Sign-in successful! Redirecting...';
        }

        // Redirect after successful sign-in
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);

    } catch (error) {
        console.error('Google Sign-In error:', error);
        const messageDiv = document.getElementById('message');
        if (messageDiv) {
            messageDiv.className = 'message error';
            messageDiv.textContent = 'Google Sign-in failed. Please try again.';
        }
    }
};

// Initialize Google Sign-in when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeGoogleSignIn();
});

// Update Logout handling
async function handleLogout() {
    try {
        await window.auth.signOut();
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        localStorage.removeItem('userPicture');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Update the authentication state observer
window.auth?.onAuthStateChanged((user) => {
    const loginBtn = document.getElementById('loginBtn');
    if (user && loginBtn) {
        loginBtn.textContent = 'LOG OUT';
        loginBtn.onclick = handleLogout;
        loginBtn.classList.add('logged-in');
    } else if (loginBtn) {
        loginBtn.textContent = 'LOG IN';
        loginBtn.onclick = () => window.location.href = 'login.html';
        loginBtn.classList.remove('logged-in');
    }
});

const text1_options = [
    "Cooking your own meals apparently improves your health, huh... who knew?",
    "Dont know how to cook? Only if there was a place to learn... oh wait!",
    "Always try new things..... especially food.",
    "Is hunger actually real? or is your brain just tricking you?"
  ];
  const text2_options = [
    "~Recipe Haven",
    "~Recipe Haven",
    "~Recipe Haven",
    "~Recipe Haven"
    
  ];
  const color_options = ["#EBB9D2", "#FE9968", "#7FE0EB", "#6CE5B1"];
  const image_options = [
    "chefatwork.jpg",
    "pexels-enginakyurt-1435904.jpg",
    "pexels-mediocrememories-1040685.jpg",
    "pexels-robinstickel-70497.jpg"
  ];
  var i = 0;
const currentOptionText1 = document.getElementById("current-option-text1");
const currentOptionText2 = document.getElementById("current-option-text2");
const currentOptionImage = document.getElementById("image");
const carousel = document.getElementById("carousel-wrapper");
const mainMenu = document.getElementById("menu");
const optionPrevious = document.getElementById("previous-option");
const optionNext = document.getElementById("next-option");

currentOptionText1.innerText = text1_options[i];
currentOptionText2.innerText = text2_options[i];
currentOptionImage.style.backgroundImage = "url(" + image_options[i] + ")";
mainMenu.style.background = color_options[i];

const CarouselState = {
    isTransitioning: false,
    preloadedImages: new Map(),
    currentIndex: 0
};

async function preloadCarouselImages() {
    const loadPromises = image_options.map(path => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                CarouselState.preloadedImages.set(path, img);
                resolve(path);
            };
            img.onerror = reject;
            img.src = path;
        });
    });
    
    try {
        await Promise.all(loadPromises);
        console.log('All carousel images preloaded');
    } catch (error) {
        console.error('Error preloading images:', error);
    }
}

async function transitionToSlide(nextIndex, direction = 'next') {
    if (CarouselState.isTransitioning) return;
    CarouselState.isTransitioning = true;

    const nextImage = image_options[nextIndex];
    const animClass = `anim-${direction}`;

    // Start loading next image before transition
    if (!CarouselState.preloadedImages.has(nextImage)) {
        await preloadImage(nextImage);
    }

    // Set data attributes
    if (direction === 'next') {
        currentOptionText1.dataset.nextText = text1_options[nextIndex];
        currentOptionText2.dataset.nextText = text2_options[nextIndex];
    } else {
        currentOptionText1.dataset.previousText = text1_options[nextIndex];
        currentOptionText2.dataset.previousText = text2_options[nextIndex];
    }

    // Transition sequence
    carousel.classList.add('loading');
    
    await new Promise(resolve => setTimeout(resolve, 200)); // Increased from 100
    
    requestAnimationFrame(() => {
        carousel.classList.remove('loading');
        carousel.classList.add(animClass);
        
        setTimeout(() => {
            mainMenu.style.background = color_options[nextIndex];
            currentOptionImage.style.backgroundImage = `url(${nextImage})`;
            
            requestAnimationFrame(() => {
                currentOptionText1.innerText = text1_options[nextIndex];
                currentOptionText2.innerText = text2_options[nextIndex];
            });
        }, 400); // Increased from 300

        setTimeout(() => {
            carousel.classList.remove(animClass);
            CarouselState.isTransitioning = false;
            CarouselState.currentIndex = nextIndex;
        }, 800); // Increased from 650
    });
}

function preloadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            CarouselState.preloadedImages.set(src, img);
            resolve(src);
        };
        img.onerror = reject;
        img.src = src;
    });
}

function moveToNextSlide() {
    const nextIndex = (CarouselState.currentIndex + 1) % text1_options.length;
    transitionToSlide(nextIndex, 'next');
}

// Update click handlers
optionNext.onclick = function() {
    const nextIndex = (CarouselState.currentIndex + 1) % text1_options.length;
    transitionToSlide(nextIndex, 'next');
};

optionPrevious.onclick = function() {
    const nextIndex = CarouselState.currentIndex === 0 ? 
        text1_options.length - 1 : 
        CarouselState.currentIndex - 1;
    transitionToSlide(nextIndex, 'previous');
};

// Initialize carousel
document.addEventListener('DOMContentLoaded', async function() {
    if (!document.getElementById('carousel-wrapper')) return;

    // Initialize first slide
    CarouselState.currentIndex = 0;
    currentOptionText1.innerText = text1_options[0];
    currentOptionText2.innerText = text2_options[0];
    mainMenu.style.background = color_options[0];

    // Preload images before starting auto-slide
    await preloadCarouselImages();
    
    if (CarouselState.preloadedImages.has(image_options[0])) {
        currentOptionImage.style.backgroundImage = `url(${image_options[0]})`;
    }

    // Start auto-slide
    const slideInterval = setInterval(() => {
        if (!CarouselState.isTransitioning) {
            moveToNextSlide();
        }
    }, 4500);

    // Cleanup
    window.addEventListener('beforeunload', () => {
        clearInterval(slideInterval);
    });
});

