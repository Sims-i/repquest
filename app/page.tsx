'use client'

import { useEffect, useState, useTransition, type FormEvent } from 'react'
import { chatWithCoach, type ChatTurn } from './actions'

type Exercise = {
  id: string
  name: string
  detail: string
  category: string
  xp: number
  completed: number
}

const starterExercises: Exercise[] = [
  { id: 'bodyweight-squat', name: 'Bodyweight Squats', detail: '3 sets × 12 reps', category: 'Legs', xp: 90, completed: 0 },
  { id: 'push-up', name: 'Push-ups', detail: '3 sets × 6–12 reps', category: 'Chest & arms', xp: 100, completed: 0 },
  { id: 'reverse-lunge', name: 'Reverse Lunges', detail: '3 sets × 8 each leg', category: 'Legs', xp: 110, completed: 0 },
  { id: 'plank', name: 'Front Plank', detail: '3 rounds × 20–30 seconds', category: 'Core', xp: 80, completed: 0 },
  { id: 'dead-bug', name: 'Dead Bugs', detail: '3 sets × 8 each side', category: 'Core', xp: 90, completed: 0 },
  { id: 'glute-bridge', name: 'Glute Bridges', detail: '3 sets × 12 reps', category: 'Glutes & core', xp: 90, completed: 0 },
  { id: 'mountain-climber', name: 'Mountain Climbers', detail: '3 rounds × 20 seconds', category: 'Full body', xp: 100, completed: 0 },
]

const ranks = [
  { name: 'Starter', xp: 0 },
  { name: 'Rookie', xp: 1500 },
  { name: 'Disciplined', xp: 5000 },
  { name: 'Athlete', xp: 12000 },
  { name: 'Elite', xp: 25000 },
  { name: 'Titan', xp: 50000 },
]

const GREETING: ChatTurn = {
  role: 'coach',
  text: 'Tell me your goal, how many days you can train, and what exercises feel comfortable. I’ll build a safe home routine for you.',
}

function formatXp(value: number) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function readNumber(key: string) {
  const value = Number(localStorage.getItem(key))
  return Number.isFinite(value) && value > 0 ? value : 0
}

function isExercise(value: unknown): value is Exercise {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.detail === 'string' &&
    typeof v.category === 'string' &&
    typeof v.xp === 'number' &&
    typeof v.completed === 'number'
  )
}

function Icon({ name }: { name: 'bolt' | 'plus' | 'check' | 'edit' | 'trash' | 'close' | 'flame' | 'send' | 'chat' }) {
  const paths = {
    bolt: <path d="m13 2-8 11h7l-1 9 8-12h-7l1-8Z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    edit: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />,
    trash: <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v5m4-5v5" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    flame: <path d="M12 22c4 0 7-3 7-7 0-3-2-6-5-9 0 3-1 4-2 5 0-4-2-7-5-9 1 5-2 7-2 12 0 5 3 8 7 8Z" />,
    send: <path d="m22 2-7 20-4-9-9-4Zm-11 11L22 2" />,
    chat: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.7-5A7 7 0 0 1 3 12V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24">{paths[name]}</svg>
}

export default function HomePage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [xp, setXp] = useState(0)
  const [totalCompletions, setTotalCompletions] = useState(0)
  const [editing, setEditing] = useState<Exercise | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [ready, setReady] = useState(false)
  const [streak, setStreak] = useState(0)
  const [lastWorkoutDate, setLastWorkoutDate] = useState('')
  const [messages, setMessages] = useState<ChatTurn[]>([GREETING])
  const [isCoachPending, startCoachTransition] = useTransition()

  const modalOpen = isAdding || editing !== null

  function closeModal() {
    setIsAdding(false)
    setEditing(null)
  }

  // Load saved progress from the browser
  useEffect(() => {
    let loaded: Exercise[] = []
    try {
      const raw = localStorage.getItem('repquest-exercises')
      const parsed: unknown = raw ? JSON.parse(raw) : []
      if (Array.isArray(parsed)) loaded = parsed.filter(isExercise)
    } catch {
      loaded = []
    }
    const list = loaded.length > 0 ? loaded : starterExercises
    setExercises(list)
    setXp(readNumber('repquest-xp'))

    const storedTotal = readNumber('repquest-total-completions')
    setTotalCompletions(storedTotal || list.reduce((sum, item) => sum + item.completed, 0))

    // Show the streak as broken if the last workout was before yesterday
    const last = localStorage.getItem('repquest-last-workout') || ''
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const stillAlive = last === dateKey(now) || last === dateKey(yesterday)
    setStreak(stillAlive ? readNumber('repquest-streak') : 0)
    setLastWorkoutDate(last)
    setReady(true)
  }, [])

  // Save progress whenever it changes
  useEffect(() => {
    if (!ready) return
    try {
      localStorage.setItem('repquest-exercises', JSON.stringify(exercises))
      localStorage.setItem('repquest-xp', String(xp))
      localStorage.setItem('repquest-total-completions', String(totalCompletions))
      localStorage.setItem('repquest-streak', String(streak))
      localStorage.setItem('repquest-last-workout', lastWorkoutDate)
    } catch {
      // Storage full or unavailable (e.g. private mode): keep working without saving
    }
  }, [exercises, xp, totalCompletions, streak, lastWorkoutDate, ready])

  // Close the modal with Escape
  useEffect(() => {
    if (!modalOpen) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsAdding(false)
        setEditing(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalOpen])

  const rankIndex = ranks.reduce((found, rank, index) => (xp >= rank.xp ? index : found), 0)
  const rank = ranks[rankIndex]
  const nextRank = ranks[Math.min(rankIndex + 1, ranks.length - 1)]
  const rankProgress = nextRank.xp === rank.xp ? 100 : ((xp - rank.xp) / (nextRank.xp - rank.xp)) * 100

  function completeExercise(exercise: Exercise) {
    setExercises((items) =>
      items.map((item) => (item.id === exercise.id ? { ...item, completed: item.completed + 1 } : item)),
    )
    setXp((value) => value + exercise.xp)
    setTotalCompletions((value) => value + 1)
    const now = new Date()
    const today = dateKey(now)
    if (lastWorkoutDate !== today) {
      const yesterday = new Date(now)
      yesterday.setDate(now.getDate() - 1)
      setStreak((value) => (lastWorkoutDate === dateKey(yesterday) ? value + 1 : 1))
      setLastWorkoutDate(today)
    }
  }

  function askCoach(prompt: string) {
    if (!prompt) return
    const history = messages.filter((m) => m !== GREETING).slice(-8)
    setMessages((items) => [...items, { role: 'user', text: prompt }])
    startCoachTransition(async () => {
      const result = await chatWithCoach(prompt, history)
      setMessages((items) => [
        ...items,
        { role: 'coach', text: result.message ?? result.error ?? 'Please try again.' },
      ])
    })
  }

  function sendCoachMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isCoachPending) return
    const form = event.currentTarget
    const prompt = String(new FormData(form).get('message') || '').trim()
    if (!prompt) return
    form.reset()
    askCoach(prompt)
  }

  function saveExercise(formData: FormData) {
    const item: Exercise = {
      id: editing?.id ?? crypto.randomUUID(),
      name: String(formData.get('name') || 'New exercise'),
      category: String(formData.get('category') || 'Other'),
      detail: String(formData.get('detail') || '3 sets × 10 reps'),
      xp: Math.max(10, Math.min(500, Number(formData.get('xp')) || 100)),
      completed: editing?.completed ?? 0,
    }
    setExercises((items) =>
      editing ? items.map((current) => (current.id === editing.id ? item : current)) : [...items, item],
    )
    closeModal()
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="background-grid" />
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="bolt" />
          </span>
          <span>REPQUEST</span>
        </div>
        <div className="level-pill">
          <span>LVL {rankIndex + 1}</span>
          <strong>{formatXp(xp)} XP</strong>
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">YOUR TRAINING JOURNEY</p>
          <h1>
            Earn your <span>strength.</span>
          </h1>
          <p className="hero-copy">
            Build strength with safe bodyweight training, one completed set at a time. Focus on good form, rest
            between workout days, and stop if anything hurts.
          </p>
        </div>
        <div className="rank-card">
          <div className="rank-emblem">
            <span>{rankIndex + 1}</span>
          </div>
          <div className="rank-info">
            <p>CURRENT RANK</p>
            <h2>{rank.name}</h2>
            <div className="progress-label">
              <span>{formatXp(xp)} XP</span>
              <span>{formatXp(nextRank.xp)} XP</span>
            </div>
            <div className="progress-track">
              <span style={{ width: `${Math.max(2, rankProgress)}%` }} />
            </div>
            <small>
              {nextRank.xp === rank.xp ? 'Maximum rank achieved' : `${formatXp(nextRank.xp - xp)} XP to ${nextRank.name}`}
            </small>
          </div>
        </div>
      </section>

      <section className="stat-row">
        <div>
          <span>TOTAL XP</span>
          <strong>{formatXp(xp)}</strong>
        </div>
        <div>
          <span>SESSIONS DONE</span>
          <strong>{totalCompletions}</strong>
        </div>
        <div>
          <span>ACTIVE EXERCISES</span>
          <strong>{exercises.length}</strong>
        </div>
        <div className="streak-stat">
          <span>DAY STREAK</span>
          <strong>
            <Icon name="flame" /> {streak}
          </strong>
        </div>
      </section>

      <section className="workout-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">TODAY&apos;S MISSION</p>
            <h2>Your exercises</h2>
          </div>
          <button className="primary-button" onClick={() => setIsAdding(true)}>
            <Icon name="plus" /> Add exercise
          </button>
        </div>

        <div className="exercise-list">
          {exercises.map((exercise, index) => (
            <article className="exercise-card" key={exercise.id}>
              <span className="exercise-number">{String(index + 1).padStart(2, '0')}</span>
              <div className="exercise-main">
                <span className="category">{exercise.category}</span>
                <h3>{exercise.name}</h3>
                <p>{exercise.detail}</p>
              </div>
              <div className="xp-reward">
                <Icon name="bolt" />
                <span>+{exercise.xp} XP</span>
              </div>
              <div className="card-actions">
                <button className="icon-button" aria-label={`Edit ${exercise.name}`} onClick={() => setEditing(exercise)}>
                  <Icon name="edit" />
                </button>
                <button
                  className="icon-button danger"
                  aria-label={`Delete ${exercise.name}`}
                  onClick={() => setExercises((items) => items.filter((item) => item.id !== exercise.id))}
                >
                  <Icon name="trash" />
                </button>
                <button className="complete-button" onClick={() => completeExercise(exercise)}>
                  <Icon name="check" /> Complete
                </button>
              </div>
            </article>
          ))}
          {ready && exercises.length === 0 && (
            <div className="empty-state">
              <span className="brand-mark">
                <Icon name="plus" />
              </span>
              <h3>Build your first mission</h3>
              <p>Add an exercise and start earning XP toward your first rank.</p>
            </div>
          )}
        </div>
      </section>

      <section className="coach-section">
        <div className="coach-intro">
          <span className="coach-orb">
            <Icon name="chat" />
          </span>
          <p className="eyebrow">PERSONAL AI COACH</p>
          <h2>A routine built around you.</h2>
          <p>
            Share your goals, experience, available days, and any movements you dislike. Your coach will create a
            safe no-equipment plan.
          </p>
          <div className="coach-prompts">
            <button disabled={isCoachPending} onClick={() => askCoach('Make me a 3-day beginner routine for strength and core.')}>
              3-day beginner plan
            </button>
            <button disabled={isCoachPending} onClick={() => askCoach('Give me a quick 15-minute full-body workout.')}>
              15-minute workout
            </button>
          </div>
        </div>
        <div className="chat-card">
          <div className="chat-header">
            <span>
              <Icon name="bolt" />
            </span>
            <div>
              <strong>RepQuest Coach</strong>
              <small>Age-appropriate training guidance</small>
            </div>
            <i />
          </div>
          <div className="chat-messages" aria-live="polite">
            {messages.map((message, index) => (
              <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
                {message.text}
              </div>
            ))}
            {isCoachPending && <div className="chat-message coach typing">Building your routine…</div>}
          </div>
          <form className="chat-input" onSubmit={sendCoachMessage}>
            <input
              name="message"
              maxLength={1000}
              placeholder="Tell me your goal and schedule…"
              aria-label="Message your AI coach"
              autoComplete="off"
            />
            <button type="submit" aria-label="Send message" disabled={isCoachPending}>
              <Icon name="send" />
            </button>
          </form>
        </div>
      </section>

      <section className="rank-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">LONG-TERM PROGRESSION</p>
            <h2>Rank roadmap</h2>
          </div>
          <p className="section-note">Consistency beats intensity. The highest ranks are built over months, not days.</p>
        </div>
        <div className="rank-roadmap">
          {ranks.map((item, index) => (
            <div className={`rank-step ${xp >= item.xp ? 'unlocked' : ''}`} key={item.name}>
              <span>{index + 1}</span>
              <div>
                <strong>{item.name}</strong>
                <small>{formatXp(item.xp)} XP</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      {modalOpen && (
        <div className="modal-backdrop" onMouseDown={closeModal}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exercise-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">{editing ? 'ADJUST YOUR PLAN' : 'NEW MISSION'}</p>
                <h2 id="exercise-modal-title">{editing ? 'Edit exercise' : 'Add exercise'}</h2>
              </div>
              <button className="icon-button" aria-label="Close" onClick={closeModal}>
                <Icon name="close" />
              </button>
            </div>
            <form action={saveExercise}>
              <label>
                Exercise name
                <input name="name" defaultValue={editing?.name} placeholder="e.g. Pull-ups" required autoFocus />
              </label>
              <div className="form-row">
                <label>
                  Muscle group
                  <input name="category" defaultValue={editing?.category} placeholder="Back" required />
                </label>
                <label>
                  XP reward
                  <input name="xp" type="number" min="10" max="500" defaultValue={editing?.xp ?? 100} required />
                </label>
              </div>
              <label>
                Target
                <input name="detail" defaultValue={editing?.detail} placeholder="3 sets × 10 reps" required />
              </label>
              <button className="primary-button submit-button" type="submit">
                {editing ? 'Save changes' : 'Add to workout'}
                <Icon name="plus" />
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
