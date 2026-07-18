import { trackGameEvent } from './gamelab.js';

const ROUND_COUNT = 5;
const ROUND_SECONDS = 30;
const BASE_POINTS = 100;
const TIME_BONUS_PER_SECOND = 2;
const WRONG_ANSWER_PENALTY_SECONDS = 3;

const WORDS = Object.freeze([
  {
    word: 'ملعب',
    category: 'مكان',
    clue: 'مكان نلعب ونتنافس فيه',
  },
  {
    word: 'كتاب',
    category: 'شيء يومي',
    clue: 'نقرأ صفحاته لنتعلم أو نستمتع',
  },
  {
    word: 'شمس',
    category: 'الطبيعة',
    clue: 'تضيء السماء في النهار',
  },
  {
    word: 'قمر',
    category: 'الطبيعة',
    clue: 'نراه مضيئًا في السماء ليلًا',
  },
  {
    word: 'مدرسة',
    category: 'مكان',
    clue: 'مكان نتعلم فيه مع المعلمين',
  },
  {
    word: 'سيارة',
    category: 'مواصلات',
    clue: 'تسير على الطريق وتنقل الركاب',
  },
  {
    word: 'مفتاح',
    category: 'شيء يومي',
    clue: 'نستخدمه لفتح الباب',
  },
  {
    word: 'هاتف',
    category: 'تقنية',
    clue: 'نتصل ونتصفح الإنترنت من خلاله',
  },
  {
    word: 'مطر',
    category: 'الطقس',
    clue: 'قطرات ماء تنزل من السحاب',
  },
  {
    word: 'بحر',
    category: 'الطبيعة',
    clue: 'مساحة واسعة من الماء المالح',
  },
  {
    word: 'كرسي',
    category: 'شيء يومي',
    clue: 'نجلس عليه في المنزل أو العمل',
  },
  {
    word: 'حديقة',
    category: 'مكان',
    clue: 'مكان أخضر نذهب إليه للنزهة',
  },
  {
    word: 'نافذة',
    category: 'المنزل',
    clue: 'نرى الخارج من خلالها',
  },
  {
    word: 'قطار',
    category: 'مواصلات',
    clue: 'يسير على سكة وينقل المسافرين',
  },
]);

function shuffle(items) {
  const shuffledItems = [...items];

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffledItems[index], shuffledItems[randomIndex]] = [
      shuffledItems[randomIndex],
      shuffledItems[index],
    ];
  }

  return shuffledItems;
}

function createLetterSet(word) {
  const letters = Array.from(word).map((character, sourceIndex) => ({
    character,
    sourceIndex,
  }));
  const shuffledLetters = shuffle(letters);
  const shuffledWord = shuffledLetters.map(({ character }) => character).join('');

  if (shuffledWord === word && shuffledLetters.length > 1) {
    [shuffledLetters[0], shuffledLetters[1]] = [
      shuffledLetters[1],
      shuffledLetters[0],
    ];
  }

  return shuffledLetters;
}

function setFeedback(element, message, state = '') {
  element.textContent = message;
  element.classList.remove('is-correct', 'is-wrong');

  if (state) {
    element.classList.add(state);
  }
}

function getResultCopy(score, maximumScore) {
  const scoreRatio = score / maximumScore;

  if (scoreRatio >= 0.82) {
    return {
      title: 'خبير الكلمات!',
      message: 'سرعة ممتازة وترتيب دقيق. حاول الآن الوصول إلى النتيجة الكاملة.',
    };
  }

  if (scoreRatio >= 0.58) {
    return {
      title: 'نتيجة قوية!',
      message: 'أكملت التحدي جيدًا. جولة أسرع قد ترفع نتيجتك كثيرًا.',
    };
  }

  if (scoreRatio >= 0.32) {
    return {
      title: 'بداية جيدة!',
      message: 'أصبحت تعرف طريقة اللعب. أعد التحدي وركّز على التلميح أولًا.',
    };
  }

  return {
    title: 'جرّب جولة أخرى',
    message: 'لا بأس. خذ ثانية لقراءة التلميح ثم رتّب الحروف بهدوء.',
  };
}

function initWordChallenge() {
  const root = document.querySelector('[data-word-game]');

  if (!root) {
    return;
  }

  const elements = {
    round: root.querySelector('[data-word-round]'),
    roundTotal: root.querySelector('[data-word-round-total]'),
    score: root.querySelector('[data-word-score]'),
    timer: root.querySelector('[data-word-timer]'),
    category: root.querySelector('[data-word-category]'),
    clue: root.querySelector('[data-word-clue]'),
    answer: root.querySelector('[data-word-answer]'),
    letters: root.querySelector('[data-word-letters]'),
    deleteButton: root.querySelector('[data-word-delete]'),
    clearButton: root.querySelector('[data-word-clear]'),
    submitButton: root.querySelector('[data-word-submit]'),
    feedback: root.querySelector('[data-word-feedback]'),
    board: root.querySelector('[data-word-board]'),
    result: root.querySelector('[data-word-result]'),
    resultTitle: root.querySelector('[data-word-result-title]'),
    finalScore: root.querySelector('[data-word-final-score]'),
    resultMessage: root.querySelector('[data-word-result-message]'),
    replayButton: root.querySelector('[data-word-replay]'),
  };

  if (Object.values(elements).some((element) => !element)) {
    console.warn('تعذر تشغيل لعبة كوّن الكلمة لأن بعض عناصر الصفحة مفقودة.');
    return;
  }

  const timerStatus = elements.timer.closest('.game-status-item');
  const maximumScore =
    ROUND_COUNT * (BASE_POINTS + ROUND_SECONDS * TIME_BONUS_PER_SECOND);

  let rounds = [];
  let currentRoundIndex = 0;
  let currentLetters = [];
  let selectedLetterIndexes = [];
  let score = 0;
  let deadline = 0;
  let timerId = 0;
  let transitionId = 0;
  let roundLocked = false;

  function getCurrentRound() {
    return rounds[currentRoundIndex];
  }

  function stopTimer() {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = 0;
    }
  }

  function stopTransition() {
    if (transitionId) {
      window.clearTimeout(transitionId);
      transitionId = 0;
    }
  }

  function getSecondsLeft() {
    return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  }

  function updateTimerDisplay() {
    const secondsLeft = getSecondsLeft();
    elements.timer.textContent = String(secondsLeft);
    timerStatus?.classList.toggle('is-warning', secondsLeft <= 10);

    return secondsLeft;
  }

  function setControlsDisabled(disabled) {
    elements.deleteButton.disabled = disabled;
    elements.clearButton.disabled = disabled;
    elements.submitButton.disabled = disabled;

    elements.letters.querySelectorAll('button').forEach((button) => {
      const isUsed = button.classList.contains('is-used');
      button.disabled = disabled || isUsed;
    });
  }

  function renderAnswer() {
    elements.answer.replaceChildren();

    if (!selectedLetterIndexes.length) {
      const placeholder = document.createElement('span');
      placeholder.className = 'word-game__answer-placeholder';
      placeholder.textContent = 'ستظهر إجابتك هنا';
      elements.answer.append(placeholder);
      return;
    }

    selectedLetterIndexes.forEach((letterIndex) => {
      const selectedLetter = currentLetters[letterIndex];
      const letter = document.createElement('span');
      letter.textContent = selectedLetter.character;
      elements.answer.append(letter);
    });
  }

  function renderLetters() {
    elements.letters.replaceChildren();

    currentLetters.forEach(({ character }, letterIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.letterIndex = String(letterIndex);
      button.setAttribute('aria-label', `اختر حرف ${character}`);
      button.textContent = character;
      elements.letters.append(button);
    });
  }

  function resetSelectedLetters() {
    selectedLetterIndexes = [];

    elements.letters.querySelectorAll('button').forEach((button) => {
      button.disabled = false;
      button.classList.remove('is-used');
    });

    renderAnswer();
  }

  function revealCorrectWord() {
    const orderedLetterIndexes = Array.from(getCurrentRound().word).map(
      (_, sourceIndex) => {
        return currentLetters.findIndex((letter) => {
          return letter.sourceIndex === sourceIndex;
        });
      },
    );

    selectedLetterIndexes = orderedLetterIndexes;
    renderAnswer();
  }

  function scheduleNextRound(delay) {
    stopTransition();
    root.classList.add('is-busy');

    transitionId = window.setTimeout(() => {
      root.classList.remove('is-busy');
      currentRoundIndex += 1;

      if (currentRoundIndex >= ROUND_COUNT) {
        finishGame();
        return;
      }

      startRound();
    }, delay);
  }

  function completeRound(result, roundPoints = 0) {
    roundLocked = true;
    stopTimer();
    setControlsDisabled(true);

    trackGameEvent('gamelab_round_complete', {
      game_name: 'word_challenge',
      round_number: currentRoundIndex + 1,
      round_result: result,
      round_score: roundPoints,
      total_score: score,
      seconds_left: getSecondsLeft(),
    });
  }

  function handleTimeout() {
    if (roundLocked) {
      return;
    }

    completeRound('timeout');
    revealCorrectWord();
    setFeedback(
      elements.feedback,
      `انتهى الوقت. الكلمة الصحيحة: ${getCurrentRound().word}`,
      'is-wrong',
    );
    scheduleNextRound(1500);
  }

  function updateTimer() {
    const secondsLeft = updateTimerDisplay();

    if (secondsLeft <= 0) {
      handleTimeout();
    }
  }

  function startTimer() {
    stopTimer();
    deadline = Date.now() + ROUND_SECONDS * 1000;
    updateTimerDisplay();
    timerId = window.setInterval(updateTimer, 250);
  }

  function startRound() {
    const round = getCurrentRound();
    currentLetters = createLetterSet(round.word);
    selectedLetterIndexes = [];
    roundLocked = false;

    elements.round.textContent = String(currentRoundIndex + 1);
    elements.category.textContent = round.category;
    elements.clue.textContent = round.clue;
    setFeedback(elements.feedback, '');
    renderAnswer();
    renderLetters();
    setControlsDisabled(false);
    startTimer();
  }

  function finishGame() {
    stopTimer();
    stopTransition();
    roundLocked = true;

    const resultCopy = getResultCopy(score, maximumScore);
    elements.finalScore.textContent = String(score);
    elements.resultTitle.textContent = resultCopy.title;
    elements.resultMessage.textContent = resultCopy.message;
    elements.board.hidden = true;
    elements.result.hidden = false;

    trackGameEvent('gamelab_game_complete', {
      game_name: 'word_challenge',
      final_score: score,
      maximum_score: maximumScore,
      completed_rounds: ROUND_COUNT,
    });
  }

  function startGame(isReplay = false) {
    stopTimer();
    stopTransition();

    rounds = shuffle(WORDS).slice(0, ROUND_COUNT);
    currentRoundIndex = 0;
    score = 0;
    elements.score.textContent = '0';
    elements.roundTotal.textContent = String(ROUND_COUNT);
    elements.board.hidden = false;
    elements.result.hidden = true;
    root.classList.remove('is-busy');

    trackGameEvent(
      isReplay ? 'gamelab_game_replay' : 'gamelab_game_start',
      {
        game_name: 'word_challenge',
        total_rounds: ROUND_COUNT,
      },
    );

    startRound();
  }

  function selectLetter(button) {
    if (roundLocked || button.disabled) {
      return;
    }

    const letterIndex = Number(button.dataset.letterIndex);

    if (!Number.isInteger(letterIndex) || !currentLetters[letterIndex]) {
      return;
    }

    selectedLetterIndexes.push(letterIndex);
    button.disabled = true;
    button.classList.add('is-used');
    setFeedback(elements.feedback, '');
    renderAnswer();
  }

  function deleteLastLetter() {
    if (roundLocked || !selectedLetterIndexes.length) {
      return;
    }

    const removedLetterIndex = selectedLetterIndexes.pop();
    const button = elements.letters.querySelector(
      `[data-letter-index="${removedLetterIndex}"]`,
    );

    if (button) {
      button.disabled = false;
      button.classList.remove('is-used');
    }

    setFeedback(elements.feedback, '');
    renderAnswer();
  }

  function submitAnswer() {
    if (roundLocked) {
      return;
    }

    const round = getCurrentRound();
    const answer = selectedLetterIndexes
      .map((letterIndex) => currentLetters[letterIndex].character)
      .join('');

    if (!answer) {
      setFeedback(elements.feedback, 'اختر الحروف أولًا ثم اضغط تحقّق.', 'is-wrong');
      return;
    }

    if (answer.length < Array.from(round.word).length) {
      setFeedback(elements.feedback, 'أكمل جميع الحروف قبل التحقّق.', 'is-wrong');
      return;
    }

    if (answer !== round.word) {
      deadline -= WRONG_ANSWER_PENALTY_SECONDS * 1000;
      updateTimerDisplay();
      setFeedback(
        elements.feedback,
        `الترتيب غير صحيح. خُصمت ${WRONG_ANSWER_PENALTY_SECONDS} ثوانٍ.`,
        'is-wrong',
      );
      return;
    }

    const secondsLeft = getSecondsLeft();
    const roundPoints =
      BASE_POINTS + secondsLeft * TIME_BONUS_PER_SECOND;
    score += roundPoints;
    elements.score.textContent = String(score);

    completeRound('correct', roundPoints);
    setFeedback(
      elements.feedback,
      `إجابة صحيحة! ربحت ${roundPoints} نقطة.`,
      'is-correct',
    );
    scheduleNextRound(1000);
  }

  elements.letters.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const button = event.target.closest('button[data-letter-index]');

    if (button) {
      selectLetter(button);
    }
  });

  elements.deleteButton.addEventListener('click', deleteLastLetter);
  elements.clearButton.addEventListener('click', () => {
    if (!roundLocked) {
      resetSelectedLetters();
      setFeedback(elements.feedback, '');
    }
  });
  elements.submitButton.addEventListener('click', submitAnswer);
  elements.replayButton.addEventListener('click', () => startGame(true));

  startGame();
}

document.addEventListener('DOMContentLoaded', initWordChallenge);
