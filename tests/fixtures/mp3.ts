// Synthetic, copyright-free MPEG-1 Layer III mono silence; no downloaded music.
export function silentMp3(frames = 240) {
  const frame = Buffer.alloc(417);
  frame.set([0xff, 0xfb, 0x90, 0xc0]);
  return Buffer.concat(Array.from({ length: frames }, () => frame));
}
