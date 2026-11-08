/**
 * A small skeleton for the two stylised fighters of the home page, seen from the side. A pose is a handful of angles; the joints
 * come from them by plain trigonometry, so the whole fight is a table of poses and the code between them is easy to test.
 *
 * Angles are in degrees. The limbs' angles are from "straight down" (an arm hanging is 0, held out in front is 90, raised
 * is 180); the torso's and head's are from "straight up" (leaning forward is positive, falling backwards is negative). "Forward"
 * is toward the opponent, so the same pose serves the fighter on either side (`facing`).
 */

export const LIMBS = { thigh: 54, shin: 54, torso: 74, neck: 18, head: 15, arm: 38, forearm: 36 }

export interface Pose {
  /** Where the hips are, across. */
  hx: number
  /** Where the hips are, up and down, when the fighter is not standing on both feet (see `g`). */
  hy: number
  /** 1 when the lowest foot is on the floor (the hips follow from the legs), 0 when `hy` rules. In between, a mix. */
  g: number
  torso: number
  head: number
  /** The arm nearer the opponent: upper arm and forearm. */
  a1: number
  a2: number
  /** The arm farther away. */
  b1: number
  b2: number
  /** The leg nearer the opponent: thigh and shin. */
  l1: number
  l2: number
  /** The leg farther away. */
  m1: number
  m2: number
  /** How much the fighter bounces on the spot (0 to 1). */
  bob: number
}

export type PoseKey = keyof Pose
export const POSE_KEYS: PoseKey[] = ['hx', 'hy', 'g', 'torso', 'head', 'a1', 'a2', 'b1', 'b2', 'l1', 'l2', 'm1', 'm2', 'bob']

export interface Point {
  x: number
  y: number
}

export interface Skeleton {
  hip: Point
  shoulder: Point
  headCentre: Point
  elbowNear: Point
  handNear: Point
  elbowFar: Point
  handFar: Point
  kneeNear: Point
  footNear: Point
  kneeFar: Point
  footFar: Point
}

const rad = (degrees: number) => (degrees * Math.PI) / 180

/** A point `length` away from `from`, at an angle measured from straight down (forward being `facing`). */
function fromDown(from: Point, angle: number, length: number, facing: 1 | -1): Point {
  return { x: from.x + Math.sin(rad(angle)) * length * facing, y: from.y + Math.cos(rad(angle)) * length }
}

/** The same, measured from straight up. */
function fromUp(from: Point, angle: number, length: number, facing: 1 | -1): Point {
  return { x: from.x + Math.sin(rad(angle)) * length * facing, y: from.y - Math.cos(rad(angle)) * length }
}

/** How far below the hips the lower foot is, for these leg angles. */
export function legReach(pose: Pose) {
  const near = Math.cos(rad(pose.l1)) * LIMBS.thigh + Math.cos(rad(pose.l2)) * LIMBS.shin
  const far = Math.cos(rad(pose.m1)) * LIMBS.thigh + Math.cos(rad(pose.m2)) * LIMBS.shin
  return Math.max(near, far)
}

/** Every joint of a fighter in a pose, with the floor at `floor`. The hips sit where the feet meet the floor, as far as `g` says. */
export function skeleton(pose: Pose, facing: 1 | -1, floor: number, time = 0): Skeleton {
  const bob = Math.sin(time * 7.5) * pose.bob
  const standingHip = floor - legReach(pose)
  const hipY = pose.g * standingHip + (1 - pose.g) * pose.hy + bob * 2.2
  const hip: Point = { x: pose.hx, y: hipY }
  const lean = pose.torso + bob * 1.5
  const shoulder = fromUp(hip, lean, LIMBS.torso, facing)
  const neck = fromUp(shoulder, pose.head, LIMBS.neck, facing)
  const headCentre = fromUp(neck, pose.head, LIMBS.head * 0.6, facing)
  const elbowNear = fromDown(shoulder, pose.a1, LIMBS.arm, facing)
  const elbowFar = fromDown(shoulder, pose.b1, LIMBS.arm, facing)
  const kneeNear = fromDown(hip, pose.l1, LIMBS.thigh, facing)
  const kneeFar = fromDown(hip, pose.m1, LIMBS.thigh, facing)
  return {
    hip,
    shoulder,
    headCentre,
    elbowNear,
    handNear: fromDown(elbowNear, pose.a2, LIMBS.forearm, facing),
    elbowFar,
    handFar: fromDown(elbowFar, pose.b2, LIMBS.forearm, facing),
    kneeNear,
    footNear: fromDown(kneeNear, pose.l2, LIMBS.shin, facing),
    kneeFar,
    footFar: fromDown(kneeFar, pose.m2, LIMBS.shin, facing),
  }
}

/** A pose, with whatever the caller leaves out taken from a standing guard. */
export const GUARD: Pose = { hx: 0, hy: 0, g: 1, torso: 8, head: 5, a1: 38, a2: 150, b1: 22, b2: 168, l1: 22, l2: -4, m1: -20, m2: 10, bob: 1 }
export const pose = (changes: Partial<Pose>): Pose => ({ ...GUARD, ...changes })

export interface Keyframe {
  t: number
  pose: Pose
}

const ease = (x: number) => x * x * (3 - 2 * x)

/** The pose at a time, easing between the two keyframes around it; the time wraps around the loop (the last keyframe leads back to the first). */
export function poseAt(frames: Keyframe[], time: number, duration: number): Pose {
  const t = ((time % duration) + duration) % duration
  let index = frames.length - 1
  for (let candidate = 0; candidate < frames.length - 1; candidate += 1) {
    if (t >= frames[candidate].t && t < frames[candidate + 1].t) {
      index = candidate
      break
    }
  }
  const from = frames[index]
  const next = frames[(index + 1) % frames.length]
  const span = index === frames.length - 1 ? duration - from.t + next.t : next.t - from.t
  const elapsed = index === frames.length - 1 && t < from.t ? t + duration - from.t : t - from.t
  const k = span <= 0 ? 0 : ease(Math.min(1, Math.max(0, elapsed / span)))
  const result = { ...from.pose }
  for (const key of POSE_KEYS) result[key] = from.pose[key] + (next.pose[key] - from.pose[key]) * k
  return result
}
