// Original implicit volume; no third-party model or video-derived geometry.
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
export function heartField(x: number, y: number, z: number) {
  const a = x * x + 2.25 * z * z + y * y - 1;
  return a * a * a - x * x * y * y * y - 0.1125 * z * z * y * y * y;
}
export function sampleHeart(count: number, seed = 14026) {
  const random = seededRandom(seed),
    positions = new Float32Array(count * 3),
    phases = new Float32Array(count);
  let accepted = 0;
  // Rejection sampling genuinely fills the volume; bias toward the shell for a crisp silhouette.
  for (let attempts = 0; accepted < count && attempts < count * 100; attempts++) {
    const x = (random() * 2 - 1) * 1.2,
      y = random() * 2.5 - 1.05,
      z = (random() * 2 - 1) * 0.8;
    const field = heartField(x, y, z);
    if (field > 0 || (field < -0.035 && random() > 0.22)) continue;
    positions.set([x * 1.32, (y - 0.16) * 1.32, z * 1.32], accepted * 3);
    phases[accepted++] = random() * Math.PI * 2;
  }
  if (accepted !== count) throw new Error('Particle sampling budget exhausted');
  return { positions, phases };
}
export function sampleStars(count: number) {
  const random = seededRandom(8751),
    positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++)
    positions.set([(random() - 0.5) * 26, (random() - 0.5) * 20, -4 - random() * 12], i * 3);
  return positions;
}
export function heartbeat(time: number) {
  return 1 + 0.035 * Math.pow((Math.sin(time * 3.6) + 1) / 2, 4);
}
