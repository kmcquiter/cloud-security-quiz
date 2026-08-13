
const LETTERS = ["A","B","C","D"];
const STORAGE_KEY = "ccsp_quiz_scores_v1";
const THEME_KEY = "ccsp_quiz_theme_v1";

let state = {
  view: "domains",
  domainId: null,
  mode: null,
  questions: [],
  current: 0,
  answers: {},
  flagged: {},
  revealed: {},
  submitted: false,
};

function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c === null || c === undefined) return;
    if (typeof c === "string") e.appendChild(document.createTextNode(c));
    else e.appendChild(c);
  });
  return e;
}

function loadScores() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveScore(record) {
  const scores = loadScores();
  scores.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores.slice(0, 100)));
}

function applyTheme() {
  const theme = localStorage.getItem(THEME_KEY) || "dark";
  document.body.classList.toggle("light", theme === "light");
}
function toggleTheme() {
  const theme = localStorage.getItem(THEME_KEY) || "dark";
  localStorage.setItem(THEME_KEY, theme === "light" ? "dark" : "light");
  applyTheme();
  render();
}

function domainList() {
  return Object.values(QUIZ_DATA);
}

function topBar(subtitle) {
  const theme = localStorage.getItem(THEME_KEY) || "dark";
  return el("div", { class: "topbar" }, [
    el("div", {}, [
      el("h1", {}, "Managing Cloud Security Quiz"),
      subtitle ? el("div", { class: "sub" }, subtitle) : null,
    ]),
    el("button", { class: "theme-toggle", onclick: toggleTheme },
      theme === "light" ? "\u2600\ufe0f Light" : "\ud83c\udf19 Dark"),
  ]);
}

function goDomains() {
  state.view = "domains";
  state.domainId = null;
  render();
}

function goModeSelect(domainId) {
  state.view = "modeSelect";
  state.domainId = domainId;
  render();
}

function startQuiz(mode) {
  const domain = QUIZ_DATA[state.domainId];
  state.mode = mode;
  state.questions = domain.questions;
  state.current = 0;
  state.answers = {};
  state.flagged = {};
  state.revealed = {};
  state.submitted = false;
  state.view = "quiz";
  render();
}

function renderDomains() {
  const container = el("div");
  container.appendChild(topBar());
  container.appendChild(el("div", { class: "center-meta" },
    `${domainList().reduce((s,d)=>s+d.questions.length,0)} questions across ${domainList().length} domains \u00b7 Choose a domain to practice`));

  const grid = el("div", { class: "domain-grid" });
  domainList().forEach(d => {
    grid.appendChild(el("div", {
      class: "domain-card",
      onclick: () => goModeSelect(d.id),
    }, [
      el("span", { class: "dnum" }, d.id.replace("D", "Domain ")),
      el("h3", {}, d.name),
      el("div", { class: "qcount" }, `${d.questions.length} questions`),
    ]));
  });
  container.appendChild(grid);

  container.appendChild(el("div", { class: "center-row" }, el("button", {
    class: "ghost-btn",
    onclick: () => { state.view = "scoreHistory"; render(); }
  }, ["\ud83d\udcc8 View score history"])));

  return container;
}

function renderModeSelect() {
  const domain = QUIZ_DATA[state.domainId];
  const container = el("div");
  container.appendChild(topBar());
  container.appendChild(el("div", { class: "crumb" }, [
    el("span", { class: "back-link", onclick: goDomains }, "\u2190 All domains"),
    el("span", {}, "/"),
    el("span", {}, domain.name),
  ]));
  container.appendChild(el("div", { class: "center-meta" },
    `${domain.questions.length} questions \u00b7 Choose your mode`));

  const grid = el("div", { class: "mode-grid" });
  grid.appendChild(el("div", { class: "mode-card", onclick: () => startQuiz("test") }, [
    el("div", { class: "icon" }, "\ud83d\udcdd"),
    el("h3", {}, "Test"),
    el("p", {}, "Select answers freely, flag questions to revisit, then submit for grading."),
  ]));
  grid.appendChild(el("div", { class: "mode-card", onclick: () => startQuiz("practice") }, [
    el("div", { class: "icon" }, "\ud83d\udcda"),
    el("h3", {}, "Practice"),
    el("p", {}, "Show/hide answers, flag questions to revisit. No score."),
  ]));
  container.appendChild(grid);

  container.appendChild(el("div", { class: "center-row" }, el("button", {
    class: "ghost-btn",
    onclick: () => { state.view = "scoreHistory"; render(); }
  }, ["\ud83d\udcc8 View score history"])));

  return container;
}

function selectChoice(qIndex, choiceIndex) {
  if (state.mode === "test" && state.submitted) return;
  state.answers[qIndex] = choiceIndex;
  render();
}

function toggleFlag() {
  const i = state.current;
  state.flagged[i] = !state.flagged[i];
  render();
}

function toggleReveal() {
  const i = state.current;
  state.revealed[i] = !state.revealed[i];
  render();
}

function goTo(i) {
  state.current = i;
  render();
}

function nextQ() {
  if (state.current < state.questions.length - 1) { state.current++; render(); }
}
function prevQ() {
  if (state.current > 0) { state.current--; render(); }
}

function submitTest() {
  state.submitted = true;
  let correct = 0;
  state.questions.forEach((q, i) => {
    if (state.answers[i] === q.answerIndex) correct++;
  });
  const total = state.questions.length;
  const pct = Math.round((correct/total)*100);
  const domain = QUIZ_DATA[state.domainId];
  saveScore({
    domain: domain.name,
    domainId: domain.id,
    correct, total, pct,
    date: new Date().toISOString(),
  });
  state.view = "results";
  render();
}

function renderQuizNav() {
  const total = state.questions.length;
  const grid = el("div", { class: "grid-nav" });
  for (let i = 0; i < total; i++) {
    const classes = ["gcell"];
    if (i === state.current) classes.push("current");
    if (state.answers[i] !== undefined) classes.push("answered");
    if (state.flagged[i]) classes.push("flagged");
    grid.appendChild(el("div", { class: classes.join(" "), onclick: () => goTo(i) }, String(i+1)));
  }
  return grid;
}

function renderQuiz() {
  const domain = QUIZ_DATA[state.domainId];
  const q = state.questions[state.current];
  const total = state.questions.length;
  const i = state.current;
  const container = el("div");
  container.appendChild(topBar());

  const progress = el("div", { class: "progressbar" }, el("div", { style: `width:${((i+1)/total)*100}%` }));
  container.appendChild(progress);

  container.appendChild(el("span", { class: `badge ${state.mode}` }, state.mode === "test" ? "Test" : "Practice"));
  container.appendChild(el("div", { class: "qmeta" }, `Question ${i+1} of ${total} \u00b7 ${domain.name}`));
  container.appendChild(el("div", { class: "qtext" }, q.question));

  const selected = state.answers[i];
  const showAnswer = state.mode === "practice" ? !!state.revealed[i] : state.submitted;

  q.choices.forEach((choice, idx) => {
    const classes = ["choice"];
    if (selected === idx) classes.push("selected");
    if (showAnswer) {
      if (idx === q.answerIndex) classes.push("correct");
      else if (selected === idx && idx !== q.answerIndex) classes.push("incorrect");
    }
    const disabled = state.mode === "test" && state.submitted;
    container.appendChild(el("button", {
      class: classes.join(" "),
      disabled: disabled ? "disabled" : null,
      onclick: () => selectChoice(i, idx),
    }, `${LETTERS[idx]}) ${choice}`));
  });

  if (state.mode === "test") {
    container.appendChild(el("div", { class: "hint" },
      state.submitted ? "Test submitted \u2014 review your answers below." : "Select an answer \u2014 you can change it before submitting"));
  } else {
    container.appendChild(el("div", { class: "hint" }, "Practice mode \u2014 no score is recorded."));
  }

  const navRow = el("div", { class: "nav-row" });
  const leftBtns = el("div", { class: "nav-left" }, [
    el("button", { class: "btn", onclick: () => { state.view = "modeSelect"; render(); } }, "\u2318 Menu"),
    el("button", {
      class: `btn ${state.flagged[i] ? "flagged" : ""}`,
      onclick: toggleFlag,
    }, `\u2691 ${state.flagged[i] ? "Flagged" : "Flag"}`),
  ]);
  if (state.mode === "practice") {
    leftBtns.appendChild(el("button", { class: "btn", onclick: toggleReveal },
      state.revealed[i] ? "\ud83d\ude48 Hide answer" : "\ud83d\udc41 Show answer"));
  }
  const rightBtns = el("div", { class: "nav-right" }, [
    el("button", { class: "btn", disabled: i === 0 ? "disabled" : null, onclick: prevQ }, "\u2190 Back"),
    i === total - 1
      ? (state.mode === "test"
          ? el("button", { class: "btn primary", disabled: state.submitted ? "disabled" : null, onclick: submitTest }, "Submit \u2713")
          : el("button", { class: "btn primary", onclick: () => { state.view = "modeSelect"; render(); } }, "Finish"))
      : el("button", { class: "btn primary", onclick: nextQ }, "Next \u2192"),
  ]);
  navRow.appendChild(leftBtns);
  navRow.appendChild(rightBtns);
  container.appendChild(navRow);

  container.appendChild(renderQuizNav());
  container.appendChild(el("div", { class: "legend" }, [
    el("span", {}, [el("span", { class: "dot flag" }), "Flagged for review"]),
    el("span", {}, [el("span", { class: "dot ans" }), "Answered"]),
  ]));

  if (state.mode === "test" && !state.submitted) {
    container.appendChild(el("div", { class: "center-row", style: "margin-top:20px;" },
      el("button", { class: "btn primary", onclick: submitTest }, "Submit test for grading")));
  }

  return container;
}

function renderResults() {
  const domain = QUIZ_DATA[state.domainId];
  const total = state.questions.length;
  let correct = 0;
  state.questions.forEach((q, i) => { if (state.answers[i] === q.answerIndex) correct++; });
  const pct = Math.round((correct/total)*100);

  const container = el("div");
  container.appendChild(topBar());
  container.appendChild(el("div", { class: "crumb" }, [
    el("span", { class: "back-link", onclick: goDomains }, "\u2190 All domains"),
    el("span", {}, "/"),
    el("span", {}, domain.name),
  ]));

  container.appendChild(el("div", { class: "result-summary" }, [
    el("div", {}, "Your score"),
    el("div", { class: "score" }, `${correct} / ${total}`),
    el("div", { class: "pct" }, `${pct}% correct`),
  ]));

  state.questions.forEach((q, i) => {
    const userIdx = state.answers[i];
    const isCorrect = userIdx === q.answerIndex;
    const item = el("div", { class: "review-item" });
    item.appendChild(el("div", { class: "rq" }, `${i+1}. ${q.question}`));
    item.appendChild(el("div", { class: `ra ${isCorrect ? "correct" : "incorrect"}` },
      `Your answer: ${userIdx !== undefined ? LETTERS[userIdx] + ") " + q.choices[userIdx] : "\u2014 not answered \u2014"}`));
    if (!isCorrect) {
      item.appendChild(el("div", { class: "ra correct" }, `Correct answer: ${LETTERS[q.answerIndex]}) ${q.choices[q.answerIndex]}`));
    }
    container.appendChild(item);
  });

  container.appendChild(el("div", { class: "center-row", style: "margin-top:20px; gap:12px;" }, [
    el("button", { class: "btn primary", onclick: () => goModeSelect(domain.id) }, "Back to domain menu"),
    el("button", { class: "btn", onclick: goDomains }, "All domains"),
  ]));

  return container;
}

function renderScoreHistory() {
  const scores = loadScores();
  const container = el("div");
  container.appendChild(topBar());
  container.appendChild(el("div", { class: "crumb" }, [
    el("span", { class: "back-link", onclick: goDomains }, "\u2190 All domains"),
  ]));
  container.appendChild(el("h2", {}, "Score history"));

  if (scores.length === 0) {
    container.appendChild(el("div", { class: "empty-state" }, "No test attempts recorded yet. Complete a Test mode quiz to see your results here."));
    return container;
  }

  const table = el("table", { class: "score-table" });
  const thead = el("tr", {}, [
    el("th", {}, "Date"),
    el("th", {}, "Domain"),
    el("th", {}, "Score"),
    el("th", {}, "Percent"),
  ]);
  table.appendChild(el("thead", {}, thead));
  const tbody = el("tbody");
  scores.forEach(s => {
    const d = new Date(s.date);
    tbody.appendChild(el("tr", {}, [
      el("td", {}, d.toLocaleString()),
      el("td", {}, s.domain),
      el("td", {}, `${s.correct} / ${s.total}`),
      el("td", {}, `${s.pct}%`),
    ]));
  });
  table.appendChild(tbody);
  container.appendChild(table);

  return container;
}

function render() {
  applyTheme();
  const app = document.getElementById("app");
  app.innerHTML = "";
  let content;
  switch (state.view) {
    case "domains": content = renderDomains(); break;
    case "modeSelect": content = renderModeSelect(); break;
    case "quiz": content = renderQuiz(); break;
    case "results": content = renderResults(); break;
    case "scoreHistory": content = renderScoreHistory(); break;
    default: content = renderDomains();
  }
  app.appendChild(content);
}

render();
