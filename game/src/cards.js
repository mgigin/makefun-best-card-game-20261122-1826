// The Emberfall card set: every card either duelist can draw. All names, numbers and
// flavour are original to this game. A card is a creature (attack/health on the board)
// or a spell (an instant effect). `art` names the little procedural emblem the renderer
// draws on the card face; `hue` picks its banner colour from the palette.

export const KIND_CREATURE = 'creature';
export const KIND_SPELL = 'spell';

export const EFFECT = {
  NONE: 'none',
  BOLT: 'bolt', // deal `amount` damage to the enemy hero
  MEND: 'mend', // restore `amount` health to your hero
  DRAW: 'draw', // draw `amount` cards
  SURGE: 'surge', // gain `amount` energy this turn
  BLAST: 'blast', // deal `amount` damage to every enemy creature
  BUFF: 'buff', // give every friendly creature +amount/+amount
};

export const CARDS = [
  { id: 'cinder-sprite', name: 'Cinder Sprite', kind: KIND_CREATURE, cost: 1, attack: 2, health: 1, art: 'flame', hue: 'ember', text: 'Quick and bright, gone by morning.' },
  { id: 'mossback-tortoise', name: 'Mossback Tortoise', kind: KIND_CREATURE, cost: 2, attack: 1, health: 5, art: 'shell', hue: 'leaf', text: 'It has outlived three forests.' },
  { id: 'lantern-fox', name: 'Lantern Fox', kind: KIND_CREATURE, cost: 2, attack: 3, health: 2, art: 'fox', hue: 'gold', text: 'It lights the path it means to steal.' },
  { id: 'frost-heron', name: 'Frost Heron', kind: KIND_CREATURE, cost: 3, attack: 3, health: 3, art: 'heron', hue: 'frost', text: 'Still water, colder patience.' },
  { id: 'ember-knight', name: 'Ember Knight', kind: KIND_CREATURE, cost: 3, attack: 4, health: 3, art: 'sword', hue: 'ember', text: 'His oath was sworn in a burning hall.' },
  { id: 'thorn-golem', name: 'Thorn Golem', kind: KIND_CREATURE, cost: 4, attack: 3, health: 6, art: 'thorn', hue: 'leaf', text: 'Every garden needs a wall that bites.' },
  { id: 'storm-falcon', name: 'Storm Falcon', kind: KIND_CREATURE, cost: 4, attack: 5, health: 3, art: 'falcon', hue: 'frost', text: 'The thunder arrives a breath behind it.' },
  { id: 'ashen-warden', name: 'Ashen Warden', kind: KIND_CREATURE, cost: 5, attack: 4, health: 7, art: 'shield', hue: 'violet', text: 'She guards the gate nobody remembers.' },
  { id: 'starfall-dragon', name: 'Starfall Dragon', kind: KIND_CREATURE, cost: 7, attack: 8, health: 8, art: 'dragon', hue: 'violet', text: 'It fell once. The sky kept the receipt.' },
  { id: 'spark-bolt', name: 'Spark Bolt', kind: KIND_SPELL, cost: 2, effect: EFFECT.BOLT, amount: 3, art: 'bolt', hue: 'gold', text: 'Deal 3 damage to the enemy hero.' },
  { id: 'hearth-mend', name: 'Hearth Mend', kind: KIND_SPELL, cost: 2, effect: EFFECT.MEND, amount: 5, art: 'hearth', hue: 'leaf', text: 'Restore 5 health to your hero.' },
  { id: 'cartographers-draft', name: "Cartographer's Draft", kind: KIND_SPELL, cost: 3, effect: EFFECT.DRAW, amount: 2, art: 'map', hue: 'frost', text: 'Draw 2 cards.' },
  { id: 'ember-surge', name: 'Ember Surge', kind: KIND_SPELL, cost: 0, effect: EFFECT.SURGE, amount: 2, art: 'surge', hue: 'ember', text: 'Gain 2 energy this turn.' },
  { id: 'cinder-blast', name: 'Cinder Blast', kind: KIND_SPELL, cost: 4, effect: EFFECT.BLAST, amount: 2, art: 'blast', hue: 'ember', text: 'Deal 2 damage to every enemy creature.' },
  { id: 'banner-of-dawn', name: 'Banner of Dawn', kind: KIND_SPELL, cost: 3, effect: EFFECT.BUFF, amount: 1, art: 'banner', hue: 'gold', text: 'Your creatures gain +1/+1.' },
];

const BY_ID = new Map(CARDS.map((card) => [card.id, card]));

export function cardById(id) {
  return BY_ID.get(id);
}

/** A fresh 24-card deck: two copies of the twelve cheapest cards, shuffled by the caller. */
export function buildDeck() {
  const ids = [];
  const sorted = [...CARDS].sort((a, b) => a.cost - b.cost);
  for (let i = 0; i < 12; i += 1) {
    ids.push(sorted[i].id, sorted[i].id);
  }
  return ids;
}
