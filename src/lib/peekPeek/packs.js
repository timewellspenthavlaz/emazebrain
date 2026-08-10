/**
 * Peek Peek — picture packs.
 *
 * Each pack is an ordered list of distinct pictures. The spec requires ≥14 per
 * pack; the attached placeholder art gives fewer (faces = 5 attached single-face
 * SVGs, marine = 9 generated 3D-rendered creatures). K is clamped to the actual
 * pack size, so smaller packs cap the difficulty ladder's top — flagged in the
 * payload. Final commissioned art (P4) raises every pack to 14.
 *
 * household and animals are not wired (no art) and resolve to marine as a
 * placeholder so `rotate` and unknown packs stay playable.
 */

const FACES = [
  { id: 'face1', name: 'Face 1', url: 'https://media.base44.com/images/public/6a53fb14473d432d3056ed57/4dfb3bd04_19998903_Funny_face_illustration_set_1.svg' },
  { id: 'face2', name: 'Face 2', url: 'https://media.base44.com/images/public/6a53fb14473d432d3056ed57/0838373a2_19998911_Funny_face_illustration_set_2.svg' },
  { id: 'face3', name: 'Face 3', url: 'https://media.base44.com/images/public/6a53fb14473d432d3056ed57/5d6df4c31_19998919_Funny_face_illustration_set_3.svg' },
  { id: 'face4', name: 'Face 4', url: 'https://media.base44.com/images/public/6a53fb14473d432d3056ed57/44c66d910_19998927_Funny_face_illustration_set_4.svg' },
  { id: 'face5', name: 'Face 5', url: 'https://media.base44.com/images/public/6a53fb14473d432d3056ed57/6952ef168_19998758_Funny_face_illustration_set_5.svg' },
];

const MARINE = [
  { id: 'clownfish', name: 'Clownfish', url: 'https://media.base44.com/images/public/6a53fb14473d432d3056ed57/66e10eed5_generated_image.png' },
  { id: 'bluetang', name: 'Blue Tang', url: 'https://media.base44.com/images/public/6a53fb14473d432d3056ed57/cfb371e87_generated_image.png' },
  { id: 'seahorse', name: 'Seahorse', url: 'https://media.base44.com/images/public/6a53fb14473d432d3056ed57/5b4e764ed_generated_image.png' },
  { id: 'starfish', name: 'Starfish', url: 'https://media.base44.com/images/public/6a53fb14473d432d3056ed57/8043da8b7_generated_image.png' },
  { id: 'jellyfish', name: 'Jellyfish', url: 'https://media.base44.com/images/public/6a53fb14473d432d3056ed57/7d2997d28_generated_image.png' },
  { id: 'crab', name: 'Crab', url: 'https://media.base44.com/images/public/6a53fb14473d432d3056ed57/9ecacf678_generated_image.png' },
  { id: 'octopus', name: 'Octopus', url: 'https://media.base44.com/images/public/6a53fb14473d432d3056ed57/fb3a98493_generated_image.png' },
  { id: 'turtle', name: 'Sea Turtle', url: 'https://media.base44.com/images/public/6a53fb14473d432d3056ed57/1f3db4202_generated_image.png' },
  { id: 'angelfish', name: 'Angelfish', url: 'https://media.base44.com/images/public/6a53fb14473d432d3056ed57/aef64aa2f_generated_image.png' },
];

export const PACKS = {
  faces: FACES,
  marine: MARINE,
  household: MARINE, // placeholder until commissioned art lands
  animals: MARINE, // placeholder until commissioned art lands
};

// `rotate` cycles packs per level in a fixed order
export const ROTATE_ORDER = ['marine', 'faces', 'marine', 'faces'];

export function packForLevel(packParam, level) {
  if (packParam === 'rotate') {
    return ROTATE_ORDER[(level - 1) % ROTATE_ORDER.length];
  }
  return PACKS[packParam] ? packParam : 'marine';
}

export function packSize(packParam) {
  if (packParam === 'rotate') {
    return Math.max(...ROTATE_ORDER.map((p) => PACKS[p].length));
  }
  return (PACKS[packParam] || PACKS.marine).length;
}

export function getPack(name) {
  return PACKS[name] || PACKS.marine;
}