import { initNav } from './modules/nav.js';
import { initFilters } from './modules/filters.js';
import { initRouteFinder } from './modules/route-finder.js';
import { initDisclosureHelpers } from './modules/disclosure.js';
import { initSearchLinks } from './modules/search.js';
import { initTaskBoard } from './modules/task-board.js';
import { initPlatformCards } from './modules/platform-cards.js';
import { initHomePage } from './pages/home.js';
import { initCountryPage } from './pages/country.js';
import { initTodayPage } from './pages/today.js';
import { initPlatformPage } from './pages/platform.js';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initFilters();
  initRouteFinder();
  initDisclosureHelpers();
  initSearchLinks();
  initTaskBoard();
  initPlatformCards();
  initHomePage();
  initCountryPage();
  initTodayPage();
  initPlatformPage();
});
