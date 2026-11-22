// Emberfall Duel's rules and state, with no drawing and no browser in it: two heroes,
// their decks, hands and boards, energy that grows each turn, creatures that fight,
// spells that resolve at once, and a simple AI duelist for the foe. The player acts by
// calling playCard / attack / endTurn; the foe acts inside step() on a timer so its turn
// can be watched. Everything random goes through the seeded generator handed in.
import { AI, HERO } from './config.js';
import { buildDeck, cardById, EFFECT, KIND_CREATURE, KIND_SPELL } from './cards.js';
import { shuffle } from './random.js';

export const EVENT_WIN = 1;
export const EVENT_LOSE = 2;
export const EVENT_PLAY = 4;
export const EVENT_ATTACK = 8;
export const EVENT_SPELL = 16;
export const EVENT_TURN = 32;

function makeHero() {
  return {
    health: HERO.health,
    energy: 0,
    energyMax: 0,
    deck: [],
    hand: [],
    board: [],
    fatigue: 0,
  };
}

function makeCreature(card) {
  return {
    id: card.id,
    attack: card.attack,
    health: card.health,
    maxHealth: card.health,
    canAttack: false,
    justPlayed: true,
  };
}

export function createWorld(random) {
  const player = makeHero();
  const foe = makeHero();
  const state = {
    player,
    foe,
    turn: 'player',
    turnNumber: 1,
    over: false,
    winner: null,
    log: 'Your move. Play a card, then end your turn.',
    selectedCard: -1,
    selectedAttacker: -1,
    foeTimer: 0,
    foeStep: 0,
    floaters: [],
    lastActionAt: 0,
    elapsed: 0,
  };

  function floater(text, x, y, color) {
    state.floaters.push({ text, x, y, color, ttl: 1.1 });
    if (state.floaters.length > 12) state.floaters.shift();
  }

  function draw(hero, count) {
    for (let i = 0; i < count; i += 1) {
      if (hero.deck.length === 0) {
        hero.fatigue += 1;
        hero.health -= hero.fatigue;
        continue;
      }
      const id = hero.deck.pop();
      if (hero.hand.length < HERO.handMax) hero.hand.push(id);
    }
  }

  function startTurn(hero) {
    hero.energyMax = Math.min(HERO.energyCap, hero.energyMax + 1);
    hero.energy = hero.energyMax;
    for (const creature of hero.board) {
      creature.canAttack = true;
      creature.justPlayed = false;
    }
    draw(hero, 1);
  }

  function checkOver() {
    if (state.over) return 0;
    if (foe.health <= 0 && player.health <= 0) {
      state.over = true;
      state.winner = 'draw';
      return EVENT_WIN;
    }
    if (foe.health <= 0) {
      state.over = true;
      state.winner = 'player';
      return EVENT_WIN;
    }
    if (player.health <= 0) {
      state.over = true;
      state.winner = 'foe';
      return EVENT_LOSE;
    }
    return 0;
  }

  function sweepDead() {
    player.board = player.board.filter((c) => c.health > 0);
    foe.board = foe.board.filter((c) => c.health > 0);
  }

  function applySpell(owner, enemy, card) {
    switch (card.effect) {
      case EFFECT.BOLT:
        enemy.health -= card.amount;
        break;
      case EFFECT.MEND:
        owner.health = Math.min(HERO.health, owner.health + card.amount);
        break;
      case EFFECT.DRAW:
        draw(owner, card.amount);
        break;
      case EFFECT.SURGE:
        owner.energy += card.amount;
        break;
      case EFFECT.BLAST:
        for (const c of enemy.board) c.health -= card.amount;
        break;
      case EFFECT.BUFF:
        for (const c of owner.board) {
          c.attack += card.amount;
          c.health += card.amount;
          c.maxHealth += card.amount;
        }
        break;
      default:
        break;
    }
    sweepDead();
  }

  function playFromHand(hero, enemy, index) {
    const card = cardById(hero.hand[index]);
    if (!card || card.cost > hero.energy) return false;
    if (card.kind === KIND_CREATURE && hero.board.length >= HERO.boardMax) return false;
    hero.energy -= card.cost;
    hero.hand.splice(index, 1);
    if (card.kind === KIND_CREATURE) hero.board.push(makeCreature(card));
    else applySpell(hero, enemy, card);
    return true;
  }

  function resolveAttack(attackerHero, defenderHero, attackerIndex, targetIndex) {
    const attacker = attackerHero.board[attackerIndex];
    if (!attacker || !attacker.canAttack || attacker.justPlayed) return false;
    attacker.canAttack = false;
    if (targetIndex === -1) {
      defenderHero.health -= attacker.attack;
    } else {
      const defender = defenderHero.board[targetIndex];
      if (!defender) return false;
      defender.health -= attacker.attack;
      attacker.health -= defender.attack;
    }
    sweepDead();
    return true;
  }

  function reset() {
    for (const hero of [player, foe]) {
      hero.health = HERO.health;
      hero.energy = 0;
      hero.energyMax = 0;
      hero.hand = [];
      hero.board = [];
      hero.fatigue = 0;
      hero.deck = shuffle(random, buildDeck());
    }
    draw(player, HERO.handStart);
    draw(foe, HERO.handStart);
    state.turn = 'player';
    state.turnNumber = 1;
    state.over = false;
    state.winner = null;
    state.selectedCard = -1;
    state.selectedAttacker = -1;
    state.floaters = [];
    state.log = 'Your move. Play a card, then end your turn.';
    startTurn(player);
  }

  /** The player plays hand card `index`. Returns event flags. */
  function playCard(index) {
    if (state.over || state.turn !== 'player') return 0;
    const card = cardById(player.hand[index]);
    if (!playFromHand(player, foe, index)) return 0;
    state.selectedCard = -1;
    state.log = `You played ${card.name}.`;
    floater(card.name, 640, 520, '#f2c94c');
    return (card.kind === KIND_SPELL ? EVENT_SPELL : EVENT_PLAY) | checkOver();
  }

  /** The player's board creature `attackerIndex` attacks `targetIndex` (-1 = the foe hero). */
  function attack(attackerIndex, targetIndex) {
    if (state.over || state.turn !== 'player') return 0;
    const attacker = player.board[attackerIndex];
    if (!attacker) return 0;
    const name = cardById(attacker.id).name;
    if (!resolveAttack(player, foe, attackerIndex, targetIndex)) return 0;
    state.selectedAttacker = -1;
    state.log = targetIndex === -1 ? `${name} strikes the foe hero!` : `${name} attacks!`;
    return EVENT_ATTACK | checkOver();
  }

  function endTurn() {
    if (state.over || state.turn !== 'player') return 0;
    state.turn = 'foe';
    state.selectedCard = -1;
    state.selectedAttacker = -1;
    state.foeTimer = AI.think;
    state.foeStep = 0;
    state.log = 'The foe duelist takes their turn…';
    startTurn(foe);
    return EVENT_TURN | checkOver();
  }

  /** One AI decision: play the best affordable card, else attack, else end the turn. */
  function foeAct() {
    // Play cards: most expensive affordable creature first; spells when they help.
    let bestIndex = -1;
    let bestCost = -1;
    for (let i = 0; i < foe.hand.length; i += 1) {
      const card = cardById(foe.hand[i]);
      if (card.cost > foe.energy) continue;
      if (card.kind === KIND_CREATURE) {
        if (foe.board.length >= HERO.boardMax) continue;
        if (card.cost > bestCost) { bestCost = card.cost; bestIndex = i; }
      } else if (bestIndex === -1) {
        const useful =
          card.effect === EFFECT.DRAW || card.effect === EFFECT.SURGE ||
          (card.effect === EFFECT.BOLT && (player.health <= 9 || random() < 0.5)) ||
          (card.effect === EFFECT.MEND && foe.health <= 18) ||
          (card.effect === EFFECT.BLAST && player.board.length >= 2) ||
          (card.effect === EFFECT.BUFF && foe.board.length >= 2);
        if (useful) bestIndex = i;
      }
    }
    if (bestIndex !== -1) {
      const card = cardById(foe.hand[bestIndex]);
      if (playFromHand(foe, player, bestIndex)) {
        state.log = `Foe plays ${card.name}.`;
        state.foeTimer = AI.play;
        return EVENT_PLAY | checkOver();
      }
    }
    // Attack: go for the hero unless a big player creature must be answered.
    for (let i = 0; i < foe.board.length; i += 1) {
      const creature = foe.board[i];
      if (!creature.canAttack || creature.justPlayed) continue;
      let target = -1;
      let biggest = 0;
      for (let j = 0; j < player.board.length; j += 1) {
        if (player.board[j].attack > biggest) { biggest = player.board[j].attack; target = j; }
      }
      if (!(biggest >= 5 && random() < 0.7)) target = -1;
      if (resolveAttack(foe, player, i, target)) {
        state.log = target === -1 ? 'Foe creature strikes you!' : 'Foe creature attacks yours!';
        state.foeTimer = AI.attack;
        return EVENT_ATTACK | checkOver();
      }
    }
    // Nothing left: hand the turn back.
    state.turn = 'player';
    state.turnNumber += 1;
    startTurn(player);
    state.log = 'Your move.';
    return EVENT_TURN | checkOver();
  }

  /** Advance timers: the foe's turn, floating combat text. Returns event flags. */
  function step(dt) {
    state.elapsed += dt;
    for (const f of state.floaters) f.ttl -= dt;
    state.floaters = state.floaters.filter((f) => f.ttl > 0);
    if (state.over || state.turn !== 'foe') return 0;
    state.foeTimer -= dt;
    if (state.foeTimer > 0) return 0;
    return foeAct();
  }

  reset();
  return { state, reset, playCard, attack, endTurn, step, draw, startTurn };
}
