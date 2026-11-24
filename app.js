const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  answerDeck: [],
  answerIndex: 0,
  currentAnswer: null,
  quizDeck: [],
  currentQuiz: null,
  score: Number(localStorage.getItem("hanukkah-score") || 0),
  attempts: Number(localStorage.getItem("hanukkah-attempts") || 0),
  answered: false
};

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildMenorah() {
  const holder = $("#heroCandles");
  const heights = [122, 122, 122, 122, 142, 122, 122, 122, 122];
  heights.forEach((height, index) => {
    const candle = document.createElement("span");
    candle.className = `candle candle-${index + 1}`;
    candle.style.setProperty("--height", `${height}px`);
    candle.style.setProperty("--delay", `${index * 0.11}s`);
    candle.innerHTML = '<i class="flame"></i><i class="wick"></i>';
    holder.appendChild(candle);
  });
}

function refillAnswerDeck() {
  state.answerDeck = shuffle(realAnswers.map((_, index) => index));
  state.answerIndex = 0;
}

function showNextAnswer(initial = false) {
  if (!state.answerDeck.length || state.answerIndex >= state.answerDeck.length) refillAnswerDeck();
  const card = $("#answerCard");
  if (!initial) card.classList.add("switching");

  window.setTimeout(() => {
    const sourceIndex = state.answerDeck[state.answerIndex];
    state.currentAnswer = realAnswers[sourceIndex];
    $("#answerNumber").textContent = `תירוץ #${String(sourceIndex + 1).padStart(2, "0")}`;
    $("#answerCounter").textContent = `${state.answerIndex + 1} / ${realAnswers.length}`;
    $("#answerTitle").textContent = state.currentAnswer.title;
    $("#answerText").textContent = state.currentAnswer.text;
    $("#answerAttribution").textContent = state.currentAnswer.attribution;
    $("#answerSource").href = state.currentAnswer.source;
    state.answerIndex += 1;
    card.classList.remove("switching");
    card.classList.remove("arrival");
    void card.offsetWidth;
    card.classList.add("arrival");
  }, initial ? 0 : 180);
}

function setMode(mode) {
  $$(".mode-tab").forEach((tab) => {
    const selected = tab.dataset.mode === mode;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });
  const discover = mode === "discover";
  $("#discoverPanel").hidden = !discover;
  $("#gamePanel").hidden = discover;
  $("#discoverPanel").classList.toggle("active", discover);
  $("#gamePanel").classList.toggle("active", !discover);
  if (!discover && !state.currentQuiz) nextQuiz();
}

function refillQuizDeck() {
  const real = shuffle(realAnswers).slice(0, 16).map((item) => ({ ...item, real: true }));
  const invented = shuffle(inventedAnswers).map((item) => ({ ...item, real: false }));
  state.quizDeck = shuffle([...real, ...invented]);
}

function nextQuiz() {
  if (!state.quizDeck.length) refillQuizDeck();
  state.currentQuiz = state.quizDeck.pop();
  state.answered = false;
  $("#quizTitle").textContent = state.currentQuiz.title;
  $("#quizText").textContent = state.currentQuiz.text;
  $("#quizActions").hidden = false;
  $("#resultBox").hidden = true;
  $("#nextQuestion").hidden = true;
  $("#quizCard").className = "quiz-card arrival";
}

function updateScore() {
  $("#score").textContent = state.score;
  $("#attempts").textContent = state.attempts;
  localStorage.setItem("hanukkah-score", state.score);
  localStorage.setItem("hanukkah-attempts", state.attempts);
}

function answerQuiz(guess) {
  if (state.answered) return;
  state.answered = true;
  const correct = guess === state.currentQuiz.real;
  state.attempts += 1;
  if (correct) state.score += 1;
  updateScore();

  $("#quizActions").hidden = true;
  const result = $("#resultBox");
  result.hidden = false;
  result.className = `result-box ${correct ? "correct" : "incorrect"}`;
  $("#resultIcon").textContent = correct ? "✓" : "×";
  $("#resultTitle").textContent = correct ? "בול! צדקתם" : "לא הפעם";
  $("#quizCard").classList.add(correct ? "is-correct" : "is-incorrect");

  const sourceLink = $("#resultSource");
  if (state.currentQuiz.real) {
    $("#resultExplanation").textContent = `זהו תירוץ אמיתי המיוחס ל${state.currentQuiz.attribution}.`;
    sourceLink.href = state.currentQuiz.source;
    sourceLink.hidden = false;
  } else {
    $("#resultExplanation").textContent = state.currentQuiz.explanation;
    sourceLink.hidden = true;
  }
  $("#nextQuestion").hidden = false;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

async function shareAnswer() {
  if (!state.currentAnswer) return;
  const text = `${state.currentAnswer.title}\n${state.currentAnswer.text}\n— ${state.currentAnswer.attribution}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "תירוץ לקושיית הבית יוסף", text, url: location.href });
    } else {
      await navigator.clipboard.writeText(`${text}\n${location.href}`);
      showToast("התירוץ הועתק ללוח");
    }
  } catch (error) {
    if (error.name !== "AbortError") showToast("לא הצלחנו לשתף כרגע");
  }
}

function openDialog() {
  const dialog = $("#infoDialog");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

buildMenorah();
refillAnswerDeck();
showNextAnswer(true);
updateScore();

$$(".mode-tab").forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
$("#nextAnswer").addEventListener("click", () => showNextAnswer());
$("#shareButton").addEventListener("click", shareAnswer);
$$('[data-guess]').forEach((button) => button.addEventListener("click", () => answerQuiz(button.dataset.guess === "true")));
$("#nextQuestion").addEventListener("click", nextQuiz);
$("#resetScore").addEventListener("click", () => {
  state.score = 0;
  state.attempts = 0;
  updateScore();
  showToast("הניקוד אופס");
});
$("#aboutButton").addEventListener("click", openDialog);
$("#sourcesButton").addEventListener("click", openDialog);
$("#dialogClose").addEventListener("click", () => $("#infoDialog").close());
$("#infoDialog").addEventListener("click", (event) => {
  if (event.target === $("#infoDialog")) $("#infoDialog").close();
});

document.addEventListener("keydown", (event) => {
  if (!$("#gamePanel").hidden && !state.answered && ["1", "2"].includes(event.key)) {
    answerQuiz(event.key === "1");
  }
});
