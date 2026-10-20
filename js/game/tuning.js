// Hero feel, in pixels and pixels per step at 60 Hz.
// Jump apex = jump² / (2 × gHeld) = 60 px ≈ 3.75 tiles walking.

export const TUNING = {
  walk: 1.5, run: 2.5,
  accWalk: 0.10, accRun: 0.14,
  decel: 0.12, skid: 0.30,
  airAcc: 0.08, airDecel: 0.02,
  jump: 6.0, jumpRunBonus: 0.3,      // running adds 0.3 × |vx|
  gHeld: 0.30, gFall: 0.60,
  apexHang: 0.5,                     // gravity multiplier near the apex while held
  jumpCut: -2,                       // releasing early clamps upward speed
  maxFall: 5.0,
  coyote: 6, buffer: 8,
  corner: 4,
  stomp: -4, stompHeld: -6,
  knockX: 1.5, knockY: -2.5, hurtLock: 12, iframes: 90,
  conveyor: 0.75,
};
