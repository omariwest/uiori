import { trackGameEvent } from './gamelab.js';

const ATTEMPT_COUNT = 5;
const SHOT_ANIMATION_MS = 720;
const NEXT_ATTEMPT_DELAY_MS = 1180;
const TARGET_DIRECTIONS = Object.freeze(['left', 'center', 'right']);

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function setFeedback(element, message, state = '') {
  element.textContent = message;
  element.classList.remove('is-success', 'is-miss');

  if (state) {
    element.classList.add(state);
  }
}

function getResultCopy(score) {
  if (score === ATTEMPT_COUNT) {
    return {
      title: 'قنّاص الركلات!',
      message: 'خمس ركلات وخمسة أهداف. نتيجة كاملة تستحق جولة أخرى.',
    };
  }

  if (score >= 4) {
    return {
      title: 'نتيجة قوية جدًا!',
      message: 'كنت قريبًا من العلامة الكاملة. اضبط توقيت ركلة واحدة فقط.',
    };
  }

  if (score >= 2) {
    return {
      title: 'بداية جيدة!',
      message: 'التوقيت يتحسن. راقب منتصف المنطقة الدقيقة قبل كل تسديدة.',
    };
  }

  return {
    title: 'الحارس تفوّق هذه المرة',
    message: 'لا تتعجل. تابع المؤشر واضغط عندما يدخل المنطقة الدقيقة.',
  };
}

function initPenaltyKick() {
  const root = document.querySelector('[data-penalty-game]');

  if (!root) {
    return;
  }

  const elements = {
    attempt: root.querySelector('[data-penalty-attempt]'),
    attemptTotal: root.querySelector('[data-penalty-attempt-total]'),
    score: root.querySelector('[data-penalty-score]'),
    streak: root.querySelector('[data-penalty-streak]'),
    board: root.querySelector('[data-penalty-board]'),
    pitch: root.querySelector('[data-penalty-pitch]'),
    target: root.querySelector('[data-penalty-target]'),
    keeper: root.querySelector('[data-penalty-keeper]'),
    ball: root.querySelector('[data-penalty-ball]'),
    pitchLabel: root.querySelector('[data-penalty-pitch-label]'),
    meter: root.querySelector('[data-penalty-meter]'),
    sweetSpot: root.querySelector('[data-penalty-sweet-spot]'),
    marker: root.querySelector('[data-penalty-marker]'),
    shootButton: root.querySelector('[data-penalty-shoot]'),
    feedback: root.querySelector('[data-penalty-feedback]'),
    result: root.querySelector('[data-penalty-result]'),
    resultTitle: root.querySelector('[data-penalty-result-title]'),
    finalScore: root.querySelector('[data-penalty-final-score]'),
    resultMessage: root.querySelector('[data-penalty-result-message]'),
    replayButton: root.querySelector('[data-penalty-replay]'),
  };

  if (Object.values(elements).some((element) => !element)) {
    console.warn('تعذر تشغيل لعبة ركلات الحسم لأن بعض عناصر الصفحة مفقودة.');
    return;
  }

  let attemptIndex = 0;
  let score = 0;
  let streak = 0;
  let bestStreak = 0;
  let markerPosition = 0;
  let markerDirection = 1;
  let markerSpeed = 54;
  let sweetSpotCenter = 50;
  let sweetSpotWidth = 18;
  let targetDirection = 'center';
  let animationFrameId = 0;
  let transitionId = 0;
  let lastFrameTime = 0;
  let roundLocked = false;
  let gameFinished = false;

  function stopMeter() {
    if (animationFrameId) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    }
  }

  function stopTransition() {
    if (transitionId) {
      window.clearTimeout(transitionId);
      transitionId = 0;
    }
  }

  function updateMarker() {
    elements.marker.style.left = `${markerPosition}%`;
    elements.meter.setAttribute('aria-valuenow', String(Math.round(markerPosition)));
  }

  function animateMeter(timestamp) {
    if (roundLocked || gameFinished) {
      return;
    }

    if (!lastFrameTime) {
      lastFrameTime = timestamp;
    }

    const elapsedSeconds = Math.min((timestamp - lastFrameTime) / 1000, 0.05);
    lastFrameTime = timestamp;
    markerPosition += markerDirection * markerSpeed * elapsedSeconds;

    if (markerPosition >= 100) {
      markerPosition = 100;
      markerDirection = -1;
    } else if (markerPosition <= 0) {
      markerPosition = 0;
      markerDirection = 1;
    }

    updateMarker();
    animationFrameId = window.requestAnimationFrame(animateMeter);
  }

  function startMeter() {
    stopMeter();
    lastFrameTime = 0;
    animationFrameId = window.requestAnimationFrame(animateMeter);
  }

  function setTarget(direction) {
    elements.target.style.top = direction === 'center' ? '26%' : '12%';
    elements.target.style.bottom = 'auto';
    elements.target.style.left = 'auto';
    elements.target.style.right = 'auto';
    elements.target.style.transform = '';

    if (direction === 'left') {
      elements.target.style.left = '9%';
    } else if (direction === 'right') {
      elements.target.style.right = '9%';
    } else {
      elements.target.style.left = '50%';
      elements.target.style.transform = 'translateX(-50%)';
    }
  }

  function resetPlayers() {
    elements.ball.classList.remove(
      'is-shot-left',
      'is-shot-center',
      'is-shot-right',
    );
    elements.keeper.classList.remove('is-diving-left', 'is-diving-right');
  }

  function getShotDirection(position) {
    if (position < 35) {
      return 'left';
    }

    if (position > 65) {
      return 'right';
    }

    return 'center';
  }

  function getKeeperDirection(shotDirection, isGoal) {
    if (!isGoal) {
      return shotDirection;
    }

    const alternatives = TARGET_DIRECTIONS.filter((direction) => {
      return direction !== shotDirection;
    });

    return randomItem(alternatives);
  }

  function animateShot(shotDirection, keeperDirection) {
    resetPlayers();
    void elements.ball.offsetWidth;

    elements.ball.classList.add(`is-shot-${shotDirection}`);

    if (keeperDirection === 'left') {
      elements.keeper.classList.add('is-diving-left');
    } else if (keeperDirection === 'right') {
      elements.keeper.classList.add('is-diving-right');
    }
  }

  function prepareAttempt() {
    stopTransition();
    resetPlayers();
    roundLocked = false;
    root.classList.remove('is-busy');

    targetDirection = randomItem(TARGET_DIRECTIONS);
    sweetSpotWidth = Math.max(12, 19 - attemptIndex * 1.5);
    sweetSpotCenter = 22 + Math.random() * 56;
    markerSpeed = 54 + attemptIndex * 8 + Math.random() * 8;
    markerPosition = markerDirection > 0 ? 0 : 100;

    elements.attempt.textContent = String(attemptIndex + 1);
    elements.attemptTotal.textContent = String(ATTEMPT_COUNT);
    elements.sweetSpot.style.left = `${sweetSpotCenter - sweetSpotWidth / 2}%`;
    elements.sweetSpot.style.right = 'auto';
    elements.sweetSpot.style.width = `${sweetSpotWidth}%`;
    elements.shootButton.disabled = false;
    elements.pitchLabel.textContent = `استعد للركلة ${attemptIndex + 1}`;
    setFeedback(
      elements.feedback,
      'اضغط زر التسديد عندما يصل المؤشر إلى المنطقة الدقيقة.',
    );
    setTarget(targetDirection);
    updateMarker();
    startMeter();
  }

  function finishGame() {
    stopMeter();
    stopTransition();
    gameFinished = true;
    roundLocked = true;

    const resultCopy = getResultCopy(score);
    elements.finalScore.textContent = String(score);
    elements.resultTitle.textContent = resultCopy.title;
    elements.resultMessage.textContent = resultCopy.message;
    elements.board.hidden = true;
    elements.result.hidden = false;
    root.classList.remove('is-busy');

    trackGameEvent('gamelab_game_complete', {
      game_name: 'penalty_kick',
      final_score: score,
      maximum_score: ATTEMPT_COUNT,
      best_streak: bestStreak,
      completed_rounds: ATTEMPT_COUNT,
    });
  }

  function completeAttempt(isGoal, accuracy, shotDirection) {
    if (isGoal) {
      score += 1;
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
      elements.score.textContent = String(score);
      elements.streak.textContent = String(streak);
      elements.pitchLabel.textContent = 'هدف!';
      setFeedback(elements.feedback, 'توقيت ممتاز — الكرة في الشباك!', 'is-success');
    } else {
      streak = 0;
      elements.streak.textContent = '0';
      elements.pitchLabel.textContent = accuracy <= sweetSpotWidth ? 'أنقذها الحارس' : 'تسديدة غير دقيقة';
      setFeedback(
        elements.feedback,
        accuracy <= sweetSpotWidth
          ? 'تسديدة قريبة، لكن الحارس وصل إليها.'
          : 'التوقيت بعيد عن المنطقة الدقيقة. ركّز في المحاولة التالية.',
        'is-miss',
      );
    }

    trackGameEvent('gamelab_round_complete', {
      game_name: 'penalty_kick',
      round_number: attemptIndex + 1,
      round_result: isGoal ? 'goal' : 'miss',
      marker_position: Math.round(markerPosition),
      accuracy_distance: Math.round(accuracy),
      shot_direction: shotDirection,
      total_score: score,
      current_streak: streak,
    });

    transitionId = window.setTimeout(() => {
      attemptIndex += 1;

      if (attemptIndex >= ATTEMPT_COUNT) {
        finishGame();
        return;
      }

      prepareAttempt();
    }, NEXT_ATTEMPT_DELAY_MS - SHOT_ANIMATION_MS);
  }

  function shoot() {
    if (roundLocked || gameFinished) {
      return;
    }

    roundLocked = true;
    root.classList.add('is-busy');
    elements.shootButton.disabled = true;
    stopMeter();

    const accuracy = Math.abs(markerPosition - sweetSpotCenter);
    const isGoal = accuracy <= sweetSpotWidth / 2;
    const shotDirection = isGoal
      ? targetDirection
      : getShotDirection(markerPosition);
    const keeperDirection = getKeeperDirection(shotDirection, isGoal);

    elements.pitchLabel.textContent = 'التسديدة في الطريق...';
    setFeedback(elements.feedback, '');
    animateShot(shotDirection, keeperDirection);

    transitionId = window.setTimeout(() => {
      completeAttempt(isGoal, accuracy, shotDirection);
    }, SHOT_ANIMATION_MS);
  }

  function startGame(isReplay = false) {
    stopMeter();
    stopTransition();

    attemptIndex = 0;
    score = 0;
    streak = 0;
    bestStreak = 0;
    markerDirection = Math.random() < 0.5 ? 1 : -1;
    gameFinished = false;
    roundLocked = false;

    elements.score.textContent = '0';
    elements.streak.textContent = '0';
    elements.board.hidden = false;
    elements.result.hidden = true;

    trackGameEvent(
      isReplay ? 'gamelab_game_replay' : 'gamelab_game_start',
      {
        game_name: 'penalty_kick',
        total_rounds: ATTEMPT_COUNT,
      },
    );

    prepareAttempt();
  }

  elements.shootButton.addEventListener('click', shoot);
  elements.replayButton.addEventListener('click', () => startGame(true));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopMeter();
      return;
    }

    if (!roundLocked && !gameFinished && !elements.board.hidden) {
      startMeter();
    }
  });

  startGame();
}

document.addEventListener('DOMContentLoaded', initPenaltyKick);
