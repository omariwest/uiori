import { trackGameEvent } from './gamelab.js';

const ROUND_COUNT = 5;
const MIN_WAIT_MS = 1300;
const MAX_WAIT_MS = 3500;
const RESULT_DISPLAY_MS = 950;

function setFeedback(element, message, state = '') {
  element.textContent = message;
  element.classList.remove('is-success', 'is-false-start');

  if (state) {
    element.classList.add(state);
  }
}

function getResultCopy(bestTime, averageTime, validRounds) {
  if (!validRounds) {
    return {
      title: 'كل المحاولات كانت مبكرة',
      message: 'انتظر تحوّل الشاشة إلى الأخضر ثم اضغط فورًا.',
    };
  }

  if (bestTime <= 190 && averageTime <= 240) {
    return {
      title: 'استجابة خاطفة!',
      message: 'زمن ممتاز جدًا. أعد الاختبار لترى هل تستطيع كسر رقمك.',
    };
  }

  if (bestTime <= 250 && averageTime <= 310) {
    return {
      title: 'سرعة ممتازة!',
      message: 'استجابتك قوية ومتوازنة عبر المحاولات. حاول تحسين المتوسط.',
    };
  }

  if (bestTime <= 340) {
    return {
      title: 'نتيجة جيدة!',
      message: 'لديك استجابة جيدة. ثبّت إصبعك قريبًا وحافظ على تركيزك.',
    };
  }

  return {
    title: 'يمكنك أن تكون أسرع',
    message: 'أعد الاختبار في مكان هادئ وانتظر الإشارة دون تخمين.',
  };
}

function initReactionSpeed() {
  const root = document.querySelector('[data-reaction-game]');

  if (!root) {
    return;
  }

  const elements = {
    round: root.querySelector('[data-reaction-round]'),
    roundTotal: root.querySelector('[data-reaction-round-total]'),
    best: root.querySelector('[data-reaction-best]'),
    average: root.querySelector('[data-reaction-average]'),
    board: root.querySelector('[data-reaction-board]'),
    pad: root.querySelector('[data-reaction-pad]'),
    signal: root.querySelector('[data-reaction-signal]'),
    status: root.querySelector('[data-reaction-status]'),
    instruction: root.querySelector('[data-reaction-instruction]'),
    feedback: root.querySelector('[data-reaction-feedback]'),
    attempts: root.querySelector('[data-reaction-attempts]'),
    attemptValues: [...root.querySelectorAll('[data-reaction-attempt]')],
    result: root.querySelector('[data-reaction-result]'),
    resultTitle: root.querySelector('[data-reaction-result-title]'),
    finalBest: root.querySelector('[data-reaction-final-best]'),
    resultMessage: root.querySelector('[data-reaction-result-message]'),
    replayButton: root.querySelector('[data-reaction-replay]'),
  };

  const requiredElements = Object.values(elements).filter((element) => {
    return !Array.isArray(element);
  });

  if (
    requiredElements.some((element) => !element) ||
    elements.attemptValues.length !== ROUND_COUNT
  ) {
    console.warn('تعذر تشغيل اختبار سرعة الاستجابة لأن بعض عناصر الصفحة مفقودة.');
    return;
  }

  let currentRoundIndex = 0;
  let results = [];
  let state = 'idle';
  let signalTime = 0;
  let waitTimerId = 0;
  let transitionId = 0;
  let gameFinished = false;

  function clearWaitTimer() {
    if (waitTimerId) {
      window.clearTimeout(waitTimerId);
      waitTimerId = 0;
    }
  }

  function clearTransition() {
    if (transitionId) {
      window.clearTimeout(transitionId);
      transitionId = 0;
    }
  }

  function setPadState(nextState) {
    state = nextState;
    elements.pad.classList.remove('is-waiting', 'is-ready', 'is-result');

    if (nextState === 'waiting') {
      elements.pad.classList.add('is-waiting');
    } else if (nextState === 'ready') {
      elements.pad.classList.add('is-ready');
    } else if (nextState === 'result') {
      elements.pad.classList.add('is-result');
    }
  }

  function getValidTimes() {
    return results.filter((result) => Number.isFinite(result));
  }

  function updateSummary() {
    const validTimes = getValidTimes();

    if (!validTimes.length) {
      elements.best.textContent = '—';
      elements.average.textContent = '—';
      return;
    }

    const bestTime = Math.min(...validTimes);
    const averageTime = Math.round(
      validTimes.reduce((total, time) => total + time, 0) / validTimes.length,
    );

    elements.best.textContent = String(bestTime);
    elements.average.textContent = String(averageTime);
  }

  function updateAttempt(result, isFalseStart = false) {
    const value = elements.attemptValues[currentRoundIndex];
    const item = value.closest('li');

    item?.classList.remove('is-complete', 'is-false-start');

    if (isFalseStart) {
      value.textContent = 'خطأ';
      item?.classList.add('is-false-start');
      return;
    }

    value.textContent = `${result} ms`;
    item?.classList.add('is-complete');
  }

  function prepareRound() {
    clearWaitTimer();
    clearTransition();
    setPadState('idle');

    elements.round.textContent = String(currentRoundIndex + 1);
    elements.status.textContent = currentRoundIndex === 0
      ? 'اضغط لبدء الاختبار'
      : 'اضغط لبدء المحاولة التالية';
    elements.instruction.textContent = 'بعد البدء، انتظر تغيّر الإشارة ثم اضغط فورًا.';
    setFeedback(
      elements.feedback,
      'لا تضغط أثناء الانتظار حتى لا تُسجّل بداية خاطئة.',
    );
  }

  function finishGame() {
    clearWaitTimer();
    clearTransition();
    gameFinished = true;
    setPadState('finished');

    const validTimes = getValidTimes();
    const bestTime = validTimes.length ? Math.min(...validTimes) : null;
    const averageTime = validTimes.length
      ? Math.round(
        validTimes.reduce((total, time) => total + time, 0) / validTimes.length,
      )
      : null;
    const resultCopy = getResultCopy(bestTime, averageTime, validTimes.length);

    elements.finalBest.textContent = bestTime === null ? '—' : String(bestTime);
    elements.resultTitle.textContent = resultCopy.title;
    elements.resultMessage.textContent = resultCopy.message;
    elements.board.hidden = true;
    elements.result.hidden = false;

    trackGameEvent('gamelab_game_complete', {
      game_name: 'reaction_speed',
      best_time_ms: bestTime ?? 0,
      average_time_ms: averageTime ?? 0,
      valid_rounds: validTimes.length,
      false_starts: ROUND_COUNT - validTimes.length,
      completed_rounds: ROUND_COUNT,
    });
  }

  function scheduleNextRound() {
    clearTransition();

    transitionId = window.setTimeout(() => {
      currentRoundIndex += 1;

      if (currentRoundIndex >= ROUND_COUNT) {
        finishGame();
        return;
      }

      prepareRound();
    }, RESULT_DISPLAY_MS);
  }

  function recordFalseStart() {
    clearWaitTimer();
    results.push(null);
    updateAttempt(null, true);
    updateSummary();
    setPadState('result');
    elements.status.textContent = 'بداية خاطئة!';
    elements.instruction.textContent = 'ضغطت قبل ظهور الإشارة الخضراء.';
    setFeedback(
      elements.feedback,
      'انتظر الإشارة في المحاولة التالية ولا تحاول تخمين وقتها.',
      'is-false-start',
    );

    trackGameEvent('gamelab_round_complete', {
      game_name: 'reaction_speed',
      round_number: currentRoundIndex + 1,
      round_result: 'false_start',
      reaction_time_ms: 0,
    });

    scheduleNextRound();
  }

  function recordReaction() {
    const reactionTime = Math.max(1, Math.round(performance.now() - signalTime));

    results.push(reactionTime);
    updateAttempt(reactionTime);
    updateSummary();
    setPadState('result');
    elements.status.textContent = `${reactionTime} ms`;
    elements.instruction.textContent = reactionTime <= 250
      ? 'استجابة سريعة جدًا!'
      : 'تم تسجيل زمنك بنجاح.';
    setFeedback(
      elements.feedback,
      reactionTime <= 250
        ? 'ممتاز! حافظ على هذا التركيز في المحاولة التالية.'
        : 'جيد. حاول تقليل الزمن في المحاولة التالية.',
      'is-success',
    );

    trackGameEvent('gamelab_round_complete', {
      game_name: 'reaction_speed',
      round_number: currentRoundIndex + 1,
      round_result: 'valid',
      reaction_time_ms: reactionTime,
    });

    scheduleNextRound();
  }

  function showSignal() {
    if (state !== 'waiting' || gameFinished) {
      return;
    }

    waitTimerId = 0;
    setPadState('ready');
    signalTime = performance.now();
    elements.status.textContent = 'اضغط الآن!';
    elements.instruction.textContent = 'الإشارة خضراء — اضغط بأسرع ما تستطيع.';
    setFeedback(elements.feedback, '');
  }

  function beginWait() {
    if (gameFinished || state !== 'idle') {
      return;
    }

    setPadState('waiting');
    elements.status.textContent = 'انتظر...';
    elements.instruction.textContent = 'لا تضغط حتى تتحول الشاشة إلى اللون الأخضر.';
    setFeedback(elements.feedback, 'راقب الإشارة فقط. الضغط الآن يُحسب بداية خاطئة.');

    const waitDuration = MIN_WAIT_MS + Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS);
    waitTimerId = window.setTimeout(showSignal, waitDuration);
  }

  function handlePadClick() {
    if (gameFinished) {
      return;
    }

    if (state === 'idle') {
      beginWait();
      return;
    }

    if (state === 'waiting') {
      recordFalseStart();
      return;
    }

    if (state === 'ready') {
      recordReaction();
    }
  }

  function startGame(isReplay = false) {
    clearWaitTimer();
    clearTransition();

    currentRoundIndex = 0;
    results = [];
    signalTime = 0;
    gameFinished = false;

    elements.roundTotal.textContent = String(ROUND_COUNT);
    elements.best.textContent = '—';
    elements.average.textContent = '—';
    elements.board.hidden = false;
    elements.result.hidden = true;

    elements.attemptValues.forEach((value) => {
      value.textContent = '—';
      value.closest('li')?.classList.remove('is-complete', 'is-false-start');
    });

    trackGameEvent(
      isReplay ? 'gamelab_game_replay' : 'gamelab_game_start',
      {
        game_name: 'reaction_speed',
        total_rounds: ROUND_COUNT,
      },
    );

    prepareRound();
  }

  elements.pad.addEventListener('click', handlePadClick);
  elements.replayButton.addEventListener('click', () => startGame(true));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (state === 'waiting' || state === 'ready')) {
      clearWaitTimer();
      setPadState('idle');
      elements.status.textContent = 'اضغط للبدء من جديد';
      elements.instruction.textContent = 'توقفت المحاولة لأن الصفحة لم تعد ظاهرة.';
      setFeedback(elements.feedback, 'لم تُحسب هذه المحاولة. ابدأ عندما تصبح جاهزًا.');
    }
  });

  startGame();
}

document.addEventListener('DOMContentLoaded', initReactionSpeed);
