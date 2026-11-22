// Boot and the one loop: the world advances in fixed 1/60 s steps (the foe's turn runs
// on its timer inside the world), clicks and keys are resolved against the renderer's
// layout, and the renderer paints what is there. Screens: title, play, win, lose.
//
// ?seed=N fixes the shuffle. ?shot=start|play|win|lose (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady.
import { RECORD_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_ATTACK, EVENT_LOSE, EVENT_PLAY, EVENT_SPELL, EVENT_TURN, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_END_TURN, createInput, hit } from './input.js';
import { createRenderer, layout, SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readRecord() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECORD_KEY) ?? '{}');
    return { wins: parsed.wins | 0, losses: parsed.losses | 0 };
  } catch {
    return { wins: 0, losses: 0 };
  }
}

function saveRecord(record) {
  try {
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(record));
  } catch {
    // Storage can be off (private windows): the record then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.record);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, renderer.view);
  let screen = SCREEN_TITLE;
  let record = readRecord();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startDuel() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Duel started. Your move.');
  }

  function finishDuel() {
    if (world.state.winner === 'player') {
      record.wins += 1;
      screen = SCREEN_WIN;
      audio.win();
      announce('Victory! The foe duelist has fallen.');
    } else {
      record.losses += 1;
      screen = SCREEN_LOSE;
      audio.lose();
      announce('Defeat. Your hero has fallen.');
    }
    saveRecord(record);
  }

  function react(events) {
    if (events & EVENT_WIN || events & EVENT_LOSE) finishDuel();
    else if (events & EVENT_SPELL) audio.spell();
    else if (events & EVENT_PLAY) audio.play();
    else if (events & EVENT_ATTACK) audio.attack();
    else if (events & EVENT_TURN) audio.turn();
  }

  function handleClick(point) {
    const state = world.state;
    if (state.turn !== 'player' || state.over) return;
    const rects = layout(state);
    if (hit(rects.endTurn, point)) {
      react(world.endTurn());
      return;
    }
    // Attack: a selected creature strikes the clicked foe creature or hero.
    if (state.selectedAttacker >= 0) {
      const foeIdx = rects.foeBoard.findIndex((r) => hit(r, point));
      if (foeIdx !== -1) {
        react(world.attack(state.selectedAttacker, foeIdx));
        return;
      }
      if (hit(rects.foeHero, point)) {
        react(world.attack(state.selectedAttacker, -1));
        return;
      }
    }
    // Select a ready creature to attack with.
    const ownIdx = rects.ownBoard.findIndex((r) => hit(r, point));
    if (ownIdx !== -1) {
      const creature = state.player.board[ownIdx];
      state.selectedAttacker = creature.canAttack && !creature.justPlayed ? ownIdx : -1;
      state.selectedCard = -1;
      return;
    }
    // Play a hand card.
    const handIdx = rects.hand.findIndex((r) => hit(r, point));
    if (handIdx !== -1) {
      state.selectedAttacker = -1;
      react(world.playCard(handIdx));
      return;
    }
    state.selectedAttacker = -1;
    state.selectedCard = -1;
  }

  function handleActions() {
    const actions = input.takeActions();
    const click = input.takeClick();
    const digit = input.takeDigit();
    if (actions) audio.unlock();
    if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSE) {
      if (actions & ACTION_CONFIRM) startDuel();
      return;
    }
    if (digit !== -1 && world.state.turn === 'player') react(world.playCard(digit));
    if (click) handleClick(click);
    if (actions & ACTION_END_TURN) react(world.endTurn());
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    while (accumulator >= STEP) {
      if (screen === SCREEN_PLAY) react(world.step(STEP));
      accumulator -= STEP;
    }
    renderer.draw(world.state, screen, record);
  }

  announce('Emberfall Duel. Press Space or click to duel. In the duel: click a card to play it, click your creature then a target to attack, E or the button ends your turn.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
