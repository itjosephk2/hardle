const MAX_GUESSES = 10;
const WORD_LENGTH = 5;

let secretWord = "";
let currentRow = 0;
let currentTile = 0;
let gameOver = false;
let guesses = [];

async function init() {
  await loadWords();

  secretWord = ANSWER_WORDS[Math.floor(Math.random() * ANSWER_WORDS.length)];
  console.log("Secret word:", secretWord);

  createGrid();
  createKeyboard();
  addKeyboardListeners();
}

function createGrid() {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  for (let i = 0; i < MAX_GUESSES; i++) {
    const row = document.createElement("div");
    row.classList.add("row");
    row.id = `row-${i}`;

    const deleteBtn = document.createElement("div");
    deleteBtn.classList.add("row-delete");
    deleteBtn.innerHTML = "↺";
    deleteBtn.addEventListener("click", () => deleteRow(i));
    row.appendChild(deleteBtn);

    const tilesContainer = document.createElement("div");
    tilesContainer.classList.add("tiles");

    for (let j = 0; j < WORD_LENGTH; j++) {
      const tile = document.createElement("div");
      tile.classList.add("tile");
      tile.id = `tile-${i}-${j}`;
      tile.addEventListener("click", () => cycleTileColor(i, j));
      tilesContainer.appendChild(tile);
    }

    row.appendChild(tilesContainer);

    const hint = document.createElement("div");
    hint.classList.add("hint");
    hint.id = `hint-${i}`;

    const orangeBox = document.createElement("div");
    orangeBox.classList.add("hint-box", "orange-count");
    orangeBox.id = `orange-${i}`;
    orangeBox.textContent = "0";

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

      if (key === "ENTER" || key === "⌫") {
        button.classList.add("wide");
      }

      button.addEventListener("click", () => handleKeyPress(key));
      rowDiv.appendChild(button);
    });

    keyboard.appendChild(rowDiv);
  });
}

function addKeyboardListeners() {
  document.addEventListener("keydown", (e) => {
    if (gameOver) return;

    if (e.key === "Enter") {
      handleKeyPress("ENTER");
    } else if (e.key === "Backspace") {
      handleKeyPress("⌫");
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      handleKeyPress(e.key.toUpperCase());
    }
  });
}

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

function addLetter(letter) {
  if (currentTile >= WORD_LENGTH) return;

  const tile = document.getElementById(`tile-${currentRow}-${currentTile}`);
  tile.textContent = letter;
  tile.classList.add("filled", "pop");
  setTimeout(() => tile.classList.remove("pop"), 100);

  currentTile++;
}

function deleteLetter() {
  if (currentTile <= 0) return;

  currentTile--;
  const tile = document.getElementById(`tile-${currentRow}-${currentTile}`);
  tile.textContent = "";
  tile.classList.remove("filled");
}

function submitGuess() {
  if (currentTile < WORD_LENGTH) {
    showMessage("Not enough letters");
    return;
  }

  let word = "";
  for (let i = 0; i < WORD_LENGTH; i++) {
    word += document.getElementById(`tile-${currentRow}-${i}`).textContent.toLowerCase();
  }

  if (!VALID_GUESSES.has(word)) {
    showMessage("Not in word list");
    shakeRow(currentRow);
    return;
  }

  const result = calculateHints(word, secretWord);

  guesses.push({
    word: word,
    greens: result.greens,
    oranges: result.oranges
  });

  // Mark tiles as submitted (unchecked by default)
  for (let i = 0; i < WORD_LENGTH; i++) {
    const tile = document.getElementById(`tile-${currentRow}-${i}`);
    tile.classList.add("submitted");
  }

  const hint = document.getElementById(`hint-${currentRow}`);
  hint.classList.add("visible");
  document.getElementById(`orange-${currentRow}`).textContent = result.oranges;
  document.getElementById(`green-${currentRow}`).textContent = result.greens;

  const deleteBtn = document.querySelector(`#row-${currentRow} .row-delete`);
  deleteBtn.classList.add("visible");

  if (result.greens === WORD_LENGTH) {
    playWinAnimation(currentRow);
    gameOver = true;
    return;
  }

  currentRow++;

  if (currentRow >= MAX_GUESSES) {
    gameOver = true;
    showMessage(`Game over! The word was: ${secretWord.toUpperCase()}`, "lose");
    return;
  }

  currentTile = 0;
}

function playWinAnimation(row) {
  // First: flip each tile green one by one
  for (let i = 0; i < WORD_LENGTH; i++) {
    const tile = document.getElementById(`tile-${row}-${i}`);

    setTimeout(() => {
      tile.classList.remove("gray", "orange");
      tile.classList.add("win-flip");
    }, i * 200);
  }

  // Then: bounce each tile one by one after all flips are done
  const flipDuration = WORD_LENGTH * 200 + 500;

  for (let i = 0; i < WORD_LENGTH; i++) {
    const tile = document.getElementById(`tile-${row}-${i}`);

    setTimeout(() => {
      tile.classList.remove("win-flip");
      tile.classList.add("green", "win-bounce");

      tile.addEventListener("animationend", () => {
        tile.classList.remove("win-bounce");
      }, { once: true });
    }, flipDuration + i * 150);
  }

  // Show win message after all animations
  const totalDuration = flipDuration + WORD_LENGTH * 150 + 600;
  setTimeout(() => {
    showMessage("🎉 You got it!", "win");
  }, totalDuration);
}

function calculateHints(guess, secret) {
  let greens = 0;
  let oranges = 0;

  const secretArr = secret.split("");
  const guessArr = guess.split("");

  const secretUsed = new Array(WORD_LENGTH).fill(false);
  const guessUsed = new Array(WORD_LENGTH).fill(false);

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessArr[i] === secretArr[i]) {
      greens++;
      secretUsed[i] = true;
      guessUsed[i] = true;
    }
  }

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

function cycleTileColor(row, col) {
  const tile = document.getElementById(`tile-${row}-${col}`);

  if (!tile.classList.contains("submitted")) return;

  // Cycle: unchecked -> gray -> orange -> green -> unchecked
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

  updateKeyboardColor(tile.textContent);
}

function updateKeyboardColor(letter) {
  const key = document.getElementById(`key-${letter}`);
  if (!key) return;

  let bestColor = "default";
  const priority = { "default": 0, "gray": 1, "orange": 2, "green": 3 };

  for (let i = 0; i < guesses.length; i++) {
    for (let j = 0; j < WORD_LENGTH; j++) {
      const tile = document.getElementById(`tile-${i}-${j}`);
      if (tile && tile.textContent === letter && tile.classList.contains("submitted")) {
        let tileColor = "default";
        if (tile.classList.contains("green")) tileColor = "green";
        else if (tile.classList.contains("orange")) tileColor = "orange";
        else if (tile.classList.contains("gray")) tileColor = "gray";

        if (priority[tileColor] > priority[bestColor]) {
          bestColor = tileColor;
        }
      }
    }
  }

  key.classList.remove("green", "orange", "gray");
  if (bestColor !== "default") {
    key.classList.add(bestColor);
  }
}

function deleteRow(rowIndex) {
  if (gameOver) return;

  // Only allow resetting submitted rows
  if (rowIndex >= currentRow) return;

  // Reset tile colors but keep the letters and submitted state
  for (let i = 0; i < WORD_LENGTH; i++) {
    const tile = document.getElementById(`tile-${rowIndex}-${i}`);
    tile.classList.remove("green", "orange", "gray");
  }

  refreshKeyboardColors();
}

function refreshKeyboardColors() {
  document.querySelectorAll(".key").forEach(key => {
    key.classList.remove("green", "orange", "gray");
  });

  for (let i = 0; i < guesses.length; i++) {
    for (let j = 0; j < WORD_LENGTH; j++) {
      const tile = document.getElementById(`tile-${i}-${j}`);
      if (tile && tile.classList.contains("submitted")) {
        updateKeyboardColor(tile.textContent);
      }
    }
  }
}

function showMessage(msg, type = "") {
  const messageEl = document.getElementById("message");
  messageEl.textContent = msg;
  messageEl.className = type;

  if (msg && type === "") {
    setTimeout(() => {
      if (messageEl.textContent === msg) {
        messageEl.textContent = "";
      }
    }, 2000);
  }
}

function shakeRow(rowIndex) {
  const row = document.getElementById(`row-${rowIndex}`);
  row.style.animation = "none";
  row.offsetHeight;
  row.style.animation = "shake 0.5s";
}

function resetGame() {
  secretWord = ANSWER_WORDS[Math.floor(Math.random() * ANSWER_WORDS.length)];
  console.log("Secret word:", secretWord);
  currentRow = 0;
  currentTile = 0;
  gameOver = false;
  guesses = [];

  createGrid();

  document.querySelectorAll(".key").forEach(key => {
    key.classList.remove("green", "orange", "gray");
  });

  showMessage("");
}

const style = document.createElement("style");
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20%, 60% { transform: translateX(-5px); }
        40%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

init();