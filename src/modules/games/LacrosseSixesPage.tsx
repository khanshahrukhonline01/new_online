import { useCallback, useEffect, useRef, useState } from 'react'
import './LacrosseSixesPage.css'

type Point = { x: number; y: number }
type Defender = Point & { id: number }

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const initialPlayer: Point = { x: 76, y: 50 }
const initialDefenders: Defender[] = [
  { id: 1, x: 53, y: 28 },
  { id: 2, x: 42, y: 50 },
  { id: 3, x: 54, y: 72 },
]
const initialBall: Point = { x: initialPlayer.x + 2, y: initialPlayer.y }

export default function LacrosseSixesPage() {
  const [player, setPlayer] = useState<Point>(initialPlayer)
  const [defenders, setDefenders] = useState<Defender[]>(initialDefenders)
  const [ball, setBall] = useState<Point>(initialBall)
  const [hasBall, setHasBall] = useState(true)
  const [score, setScore] = useState(0)
  const [seconds, setSeconds] = useState(60)
  const [shots, setShots] = useState(0)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [message, setMessage] = useState('Press Start, then move with WASD or the arrow keys.')
  const playerRef = useRef(player)
  const ballRef = useRef(ball)
  const hasBallRef = useRef(hasBall)
  const defendersRef = useRef(defenders)
  const dodgeUntil = useRef(0)

  playerRef.current = player
  ballRef.current = ball
  hasBallRef.current = hasBall
  defendersRef.current = defenders

  const move = useCallback((dx: number, dy: number) => {
    if (!running || finished) return
    const next = {
      x: clamp(playerRef.current.x + dx, 8, 91),
      y: clamp(playerRef.current.y + dy, 8, 92),
    }
    setPlayer(next)
    if (hasBallRef.current) {
      setBall({ x: next.x + 2.5, y: next.y })
    } else if (distance(next, ballRef.current) < 7) {
      setHasBall(true)
      setBall({ x: next.x + 2.5, y: next.y })
      setMessage('Ball recovered. Attack the goal!')
    }
  }, [running, finished])

  const startGame = () => {
    if (finished) {
      setPlayer(initialPlayer)
      setDefenders(initialDefenders)
      setBall(initialBall)
      setHasBall(true)
      setScore(0)
      setShots(0)
      setSeconds(60)
      setFinished(false)
    }
    setRunning(true)
    setMessage('Drive left, create space, and shoot inside the scoring zone.')
  }

  const resetGame = () => {
    setRunning(false)
    setFinished(false)
    setPlayer(initialPlayer)
    setDefenders(initialDefenders)
    setBall(initialBall)
    setHasBall(true)
    setScore(0)
    setShots(0)
    setSeconds(60)
    setMessage('Press Start, then move with WASD or the arrow keys.')
  }

  const shoot = useCallback(() => {
    if (!running || finished) return
    if (!hasBallRef.current) {
      setMessage('Recover the ball before shooting.')
      return
    }
    if (playerRef.current.x > 48) {
      setMessage('Move closer to the goal before shooting.')
      return
    }
    setShots(value => value + 1)
    const blocked = defendersRef.current.some(defender => distance(defender, playerRef.current) < 10)
    if (blocked) {
      setHasBall(false)
      setBall({ x: playerRef.current.x - 3, y: playerRef.current.y })
      setMessage('Blocked! Dodge the defence and recover the ball.')
      return
    }
    setScore(value => value + 1)
    setHasBall(true)
    setPlayer(initialPlayer)
    setBall(initialBall)
    setDefenders(initialDefenders)
    setMessage('GOAL! Reset in possession — score another.')
  }, [running, finished])

  const pass = useCallback(() => {
    if (!running || finished) return
    if (!hasBallRef.current) {
      setMessage('You need possession to pass.')
      return
    }
    const nextBall = { x: clamp(playerRef.current.x - 14, 8, 91), y: clamp(playerRef.current.y + (playerRef.current.y < 50 ? 10 : -10), 8, 92) }
    setBall(nextBall)
    setHasBall(false)
    setMessage('Pass released. Move to the ball to regain possession.')
  }, [running, finished])

  const dodge = useCallback(() => {
    if (!running || finished) return
    dodgeUntil.current = Date.now() + 1100
    move(-7, playerRef.current.y < 50 ? 7 : -7)
    setMessage('Quick dodge! Use the space you created.')
  }, [running, finished, move])

  useEffect(() => {
    if (!running || finished) return
    const timer = window.setInterval(() => {
      setSeconds(value => {
        if (value <= 1) {
          setRunning(false)
          setFinished(true)
          setMessage('Full time. Start a new 60-second match to beat your score.')
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [running, finished])

  useEffect(() => {
    if (!running || finished) return
    const simulation = window.setInterval(() => {
      const target = hasBallRef.current ? playerRef.current : ballRef.current
      setDefenders(previous => previous.map(defender => {
        const dx = target.x - defender.x
        const dy = target.y - defender.y
        const length = Math.max(1, Math.hypot(dx, dy))
        const speed = Date.now() < dodgeUntil.current ? 0.22 : 0.72
        return {
          ...defender,
          x: clamp(defender.x + (dx / length) * speed, 12, 88),
          y: clamp(defender.y + (dy / length) * speed, 10, 90),
        }
      }))
      if (hasBallRef.current) {
        const nearest = defendersRef.current.some(defender => distance(defender, playerRef.current) < 4.5)
        if (nearest && Date.now() >= dodgeUntil.current) {
          setHasBall(false)
          setBall({ x: playerRef.current.x - 2, y: playerRef.current.y })
          setMessage('Defence stripped the ball. Move onto it to recover!')
        }
      } else if (distance(playerRef.current, ballRef.current) < 7) {
        setHasBall(true)
        setBall({ x: playerRef.current.x + 2.5, y: playerRef.current.y })
      }
    }, 180)
    return () => window.clearInterval(simulation)
  }, [running, finished])

  useEffect(() => {
    if (!running) return
    const handleKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const moves: Record<string, Point> = {
        arrowup: { x: 0, y: -5 }, w: { x: 0, y: -5 },
        arrowdown: { x: 0, y: 5 }, s: { x: 0, y: 5 },
        arrowleft: { x: -5, y: 0 }, a: { x: -5, y: 0 },
        arrowright: { x: 5, y: 0 }, d: { x: 5, y: 0 },
      }
      if (moves[key]) {
        event.preventDefault()
        move(moves[key].x, moves[key].y)
      } else if (key === 'enter') {
        event.preventDefault()
        shoot()
      } else if (key === ' ') {
        event.preventDefault()
        pass()
      } else if (key === 'shift') {
        event.preventDefault()
        dodge()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [running, move, shoot, pass, dodge])

  const possessionLabel = hasBall ? 'In possession' : 'Loose ball'
  const formatTime = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <main className="lacrosse-page">
      <section className="lacrosse-hero">
        <p className="eyebrow">KHELGRID ARCADE · WORLD LACROSSE SIXES INSPIRED</p>
        <div className="lacrosse-heading-row">
          <div>
            <h1>Lacrosse Sixes</h1>
            <p className="lacrosse-intro">A fast, small-sided lacrosse challenge. Carry, dodge, pass and shoot your way past the defence in a 60-second round.</p>
          </div>
          <span className="lacrosse-live-tag"><span /> PLAYABLE GAME</span>
        </div>
        <div className="lacrosse-scorebar" aria-label="Match statistics">
          <div><span>YOUR SCORE</span><strong>{score}</strong></div>
          <div><span>TIME LEFT</span><strong className={seconds <= 10 ? 'is-urgent' : ''}>{formatTime}</strong></div>
          <div><span>SHOTS</span><strong>{shots}</strong></div>
          <div><span>POSSESSION</span><strong className="possession-value">{possessionLabel}</strong></div>
        </div>
      </section>

      <section className="lacrosse-game-layout" aria-label="Lacrosse game">
        <div className="lacrosse-arena-wrap">
          <div className="lacrosse-arena-topline"><span>ATTACK ←</span><span>3 DEFENDERS · 1 PLAYER</span><span>60 SECOND ROUND</span></div>
          <div className="lacrosse-arena" role="img" aria-label="Top-down lacrosse field showing your player, three moving defenders, ball and goal">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <pattern id="lacrosse-grass" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 0H12V12H0Z" fill="#126443" /><path d="M0 0H6V12H0Z" fill="#0e573a" opacity=".35" /></pattern>
              </defs>
              <rect width="100" height="100" fill="url(#lacrosse-grass)" />
              <rect x="3" y="4" width="94" height="92" rx="2" fill="none" stroke="rgba(255,255,255,.78)" strokeWidth=".7" />
              <path d="M50 4V96 M50 30A20 20 0 0 0 50 70 M3 30H17V70H3 M83 30H97V70H83" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth=".65" />
              <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255,255,255,.62)" strokeWidth=".6" />
              <rect x="2" y="41" width="5" height="18" fill="none" stroke="#fef3c7" strokeWidth="1" />
              <path d="M7 41Q15 50 7 59" fill="none" stroke="#fef3c7" strokeWidth=".7" />
              {defenders.map(defender => <g key={defender.id} transform={`translate(${defender.x} ${defender.y})`}><circle r="3.2" fill="#f97316" stroke="#fff7ed" strokeWidth=".65" /><text y="1.1" textAnchor="middle" fontSize="2.8" fill="#fff">D</text></g>)}
              <g transform={`translate(${player.x} ${player.y})`}><circle r="3.7" fill="#10b981" stroke="#ecfdf5" strokeWidth=".8" /><text y="1.1" textAnchor="middle" fontSize="2.8" fontWeight="bold" fill="#052e24">YOU</text><path d="M2 -2L7 -6" stroke="#f8fafc" strokeWidth="1.1" strokeLinecap="round" /><circle cx="7.5" cy="-6.5" r="1.1" fill="#f8fafc" /></g>
              <circle cx={ball.x} cy={ball.y} r="1.35" fill="#fef08a" stroke="#422006" strokeWidth=".45" />
            </svg>
            {!running && <div className="lacrosse-arena-overlay"><strong>{finished ? 'FULL TIME' : 'READY TO PLAY?'}</strong><span>{finished ? `Final score: ${score}` : 'Start your sixes challenge'}</span></div>}
          </div>
          <p className="lacrosse-game-message" role="status" aria-live="polite">{message}</p>
          <div className="lacrosse-primary-controls">
            {!running ? <button className="lacrosse-start" onClick={startGame}>{finished ? 'Play again' : 'Start match'}</button> : <button className="lacrosse-start" onClick={() => { setRunning(false); setMessage('Match paused. Resume when ready.') }}>Pause</button>}
            <button className="lacrosse-reset" onClick={resetGame}>Reset</button>
            <span className="lacrosse-status">{running ? 'MATCH LIVE' : finished ? 'MATCH COMPLETE' : 'NOT STARTED'}</span>
          </div>
        </div>

        <aside className="lacrosse-side-panel">
          <div className="lacrosse-instructions">
            <p className="eyebrow">HOW TO PLAY</p>
            <h2>Beat the defence.</h2>
            <p>Move left toward the goal, avoid defenders and keep possession. Shoot from inside the attacking zone.</p>
            <ul>
              <li><kbd>W A S D</kbd> / <kbd>↑ ↓ ← →</kbd> Move</li>
              <li><kbd>Enter</kbd> Shoot when close to goal</li>
              <li><kbd>Space</kbd> Pass into space</li>
              <li><kbd>Shift</kbd> Quick dodge</li>
            </ul>
          </div>
          <div className="lacrosse-touch-panel">
            <p className="eyebrow">TOUCH CONTROLS</p>
            <div className="lacrosse-dpad">
              <button aria-label="Move up" onClick={() => move(0, -5)}>↑</button>
              <button aria-label="Move left" onClick={() => move(-5, 0)}>←</button>
              <button aria-label="Move down" onClick={() => move(0, 5)}>↓</button>
              <button aria-label="Move right" onClick={() => move(5, 0)}>→</button>
            </div>
            <div className="lacrosse-action-buttons">
              <button onClick={pass}>Pass</button>
              <button onClick={dodge}>Dodge</button>
              <button onClick={shoot}>Shoot</button>
            </div>
          </div>
        </aside>
      </section>
      <p className="lacrosse-disclaimer">This is an original KhelGrid arcade mini-game inspired by the fast pace of six-a-side lacrosse. It is not an official World Lacrosse game or rules simulator.</p>
    </main>
  )
}
