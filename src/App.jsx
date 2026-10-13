
import { useState } from 'react'
import './App.css'
import WorkoutPlans from './WorkoutPlans'
import DailyActivityTracker from './DailyActivityTracker'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

function App() {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [activePage, setActivePage] = useState('dashboard')

  // Shared dashboard summary values
  const [dailySteps, setDailySteps] = useState(0)
  const [waterIntake, setWaterIntake] = useState(0)
  const [workoutMinutes, setWorkoutMinutes] = useState(0)

  const caloriesBurned = Math.round(dailySteps * 0.04)

  // Called whenever the tracker loads or saves activity.
  const handleActivityChange = ({ steps, waterMl }) => {
    setDailySteps(Number(steps) || 0)
    setWaterIntake(Number(waterMl) || 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    if (!email.trim() || !password.trim()) {
      setMessage('Please enter your email and password.')
      return
    }

    if (!isLogin && !name.trim()) {
      setMessage('Please enter your name.')
      return
    }

    setLoading(true)

    try {
      const url = isLogin
  ? `${API_BASE_URL}/users/login`
  : `${API_BASE_URL}/users`
      const body = isLogin
        ? {
            email: email.trim(),
            password,
          }
        : {
            name: name.trim(),
            email: email.trim(),
            password,
          }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setMessage(
          data.message ||
            data.error ||
            (isLogin
              ? 'Invalid email or password.'
              : 'Unable to create account.')
        )
        return
      }

      if (isLogin) {
        const loggedInEmail = data.email || email.trim()

        setUserName(
          data.name || name || loggedInEmail.split('@')[0]
        )
        setUserEmail(loggedInEmail)
        setDailySteps(0)
        setWaterIntake(0)
        setWorkoutMinutes(0)
        setIsLoggedIn(true)
        setActivePage('dashboard')
        setMessage('')
      } else {
        setMessage('Account created successfully! Please log in.')
        setName('')
        setPassword('')
        setIsLogin(true)
      }
    } catch (error) {
      console.error('Login/signup error:', error)
      setMessage(
        'Unable to connect to the server. Check that Spring Boot is running.'
      )
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setIsLogin((previous) => !previous)
    setMessage('')
    setName('')
    setEmail('')
    setPassword('')
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUserName('')
    setUserEmail('')
    setActivePage('dashboard')
    setDailySteps(0)
    setWaterIntake(0)
    setWorkoutMinutes(0)
    setIsLogin(true)
    setName('')
    setEmail('')
    setPassword('')
    setMessage('')
  }

  // Workout library
  if (isLoggedIn && activePage === 'workouts') {
    return (
      <WorkoutPlans
        onBack={() => setActivePage('dashboard')}
        userEmail={userEmail}
        onWorkoutCompleted={(minutes) => {
          setWorkoutMinutes((current) => current + minutes)
        }}
      />
    )
  }

  // Dashboard
  if (isLoggedIn) {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <div className="brand">
            <h1>AuraFit</h1>
            <span>Your fitness companion</span>
          </div>

          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </header>

        <main className="dashboard-content">
          <button
            className="start-workout-button"
            onClick={() => setActivePage('workouts')}
          >
            Explore All Workouts
          </button>

          <section className="welcome-section">
            <h2>Welcome back, {userName}! 👋</h2>
            <p>Ready to continue your fitness journey?</p>
          </section>

          {/* Live summary connected to the activity tracker */}
          <section className="workout-summary">
            <div>
              <span>🔥</span>
              <strong>{caloriesBurned.toLocaleString()}</strong>
              <p>Estimated Calories Burned</p>
            </div>

            <div>
              <span>💧</span>
              <strong>{(waterIntake / 1000).toFixed(1)} L</strong>
              <p>Water Intake</p>
            </div>

            <div>
              <span>👟</span>
              <strong>{dailySteps.toLocaleString()}</strong>
              <p>Steps</p>
            </div>

            <div>
              <span>⏱️</span>
              <strong>{workoutMinutes} min</strong>
              <p>Workout Time</p>
            </div>
          </section>

          <DailyActivityTracker
            userEmail={userEmail}
            onActivityChange={handleActivityChange}
          />

          <section className="recommended-workout">
            <h2>Keep moving and stay consistent.</h2>

            <article className="library-card">
              <div className="library-icon">💪</div>
              <h3>Full Body Workout</h3>
              <p>30 minutes · Beginner friendly</p>

              <button
                className="start-workout-button"
                onClick={() => setActivePage('workouts')}
              >
                Start Workout
              </button>
            </article>
          </section>
        </main>
      </div>
    )
  }

  // Login and signup
  
  return (
    <div className="auth-page-v2">
      <div className="auth-decoration auth-decoration-left" />
      <div className="auth-decoration auth-decoration-right" />

      <header className="auth-logo-v2">
        <div className="auth-logo-mark">🌿</div>
        <h1>
          Aura<span>Fit</span>
        </h1>
        <p>Your fitness companion</p>
      </header>

      <main className="auth-card-v2">
        <div className="auth-tabs-v2">
          <button
            type="button"
            className={isLogin ? 'auth-tab-v2 active' : 'auth-tab-v2'}
            onClick={() => {
              setIsLogin(true)
              setMessage('')
            }}
          >
            Login
          </button>

          <button
            type="button"
            className={!isLogin ? 'auth-tab-v2 active' : 'auth-tab-v2'}
            onClick={() => {
              setIsLogin(false)
              setMessage('')
            }}
          >
            Sign Up
          </button>
        </div>

        <div className="auth-heading-v2">
          <span className="auth-eyebrow-v2">
            YOUR FITNESS JOURNEY
          </span>

          <h2>
            {isLogin ? 'Welcome Back!' : 'Create Your Account'}
          </h2>

          <p>
            {isLogin
              ? 'Log in to continue your fitness journey.'
              : 'Join AuraFit and start building healthier habits.'}
          </p>
        </div>

        <form className="auth-form-v2" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="auth-field-v2">
              <label htmlFor="auth-name">Full Name</label>
              <div className="auth-input-wrap-v2">
                <span aria-hidden="true">👤</span>
                <input
                  id="auth-name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            </div>
          )}

          <div className="auth-field-v2">
            <label htmlFor="auth-email">Email Address</label>
            <div className="auth-input-wrap-v2">
              <span aria-hidden="true">✉</span>
              <input
                id="auth-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="auth-field-v2">
            <label htmlFor="auth-password">Password</label>
            <div className="auth-input-wrap-v2">
              <span aria-hidden="true">🔒</span>
              <input
                id="auth-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
              />
            </div>
          </div>

          {message && (
            <p className="auth-message-v2" role="alert">
              {message}
            </p>
          )}

          <button
            className="auth-submit-v2"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Please wait...'
              : isLogin
                ? 'Login  →'
                : 'Create Account  →'}
          </button>
        </form>

        <div className="auth-divider-v2">
          <span />
          <p>YOUR HEALTH, YOUR JOURNEY</p>
          <span />
        </div>

        <p className="auth-switch-v2">
          {isLogin
            ? "Don't have an account?"
            : 'Already have an account?'}

          <button
            type="button"
            onClick={() => {
              setIsLogin((previous) => !previous)
              setMessage('')
            }}
          >
            {isLogin ? 'Sign up' : 'Login'}
          </button>
        </p>
      </main>

      <footer className="auth-footer-v2">
        <span>🌱</span> Stronger · Fitter · Healthier
      </footer>
    </div>
  )
}


export default App
