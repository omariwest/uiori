const ANALYTICS_ID = 'G-GLGJXPV0LS';

const GAME_PATHS = Object.freeze({
  'word-challenge': 'word_challenge',
  'penalty-kick': 'penalty_kick',
  'reaction-speed': 'reaction_speed',
});

function normalizePath(pathname) {
  const cleanPath = pathname.replace(/\/{2,}/g, '/');
  return cleanPath.endsWith('/') ? cleanPath : `${cleanPath}/`;
}

export function getGameKey(pathname = window.location.pathname) {
  const pathParts = normalizePath(pathname).split('/').filter(Boolean);
  const gameSlug = pathParts[0] === 'gamelab' ? pathParts[1] : '';

  return GAME_PATHS[gameSlug] || 'gamelab_hub';
}

function getPageType(pathname = window.location.pathname) {
  const normalizedPath = normalizePath(pathname);

  if (normalizedPath === '/gamelab/') {
    return 'hub';
  }

  if (normalizedPath.endsWith('/play/')) {
    return 'gameplay';
  }

  return 'game_landing';
}

function dataLayerHasConfig() {
  return window.dataLayer.some((entry) => {
    return entry && entry[0] === 'config' && entry[1] === ANALYTICS_ID;
  });
}

function initAnalytics() {
  window.dataLayer = window.dataLayer || [];

  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }

  if (!dataLayerHasConfig()) {
    window.gtag('js', new Date());
    window.gtag('config', ANALYTICS_ID);
  }
}

export function trackGameEvent(eventName, parameters = {}) {
  if (typeof eventName !== 'string' || !eventName.trim()) {
    return;
  }

  initAnalytics();

  window.gtag('event', eventName, {
    game_name: getGameKey(),
    page_type: getPageType(),
    ...parameters,
  });
}

function setCurrentYear() {
  const currentYear = String(new Date().getFullYear());

  document.querySelectorAll('[data-current-year]').forEach((element) => {
    element.textContent = currentYear;
  });
}

function getLinkLabel(link) {
  const label = link.getAttribute('aria-label') || link.textContent || '';
  return label.replace(/\s+/g, ' ').trim().slice(0, 100);
}

function trackGameLabLink(link) {
  const url = new URL(link.href, window.location.href);

  if (url.origin !== window.location.origin) {
    return;
  }

  const targetPath = normalizePath(url.pathname);

  if (!targetPath.startsWith('/gamelab/')) {
    return;
  }

  const sourcePath = normalizePath(window.location.pathname);
  const sourceGame = getGameKey();
  const targetGame = getGameKey(targetPath);

  if (
    targetGame === 'gamelab_hub' ||
    (targetPath === sourcePath && url.hash)
  ) {
    return;
  }

  const parameters = {
    source_game: sourceGame,
    target_game: targetGame,
    link_text: getLinkLabel(link),
    target_path: targetPath,
  };

  if (targetPath.endsWith('/play/')) {
    trackGameEvent('gamelab_play_click', parameters);
    return;
  }

  const isRelatedLink =
    link.matches('.related-game-card') ||
    (sourceGame !== 'gamelab_hub' &&
      targetGame !== 'gamelab_hub' &&
      sourceGame !== targetGame);

  trackGameEvent(
    isRelatedLink ? 'gamelab_related_game_click' : 'gamelab_game_open',
    parameters,
  );
}

function initLinkTracking() {
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const link = event.target.closest('a[href]');

    if (!link) {
      return;
    }

    trackGameLabLink(link);
  });
}

function initGameLab() {
  setCurrentYear();
  initLinkTracking();

  trackGameEvent('gamelab_page_view');
}

initAnalytics();

window.GameLab = Object.freeze({
  getGameKey,
  track: trackGameEvent,
});

document.addEventListener('DOMContentLoaded', initGameLab);
