// Drawing only: the duel's state and the current screen in, pixels out. The 1280x720
// table is scaled to fit the window and centred. Cards are drawn as cream faces with a
// coloured banner, a cost gem, a small procedural emblem, rules text and — for
// creatures — attack/health gems, so every value is readable in a screenshot.
import { CARD, FIELD, FONT, FONT_UI, HERO, PALETTE } from './config.js';
import { cardById, KIND_CREATURE } from './cards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';

const HUE = {
  ember: PALETTE.ember,
  gold: PALETTE.gold,
  frost: PALETTE.frost,
  leaf: PALETTE.leaf,
  violet: PALETTE.violet,
};

function rowX(count, w, gap) {
  const total = count * w + Math.max(0, count - 1) * gap;
  return (FIELD.width - total) / 2;
}

/** Every clickable rectangle on the table, for the input layer to hit-test. */
export function layout(state) {
  const rects = { hand: [], ownBoard: [], foeBoard: [], foeHero: null, endTurn: null };
  // A full hand shrinks a little so eight cards still clear the hero portraits.
  const handW = state.player.hand.length > 6 ? 96 : CARD.handW;
  const handH = state.player.hand.length > 6 ? 134 : CARD.handH;
  const hx = rowX(state.player.hand.length, handW, CARD.handGap);
  state.player.hand.forEach((id, i) => {
    rects.hand.push({ x: hx + i * (handW + CARD.handGap), y: CARD.handY + (CARD.handH - handH), w: handW, h: handH, index: i });
  });
  const ox = rowX(state.player.board.length, CARD.boardW, CARD.boardGap);
  state.player.board.forEach((c, i) => {
    rects.ownBoard.push({ x: ox + i * (CARD.boardW + CARD.boardGap), y: CARD.ownBoardY, w: CARD.boardW, h: CARD.boardH, index: i });
  });
  const fx = rowX(state.foe.board.length, CARD.boardW, CARD.boardGap);
  state.foe.board.forEach((c, i) => {
    rects.foeBoard.push({ x: fx + i * (CARD.boardW + CARD.boardGap), y: CARD.foeBoardY, w: CARD.boardW, h: CARD.boardH, index: i });
  });
  rects.foeHero = { x: 56, y: 36, w: 120, h: 120 };
  rects.endTurn = { x: 1096, y: 316, w: 150, h: 56 };
  return rects;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    view.x = (canvas.width - FIELD.width * view.scale) / 2;
    view.y = (canvas.height - FIELD.height * view.scale) / 2;
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function text(value, x, y, size, color, align = 'left', font = FONT_UI, weight = '') {
    ctx.font = `${weight} ${size}px ${font}`.trim();
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function wrap(value, x, y, maxWidth, size, color, lineHeight) {
    ctx.font = `${size}px ${FONT_UI}`;
    const words = value.split(' ');
    let line = '';
    let ly = y;
    for (const word of words) {
      const test = line === '' ? word : `${line} ${word}`;
      if (ctx.measureText(test).width > maxWidth && line !== '') {
        text(line, x, ly, size, color, 'center');
        line = word;
        ly += lineHeight;
      } else line = test;
    }
    if (line !== '') text(line, x, ly, size, color, 'center');
  }

  /** A tiny emblem per card, drawn with plain shapes so the art is ours and offline. */
  function emblem(kind, cx, cy, s, color) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, s * 0.09);
    ctx.beginPath();
    switch (kind) {
      case 'flame':
        ctx.moveTo(cx, cy - s);
        ctx.quadraticCurveTo(cx + s * 0.8, cy, cx + s * 0.45, cy + s * 0.7);
        ctx.quadraticCurveTo(cx, cy + s, cx - s * 0.45, cy + s * 0.7);
        ctx.quadraticCurveTo(cx - s * 0.8, cy, cx, cy - s);
        ctx.fill();
        break;
      case 'bolt':
        ctx.moveTo(cx + s * 0.25, cy - s);
        ctx.lineTo(cx - s * 0.55, cy + s * 0.15);
        ctx.lineTo(cx - s * 0.02, cy + s * 0.15);
        ctx.lineTo(cx - s * 0.25, cy + s);
        ctx.lineTo(cx + s * 0.55, cy - s * 0.15);
        ctx.lineTo(cx + s * 0.02, cy - s * 0.15);
        ctx.closePath();
        ctx.fill();
        break;
      case 'sword':
        ctx.moveTo(cx, cy - s);
        ctx.lineTo(cx + s * 0.22, cy + s * 0.35);
        ctx.lineTo(cx - s * 0.22, cy + s * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(cx - s * 0.55, cy + s * 0.42, s * 1.1, s * 0.16);
        ctx.fillRect(cx - s * 0.09, cy + s * 0.58, s * 0.18, s * 0.42);
        break;
      case 'shield':
        ctx.moveTo(cx, cy - s);
        ctx.lineTo(cx + s * 0.75, cy - s * 0.7);
        ctx.lineTo(cx + s * 0.75, cy + s * 0.1);
        ctx.quadraticCurveTo(cx + s * 0.7, cy + s * 0.7, cx, cy + s);
        ctx.quadraticCurveTo(cx - s * 0.7, cy + s * 0.7, cx - s * 0.75, cy + s * 0.1);
        ctx.lineTo(cx - s * 0.75, cy - s * 0.7);
        ctx.closePath();
        ctx.fill();
        break;
      case 'dragon':
        ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.4, cy - s * 0.2);
        ctx.lineTo(cx - s, cy - s * 0.95);
        ctx.lineTo(cx - s * 0.85, cy + s * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.4, cy - s * 0.2);
        ctx.lineTo(cx + s, cy - s * 0.95);
        ctx.lineTo(cx + s * 0.85, cy + s * 0.25);
        ctx.closePath();
        ctx.fill();
        break;
      case 'falcon':
        ctx.moveTo(cx - s, cy + s * 0.5);
        ctx.quadraticCurveTo(cx - s * 0.2, cy - s * 0.4, cx, cy - s * 0.15);
        ctx.quadraticCurveTo(cx + s * 0.2, cy - s * 0.4, cx + s, cy + s * 0.5);
        ctx.quadraticCurveTo(cx + s * 0.3, cy + s * 0.25, cx, cy + s * 0.55);
        ctx.quadraticCurveTo(cx - s * 0.3, cy + s * 0.25, cx - s, cy + s * 0.5);
        ctx.fill();
        break;
      case 'heron':
        ctx.moveTo(cx - s * 0.7, cy + s * 0.6);
        ctx.quadraticCurveTo(cx, cy - s * 0.9, cx + s * 0.85, cy - s * 0.2);
        ctx.quadraticCurveTo(cx + s * 0.2, cy + s * 0.1, cx + s * 0.3, cy + s * 0.6);
        ctx.closePath();
        ctx.fill();
        break;
      case 'fox':
        ctx.moveTo(cx - s * 0.7, cy - s * 0.85);
        ctx.lineTo(cx - s * 0.15, cy - s * 0.25);
        ctx.lineTo(cx + s * 0.15, cy - s * 0.25);
        ctx.lineTo(cx + s * 0.7, cy - s * 0.85);
        ctx.lineTo(cx + s * 0.55, cy + s * 0.35);
        ctx.lineTo(cx, cy + s * 0.95);
        ctx.lineTo(cx - s * 0.55, cy + s * 0.35);
        ctx.closePath();
        ctx.fill();
        break;
      case 'shell':
        ctx.arc(cx, cy + s * 0.15, s * 0.8, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = PALETTE.cardFace;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.8, cy + s * 0.15);
        ctx.lineTo(cx + s * 0.8, cy + s * 0.15);
        ctx.stroke();
        break;
      case 'thorn':
        for (let i = -1; i <= 1; i += 1) {
          ctx.beginPath();
          ctx.moveTo(cx + i * s * 0.55 - s * 0.16, cy + s * 0.8);
          ctx.lineTo(cx + i * s * 0.55, cy - s * (i === 0 ? 1 : 0.65));
          ctx.lineTo(cx + i * s * 0.55 + s * 0.16, cy + s * 0.8);
          ctx.closePath();
          ctx.fill();
        }
        break;
      case 'hearth':
        ctx.arc(cx, cy - s * 0.1, s * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - s * 0.7, cy + s * 0.35, s * 1.4, s * 0.22);
        ctx.fillRect(cx - s * 0.7, cy + s * 0.7, s * 1.4, s * 0.22);
        break;
      case 'map':
        ctx.strokeRect(cx - s * 0.8, cy - s * 0.55, s * 1.6, s * 1.1);
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.5, cy + s * 0.3);
        ctx.quadraticCurveTo(cx, cy - s * 0.35, cx + s * 0.45, cy + s * 0.15);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + s * 0.45, cy + s * 0.15, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'surge':
        ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 8; i += 1) {
          const a = (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * s * 0.55, cy + Math.sin(a) * s * 0.55);
          ctx.lineTo(cx + Math.cos(a) * s * 0.95, cy + Math.sin(a) * s * 0.95);
          ctx.stroke();
        }
        break;
      case 'blast':
        for (let i = 0; i < 8; i += 1) {
          const a = (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s);
          ctx.lineTo(cx + Math.cos(a + 0.35) * s * 0.45, cy + Math.sin(a + 0.35) * s * 0.45);
          ctx.closePath();
          ctx.fill();
        }
        break;
      case 'banner':
        ctx.fillRect(cx - s * 0.08, cy - s, s * 0.16, s * 2);
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.08, cy - s);
        ctx.lineTo(cx + s * 0.95, cy - s * 0.7);
        ctx.lineTo(cx + s * 0.08, cy - s * 0.4);
        ctx.closePath();
        ctx.fill();
        break;
      default:
        ctx.arc(cx, cy, s * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
  }

  function gem(x, y, r, fill, label, labelColor) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(label, x, y + r * 0.38, r * 1.05, labelColor, 'center', FONT_UI, 'bold');
  }

  function drawCardFace(x, y, w, h, card, opts = {}) {
    const hue = HUE[card.hue] ?? PALETTE.violet;
    rr(x, y, w, h, 10);
    ctx.fillStyle = PALETTE.cardFace;
    ctx.fill();
    ctx.strokeStyle = opts.selected ? PALETTE.gold : 'rgba(0,0,0,0.4)';
    ctx.lineWidth = opts.selected ? 4 : 2;
    ctx.stroke();
    // banner (the name sits right of the cost gem so the gem never covers it)
    rr(x + 5, y + 5, w - 10, h * 0.17, 6);
    ctx.fillStyle = hue;
    ctx.fill();
    text(card.name, x + 26 + (w - 32) / 2, y + h * 0.135, Math.max(9, w * 0.09), '#1d1428', 'center', FONT_UI, 'bold');
    // art window
    rr(x + 8, y + h * 0.22, w - 16, h * 0.34, 6);
    ctx.fillStyle = '#241a33';
    ctx.fill();
    emblem(card.art, x + w / 2, y + h * 0.39, w * 0.16, hue);
    // rules text
    wrap(card.text, x + w / 2, y + h * 0.66, w - 18, Math.max(9, w * 0.085), PALETTE.cardInk, h * 0.09);
    // cost gem
    gem(x + 13, y + 13, 12, PALETTE.energy, String(card.cost), '#3a2c07');
    if (card.kind === KIND_CREATURE) {
      const atk = opts.attack ?? card.attack;
      const hp = opts.health ?? card.health;
      gem(x + 13, y + h - 13, 12, '#e8b64c', String(atk), '#3a2c07');
      gem(x + w - 13, y + h - 13, 12, hp < (opts.maxHealth ?? card.health) ? '#ff6b6b' : '#e4574d', String(hp), '#fff5f0');
    }
    if (opts.dim) {
      rr(x, y, w, h, 10);
      ctx.fillStyle = 'rgba(20,14,30,0.45)';
      ctx.fill();
    }
  }

  function drawCardBack(x, y, w, h) {
    rr(x, y, w, h, 8);
    ctx.fillStyle = PALETTE.cardBack;
    ctx.fill();
    ctx.strokeStyle = PALETTE.cardBackEdge;
    ctx.lineWidth = 3;
    ctx.stroke();
    rr(x + 6, y + 6, w - 12, h - 12, 6);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    emblem('flame', x + w / 2, y + h / 2, w * 0.2, PALETTE.gold);
  }

  function drawHero(x, y, hero, label, isFoe, highlight) {
    rr(x, y, 120, 120, 14);
    ctx.fillStyle = PALETTE.panel;
    ctx.fill();
    ctx.strokeStyle = highlight ? PALETTE.bad : PALETTE.panelEdge;
    ctx.lineWidth = highlight ? 4 : 2;
    ctx.stroke();
    emblem(isFoe ? 'dragon' : 'sword', x + 60, y + 48, 26, isFoe ? PALETTE.violet : PALETTE.ember);
    text(label, x + 60, y + 96, 15, PALETTE.text, 'center', FONT_UI, 'bold');
    gem(x + 104, y + 104, 16, '#e4574d', String(Math.max(0, hero.health)), '#fff5f0');
  }

  function drawEnergy(x, y, hero) {
    text('Energy', x, y - 8, 14, PALETTE.muted, 'left');
    for (let i = 0; i < HERO.energyCap; i += 1) {
      ctx.fillStyle = i < hero.energy ? PALETTE.energy : PALETTE.energySpent;
      ctx.beginPath();
      ctx.arc(x + 12 + i * 24, y + 12, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    text(`${hero.energy}/${hero.energyMax}`, x + 12 + HERO.energyCap * 24, y + 17, 15, PALETTE.text, 'left', FONT_UI, 'bold');
  }

  function drawPanel(title, lines, prompt) {
    const w = 640;
    const h = 150 + lines.length * 36 + 70;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;
    rr(x, y, w, h, 18);
    ctx.fillStyle = 'rgba(24,16,38,0.97)';
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    text(title, FIELD.width / 2, y + 84, 52, PALETTE.gold, 'center', FONT, 'bold');
    lines.forEach((line, i) => text(line, FIELD.width / 2, y + 140 + i * 36, 22, PALETTE.muted, 'center'));
    text(prompt, FIELD.width / 2, y + h - 42, 24, PALETTE.ember, 'center', FONT_UI, 'bold');
  }

  function draw(state, screen, record) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);

    // table
    ctx.fillStyle = PALETTE.felt;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.feltEdge;
    ctx.fillRect(0, FIELD.height / 2 - 3, FIELD.width, 6);
    text('EMBERFALL DUEL', FIELD.width / 2, 40, 22, 'rgba(243,236,255,0.16)', 'center', FONT, 'bold');

    const rects = layout(state);
    const foe = state.foe;
    const me = state.player;
    const myTurn = state.turn === 'player' && !state.over;

    // foe hand (backs) + hero
    const fhX = rowX(foe.hand.length, CARD.foeHandW, 6);
    foe.hand.forEach((id, i) => drawCardBack(fhX + i * (CARD.foeHandW + 6), CARD.foeHandY, CARD.foeHandW, CARD.foeHandH));
    drawHero(56, 36, foe, 'FOE', true, state.selectedAttacker >= 0);
    text(`Deck ${foe.deck.length}`, 116, 182, 14, PALETTE.muted, 'center');
    drawEnergy(1096 - 250, 64, foe);

    // foe board
    foe.board.forEach((c, i) => {
      const r = rects.foeBoard[i];
      drawCardFace(r.x, r.y, r.w, r.h, cardById(c.id), { attack: c.attack, health: c.health, maxHealth: c.maxHealth });
    });
    if (foe.board.length === 0) text('— foe board —', FIELD.width / 2, CARD.foeBoardY + 70, 16, 'rgba(179,166,204,0.5)', 'center');

    // log line
    text(state.log, FIELD.width / 2, 344, 19, PALETTE.text, 'center', FONT_UI, 'bold');
    text(`Turn ${state.turnNumber} · ${state.turn === 'player' ? 'your turn' : 'foe turn'}`, FIELD.width / 2, 368, 14, PALETTE.muted, 'center');

    // own board
    me.board.forEach((c, i) => {
      const r = rects.ownBoard[i];
      drawCardFace(r.x, r.y, r.w, r.h, cardById(c.id), {
        attack: c.attack,
        health: c.health,
        maxHealth: c.maxHealth,
        selected: state.selectedAttacker === i,
        dim: !c.canAttack || c.justPlayed,
      });
      if (c.justPlayed) text('summoning…', r.x + r.w / 2, r.y + r.h + 16, 12, PALETTE.muted, 'center');
    });
    if (me.board.length === 0) text('— your board —', FIELD.width / 2, CARD.ownBoardY + 70, 16, 'rgba(179,166,204,0.5)', 'center');

    // own hero + energy + deck
    drawHero(56, 548, me, 'YOU', false, false);
    text(`Deck ${me.deck.length}`, 116, 694, 14, PALETTE.muted, 'center');
    drawEnergy(1000, 640, me);

    // end turn button
    const b = rects.endTurn;
    rr(b.x, b.y, b.w, b.h, 12);
    ctx.fillStyle = myTurn ? PALETTE.ember : '#4a3a2e';
    ctx.fill();
    ctx.strokeStyle = PALETTE.emberDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    text('END TURN', b.x + b.w / 2, b.y + 36, 20, myTurn ? '#fff5f0' : PALETTE.muted, 'center', FONT_UI, 'bold');

    // player hand
    me.hand.forEach((id, i) => {
      const r = rects.hand[i];
      const card = cardById(id);
      const lift = state.selectedCard === i ? -18 : 0;
      drawCardFace(r.x, r.y + lift, r.w, r.h, card, { selected: state.selectedCard === i, dim: !myTurn || card.cost > me.energy });
      text(String(i + 1), r.x + r.w / 2, r.y + lift + r.h + 16, 12, PALETTE.muted, 'center');
    });

    // floating combat text
    for (const f of state.floaters) {
      text(f.text, f.x, f.y - (1.1 - f.ttl) * 30, 20, f.color, 'center', FONT_UI, 'bold');
    }

    if (screen === SCREEN_TITLE) {
      drawPanel('Emberfall Duel', [
        'Outlast the foe duelist: bring their hero from 30 health to zero.',
        'Play creatures and spells with energy — it grows by one each turn.',
        'Creatures attack next turn. Click a card to play it; click your',
        'creature, then a target. Keys 1–8 play a card, E ends the turn.',
        `Record: ${record.wins} wins · ${record.losses} losses`,
      ], 'Press Space or click to duel');
    } else if (screen === SCREEN_WIN) {
      drawPanel('Victory!', [
        'The foe duelist\'s hero has fallen. The ember crown is yours.',
        `Turns taken: ${state.turnNumber} · Your health left: ${Math.max(0, me.health)}`,
        `Record: ${record.wins} wins · ${record.losses} losses`,
      ], 'Press Space or click to duel again');
    } else if (screen === SCREEN_LOSE) {
      drawPanel('Defeat', [
        'Your hero has fallen to the foe duelist. The embers cool…',
        `Turns survived: ${state.turnNumber} · Foe health left: ${Math.max(0, foe.health)}`,
        `Record: ${record.wins} wins · ${record.losses} losses`,
      ], 'Press Space or click to try again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view };
}
