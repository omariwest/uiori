import { trackGameEvent } from './gamelab.js';

const STATE_VERSION = 1;
const TOTAL_QUESTIONS = 7;
const GAMEPLAY_KEY = 'uiori:gamelab:quick-quiz:v1';
const ATTRIBUTION_KEY = 'uiori:gamelab:quick-quiz:attribution:v1';
const ATTRIBUTION_KEYS = Object.freeze([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'pa_campaign_id',
  'pa_zone_id',
  'pa_subzone_id',
  'pa_click_id',
  'pa_creative_id',
  'pa_cost',
  'pa_country',
  'pa_format',
]);
const QUESTIONS = Object.freeze([
  {
    id: 'question_1',
    correctAnswerId: 'q1_hole',
    answerIds: ['q1_hole', 'q1_sea', 'q1_book', 'q1_time'],
  },
  {
    id: 'question_2',
    correctAnswerId: 'q2_32',
    answerIds: ['q2_18', 'q2_24', 'q2_32', 'q2_64'],
  },
  {
    id: 'question_3',
    correctAnswerId: 'q3_uncertain',
    answerIds: ['q3_yes', 'q3_no', 'q3_uncertain', 'q3_night'],
  },
  {
    id: 'question_4',
    correctAnswerId: 'q4_rabat',
    answerIds: ['q4_casablanca', 'q4_marrakesh', 'q4_rabat', 'q4_fes'],
  },
  {
    id: 'question_5',
    correctAnswerId: 'q5_three',
    answerIds: ['q5_two', 'q5_three', 'q5_four', 'q5_five'],
  },
  {
    id: 'question_6',
    correctAnswerId: 'q6_carrot',
    answerIds: ['q6_apple', 'q6_banana', 'q6_orange', 'q6_carrot'],
  },
  {
    id: 'question_7',
    correctAnswerId: 'q7_four',
    answerIds: ['q7_three', 'q7_four', 'q7_six', 'q7_seven'],
  },
]);

function getSessionStorage() {
  try {
    const storage = window.sessionStorage;
    const testKey = `${GAMEPLAY_KEY}:test`;
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return storage;
  } catch {
    return null;
  }
}

const storage = getSessionStorage();

function createAttemptId() {
  try {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    const randomBytes = new Uint32Array(4);
    crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes, (value) => value.toString(16)).join('-');
  } catch {
    return `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 14)}`;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeTimestamp(value, fallback) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function createState() {
  return {
    version: STATE_VERSION,
    attemptId: createAttemptId(),
    startedTimestamp: Date.now(),
    currentAllowedStep: 1,
    selectedAnswerIds: {},
    correctnessRecords: {},
    score: 0,
    currentStreak: 0,
    bestStreak: 0,
    isComplete: false,
    completedTimestamp: null,
    eventMarkers: {
      answers: [],
      complete: false,
    },
  };
}

function sanitizeState(candidate) {
  if (
    !isPlainObject(candidate) ||
    candidate.version !== STATE_VERSION ||
    typeof candidate.attemptId !== 'string' ||
    !/^[a-zA-Z0-9-]{8,100}$/.test(candidate.attemptId) ||
    !isPlainObject(candidate.selectedAnswerIds) ||
    !isPlainObject(candidate.correctnessRecords)
  ) {
    return null;
  }

  const selectedAnswerIds = {};
  const correctnessRecords = {};
  let score = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  let answeredCount = 0;

  for (const question of QUESTIONS) {
    const answerId = candidate.selectedAnswerIds[question.id];

    if (!question.answerIds.includes(answerId)) {
      break;
    }

    const isCorrect = answerId === question.correctAnswerId;
    selectedAnswerIds[question.id] = answerId;
    correctnessRecords[question.id] = isCorrect;
    answeredCount += 1;

    if (isCorrect) {
      score += 1;
      currentStreak += 1;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  const isComplete = answeredCount === TOTAL_QUESTIONS;
  const startedTimestamp = sanitizeTimestamp(
    candidate.startedTimestamp,
    Date.now(),
  );
  const completedTimestamp = isComplete
    ? Math.max(
        startedTimestamp,
        sanitizeTimestamp(candidate.completedTimestamp, Date.now()),
      )
    : null;
  const rawMarkers = isPlainObject(candidate.eventMarkers)
    ? candidate.eventMarkers
    : {};
  const answerMarkers = Array.isArray(rawMarkers.answers)
    ? rawMarkers.answers.filter((questionId, index, values) => {
        return (
          typeof questionId === 'string' &&
          Object.prototype.hasOwnProperty.call(selectedAnswerIds, questionId) &&
          values.indexOf(questionId) === index
        );
      })
    : [];

  return {
    version: STATE_VERSION,
    attemptId: candidate.attemptId,
    startedTimestamp,
    currentAllowedStep: isComplete
      ? TOTAL_QUESTIONS + 1
      : answeredCount + 1,
    selectedAnswerIds,
    correctnessRecords,
    score,
    currentStreak,
    bestStreak,
    isComplete,
    completedTimestamp,
    eventMarkers: {
      answers: answerMarkers,
      complete: isComplete && rawMarkers.complete === true,
    },
  };
}

function readState() {
  if (!storage) {
    return null;
  }

  try {
    const rawState = storage.getItem(GAMEPLAY_KEY);

    if (!rawState) {
      return null;
    }

    const state = sanitizeState(JSON.parse(rawState));

    if (!state) {
      storage.removeItem(GAMEPLAY_KEY);
    }

    return state;
  } catch {
    try {
      storage.removeItem(GAMEPLAY_KEY);
    } catch {
      // Storage failures are handled by the recovery interface.
    }

    return null;
  }
}

function saveState(state) {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(GAMEPLAY_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function sanitizeAttribution(candidate) {
  const values = {};
  const rawValues =
    isPlainObject(candidate) && isPlainObject(candidate.values)
      ? candidate.values
      : {};

  for (const key of ATTRIBUTION_KEYS) {
    const value = rawValues[key];

    if (typeof value !== 'string') {
      continue;
    }

    const cleanValue = value.trim().slice(0, 200);

    if (cleanValue) {
      values[key] = cleanValue;
    }
  }

  return {
    version: STATE_VERSION,
    values,
  };
}

function readAttribution() {
  if (!storage) {
    return sanitizeAttribution(null);
  }

  try {
    const rawAttribution = storage.getItem(ATTRIBUTION_KEY);
    return rawAttribution
      ? sanitizeAttribution(JSON.parse(rawAttribution))
      : sanitizeAttribution(null);
  } catch {
    return sanitizeAttribution(null);
  }
}

function captureAttribution() {
  const attribution = readAttribution();
  const search = new URLSearchParams(window.location.search);

  for (const key of ATTRIBUTION_KEYS) {
    if (Object.prototype.hasOwnProperty.call(attribution.values, key)) {
      continue;
    }

    const value = search.get(key);
    const cleanValue = typeof value === 'string' ? value.trim().slice(0, 200) : '';

    if (cleanValue) {
      attribution.values[key] = cleanValue;
    }
  }

  if (storage) {
    try {
      storage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
    } catch {
      // The quiz recovery interface handles unavailable cross-page storage.
    }
  }

  return attribution.values;
}

function appendAttribution(path, attribution) {
  const url = new URL(path, window.location.origin);

  for (const key of ATTRIBUTION_KEYS) {
    if (attribution[key]) {
      url.searchParams.set(key, attribution[key]);
    }
  }

  return `${url.pathname}${url.search}`;
}

function updateAttributedLinks(attribution) {
  document.querySelectorAll('[data-quiz-attribution-link]').forEach((link) => {
    const cleanPath = link.getAttribute('href');

    if (cleanPath) {
      link.setAttribute('href', appendAttribution(cleanPath, attribution));
    }
  });
}

function questionPath(questionNumber) {
  return questionNumber === 1
    ? '/gamelab/quick-quiz/'
    : `/gamelab/quick-quiz/${questionNumber}/`;
}

function redirectToStep(step, attribution) {
  const path =
    step > TOTAL_QUESTIONS
      ? '/gamelab/quick-quiz/result/'
      : questionPath(step);
  window.location.replace(appendAttribution(path, attribution));
}

function showRecovery(root) {
  root.innerHTML = `
    <div class="quick-quiz-recovery" role="alert">
      <h2>تعذّر حفظ تقدّم الاختبار</h2>
      <p>يلزم السماح بالتخزين المؤقت في المتصفح للانتقال بين الأسئلة.</p>
      <a
        class="btn btn-primary"
        href="/gamelab/quick-quiz/"
        data-gamelab-track-ignore
      >ابدأ الاختبار من جديد</a>
    </div>
  `;
}

function getResultLevel(score) {
  if (score <= 2) {
    return 'بداية جيدة';
  }

  if (score <= 4) {
    return 'نتيجة جيدة';
  }

  if (score <= 6) {
    return 'نتيجة قوية';
  }

  return 'النتيجة الكاملة';
}

function getCompletionTime(state) {
  return Math.max(0, state.completedTimestamp - state.startedTimestamp);
}

function formatCompletionTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds} ثانية`;
  }

  return `${minutes} د ${seconds} ث`;
}

function renderAnsweredQuestion(root, state, questionNumber) {
  const question = QUESTIONS[questionNumber - 1];
  const selectedAnswerId = state.selectedAnswerIds[question.id];

  if (!selectedAnswerId) {
    return;
  }

  const selectedButton = root.querySelector(
    `[data-answer-id="${selectedAnswerId}"]`,
  );
  const correctButton = root.querySelector(
    `[data-answer-id="${question.correctAnswerId}"]`,
  );
  const feedback = root.querySelector('[data-quiz-feedback]');
  const continueLink = root.querySelector('[data-quiz-continue]');
  const isCorrect = state.correctnessRecords[question.id];

  root.querySelectorAll('[data-answer-id]').forEach((button) => {
    button.disabled = true;
    button.setAttribute(
      'aria-pressed',
      button === selectedButton ? 'true' : 'false',
    );
  });

  correctButton?.classList.add('is-correct');

  if (selectedButton && !isCorrect) {
    selectedButton.classList.add('is-incorrect');
  }

  if (feedback) {
    feedback.className = `quick-quiz-feedback ${
      isCorrect ? 'is-correct' : 'is-incorrect'
    }`;
    feedback.textContent = isCorrect
      ? 'إجابة صحيحة. أحسنت!'
      : `إجابة غير صحيحة. الإجابة الصحيحة: ${
          correctButton?.textContent.trim() || ''
        }`;
  }

  if (continueLink) {
    continueLink.hidden = false;
  }
}

function answerQuestion(root, state, questionNumber, answerButton, attribution) {
  const question = QUESTIONS[questionNumber - 1];

  if (state.selectedAnswerIds[question.id]) {
    return;
  }

  const answerId = answerButton.dataset.answerId;

  if (!question.answerIds.includes(answerId)) {
    return;
  }

  const isCorrect = answerId === question.correctAnswerId;
  state.selectedAnswerIds[question.id] = answerId;
  state.correctnessRecords[question.id] = isCorrect;
  state.score += isCorrect ? 1 : 0;
  state.currentStreak = isCorrect ? state.currentStreak + 1 : 0;
  state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
  state.currentAllowedStep = Math.min(questionNumber + 1, TOTAL_QUESTIONS + 1);

  if (questionNumber === TOTAL_QUESTIONS) {
    state.isComplete = true;
    state.completedTimestamp = Date.now();
  }

  const shouldTrackAnswer = !state.eventMarkers.answers.includes(question.id);

  if (shouldTrackAnswer) {
    state.eventMarkers.answers.push(question.id);
  }

  if (!saveState(state)) {
    showRecovery(root);
    return;
  }

  root.querySelector('[data-quiz-score]').textContent = String(state.score);
  root.querySelector('[data-quiz-streak]').textContent = String(
    state.currentStreak,
  );
  renderAnsweredQuestion(root, state, questionNumber);

  if (shouldTrackAnswer) {
    trackGameEvent('quiz_answer', {
      question_id: question.id,
      answer_id: answerId,
      question_number: questionNumber,
      is_correct: isCorrect,
      resulting_score: state.score,
      current_streak: state.currentStreak,
      best_streak: state.bestStreak,
      ...attribution,
    });
  }

  const feedback = root.querySelector('[data-quiz-feedback]');

  if (feedback) {
    feedback.focus({ preventScroll: true });
  }
}

function initQuestionPage(root, attribution) {
  const questionNumber = Number(document.body.dataset.questionNumber);

  if (!Number.isInteger(questionNumber) || !QUESTIONS[questionNumber - 1]) {
    return;
  }

  if (!storage) {
    showRecovery(root);
    return;
  }

  let state = readState();

  if (questionNumber === 1 && (!state || state.isComplete)) {
    state = createState();

    if (!saveState(state)) {
      showRecovery(root);
      return;
    }
  }

  if (!state) {
    redirectToStep(1, attribution);
    return;
  }

  if (questionNumber > state.currentAllowedStep) {
    redirectToStep(state.currentAllowedStep, attribution);
    return;
  }

  root.querySelector('[data-quiz-score]').textContent = String(state.score);
  root.querySelector('[data-quiz-streak]').textContent = String(
    state.currentStreak,
  );
  renderAnsweredQuestion(root, state, questionNumber);

  root.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const answerButton = event.target.closest('[data-answer-id]');

    if (answerButton instanceof HTMLButtonElement) {
      answerQuestion(
        root,
        state,
        questionNumber,
        answerButton,
        attribution,
      );
    }
  });

  trackGameEvent('quiz_question_view', {
    question_number: questionNumber,
    total_questions: TOTAL_QUESTIONS,
    current_score: state.score,
    current_streak: state.currentStreak,
    ...attribution,
  });
}

function initResultPage(root, attribution) {
  if (!storage) {
    showRecovery(root);
    return;
  }

  const state = readState();

  if (!state || !state.isComplete) {
    redirectToStep(state?.currentAllowedStep || 1, attribution);
    return;
  }

  const resultLevel = getResultLevel(state.score);
  const completionTime = getCompletionTime(state);
  root.querySelector('[data-quiz-final-score]').textContent = String(
    state.score,
  );
  root.querySelector('[data-quiz-result-level]').textContent = resultLevel;
  root.querySelector('[data-quiz-best-streak]').textContent = String(
    state.bestStreak,
  );
  root.querySelector('[data-quiz-completion-time]').textContent =
    formatCompletionTime(completionTime);

  if (!state.eventMarkers.complete) {
    state.eventMarkers.complete = true;

    if (saveState(state)) {
      trackGameEvent('quiz_complete', {
        final_score: state.score,
        maximum_score: TOTAL_QUESTIONS,
        result_level: resultLevel,
        best_streak: state.bestStreak,
        completion_time_ms: completionTime,
        ...attribution,
      });
    }
  }

  root.querySelector('[data-quiz-replay]')?.addEventListener('click', () => {
    trackGameEvent('quiz_replay', {
      final_score: state.score,
      result_level: resultLevel,
      best_streak: state.bestStreak,
      completion_time_ms: completionTime,
      ...attribution,
    });

    try {
      storage.removeItem(GAMEPLAY_KEY);
    } catch {
      // Natural navigation will show recovery if storage remains unavailable.
    }
  });

  document.querySelectorAll('[data-quiz-related-game]').forEach((link) => {
    link.addEventListener('click', () => {
      trackGameEvent('quiz_related_game_click', {
        target_game: link.dataset.quizRelatedGame,
        target_path: new URL(link.href, window.location.href).pathname,
        ...attribution,
      });
    });
  });
}

function initQuickQuiz() {
  const root = document.querySelector('[data-quick-quiz]');

  if (!root) {
    return;
  }

  const attribution = captureAttribution();
  updateAttributedLinks(attribution);

  if (document.body.dataset.quizPage === 'result') {
    initResultPage(root, attribution);
    return;
  }

  initQuestionPage(root, attribution);
}

document.addEventListener('DOMContentLoaded', initQuickQuiz);
