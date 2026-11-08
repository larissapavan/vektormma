import { pose, poseAt, skeleton, type Keyframe, type Pose, type Skeleton } from './rig'

/**
 * The fight the home page plays on a loop, as two tables of poses (see rig.ts): they trade strikes, the one on the left takes the
 * other down, finishes on the ground and gets up the winner. Every number is a guess made to look right, kept in one place so it
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
  // The level change and the takedown
  { t: 6.1, pose: p({ hx: 212, torso: 58, head: 46, a1: 62, a2: 28, b1: 58, b2: 22, l1: 62, l2: 6, m1: -34, m2: -18, bob: 0 }) },
  { t: 6.6, pose: p({ hx: 240, torso: 66, head: 52, a1: 60, a2: 24, b1: 56, b2: 18, l1: 70, l2: 10, m1: -36, m2: -22, bob: 0 }) },
  // On top of him
  { t: 7.3, pose: p({ hx: 282, hy: 322, g: 0, torso: 40, head: 32, a1: 70, a2: 40, b1: 30, b2: 140, l1: 84, l2: -78, m1: 96, m2: -84, bob: 0 }) },
  { t: 8.0, pose: p({ hx: 284, hy: 322, g: 0, torso: 46, head: 36, a1: 74, a2: 28, b1: 10, b2: 150, l1: 84, l2: -78, m1: 96, m2: -84, bob: 0 }) },
  { t: 8.5, pose: p({ hx: 284, hy: 322, g: 0, torso: 38, head: 30, a1: 20, a2: 150, b1: 76, b2: 26, l1: 84, l2: -78, m1: 96, m2: -84, bob: 0 }) },
  { t: 9.0, pose: p({ hx: 284, hy: 322, g: 0, torso: 46, head: 36, a1: 74, a2: 28, b1: 10, b2: 150, l1: 84, l2: -78, m1: 96, m2: -84, bob: 0 }) },
  { t: 9.5, pose: p({ hx: 284, hy: 322, g: 0, torso: 38, head: 30, a1: 20, a2: 150, b1: 76, b2: 26, l1: 84, l2: -78, m1: 96, m2: -84, bob: 0 }) },
  { t: 10.1, pose: p({ hx: 284, hy: 322, g: 0, torso: 30, head: 20, a1: 40, a2: 90, b1: 40, b2: 90, l1: 84, l2: -78, m1: 96, m2: -84, bob: 0 }) },
  // He gets up, and walks back with an arm raised
  { t: 10.5, pose: p({ hx: 278, torso: 36, head: 24, a1: 40, a2: 90, b1: 40, b2: 90, l1: 64, l2: -44, m1: 8, m2: 6, bob: 0 }) },
  { t: 11.1, pose: p({ hx: 250, torso: 14, head: 8, a1: 30, a2: 60, b1: 30, b2: 60, l1: 20, l2: 0, m1: -14, m2: 4, bob: 0.2 }) },
  { t: 11.9, pose: p({ hx: 196, torso: 4, head: -4, a1: 20, a2: 20, b1: 168, b2: 176, l1: 14, l2: 0, m1: -10, m2: 4, bob: 0.4 }) },
  { t: 12.95, pose: p({ hx: 196, torso: 4, head: -4, a1: 20, a2: 20, b1: 168, b2: 176, l1: 14, l2: 0, m1: -10, m2: 4, bob: 0.4 }) },
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
  // He sprawls and falls on his back
  { t: 6.1, pose: p({ hx: 322, torso: 22, head: 18, a1: 80, a2: 110, b1: 70, b2: 100, l1: -10, l2: -2, m1: -22, m2: 6, bob: 0 }) },
  { t: 6.7, pose: p({ hx: 322, torso: 52, head: 40, a1: 100, a2: 120, b1: 90, b2: 110, l1: -26, l2: -6, m1: -40, m2: -10, bob: 0 }) },
  { t: 7.3, pose: p({ hx: 320, hy: 352, g: 0, torso: -86, head: -80, a1: 120, a2: 150, b1: 110, b2: 140, l1: 118, l2: 44, m1: 100, m2: 62, bob: 0 }) },
  { t: 8.0, pose: p({ hx: 320, hy: 352, g: 0, torso: -86, head: -72, a1: 126, a2: 160, b1: 112, b2: 150, l1: 118, l2: 44, m1: 100, m2: 62, bob: 0 }) },
  { t: 9.0, pose: p({ hx: 320, hy: 352, g: 0, torso: -86, head: -78, a1: 120, a2: 164, b1: 106, b2: 150, l1: 118, l2: 44, m1: 100, m2: 62, bob: 0 }) },
  { t: 9.8, pose: p({ hx: 320, hy: 352, g: 0, torso: -88, head: -84, a1: 100, a2: 120, b1: 94, b2: 110, l1: 112, l2: 52, m1: 100, m2: 64, bob: 0 }) },
  { t: 10.6, pose: p({ hx: 320, hy: 352, g: 0, torso: -88, head: -86, a1: 78, a2: 80, b1: 74, b2: 78, l1: 104, l2: 70, m1: 100, m2: 66, bob: 0 }) },
  { t: 12.95, pose: p({ hx: 320, hy: 352, g: 0, torso: -88, head: -86, a1: 78, a2: 80, b1: 74, b2: 78, l1: 104, l2: 70, m1: 100, m2: 66, bob: 0 }) },
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
  { t: 6.6, by: 'left', joint: 'handNear' },
  { t: 7.25, by: 'right', joint: 'hip' },
  { t: 8.0, by: 'left', joint: 'handNear' },
  { t: 8.5, by: 'left', joint: 'handFar' },
  { t: 9.0, by: 'left', joint: 'handNear' },
  { t: 9.5, by: 'left', joint: 'handFar' },
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
