import { useEffect, useState } from 'react'
import './App.css'

const API_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

// TEST MODE: true gives each workout a 30-second timer so you can test quickly.
// When you are ready for real workout durations, change this to false.
const USE_TEST_TIMER = false
const TEST_TIMER_SECONDS = 30

function WorkoutPlans({ onBack, userEmail, onWorkoutCompleted }) {
  const categories = ['All', 'Cardio', 'Strength', 'Yoga']

  const [category, setCategory] = useState('All')
  const [activeWorkout, setActiveWorkout] = useState(null)
  const [completedIds, setCompletedIds] = useState([])
  const [completionHistory, setCompletionHistory] = useState([])
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingWorkout, setSavingWorkout] = useState(false)
  const [error, setError] = useState('')
  const [completionError, setCompletionError] = useState('')

  // Timer state for the currently selected workout
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [timerStarted, setTimerStarted] = useState(false)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerFinished, setTimerFinished] = useState(false)

  const getWorkoutSeconds = (workout) => {
    if (USE_TEST_TIMER) return TEST_TIMER_SECONDS
    return Math.max(1, Number(workout?.duration) || 1) * 60
  }

  const formatTime = (totalSeconds) => {
    const safeSeconds = Math.max(0, totalSeconds)
    const minutes = Math.floor(safeSeconds / 60)
    const seconds = safeSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  function resetTimer(workout) {
    setSecondsRemaining(workout ? getWorkoutSeconds(workout) : 0)
    setTimerStarted(false)
    setTimerRunning(false)
    setTimerFinished(false)
  }

  // Load workouts from Spring Boot
  useEffect(() => {
    let cancelled = false

    async function loadWorkouts() {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(`${API_URL}/workouts`)
        if (!response.ok) throw new Error(`Server returned ${response.status}`)

        const data = await response.json()
        if (!Array.isArray(data)) throw new Error('Invalid workout data')

        if (!cancelled) setWorkouts(data)
      } catch (err) {
        console.error('Error loading workouts:', err)
        if (!cancelled) {
          setError('Unable to load workouts. Check whether the backend is running.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadWorkouts()
    return () => {
      cancelled = true
    }
  }, [])

  // Load the full completion history from MySQL
  async function refreshCompletionHistory() {
    if (!userEmail) {
      setCompletionHistory([])
      setCompletedIds([])
      return
    }

    const params = new URLSearchParams({ email: userEmail })
    const response = await fetch(`${API_URL}/workouts/completed?${params.toString()}`)
    if (!response.ok) throw new Error('Unable to load completion history')

    const data = await response.json()
    if (!Array.isArray(data)) throw new Error('Invalid completion history')

    setCompletionHistory(data)
    setCompletedIds([...new Set(data.map((item) => Number(item.workoutId)))])
  }

  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      if (!userEmail) {
        setCompletionHistory([])
        setCompletedIds([])
        return
      }

      try {
        setCompletionError('')
        const params = new URLSearchParams({ email: userEmail })
        const response = await fetch(`${API_URL}/workouts/completed?${params.toString()}`)
        if (!response.ok) throw new Error('Unable to load completion history')

        const data = await response.json()
        if (!Array.isArray(data)) throw new Error('Invalid completion history')

        if (!cancelled) {
          setCompletionHistory(data)
          setCompletedIds([...new Set(data.map((item) => Number(item.workoutId)))])
        }
      } catch (err) {
        console.error('Error loading completion history:', err)
        if (!cancelled) {
          setCompletionError('Could not load your workout history. Please refresh the page.')
        }
      }
    }

    loadHistory()
    return () => {
      cancelled = true
    }
  }, [userEmail])

  // Countdown timer: runs only while the timer is active.
  useEffect(() => {
    if (!timerRunning || !activeWorkout) return undefined

    const intervalId = window.setInterval(() => {
      setSecondsRemaining((previous) => {
        if (previous <= 1) {
          window.clearInterval(intervalId)
          setTimerRunning(false)
          setTimerFinished(true)
          return 0
        }
        return previous - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [timerRunning, activeWorkout])

  // Filter workouts
  const filteredWorkouts =
    category === 'All'
      ? workouts
      : workouts.filter(
          (workout) => workout.category?.toLowerCase() === category.toLowerCase(),
        )

  function openWorkout(workout) {
    setActiveWorkout(workout)
    setCompletionError('')
    resetTimer(workout)
  }

  function closeWorkout() {
    if (savingWorkout) return
    setActiveWorkout(null)
    setCompletionError('')
    resetTimer(null)
  }

  function startTimer() {
    if (!activeWorkout || savingWorkout) return
    if (secondsRemaining <= 0) {
      setSecondsRemaining(getWorkoutSeconds(activeWorkout))
      setTimerFinished(false)
    }
    setTimerStarted(true)
    setTimerRunning(true)
  }

  function pauseTimer() {
    setTimerRunning(false)
  }

  // Save a completion to MySQL when the user finishes the session.
  async function finishWorkout() {
    if (!activeWorkout || savingWorkout) return

    if (!timerStarted) {
      setCompletionError('Please start the workout timer before finishing.')
      return
    }

    if (!userEmail) {
      setCompletionError('Please log in again to save your progress.')
      return
    }

    setSavingWorkout(true)
    setCompletionError('')

    try {
      const params = new URLSearchParams({
        workoutId: String(activeWorkout.id),
        email: userEmail,
      })

      const response = await fetch(`${API_URL}/workouts/completed?${params.toString()}`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error(`Saving failed (${response.status})`)
await response.json()
await refreshCompletionHistory()

// Add the completed workout's duration to the dashboard.
const completedMinutes = Math.max(
  0,
  Number(activeWorkout.duration) || 0
)

onWorkoutCompleted?.(completedMinutes)

setActiveWorkout(null)
resetTimer(null)
    } catch (err) {
      console.error('Error saving workout completion:', err)
      setCompletionError('Unable to save completion. Check the backend and try again.')
    } finally {
      setSavingWorkout(false)
    }
  }

  return (
    <div className="workout-page">
      <header className="workout-header">
        <div>
          <h1>AuraFit</h1>
          <p>Your personal fitness companion</p>
        </div>

        <button type="button" className="back-button" onClick={onBack}>
          ← Dashboard
        </button>
      </header>

      <main className="workout-main">
        <section className="workout-banner">
          <div>
            <span className="eyebrow">YOUR FITNESS JOURNEY</span>
            <h2>Find Your Workout</h2>
            <p>Choose a workout that fits your goals and energy.</p>
          </div>
          <div className="banner-icon">🏆</div>
        </section>

        <section className="workout-summary">
          <div>
            <span>Available workouts</span>
            <strong>{workouts.length}</strong>
          </div>
          <div>
            <span>Completed by you</span>
            <strong>{completionHistory.length}</strong>
          </div>
          <div>
            <span>Categories</span>
            <strong>{categories.length - 1}</strong>
          </div>
        </section>

        <section className="workout-library">
          <div className="workout-heading">
            <div>
              <h2>Workout Library</h2>
              <p>Pick your preferred training style.</p>
            </div>
          </div>

          <div className="workout-filters">
            {categories.map((item) => (
              <button
                type="button"
                key={item}
                className={`filter-button ${category === item ? 'selected' : ''}`}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          {loading && <p className="message">Loading workouts...</p>}

          {error && (
            <div className="message" role="alert">
              <p>{error}</p>
              <button type="button" onClick={() => window.location.reload()}>
                Retry
              </button>
            </div>
          )}

          {completionError && !activeWorkout && (
            <p className="message" role="alert">{completionError}</p>
          )}

          {!loading && !error && (
            <div className="workout-library-grid">
              {filteredWorkouts.map((workout) => {
                const isCompleted = completedIds.includes(Number(workout.id))
                return (
                  <article className="library-card" key={workout.id}>
                    <div className={`library-icon ${(workout.category || '').toLowerCase()}`}>
                      {workout.icon || '🏋️'}
                    </div>

                    <div className="library-card-content">
                      <span className="category-label">{workout.category}</span>
                      <h3>{workout.title}</h3>
                      <p>{workout.description}</p>

                      <div className="workout-meta">
                        <span>⏱ {workout.duration} min</span>
                        <span>{workout.level}</span>
                      </div>

                      {isCompleted && <p className="completed-label">✓ Completed</p>}

                      <button
                        type="button"
                        className="start-workout-button"
                        onClick={() => openWorkout(workout)}
                      >
                        {isCompleted ? 'Start Again' : 'Start Workout'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {!loading && !error && filteredWorkouts.length === 0 && (
            <p>No workouts found in this category.</p>
          )}
        </section>

        {activeWorkout && (
          <div
            className="workout-modal-backdrop"
            onClick={(event) => {
              if (event.target === event.currentTarget && !savingWorkout) closeWorkout()
            }}
          >
            <section
              className="workout-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="active-workout-title"
            >
              <div className="modal-icon">{activeWorkout.icon || '🏋️'}</div>
              <h2 id="active-workout-title">{activeWorkout.title}</h2>
              <p>{activeWorkout.description}</p>

              <div className="modal-details">
                <span>Duration: {activeWorkout.duration} minutes</span>
                <span>Level: {activeWorkout.level}</span>
              </div>

              <p className="demo-notice">
                Follow a suitable routine and exercise at your own pace.
              </p>

              <div className="timer-panel" aria-live="polite">
                <span className="timer-caption">{timerFinished ? 'Workout timer finished' : 'Time remaining'}</span>
                <strong className="timer-display">{formatTime(secondsRemaining)}</strong>
                {USE_TEST_TIMER && (
                  <small className="timer-test-note">Test mode: 30-second timer</small>
                )}
              </div>

              {completionError && <p className="message" role="alert">{completionError}</p>}

              {completedIds.includes(Number(activeWorkout.id)) && (
                <p className="completed-label">
                  ✓ You have completed this workout before. You can complete it again.
                </p>
              )}

              <div className="timer-controls">
                {!timerStarted || timerFinished ? (
                  <button
                    type="button"
                    className="start-workout-button"
                    onClick={startTimer}
                    disabled={savingWorkout}
                  >
                    {timerFinished ? 'Start Timer Again' : 'Start Timer'}
                  </button>
                ) : timerRunning ? (
                  <button
                    type="button"
                    className="start-workout-button"
                    onClick={pauseTimer}
                    disabled={savingWorkout}
                  >
                    Pause
                  </button>
                ) : (
                  <button
                    type="button"
                    className="start-workout-button"
                    onClick={startTimer}
                    disabled={savingWorkout}
                  >
                    Resume
                  </button>
                )}

                <button
                  type="button"
                  className="finish-workout-button"
                  onClick={finishWorkout}
                  disabled={!timerStarted || savingWorkout}
                >
                  {savingWorkout ? 'Saving...' : 'Finish Workout'}
                </button>

                <button
                  type="button"
                  className="cancel-workout-button"
                  onClick={closeWorkout}
                  disabled={savingWorkout}
                >
                  Close
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default WorkoutPlans
