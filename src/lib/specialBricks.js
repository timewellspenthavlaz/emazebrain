export const SPECIAL_BRICK_TYPES = [
  { id: 'exploding',   color: '#FF4444', symbol: '✦' },
  { id: 'slow_down',   color: '#3B82F6', symbol: '〜' },
  { id: 'rocket',     color: '#F59E0B', symbol: '▲' },
  { id: 'paddle_thin', color: '#A855F7', symbol: '−' },
  { id: 'paddle_wide', color: '#22C55E', symbol: '╋' },
  { id: 'multi_ball',  color: '#EC4899', symbol: '◉' },
  { id: 'invisible',   color: '#64748B', symbol: '?' },
  { id: 'gravity',     color: '#78716C', symbol: '▼' },
];

const TYPE_PAIRS = [
  ['exploding', 'slow_down'],
  ['rocket', 'paddle_thin'],
  ['paddle_wide', 'multi_ball'],
  ['invisible', 'gravity'],
];

export function getAvailableSpecialTypes(level) {
  if (level >= 10) return SPECIAL_BRICK_TYPES.map(t => t.id);
  const cycleIndex = (level - 1) % 5;
  if (cycleIndex === 4) {
    const shuffled = [...SPECIAL_BRICK_TYPES].sort(() => Math.random() - 0.5);
    return [shuffled[0].id, shuffled[1].id];
  }
  return TYPE_PAIRS[cycleIndex];
}

export function assignSpecialBricks(bricks, level) {
  const availableTypes = getAvailableSpecialTypes(level);
  const total = bricks.length;
  if (total === 0) return bricks;

  const minSpecial = Math.max(1, Math.ceil(total * 0.05));
  const maxSpecial = Math.max(minSpecial, Math.ceil(total * 0.15));
  const specialCount = minSpecial + Math.floor(Math.random() * (maxSpecial - minSpecial + 1));

  const indices = bricks.map((_, i) => i).sort(() => Math.random() - 0.5);

  for (let i = 0; i < specialCount && i < indices.length; i++) {
    const brick = bricks[indices[i]];
    brick.special = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    if (brick.special === 'invisible') brick.visible = false;
  }

  return bricks;
}

export function getSpecialConfig(typeId) {
  return SPECIAL_BRICK_TYPES.find(t => t.id === typeId);
}