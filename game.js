// ========================
// GAME CONSTANTS
// ========================
const MAX_GUESSES = 10;  // Maximum number of guesses allowed
const WORD_LENGTH = 5;   // Length of the secret word

// ========================
// GAME STATE
// ========================
let secretWord = "";      // The word the player needs to guess
let currentRow = 0;       // Which row the player is currently on
let currentTile = 0;      // Which tile in the current row (0-4)
let gameOver = false;      // Whether the game has ended
let guesses = [];          // Array of submitted guesses with their hint data

// ========================
// INITIALIZATION
// ========================

/**
 * Initialize the game
 * Loads word lists, picks a secret word, and sets up the UI
 */
async function init() {
  await loadWords();

  // Pick a random word from the answer list
  secretWord = ANSWER_WORDS[Math.floor(Math.random() * ANSWER_WORDS.length)];
  console.log("Secret Word: ", secretWord);

  createGrid();
  createKeyboard();
  addKeyboardListeners();
}

// ========================
// UI CREATION
// ========================

/**
 * Creates the game grid with rows of tiles
 * Each row contains: reset button | 5 letter tiles | hint counts
 */
function createGrid() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  for (let i = 0; i < MAX_GUESSES; i++) {
    // Create row container
    const row = document.createElement("div");
    row.classList.add("row");
    row.id = `row-${i}`;

    // Reset button (↺) - clears tile colors for this row
    const deleteBtn = document.createElement("div");
    deleteBtn.classList.add("row-delete");
    deleteBtn.innerHTML = "↺";
    deleteBtn.addEventListener("click", () => deleteRow(i));
    row.appendChild(deleteBtn);

    // Tiles container - holds the 5 letter tiles
    const tilesContainer = document.createElement("div");
    tilesContainer.classList.add("tiles");

    for (let j = 0; j < WORD_LENGTH; j++) {
      const tile = document.createElement("div");
      tile.classList.add("tile");
      tile.id = `tile-${i}-${j}`;
      // Click to cycle tile color (gray -> orange -> green -> unchecked)
      tile.addEventListener("click", () => cycleTileColor(i, j));
      tilesContainer.appendChild(tile);
    }

    row.appendChild(tilesContainer);

    // Hint container - shows orange and green counts after submission
    const hint = document.createElement("div");
    hint.classList.add("hint");
    hint.id = `hint-${i}`;

    // Orange count box - letters in word but wrong position
    const orangeBox = document.createElement("div");
    orangeBox.classList.add("hint-box", "orange-count");
    orangeBox.id = `orange-${i}`;
    orangeBox.textContent = "0";

    // Green count box - letters in correct position
    const greenBox = document.createElement("div");
    greenBox.classList.add("hint-box", "green-count");
    greenBox.id = `green-${i}`;
    greenBox.textContent = "0";

    hint.appendChild(orangeBox);
    hint.appendChild(greenBox);
    row.appendChild(hint);

    grid.appendChild(row);
  }
}

/**
 * Creates the on-screen keyboard
 * Three rows matching a QWERTY layout with ENTER and backspace keys
 */
function createKeyboard() {
  const keyboard = document.getElementById("keyboard");
  keyboard.innerHTML = "";

  const rows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"]
  ];

  rows.forEach(row => {
    const rowDiv = document.createElement("div");
    rowDiv.classList.add("keyboard-row");

    row.forEach(key => {
      const button = document.createElement("button");
      button.classList.add("key");
      button.textContent = key;
      button.id = `key-${key}`;

      // ENTER and backspace get wider buttons
      if (key === "ENTER" || key === "⌫") {
        button.classList.add("wide");
      }

      button.addEventListener("click", () => handleKeyPress(key));
      rowDiv.appendChild(button);
    });

    keyboard.appendChild(rowDiv);
  });
}

// ========================
// INPUT HANDLING
// ========================

/**
 * Handles physical keyboard input
 * Named function so it can be removed and re-added cleanly
 * Maps Enter, Backspace, and letter keys to game actions
 */
function handleKeyDown(e) {
  if (gameOver) return;

  if (e.key === "Enter") {
    handleKeyPress("ENTER");
  } else if (e.key === "Backspace") {
    handleKeyPress("⌫");
  } else if (/^[a-zA-Z]$/.test(e.key)) {
    handleKeyPress(e.key.toUpperCase());
  }
}

/**
 * Adds the physical keyboard listener
 * Removes any existing listener first to prevent duplicates
 */
function addKeyboardListeners() {
  document.removeEventListener("keydown", handleKeyDown);
  document.addEventListener("keydown", handleKeyDown);
}

/**
 * Routes key presses to the appropriate action
 * Blocks input if game is over or words haven't loaded
 */
function handleKeyPress(key) {
  if (gameOver || !wordsLoaded) return;

  if (key === "ENTER") {
    submitGuess();
  } else if (key === "⌫") {
    deleteLetter();
  } else {
    addLetter(key);
  }
}

/**
 * Adds a letter to the current tile and advances the cursor
 * Includes a pop animation on the tile
 */
function addLetter(letter) {
  if (currentTile >= WORD_LENGTH) return;

  const tile = document.getElementById(`tile-${currentRow}-${currentTile}`);
  tile.textContent = letter;
  tile.classList.add("filled", "pop");
  setTimeout(() => tile.classList.remove("pop"), 100);

  currentTile++;
}

/**
 * Removes the last typed letter and moves cursor back
 */
function deleteLetter() {
  if (currentTile <= 0) return;

  currentTile--;
  const tile = document.getElementById(`tile-${currentRow}-${currentTile}`);
  tile.textContent = "";
  tile.classList.remove("filled");
}

// ========================
// GUESS SUBMISSION
// ========================

/**
 * Submits the current row as a guess
 * Validates word length and existence in word list
 * Calculates hints and checks for win/loss
 * Updates stats when game ends
 */
function submitGuess() {
  // Check if all tiles are filled
  if (currentTile < WORD_LENGTH) {
    showMessage("Not enough letters");
    return;
  }

  // Build the word from tile contents
  let word = "";
  for (let i = 0; i < WORD_LENGTH; i++) {
    word += document.getElementById(`tile-${currentRow}-${i}`).textContent.toLowerCase();
  }

  // Validate against word list
  if (!VALID_GUESSES.has(word)) {
    showMessage("Not in word list");
    shakeRow(currentRow);
    return;
  }

  // Calculate green and orange counts
  const result = calculateHints(word, secretWord);

  // Store guess data
  guesses.push({
    word: word,
    greens: result.greens,
    oranges: result.oranges
  });

  // Mark all tiles in this row as submitted (clickable for color cycling)
  for (let i = 0; i < WORD_LENGTH; i++) {
    const tile = document.getElementById(`tile-${currentRow}-${i}`);
    tile.classList.add("submitted");
  }

  // Show hint counts
  const hint = document.getElementById(`hint-${currentRow}`);
  hint.classList.add("visible");
  document.getElementById(`orange-${currentRow}`).textContent = result.oranges;
  document.getElementById(`green-${currentRow}`).textContent = result.greens;

  // Show the row reset button
  const deleteBtn = document.querySelector(`#row-${currentRow} .row-delete`);
  deleteBtn.classList.add("visible");

  // Check for win - all letters in correct position
  if (result.greens === WORD_LENGTH) {
    playWinAnimation(currentRow);
    gameOver = true;
    updateStats(true, currentRow + 1);  // Record win and guess number
    return;
  }

  // Move to next row
  currentRow++;

  // Check for loss - used all guesses
  if (currentRow >= MAX_GUESSES) {
    gameOver = true;
    showMessage(`The word was: ${secretWord.toUpperCase()}`, "lose");
    updateStats(false, 0);  // Record loss

    // Show stats modal after a short delay so player can read the answer
    setTimeout(() => {
      toggleStats();
    }, 1500);

    return;
  }

  // Reset tile cursor for new row
  currentTile = 0;
}

// ========================
// WIN ANIMATION
// ========================

/**
 * Plays a two-part win animation on the winning row
 * Step 1: Each tile flips to green one by one
 * Step 2: Each tile bounces one by one
 * Then shows the win message and stats modal
 */
function playWinAnimation(row) {
  // Step 1: Flip each tile to green sequentially
  for (let i = 0; i < WORD_LENGTH; i++) {
    const tile = document.getElementById(`tile-${row}-${i}`);

    setTimeout(() => {
      tile.classList.remove("gray", "orange");
      tile.classList.add("win-flip");
    }, i * 200);
  }

  // Step 2: Bounce tiles after all flips complete
  const flipDuration = WORD_LENGTH * 200 + 500;

  for (let i = 0; i < WORD_LENGTH; i++) {
    const tile = document.getElementById(`tile-${row}-${i}`);

    setTimeout(() => {
      tile.classList.remove("win-flip");
      tile.classList.add("green", "win-bounce");

      // Clean up bounce class after animation ends
      tile.addEventListener("animationend", () => {
        tile.classList.remove("win-bounce");
      }, { once: true });
    }, flipDuration + i * 150);
  }

  // Show win message and stats after all animations finish
  const totalDuration = flipDuration + WORD_LENGTH * 150 + 600;
  setTimeout(() => {
    showMessage("You got it!", "win");
    toggleStats();  // Auto-show stats modal after win
  }, totalDuration);
}

// ========================
// HINT CALCULATION
// ========================

/**
 * Calculates green and orange counts for a guess
 * Green = correct letter in correct position
 * Orange = correct letter in wrong position
 * Uses two-pass algorithm to handle duplicate letters correctly
 *
 * @param {string} guess - The player's guessed word
 * @param {string} secret - The secret word to compare against
 * @returns {object} - { greens: number, oranges: number }
 */
function calculateHints(guess, secret) {
  let greens = 0;
  let oranges = 0;

  const secretArr = secret.split("");
  const guessArr = guess.split("");

  // Track which letters have been matched
  const secretUsed = new Array(WORD_LENGTH).fill(false);
  const guessUsed = new Array(WORD_LENGTH).fill(false);

  // First pass: find exact matches (greens)
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessArr[i] === secretArr[i]) {
      greens++;
      secretUsed[i] = true;
      guessUsed[i] = true;
    }
  }

  // Second pass: find wrong-position matches (oranges)
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessUsed[i]) continue;

    for (let j = 0; j < WORD_LENGTH; j++) {
      if (secretUsed[j]) continue;

      if (guessArr[i] === secretArr[j]) {
        oranges++;
        secretUsed[j] = true;
        guessUsed[i] = true;
        break;
      }
    }
  }

  return { greens, oranges };
}

// ========================
// TILE COLOR CYCLING
// ========================

/**
 * Cycles a submitted tile through colors when clicked
 * Order: unchecked → gray → orange → green → unchecked
 * Only works on submitted tiles and when game is not over
 */
function cycleTileColor(row, col) {
  const tile = document.getElementById(`tile-${row}-${col}`);

  // Only allow cycling on submitted tiles
  if (!tile.classList.contains("submitted")) return;

  // Block cycling after game ends
  if (gameOver) return;

  // Cycle through colors
  if (tile.classList.contains("green")) {
    tile.classList.remove("green");
  } else if (tile.classList.contains("orange")) {
    tile.classList.remove("orange");
    tile.classList.add("green");
  } else if (tile.classList.contains("gray")) {
    tile.classList.remove("gray");
    tile.classList.add("orange");
  } else {
    tile.classList.add("gray");
  }

  // Update the keyboard key to reflect the best color across all rows
  updateKeyboardColor(tile.textContent);
}

// ========================
// KEYBOARD COLOR MANAGEMENT
// ========================

/**
 * Updates a keyboard key's color based on the best tile color
 * across all submitted rows for that letter
 * Priority: green > orange > gray > default
 */
function updateKeyboardColor(letter) {
  const key = document.getElementById(`key-${letter}`);
  if (!key) return;

  let bestColor = "default";
  const priority = { "default": 0, "gray": 1, "orange": 2, "green": 3 };

  // Scan all submitted tiles for this letter
  for (let i = 0; i < guesses.length; i++) {
    for (let j = 0; j < WORD_LENGTH; j++) {
      const tile = document.getElementById(`tile-${i}-${j}`);
      if (tile && tile.textContent === letter && tile.classList.contains("submitted")) {
        let tileColor = "default";
        if (tile.classList.contains("green")) tileColor = "green";
        else if (tile.classList.contains("orange")) tileColor = "orange";
        else if (tile.classList.contains("gray")) tileColor = "gray";

        // Keep the highest priority color
        if (priority[tileColor] > priority[bestColor]) {
          bestColor = tileColor;
        }
      }
    }
  }

  // Apply the best color to the keyboard key
  key.classList.remove("green", "orange", "gray");
  if (bestColor !== "default") {
    key.classList.add(bestColor);
  }
}

/**
 * Resets tile colors for a submitted row (clears annotations)
 * Does not remove the letters or submitted state
 * Only works on submitted rows and when game is not over
 */
function deleteRow(rowIndex) {
  if (gameOver) return;

  // Only allow resetting submitted rows
  if (rowIndex >= currentRow) return;

  // Clear all color annotations from tiles
  for (let i = 0; i < WORD_LENGTH; i++) {
    const tile = document.getElementById(`tile-${rowIndex}-${i}`);
    tile.classList.remove("green", "orange", "gray");
  }

  // Recalculate all keyboard colors
  refreshKeyboardColors();
}

/**
 * Recalculates all keyboard key colors from scratch
 * Called after a row reset to ensure keyboard stays in sync
 */
function refreshKeyboardColors() {
  // Clear all keyboard colors
  document.querySelectorAll(".key").forEach(key => {
    key.classList.remove("green", "orange", "gray");
  });

  // Rebuild colors from all submitted tiles
  for (let i = 0; i < guesses.length; i++) {
    for (let j = 0; j < WORD_LENGTH; j++) {
      const tile = document.getElementById(`tile-${i}-${j}`);
      if (tile && tile.classList.contains("submitted")) {
        updateKeyboardColor(tile.textContent);
      }
    }
  }
}

// ========================
// UI FEEDBACK
// ========================

/**
 * Shows a message to the player
 * Temporary messages (no type) auto-clear after 2 seconds
 * Win/lose messages persist until game reset
 *
 * @param {string} msg - The message text
 * @param {string} type - "win", "lose", or "" for temporary
 */
function showMessage(msg, type = "") {
  const messageEl = document.getElementById("message");
  messageEl.textContent = msg;
  messageEl.className = type;

  // Auto-clear temporary messages after 2 seconds
  if (msg && type === "") {
    setTimeout(() => {
      if (messageEl.textContent === msg) {
        messageEl.textContent = "";
      }
    }, 2000);
  }
}

/**
 * Plays a shake animation on a row (used for invalid guesses)
 */
function shakeRow(rowIndex) {
  const row = document.getElementById(`row-${rowIndex}`);
  // Reset animation to allow re-triggering
  row.style.animation = "none";
  row.offsetHeight; // Force reflow
  row.style.animation = "shake 0.5s";
}

// ========================
// GAME RESET
// ========================

/**
 * Resets the entire game state and UI
 * Picks a new secret word and clears all progress
 */
function resetGame() {
  // Pick a new random word
  secretWord = ANSWER_WORDS[Math.floor(Math.random() * ANSWER_WORDS.length)];

  // Reset game state
  currentRow = 0;
  currentTile = 0;
  gameOver = false;
  guesses = [];

  // Rebuild the grid
  createGrid();

  // Clear all keyboard colors
  document.querySelectorAll(".key").forEach(key => {
    key.classList.remove("green", "orange", "gray");
  });

  // Re-add keyboard listener for fresh game
  addKeyboardListeners();

  // Clear any messages
  showMessage("");

  // Remove focus from button so Enter key works for the game
  document.activeElement.blur();
}

// ========================
// DYNAMIC STYLES
// ========================

// Inject shake animation keyframes into the page
const style = document.createElement("style");
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20%, 60% { transform: translateX(-5px); }
        40%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// ========================
// HELP MODAL
// ========================

/**
 * Toggles the help modal open/closed
 */
function toggleHelp() {
  const modal = document.getElementById("help-modal");
  modal.classList.toggle("hidden");
}

/**
 * Close modals when pressing the Escape key
 * Checks help modal first, then stats modal
 */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const helpModal = document.getElementById("help-modal");
    if (!helpModal.classList.contains("hidden")) {
      toggleHelp();
      return;
    }

    const statsModal = document.getElementById("stats-modal");
    if (!statsModal.classList.contains("hidden")) {
      toggleStats();
    }
  }
});

// ========================
// STATS TRACKING
// ========================

/**
 * Returns the default stats object
 * Used when no stats exist in localStorage yet
 */
function getDefaultStats() {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
      6: 0, 7: 0, 8: 0, 9: 0, 10: 0
    }
  };
}

/**
 * Loads stats from localStorage
 * Returns default stats if none exist yet
 */
function loadStats() {
  const saved = localStorage.getItem("hardle-stats");
  if (saved) {
    return JSON.parse(saved);
  }
  return getDefaultStats();
}

/**
 * Saves stats object to localStorage
 * @param {object} stats - The stats object to save
 */
function saveStats(stats) {
  localStorage.setItem("hardle-stats", JSON.stringify(stats));
}

/**
 * Updates stats after a game ends
 * Increments games played, tracks wins/losses,
 * updates streaks, and records guess distribution
 *
 * @param {boolean} won - Whether the player won
 * @param {number} numGuesses - How many guesses it took (only matters if won)
 */
function updateStats(won, numGuesses) {
  const stats = loadStats();

  // Increment total games played
  stats.gamesPlayed++;

  if (won) {
    // Increment wins
    stats.gamesWon++;

    // Extend current win streak
    stats.currentStreak++;

    // Update max streak if current is higher
    if (stats.currentStreak > stats.maxStreak) {
      stats.maxStreak = stats.currentStreak;
    }

    // Record which guess number solved it
    stats.guessDistribution[numGuesses]++;
  } else {
    // Loss breaks the current streak
    stats.currentStreak = 0;
  }

  // Save updated stats to localStorage
  saveStats(stats);
}

// ========================
// STATS MODAL
// ========================

/**
 * Toggles the stats modal open/closed
 * Refreshes the displayed stats each time it opens
 */
function toggleStats() {
  const modal = document.getElementById("stats-modal");
  modal.classList.toggle("hidden");

  // Refresh stats display when opening
  if (!modal.classList.contains("hidden")) {
    displayStats();
  }
}

/**
 * Populates the stats modal with current data
 * Updates summary numbers and builds the distribution chart
 */
function displayStats() {
  const stats = loadStats();

  // Update summary numbers
  document.getElementById("stat-played").textContent = stats.gamesPlayed;
  document.getElementById("stat-streak").textContent = stats.currentStreak;
  document.getElementById("stat-max-streak").textContent = stats.maxStreak;

  // Calculate win percentage
  const winPct = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;
  document.getElementById("stat-win-pct").textContent = winPct;

  // Build guess distribution chart
  const distContainer = document.getElementById("guess-distribution");
  distContainer.innerHTML = "";

  // Find the max value for scaling bars
  const maxCount = Math.max(...Object.values(stats.guessDistribution), 1);

  // Create a bar for each guess number (1-10)
  for (let i = 1; i <= MAX_GUESSES; i++) {
    const count = stats.guessDistribution[i] || 0;

    const row = document.createElement("div");
    row.classList.add("dist-row");

    // Guess number label
    const label = document.createElement("div");
    label.classList.add("dist-label");
    label.textContent = i;

    // Bar with width proportional to count
    const bar = document.createElement("div");
    bar.classList.add("dist-bar");
    bar.textContent = count;

    // Scale bar width (minimum 24px, max 100%)
    const percentage = (count / maxCount) * 100;
    bar.style.width = count > 0 ? `${Math.max(percentage, 8)}%` : "24px";

    // Highlight if this was the most recent winning guess
    if (gameOver && count > 0 && i === currentRow + 1) {
      bar.classList.add("highlight");
    }

    row.appendChild(label);
    row.appendChild(bar);
    distContainer.appendChild(row);
  }
}

// ========================
// START THE GAME
// ========================
init();
