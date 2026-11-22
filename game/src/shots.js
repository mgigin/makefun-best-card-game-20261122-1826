// The screenshot scenes behind ?shot=start|play|win|lose. Each one plays the real rules
// forward from a fresh duel with a simple autopilot at the player's seat (play every
// affordable card, send ready creatures at the foe hero), so the frame is what a real
// game looks like and the same seed always gives the same frame. The win scene starts
// the foe hero wounded; the lose scene has the autopilot pass while the foe plays on.
import { STEP } from './config.js';
import { cardById, KIND_CREATURE } from './cards.js';
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const MAX_STEPS = 60 * 600;

/** One autopilot decision for the player: play a card, attack, or end the turn. */
function autopilotAct(world, passive) {
  const state = world.state;
  if (passive) {
    world.endTurn();
    return;
  }
  // Play the most expensive affordable card.
  let best = -1;
  let bestCost = -1;
  state.player.hand.forEach((id, i) => {
    const card = cardById(id);
    if (card.cost <= state.player.energy && card.cost > bestCost) {
      if (card.kind === KIND_CREATURE && state.player.board.length >= 5) return;
      best = i;
      bestCost = card.cost;
    }
  });
  if (best !== -1) {
    world.playCard(best);
    return;
  }
  // Attack the foe hero with the first ready creature.
  const ready = state.player.board.findIndex((c) => c.canAttack && !c.justPlayed);
  if (ready !== -1) {
    world.attack(ready, -1);
    return;
  }
  world.endTurn();
}

/** Run the duel until `done(state)` holds or the step budget runs out. */
function simulate(world, done, passive = false) {
  for (let i = 0; i < MAX_STEPS; i += 1) {
    if (done(world.state)) return;
    if (world.state.turn === 'player') autopilotAct(world, passive);
    else world.step(STEP);
    if (world.state.over) return;
  }
}

export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name === 'play') {
    simulate(world, (s) => s.turnNumber >= 5 && s.player.board.length >= 2 && s.foe.board.length >= 1);
    return { screen: SCREEN_PLAY, record: { wins: 3, losses: 1 } };
  }
  if (name === 'win') {
    state.foe.health = 8;
    simulate(world, (s) => s.over);
    return { screen: state.winner === 'player' ? SCREEN_WIN : SCREEN_PLAY, record: { wins: 4, losses: 1 } };
  }
  if (name === 'lose') {
    state.player.health = 7;
    simulate(world, (s) => s.over, true);
    return { screen: state.winner === 'foe' ? SCREEN_LOSE : SCREEN_PLAY, record: { wins: 3, losses: 2 } };
  }
  return { screen: SCREEN_TITLE, record: { wins: 3, losses: 1 } };
}
