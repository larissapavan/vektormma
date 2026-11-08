import { pose, poseAt, skeleton, type Keyframe, type Pose, type Skeleton } from './rig'

/**
 * The fight the home page plays on a loop, as two tables of poses (see rig.ts): they trade strikes, then the one on the left lands a straight
 * right hand, the other drops on his back and the winner raises a glove. Every number is a guess made to look right, kept in one place so it
 * can be changed by looking at it. The two sides are not real fighters, and the result is not a prediction.
 */

export const LOOP_SECONDS = 13
export const FLOOR = 372

/** The side that wins (left) and the side that loses (right) face each other: `facing` says which way each one looks. */
export const LEFT = { facing: 1 as const }
export const RIGHT = { facing: -1 as const }

const p = pose

export const LEFT_FRAMES: Keyframe[] = [
  { t: 0, pose: p({ hx: 168 }) },
  { t: 1.6, pose: p({ hx: 182, l1: 26, m1: -22 }) },
  // The jab
  { t: 2.35, pose: p({ hx: 188, torso: 12, a1: 88, a2: 96, l1: 32, l2: -2, bob: 0.3 }) },
  { t: 2.6, pose: p({ hx: 196, torso: 16, a1: 92, a2: 92, l1: 36, l2: 0, bob: 0 }) },
  { t: 3.05, pose: p({ hx: 184, torso: 6 }) },
  // The counter goes past him
  { t: 3.7, pose: p({ hx: 176, torso: -10, head: -6, a1: 60, a2: 150, b1: 40, b2: 160, l1: 14, m1: -26 }) },
  { t: 4.1, pose: p({ hx: 182, torso: 8 }) },
  // The low kick with the back leg
  { t: 4.7, pose: p({ hx: 184, torso: -10, head: 0, m1: 84, m2: 96, l1: 8, l2: -4, a1: 50, b1: 70, bob: 0.2 }) },
  { t: 5.0, pose: p({ hx: 190, torso: -14, head: 0, m1: 96, m2: 100, l1: 8, l2: -4, a1: 50, b1: 70, bob: 0 }) },
  { t: 5.5, pose: p({ hx: 188 }) },
  // The straight right hand that ends it: a step in, the hips turning through
  { t: 6.0, pose: p({ hx: 192, torso: -6, head: 0, a1: 40, a2: 150, b1: 50, b2: 150, l1: 26, m1: -22, bob: 0 }) },
  { t: 6.4, pose: p({ hx: 206, torso: 20, head: 12, a1: 40, a2: 150, b1: 90, b2: 90, l1: 38, l2: 0, m1: -28, m2: 10, bob: 0 }) },
  { t: 7.0, pose: p({ hx: 212, torso: 14, head: 8, a1: 40, a2: 150, b1: 70, b2: 100, l1: 32, l2: 0, bob: 0 }) },
  // He stands over him, then steps back and lets his hands drop
  { t: 8.0, pose: p({ hx: 208, torso: 6, head: 6, a1: 24, a2: 70, b1: 22, b2: 60, l1: 20, l2: 0, m1: -16, m2: 6, bob: 0.3 }) },
  { t: 9.2, pose: p({ hx: 192, torso: 2, head: 0, a1: 14, a2: 24, b1: 14, b2: 24, l1: 14, l2: 0, m1: -12, m2: 4, bob: 0.4 }) },
  // And raises a glove
  { t: 10.3, pose: p({ hx: 190, torso: 0, head: -4, a1: 14, a2: 24, b1: 150, b2: 168, l1: 14, l2: 0, m1: -12, m2: 4, bob: 0.4 }) },
  { t: 12.95, pose: p({ hx: 190, torso: 0, head: -4, a1: 14, a2: 24, b1: 150, b2: 168, l1: 14, l2: 0, m1: -12, m2: 4, bob: 0.4 }) },
]

export const RIGHT_FRAMES: Keyframe[] = [
  { t: 0, pose: p({ hx: 322 }) },
  { t: 1.6, pose: p({ hx: 314, l1: 26, m1: -22 }) },
  // He takes the jab
  { t: 2.35, pose: p({ hx: 312, torso: 6 }) },
  { t: 2.7, pose: p({ hx: 322, torso: -12, head: -10, a1: 60, a2: 150 }) },
  { t: 3.2, pose: p({ hx: 316, torso: 10 }) },
  // And throws the counter
  { t: 3.6, pose: p({ hx: 304, torso: 20, head: 10, b1: 86, b2: 90, l1: 30, l2: 0, bob: 0 }) },
  { t: 4.2, pose: p({ hx: 312, torso: 10 }) },
  // He covers up from the kick
  { t: 4.7, pose: p({ hx: 314, torso: 18, head: 14, a1: 28, a2: 176, b1: 20, b2: 172, bob: 0 }) },
  { t: 5.1, pose: p({ hx: 322, torso: 16, head: 12, a1: 28, a2: 176, b1: 20, b2: 172, bob: 0 }) },
  { t: 5.6, pose: p({ hx: 320 }) },
  // He sees it late, takes the right hand, and drops on his back
  { t: 6.0, pose: p({ hx: 322, torso: 8, head: 6, a1: 40, a2: 150, b1: 22, b2: 168 }) },
  { t: 6.4, pose: p({ hx: 330, hy: 262, torso: -16, head: -22, a1: 70, a2: 130, b1: 90, b2: 120, l1: 18, l2: -6, m1: -16, m2: 8, bob: 0 }) },
  { t: 6.9, pose: p({ hx: 326, hy: 290, g: 0, torso: -52, head: -44, a1: 100, a2: 130, b1: 110, b2: 130, l1: 64, l2: -12, m1: 62, m2: -18, bob: 0 }) },
  { t: 7.2, pose: p({ hx: 322, hy: 328, g: 0, torso: -72, head: -64, a1: 110, a2: 140, b1: 104, b2: 134, l1: 90, l2: 30, m1: 84, m2: 40, bob: 0 }) },
  { t: 7.6, pose: p({ hx: 320, hy: 352, g: 0, torso: -86, head: -80, a1: 120, a2: 150, b1: 110, b2: 140, l1: 118, l2: 44, m1: 100, m2: 62, bob: 0 }) },
  { t: 9.0, pose: p({ hx: 320, hy: 352, g: 0, torso: -88, head: -84, a1: 112, a2: 130, b1: 102, b2: 122, l1: 112, l2: 54, m1: 100, m2: 64, bob: 0 }) },
  { t: 12.95, pose: p({ hx: 320, hy: 352, g: 0, torso: -88, head: -86, a1: 100, a2: 110, b1: 96, b2: 106, l1: 106, l2: 66, m1: 100, m2: 66, bob: 0 }) },
]

/** A blow that lands: when, who threw it and with what (the point is read off the fighter's own pose at that moment). */
export interface Impact {
  t: number
  by: 'left' | 'right'
  joint: 'handNear' | 'handFar' | 'footFar' | 'hip'
}

export const IMPACTS: Impact[] = [
  { t: 2.6, by: 'left', joint: 'handNear' },
  { t: 3.6, by: 'right', joint: 'handFar' },
  { t: 5.0, by: 'left', joint: 'footFar' },
  { t: 6.4, by: 'left', joint: 'handFar' },
]

export interface Scene {
  left: Pose
  right: Pose
  leftBody: Skeleton
  rightBody: Skeleton
}

/** Both fighters at a time in the loop. */
export function sceneAt(time: number): Scene {
  const left = poseAt(LEFT_FRAMES, time, LOOP_SECONDS)
  const right = poseAt(RIGHT_FRAMES, time, LOOP_SECONDS)
  return { left, right, leftBody: skeleton(left, LEFT.facing, FLOOR, time), rightBody: skeleton(right, RIGHT.facing, FLOOR, time) }
}

/** Where a blow lands, and how far along its burst is (0 to 1, or null when it is not on screen). */
export function impactAt(time: number, impact: Impact) {
  const age = (((time - impact.t) % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS
  if (age > 0.45) return null
  const at = sceneAt(impact.t)
  const body = impact.by === 'left' ? at.leftBody : at.rightBody
  return { ...body[impact.joint], progress: age / 0.45 }
}

/** The scene fades out at the end of the loop and in at the start, so the jump back to the first pose is never seen. */
export function fadeAt(time: number) {
  const t = ((time % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS
  if (t < 0.5) return t / 0.5
  if (t > 12.3) return Math.max(0, (LOOP_SECONDS - t) / (LOOP_SECONDS - 12.3))
  return 1
}
