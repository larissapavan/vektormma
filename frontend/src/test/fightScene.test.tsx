import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import i18n from '../i18n'
import { fadeAt, FLOOR, IMPACTS, impactAt, LEFT_FRAMES, LOOP_SECONDS, RIGHT_FRAMES, sceneAt } from '../shared/components/fightScene/choreography'
import { FightLoop, STILL_TIME } from '../shared/components/fightScene/FightLoop'
import { GUARD, legReach, LIMBS, POSE_KEYS, pose, poseAt, skeleton, type Point } from '../shared/components/fightScene/rig'

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
/** What the picture shows, across (see VIEW in FightScene.tsx), with a little room for the camera's sway. */
const VIEW_LEFT = 40
const VIEW_RIGHT = 440
const SWAY = 7

describe('the skeleton', () => {
  it('keeps every bone the same length in any pose', () => {
    for (const changes of [{}, { torso: 60, a1: 100, a2: 20, l1: 80, l2: -70 }, { torso: -86, head: -80, b1: 170, m1: 96 }]) {
      const body = skeleton(pose(changes), 1, FLOOR)
      expect(dist(body.hip, body.shoulder)).toBeCloseTo(LIMBS.torso, 6)
      expect(dist(body.shoulder, body.elbowNear)).toBeCloseTo(LIMBS.arm, 6)
      expect(dist(body.elbowNear, body.handNear)).toBeCloseTo(LIMBS.forearm, 6)
      expect(dist(body.hip, body.kneeFar)).toBeCloseTo(LIMBS.thigh, 6)
      expect(dist(body.kneeFar, body.footFar)).toBeCloseTo(LIMBS.shin, 6)
    }
  })

  it('stands the lowest foot on the floor when the fighter is standing, and lets the hips rule when not', () => {
    const standing = skeleton(GUARD, 1, FLOOR)
    expect(Math.max(standing.footNear.y, standing.footFar.y)).toBeCloseTo(FLOOR, 6)
    expect(legReach(GUARD)).toBeGreaterThan(90)
    expect(skeleton(pose({ g: 0, hy: 300 }), 1, FLOOR).hip.y).toBe(300)
    expect(skeleton(pose({ g: 0.5, hy: 300 }), 1, FLOOR).hip.y).toBeCloseTo((300 + FLOOR - legReach(GUARD)) / 2, 6)
  })

  it('mirrors for the fighter on the other side: forward is toward the opponent', () => {
    const right = skeleton(pose({ hx: 300, a1: 90, a2: 90 }), 1, FLOOR)
    const left = skeleton(pose({ hx: 300, a1: 90, a2: 90 }), -1, FLOOR)
    expect(right.handNear.x).toBeGreaterThan(300)
    expect(left.handNear.x).toBeLessThan(300)
    expect(left.handNear.y).toBeCloseTo(right.handNear.y, 6)
  })

  it('bounces only as much as the pose says', () => {
    const still = skeleton(pose({ bob: 0 }), 1, FLOOR, 0.2)
    expect(still.hip.y).toBeCloseTo(FLOOR - legReach(pose({ bob: 0 })), 6)
    expect(skeleton(pose({ bob: 1 }), 1, FLOOR, 0.2).hip.y).not.toBeCloseTo(still.hip.y, 2)
  })
})

describe('easing between poses', () => {
  const frames = [
    { t: 0, pose: pose({ torso: 0, hx: 100 }) },
    { t: 2, pose: pose({ torso: 40, hx: 200 }) },
    { t: 4, pose: pose({ torso: 0, hx: 100 }) },
  ]

  it('is exactly the keyframe at the keyframe’s time, and between the two around it in between', () => {
    expect(poseAt(frames, 0, 6).torso).toBe(0)
    expect(poseAt(frames, 2, 6).torso).toBe(40)
    const middle = poseAt(frames, 1, 6)
    expect(middle.torso).toBeGreaterThan(0)
    expect(middle.torso).toBeLessThan(40)
    expect(middle.torso).toBeCloseTo(20, 6) // the easing is symmetric
  })

  it('wraps around the loop: after the last keyframe it leads back to the first', () => {
    const wrapped = poseAt(frames, 5, 6)
    expect(wrapped.hx).toBeGreaterThanOrEqual(100)
    expect(wrapped.hx).toBeLessThan(frames[2].pose.hx + 1)
    expect(poseAt(frames, 6, 6)).toEqual(poseAt(frames, 0, 6))
    expect(poseAt(frames, -2, 6)).toEqual(poseAt(frames, 4, 6))
  })

  it('moves every number of the pose', () => {
    const a = pose({})
    const b = { ...a }
    for (const key of POSE_KEYS) b[key] = a[key] + 10
    const half = poseAt([{ t: 0, pose: a }, { t: 2, pose: b }], 1, 4)
    for (const key of POSE_KEYS) expect(half[key]).toBeCloseTo(a[key] + 5, 6)
  })
})

describe('the fight', () => {
  const samples = Array.from({ length: Math.round(LOOP_SECONDS * 20) }, (_, index) => index / 20)

  it.each([
    ['the left one', LEFT_FRAMES],
    ['the right one', RIGHT_FRAMES],
  ])('has %s’s keyframes in order, inside the loop, with real numbers', (_name, frames) => {
    expect(frames[0].t).toBe(0)
    for (let index = 1; index < frames.length; index += 1) expect(frames[index].t).toBeGreaterThan(frames[index - 1].t)
    expect(frames[frames.length - 1].t).toBeLessThan(LOOP_SECONDS)
    for (const frame of frames) for (const key of POSE_KEYS) expect(Number.isFinite(frame.pose[key])).toBe(true)
  })

  it('keeps both fighters inside the picture and above the floor, the whole way through', () => {
    for (const time of samples) {
      const { leftBody, rightBody } = sceneAt(time)
      for (const body of [leftBody, rightBody]) {
        for (const point of [body.hip, body.shoulder, body.headCentre, body.handNear, body.handFar, body.footNear, body.footFar, body.kneeNear, body.kneeFar]) {
          expect(point.x, `x at ${time}s`).toBeGreaterThan(VIEW_LEFT + SWAY + 8)
          expect(point.x, `x at ${time}s`).toBeLessThan(VIEW_RIGHT - SWAY - 8)
          expect(point.y, `y at ${time}s`).toBeLessThanOrEqual(FLOOR + 8) // nothing sinks through the floor
        }
      }
    }
  })

  it('has the winner on the left standing at the end, and the other one on the floor', () => {
    const { leftBody, rightBody } = sceneAt(12.6)
    expect(leftBody.headCentre.y).toBeLessThan(FLOOR - 150)
    expect(rightBody.headCentre.y).toBeGreaterThan(FLOOR - 40)
  })

  it('fades out at the end of the loop and in at the start, so the jump back is never seen', () => {
    expect(fadeAt(0)).toBe(0)
    expect(fadeAt(LOOP_SECONDS - 0.001)).toBeLessThan(0.01)
    expect(fadeAt(LOOP_SECONDS / 2)).toBe(1)
    expect(fadeAt(LOOP_SECONDS)).toBe(0) // the same moment as 0
    // The poses jump (the one on the floor stands again) only where the picture is dark.
    const jump = Math.abs(sceneAt(LOOP_SECONDS - 0.04).right.torso - sceneAt(0.04).right.torso)
    expect(jump).toBeGreaterThan(50)
    expect(Math.max(fadeAt(LOOP_SECONDS - 0.04), fadeAt(0.04))).toBeLessThan(0.1)
  })

  it('draws a burst for each blow only just after it lands, where the fist or foot is', () => {
    for (const impact of IMPACTS) {
      expect(impact.t).toBeGreaterThan(0)
      expect(impact.t).toBeLessThan(LOOP_SECONDS)
      const landing = impactAt(impact.t, impact)
      expect(landing?.progress).toBe(0)
      const at = sceneAt(impact.t)
      const joint = (impact.by === 'left' ? at.leftBody : at.rightBody)[impact.joint]
      expect(landing).toMatchObject({ x: joint.x, y: joint.y })
      expect(impactAt(impact.t + 0.2, impact)?.progress).toBeCloseTo(0.2 / 0.45, 6)
      expect(impactAt(impact.t + 0.6, impact)).toBeNull()
      expect(impactAt(impact.t - 0.1, impact)).toBeNull()
    }
  })

  it('has the blows land close to the other fighter', () => {
    for (const impact of IMPACTS) {
      const at = sceneAt(impact.t)
      const struck = impact.by === 'left' ? at.rightBody : at.leftBody
      const joint = (impact.by === 'left' ? at.leftBody : at.rightBody)[impact.joint]
      const nearest = Math.min(...[struck.headCentre, struck.shoulder, struck.hip, struck.kneeNear, struck.kneeFar, struck.handNear, struck.handFar].map((point) => dist(point, joint)))
      expect(nearest, `blow at ${impact.t}s`).toBeLessThan(60)
    }
  })
})

describe('the loop on the page', () => {
  const pending = new Map<number, FrameRequestCallback>()
  let now = 0

  beforeEach(async () => {
    pending.clear()
    now = 1000
    let nextId = 0
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      nextId += 1
      pending.set(nextId, callback)
      return nextId
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      pending.delete(id)
    })
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), onchange: null, dispatchEvent: vi.fn() })) as never
    await i18n.changeLanguage('en-US')
  })

  afterEach(() => vi.restoreAllMocks())

  const advance = (seconds: number) =>
    act(() => {
      now += seconds * 1000
      const run = [...pending.values()]
      pending.clear()
      run.forEach((callback) => callback(now))
    })

  it('describes itself for a screen reader and keeps the picture itself out of the reading order', () => {
    const { container } = render(<FightLoop />)
    expect(screen.getByRole('img', { name: /two stylised fighters.*red one takes the blue one down/i })).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('is told in the other languages too', async () => {
    await i18n.changeLanguage('pt-BR')
    const { unmount } = render(<FightLoop />)
    expect(screen.getByRole('img', { name: /dois lutadores estilizados/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pausar a animação/i })).toBeInTheDocument()
    unmount()
  })

  it('plays: the picture changes as time passes, and loops', () => {
    const { container } = render(<FightLoop />)
    const first = container.innerHTML
    advance(1.5)
    const later = container.innerHTML
    expect(later).not.toBe(first)
    advance(LOOP_SECONDS - 1.5) // a whole loop later it is where it was
    expect(container.innerHTML).toBe(first)
  })

  it('pauses on its button and plays again on the same one', async () => {
    const { container } = render(<FightLoop />)
    advance(1)
    await userEvent.click(screen.getByRole('button', { name: /pause the animation/i }))
    const frozen = container.innerHTML
    expect(pending.size).toBe(0) // nothing is scheduled any more
    advance(2)
    expect(container.innerHTML).toBe(frozen)
    await userEvent.click(screen.getByRole('button', { name: /play the animation/i }))
    advance(1)
    expect(container.innerHTML).not.toBe(frozen)
  })

  it('starts still, on a trade of blows, for a visitor who asked the system for less motion', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), onchange: null, dispatchEvent: vi.fn() })) as never
    const { container } = render(<FightLoop />)
    const still = container.innerHTML
    expect(screen.getByRole('button', { name: /play the animation/i })).toBeInTheDocument()
    expect(pending.size).toBe(0)
    advance(3)
    expect(container.innerHTML).toBe(still)
    expect(STILL_TIME).toBeGreaterThan(2)
    expect(STILL_TIME).toBeLessThan(3.2)
  })

  it('stops scheduling frames when it is taken off the page', () => {
    const { unmount } = render(<FightLoop />)
    unmount()
    expect(window.cancelAnimationFrame).toHaveBeenCalled()
  })
})
