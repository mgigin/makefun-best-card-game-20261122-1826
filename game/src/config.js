// Emberfall Duel — every tuning number, layout box and colour in one place.
// The table is a fixed 1280x720 logical area; the renderer scales it to the window,
// so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const HERO = {
  health: 30,
  handStart: 4,
  handMax: 8,
  boardMax: 5,
  deckSize: 24,
  energyCap: 10,
};

/** How long the AI pauses between its actions, so a turn can be followed with the eyes. */
export const AI = { think: 0.55, play: 0.7, attack: 0.65 };

/** Card geometry on the table (logical pixels). */
export const CARD = {
  handW: 118,
  handH: 164,
  handGap: 10,
  handY: 540,
  boardW: 96,
  boardH: 132,
  boardGap: 12,
  foeBoardY: 168,
  ownBoardY: 372,
  foeHandY: 26,
  foeHandW: 62,
  foeHandH: 86,
};

export const PALETTE = {
  backdrop: '#0d0a12',
  felt: '#241a33',
  feltEdge: '#171021',
  panel: '#2e2142',
  panelEdge: '#4a3566',
  text: '#f3ecff',
  muted: '#b3a6cc',
  gold: '#f2c94c',
  ember: '#ff7a45',
  emberDark: '#c94f2a',
  frost: '#6fd3ff',
  leaf: '#7be495',
  violet: '#b78bff',
  cardFace: '#f7f0e1',
  cardInk: '#2a2135',
  cardBack: '#5b3a8c',
  cardBackEdge: '#3d2763',
  good: '#7be495',
  bad: '#ff6b6b',
  energy: '#ffd166',
  energySpent: '#6b5a3e',
};

export const FONT = 'Georgia, "Times New Roman", serif';
export const FONT_UI = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the win/loss record is kept between visits (this browser only). */
export const RECORD_KEY = 'emberfall-duel.record';
