import { memo, useId } from 'react'

import { fadeAt, FLOOR, IMPACTS, impactAt, LOOP_SECONDS, sceneAt } from './choreography'
import { LIMBS, type Point, type Skeleton } from './rig'

/**
 * One picture of the fight at a time in the loop: two faceless figures on a dark floor with a red grid, seen from the side. It is
 * a drawing (an SVG of lines and circles), nothing is loaded, and it is the same drawing in the light and the dark theme because it
 * sits on its own dark panel.
 */

/** What the picture shows: a square cut out of a wider room (the floor and the walls are drawn past its edges, so the camera can sway). */
const VIEW = { x: 40, y: 112, size: 400 }
const ROOM = { width: 480, height: 520 }
const HORIZON = 196
const VANISH_X = ROOM.width / 2

const SKIN = { rim: '#8a94a3', dark: '#262930', mid: '#454953', light: '#7b808c' }

interface Colours {
  shorts: string
  glove: string
}

const RED: Colours = { shorts: '#b01f25', glove: '#d62f2f' }
const BLUE: Colours = { shorts: '#1f46b5', glove: '#2b59d9' }

function Limb({ from, to, width, back = false }: { from: Point; to: Point; width: number; back?: boolean }) {
  const base = back ? SKIN.dark : SKIN.mid
  return (
    <g strokeLinecap="round" fill="none">
      <line x1={from.x + 2} y1={from.y + 1} x2={to.x + 2} y2={to.y + 1} stroke={SKIN.rim} strokeOpacity={back ? 0.18 : 0.38} strokeWidth={width + 1.5} />
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={base} strokeWidth={width} />
      <line x1={from.x - width * 0.18} y1={from.y - width * 0.18} x2={to.x - width * 0.18} y2={to.y - width * 0.18} stroke={SKIN.light} strokeOpacity={back ? 0.18 : 0.4} strokeWidth={width * 0.3} />
    </g>
  )
}

function Glove({ at, colour, back = false }: { at: Point; colour: string; back?: boolean }) {
  return <circle cx={at.x} cy={at.y} r={8.5} fill={colour} fillOpacity={back ? 0.85 : 1} stroke="#00000055" strokeWidth={1} />
}

/** One fighter: the far limbs first (darker), then the trunk and head, then the near limbs, the shorts and the gloves. */
function Fighter({ body, colours, facing }: { body: Skeleton; colours: Colours; facing: 1 | -1 }) {
  const { hip, shoulder, headCentre } = body
  // The shorts: a short thick stroke from the hip along each thigh, and a band at the waist.
  const toward = (to: Point, share: number): Point => ({ x: hip.x + (to.x - hip.x) * share, y: hip.y + (to.y - hip.y) * share })
  const waist = { x: hip.x + (shoulder.x - hip.x) * 0.1, y: hip.y + (shoulder.y - hip.y) * 0.1 }
  return (
    <g>
      <Limb from={body.hip} to={body.kneeFar} width={14} back />
      <Limb from={body.kneeFar} to={body.footFar} width={10.5} back />
      <Limb from={body.shoulder} to={body.elbowFar} width={9.5} back />
      <Limb from={body.elbowFar} to={body.handFar} width={8.5} back />
      <Glove at={body.handFar} colour={colours.glove} back />

      <Limb from={body.hip} to={body.shoulder} width={26} />
      <Limb from={body.shoulder} to={{ x: headCentre.x, y: headCentre.y + 6 }} width={9} />
      <circle cx={headCentre.x} cy={headCentre.y} r={LIMBS.head} fill={SKIN.mid} stroke={SKIN.rim} strokeOpacity={0.4} strokeWidth={1.5} />
      <ellipse cx={headCentre.x - LIMBS.head * 0.3 * facing} cy={headCentre.y - LIMBS.head * 0.35} rx={LIMBS.head * 0.38} ry={LIMBS.head * 0.28} fill={SKIN.light} fillOpacity={0.35} />

      <Limb from={body.hip} to={body.kneeNear} width={15.5} />
      <Limb from={body.kneeNear} to={body.footNear} width={11.5} />
      <g strokeLinecap="round" stroke={colours.shorts} fill="none">
        <line x1={hip.x} y1={hip.y} x2={toward(body.kneeNear, 0.5).x} y2={toward(body.kneeNear, 0.5).y} strokeWidth={22} />
        <line x1={hip.x} y1={hip.y} x2={toward(body.kneeFar, 0.46).x} y2={toward(body.kneeFar, 0.46).y} strokeWidth={20} strokeOpacity={0.92} />
        <line x1={hip.x} y1={hip.y} x2={waist.x} y2={waist.y} strokeWidth={26} />
      </g>

      <Limb from={body.shoulder} to={body.elbowNear} width={10.5} />
      <Limb from={body.elbowNear} to={body.handNear} width={9.5} />
      <Glove at={body.handNear} colour={colours.glove} />
    </g>
  )
}

/** The floor: red lines running to a point on the horizon, and rows that crowd together as they get farther away. */
function Floor({ shift }: { shift: number }) {
  const id = useId()
  const rows = Array.from({ length: 11 }, (_, index) => {
    const depth = index / 10
    return HORIZON + 6 + (ROOM.height - HORIZON - 6) * depth ** 1.9
  })
  const columns = Array.from({ length: 17 }, (_, index) => (index - 8) * 78)
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0} />
          <stop offset="0.35" stopColor="#fff" stopOpacity={0.75} />
          <stop offset="1" stopColor="#fff" stopOpacity={1} />
        </linearGradient>
        <mask id={`${id}-mask`}>
          <rect x="0" y={HORIZON} width={ROOM.width} height={ROOM.height - HORIZON} fill={`url(#${id}-fade)`} />
        </mask>
      </defs>
      <g mask={`url(#${id}-mask)`} stroke="#4a5463" strokeWidth={1.4} fill="none">
        {rows.map((y) => (
          <line key={y} x1={0} y1={y} x2={ROOM.width} y2={y} strokeOpacity={0.85} />
        ))}
        {columns.map((x) => (
          <line key={x} x1={VANISH_X + (x - shift * 0.4) * 0.12 + shift * 0.3} y1={HORIZON + 6} x2={VANISH_X + x * 1.5 - shift} y2={ROOM.height} strokeOpacity={0.8} />
        ))}
      </g>
    </g>
  )
}

function Burst({ at, progress }: { at: Point; progress: number }) {
  const eased = 1 - (1 - progress) ** 2
  return (
    <g pointerEvents="none">
      <circle cx={at.x} cy={at.y} r={6 + 26 * eased} fill="none" stroke="#fff" strokeOpacity={0.9 * (1 - progress)} strokeWidth={2.2 * (1 - progress) + 0.4} />
      <circle cx={at.x} cy={at.y} r={4 + 14 * eased} fill="#ffffff" fillOpacity={0.5 * (1 - progress)} />
    </g>
  )
}

function Shadow({ x, width }: { x: number; width: number }) {
  return <ellipse cx={x} cy={FLOOR + 4} rx={width} ry={9} fill="#000" fillOpacity={0.5} />
}

export const FightScene = memo(function FightScene({ time }: { time: number }) {
  const id = useId()
  const { left, right, leftBody, rightBody } = sceneAt(time)
  const fade = fadeAt(time)
  const sway = Math.sin((time / LOOP_SECONDS) * Math.PI * 2) * 7
  // Whoever is on the floor is drawn first, so the one on top is in front.
  const leftOnTop = leftBody.hip.y < rightBody.hip.y - 12 && right.g < 0.5
  const order = leftOnTop
    ? [{ key: 'right', body: rightBody, colours: BLUE, facing: -1 as const }, { key: 'left', body: leftBody, colours: RED, facing: 1 as const }]
    : [{ key: 'left', body: leftBody, colours: RED, facing: 1 as const }, { key: 'right', body: rightBody, colours: BLUE, facing: -1 as const }]
  const bursts = IMPACTS.map((impact) => impactAt(time, impact)).filter((value): value is NonNullable<typeof value> => value !== null)

  return (
    <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.size} ${VIEW.size}`} className="block h-full w-full" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-room`} cx="50%" cy="38%" r="75%">
          <stop offset="0" stopColor="#1b222d" />
          <stop offset="0.55" stopColor="#10151d" />
          <stop offset="1" stopColor="#10151d" />
        </radialGradient>
      </defs>
      <rect width={ROOM.width} height={ROOM.height} fill={`url(#${id}-room)`} />
      <g transform={`translate(${sway * 0.4} 0)`}>
        <Floor shift={sway * 3} />
      </g>
      <g opacity={fade} transform={`translate(${sway} 0)`}>
        <Shadow x={leftBody.hip.x} width={left.g < 0.5 ? 70 : 46} />
        <Shadow x={rightBody.hip.x} width={right.g < 0.5 ? 78 : 46} />
        {order.map((fighter) => (
          <Fighter key={fighter.key} body={fighter.body} colours={fighter.colours} facing={fighter.facing} />
        ))}
        {bursts.map((burst, index) => (
          <Burst key={index} at={burst} progress={burst.progress} />
        ))}
      </g>
    </svg>
  )
})
