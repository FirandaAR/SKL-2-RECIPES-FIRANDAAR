/**
 * GourmetCraft — Recipe Finder JavaScript
 * API Source: https://dummyjson.com/recipes
 */

const API_URL = 'https://dummyjson.com/recipes';

// --- Selectors DOM ---
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const emptyText = document.getElementById('empty-text');
const recipeGrid = document.getElementById('recipe-grid');
const resultSummary = document.getElementById('result-summary');

const searchInput = document.getElementById('search-input');
const cuisineSelect = document.getElementById('cuisine-select');
const difficultySelect = document.getElementById('difficulty-select');
const sortSelect = document.getElementById('sort-select');
const resetBtn = document.getElementById('reset-btn');
const retryBtn = document.getElementById('retry-btn');

const showAllBtn = document.getElementById('show-all-btn');
const showFavBtn = document.getElementById('show-fav-btn');
const favCountSpan = document.getElementById('fav-count');

const recipeDialog = document.getElementById('recipe-dialog');
const dialogContent = document.getElementById('dialog-content');
const dialogClose = document.getElementById('dialog-close');

// --- Global State ---
let allRecipes = []; 
let favorites = getFavoritesFromStorage(); 
let currentTab = 'all'; 

// =========================================================
// 1. LOCALSTORAGE HELPER FUNCTIONS
// =========================================================

function getFavoritesFromStorage() {
  const saved = localStorage.getItem('recipe_favorites');
  return saved ? JSON.parse(saved) : [];
}

function saveFavoritesToStorage() {
  localStorage.setItem('recipe_favorites', JSON.stringify(favorites));
  updateFavBadgeCount();
}

function updateFavBadgeCount() {
  if (favCountSpan) {
    favCountSpan.textContent = favorites.length;
  }
}

function toggleFavorite(recipeId) {
  const id = Number(recipeId);
  const index = favorites.indexOf(id);

  if (index === -1) {
    favorites.push(id);
  } else {
    favorites.splice(index, 1);
  }

  saveFavoritesToStorage();
  applyFiltersAndRender();
}

// =========================================================
// 2. FETCH DATA DARI API
// =========================================================

async function fetchRecipes() {
  showState('loading');
  try {
    const response = await fetch(`${API_URL}?limit=0`);
    if (!response.ok) {
      throw new Error(`Gagal memuat API! Status: ${response.status}`);
    }

    const data = await response.json();
    allRecipes = data.recipes || [];

    populateCuisineDropdown(allRecipes);
    updateFavBadgeCount();
    applyFiltersAndRender();
  } catch (error) {
    console.error('Fetch error:', error);
    if (errorMessage) {
      errorMessage.textContent = error.message || 'Gagal terhubung ke server API.';
    }
    showState('error');
  }
}

function populateCuisineDropdown(recipes) {
  const cuisines = [...new Set(recipes.map((r) => r.cuisine))].sort();
  cuisineSelect.innerHTML = '<option value="all">Semua Masakan</option>';
  
  cuisines.forEach((cuisine) => {
    cuisineSelect.innerHTML += `<option value="${cuisine}">${cuisine}</option>`;
  });
}

// =========================================================
// 3. SEARCH, FILTER & SORT LOGIC
// =========================================================

function applyFiltersAndRender() {
  const searchQuery = searchInput.value.toLowerCase().trim();
  const selectedCuisine = cuisineSelect.value;
  const selectedDifficulty = difficultySelect.value;
  const sortValue = sortSelect.value;

  // 1. Filter
  let filtered = allRecipes.filter((recipe) => {
    if (currentTab === 'fav' && !favorites.includes(recipe.id)) {
      return false;
    }

    const matchesSearch =
      searchQuery === '' ||
      recipe.name.toLowerCase().includes(searchQuery) ||
      recipe.ingredients.some((i) => i.toLowerCase().includes(searchQuery));

    const matchesCuisine =
      selectedCuisine === 'all' || recipe.cuisine === selectedCuisine;

    const matchesDifficulty =
      selectedDifficulty === 'all' || recipe.difficulty === selectedDifficulty;

    return matchesSearch && matchesCuisine && matchesDifficulty;
  });

  // 2. Sorting
  filtered.sort((a, b) => {
    switch (sortValue) {
      case 'rating-desc':
        return b.rating - a.rating;
      case 'time-asc':
        return a.prepTimeMinutes - b.prepTimeMinutes;
      case 'cal-asc':
        return a.caloriesPerServing - b.caloriesPerServing;
      default:
        return a.id - b.id;
    }
  });

  // 3. Tampilkan State
  if (filtered.length === 0) {
    if (currentTab === 'fav' && favorites.length === 0) {
      emptyText.textContent = 'Belum ada resep favorit yang disimpan. Klik ❤️ pada resep untuk menyimpannya!';
    } else {
      emptyText.textContent = 'Coba gunakan kata kunci pencarian atau filter yang lain.';
    }
    showState('empty');
    resultSummary.textContent = 'Menampilkan 0 resep';
  } else {
    showState('grid');
    const totalText = currentTab === 'fav' ? 'resep favorit' : 'resep pilihan';
    resultSummary.textContent = `Menampilkan ${filtered.length} ${totalText}`;
    renderRecipeCards(filtered);
  }
}

// =========================================================
// 4. RENDER UI CARDS
// =========================================================

function renderRecipeCards(recipes) {
  recipeGrid.innerHTML = recipes
    .map((recipe) => {
      const { id, name, image, cuisine, difficulty, rating, prepTimeMinutes } = recipe;
      const isFav = favorites.includes(id);

      return `
        <article class="recipe-card">
          <div class="recipe-image-wrap">
            <img class="recipe-image" src="${image}" alt="${name}" loading="lazy">
            <button class="fav-btn" data-id="${id}" aria-label="Simpan Favorit">
              ${isFav ? '❤️' : '🤍'}
            </button>
          </div>

          <div class="recipe-body">
            <div class="badges">
              <span class="badge badge-cuisine">${cuisine}</span>
              <span class="badge badge-difficulty">${difficulty}</span>
            </div>

            <h3 class="recipe-title">${name}</h3>

            <div class="recipe-meta">
              <span>⭐ ${rating}</span>
              <span>⏱️ ${prepTimeMinutes} mnt</span>
            </div>

            <button type="button" class="detail-btn" data-id="${id}">
              Lihat Resep
            </button>
          </div>
        </article>
      `;
    })
    .join('');
}

// =========================================================
// 5. MODAL DETAIL RESEP
// =========================================================

function openRecipeModal(recipeId) {
  const recipe = allRecipes.find((r) => r.id === Number(recipeId));
  if (!recipe) return;

  const {
    name,
    image,
    cuisine,
    difficulty,
    prepTimeMinutes,
    cookTimeMinutes,
    servings,
    caloriesPerServing,
    ingredients,
    instructions,
  } = recipe;

  dialogContent.innerHTML = `
    <div class="dialog-detail-grid">
      <div>
        <img class="dialog-image" src="${image}" alt="${name}">
        <div class="dialog-stats">
          <div><span>Persiapan</span><strong>⏱️ ${prepTimeMinutes} mnt</strong></div>
          <div><span>Memasak</span><strong>🔥 ${cookTimeMinutes} mnt</strong></div>
          <div><span>Porsi</span><strong>🍽️ ${servings} porsi</strong></div>
          <div><span>Kalori</span><strong>⚡ ${caloriesPerServing} kcal</strong></div>
        </div>
      </div>

      <div class="dialog-info">
        <div class="badges">
          <span class="badge badge-cuisine">${cuisine}</span>
          <span class="badge badge-difficulty">${difficulty}</span>
        </div>
        <h2>${name}</h2>

        <h4 class="dialog-section-title">🛒 Bahan-bahan:</h4>
        <ul class="dialog-list">
          ${ingredients.map((ing) => `<li>${ing}</li>`).join('')}
        </ul>

        <h4 class="dialog-section-title">👨‍🍳 Langkah Pembuatan:</h4>
        <ol class="dialog-list">
          ${instructions.map((step) => `<li>${step}</li>`).join('')}
        </ol>
      </div>
    </div>
  `;

  if (typeof recipeDialog.showModal === 'function') {
    recipeDialog.showModal();
  }
}

function showState(state) {
  loadingState.hidden = state !== 'loading';
  errorState.hidden = state !== 'error';
  emptyState.hidden = state !== 'empty';
  recipeGrid.hidden = state !== 'grid';
}

// =========================================================
// 6. EVENT LISTENERS
// =========================================================

recipeGrid.addEventListener('click', (e) => {
  const favBtn = e.target.closest('.fav-btn');
  if (favBtn) {
    e.stopPropagation();
    toggleFavorite(favBtn.dataset.id);
    return;
  }

  const detailBtn = e.target.closest('.detail-btn');
  if (detailBtn) {
    openRecipeModal(detailBtn.dataset.id);
  }
});

searchInput.addEventListener('input', applyFiltersAndRender);
cuisineSelect.addEventListener('change', applyFiltersAndRender);
difficultySelect.addEventListener('change', applyFiltersAndRender);
sortSelect.addEventListener('change', applyFiltersAndRender);

resetBtn.addEventListener('click', () => {
  searchInput.value = '';
  cuisineSelect.value = 'all';
  difficultySelect.value = 'all';
  sortSelect.value = 'default';
  applyFiltersAndRender();
});

showAllBtn.addEventListener('click', () => {
  currentTab = 'all';
  showAllBtn.className = 'nav-tab active-tab';
  showFavBtn.className = 'nav-tab outline';
  applyFiltersAndRender();
});

showFavBtn.addEventListener('click', () => {
  currentTab = 'fav';
  showFavBtn.className = 'nav-tab active-tab';
  showAllBtn.className = 'nav-tab outline';
  applyFiltersAndRender();
});

dialogClose.addEventListener('click', () => recipeDialog.close());

recipeDialog.addEventListener('click', (e) => {
  const rect = recipeDialog.getBoundingClientRect();
  const isInDialog =
    rect.top <= e.clientY &&
    e.clientY <= rect.top + rect.height &&
    rect.left <= e.clientX &&
    e.clientX <= rect.left + rect.width;

  if (!isInDialog) recipeDialog.close();
});

if (retryBtn) retryBtn.addEventListener('click', fetchRecipes);

// Inisialisasi awal
fetchRecipes();