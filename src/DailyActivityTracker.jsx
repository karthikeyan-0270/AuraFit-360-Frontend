import { useEffect, useState } from 'react'
import './DailyActivityTracker.css'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

function DailyActivityTracker({ userEmail, onActivityChange }) {
  const [steps, setSteps] = useState(0)
  const [water, setWater] = useState(0)
  const [savedSteps, setSavedSteps] = useState(0)
  const [savedWater, setSavedWater] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const email = userEmail?.trim()

  useEffect(() => {
    let cancelled = false

    async function loadActivity() {
      if (!email) {
        setLoading(false)
        setMessage('Please log in to track your daily activity.')
        return
      }

      setLoading(true)
      setMessage('')

      try {
       const response = await fetch(
  `${API_BASE_URL}/daily-activity?email=${encodeURIComponent(email)}`
)

        if (!response.ok) {
          throw new Error('Could not load daily activity.')
        }

        const data = await response.json()
        const loadedSteps = Number(data.steps) || 0
        const loadedWater = Number(data.waterMl) || 0

        if (!cancelled) {
          setSteps(loadedSteps)
          setWater(loadedWater)
          setSavedSteps(loadedSteps)
          setSavedWater(loadedWater)

          onActivityChange?.({
            steps: loadedSteps,
            waterMl: loadedWater,
          })
        }
      } catch (error) {
        console.error('Load activity error:', error)

        if (!cancelled) {
          setMessage(
            'Unable to load activity. Check that the backend is running.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadActivity()

    return () => {
      cancelled = true
    }
  }, [email])

  const saveActivity = async (nextSteps, nextWater) => {
    if (!email) {
      setMessage('Please log in first.')
      return
    }

    if (
      !Number.isInteger(Number(nextSteps)) ||
      nextSteps < 0 ||
      nextSteps > 200000
    ) {
      setMessage('Steps must be between 0 and 200000.')
      return
    }

    if (
      !Number.isInteger(Number(nextWater)) ||
      nextWater < 0 ||
      nextWater > 20000
    ) {
      setMessage('Water intake must be between 0 and 20000 ml.')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/daily-activity?email=${encodeURIComponent(email)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            steps: Number(nextSteps),
            waterMl: Number(nextWater),
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Save failed: ${response.status}`)
      }

      const data = await response.json()
      const savedStepValue = Number(data.steps) || 0
      const savedWaterValue = Number(data.waterMl) || 0

      setSteps(savedStepValue)
      setWater(savedWaterValue)
      setSavedSteps(savedStepValue)
      setSavedWater(savedWaterValue)

      // Update the dashboard summary only after a successful save.
      onActivityChange?.({
        steps: savedStepValue,
        waterMl: savedWaterValue,
      })

      setMessage('Daily activity saved successfully!')
    } catch (error) {
      console.error('Save activity error:', error)
      setMessage(error.message || 'Unable to save activity.')
    } finally {
      setSaving(false)
    }
  }

  const resetActivity = () => {
    setSteps(0)
    setWater(0)
    saveActivity(0, 0)
  }

  const stepsPercent = Math.min((steps / 8000) * 100, 100)
  const waterPercent = Math.min((water / 2000) * 100, 100)

  return (
    <section className="daily-activity">
      <h2>Daily Activity Tracker</h2>
      <p className="activity-subtitle">
        Track your daily movement and hydration.
      </p>

      {loading ? (
        <p>Loading today's activity...</p>
      ) : (
        <>
          <div className="activity-grid">
            <div className="activity-card">
              <div className="activity-icon">👟</div>
              <h3>Daily Steps</h3>
              <strong>{steps.toLocaleString()} / 8,000</strong>

              <div className="progress-track">
                <div
                  className="progress-fill steps-fill"
                  style={{ width: `${stepsPercent}%` }}
                />
              </div>

              <label htmlFor="daily-steps">Update steps</label>
              <input
                id="daily-steps"
                type="number"
                min="0"
                max="200000"
                step="1"
                value={steps}
                onChange={(e) =>
                  setSteps(Math.max(0, Number(e.target.value) || 0))
                }
              />

              <p>{Math.round(stepsPercent)}% of daily goal</p>
            </div>

            <div className="activity-card">
              <div className="activity-icon">💧</div>
              <h3>Water Intake</h3>
              <strong>{water} / 2000 ml</strong>

              <div className="progress-track">
                <div
                  className="progress-fill water-fill"
                  style={{ width: `${waterPercent}%` }}
                />
              </div>

              <label htmlFor="daily-water">Update water (ml)</label>
              <input
                id="daily-water"
                type="number"
                min="0"
                max="20000"
                step="1"
                value={water}
                onChange={(e) =>
                  setWater(Math.max(0, Number(e.target.value) || 0))
                }
              />

              <p>{Math.round(waterPercent)}% of daily goal</p>
            </div>
          </div>

          <div className="activity-actions">
            <button
              onClick={() => saveActivity(steps, water)}
              disabled={
                saving ||
                (steps === savedSteps && water === savedWater)
              }
            >
              {saving ? 'Saving...' : 'Save Daily Activity'}
            </button>

            <button
              className="reset-activity"
              onClick={resetActivity}
              disabled={saving}
            >
              Reset Daily Activity
            </button>
          </div>

          {message && (
            <p className="activity-message" role="status">
              {message}
            </p>
          )}
        </>
      )}
    </section>
  )
}

export default DailyActivityTracker
