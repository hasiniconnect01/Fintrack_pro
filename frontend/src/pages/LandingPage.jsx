import React, { useState, useEffect } from 'react'

export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Theme State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('fintrack_theme') || 'light'
  })

  // Hero interactive widget tab: 'security' | 'calculator'
  const [widgetTab, setWidgetTab] = useState('calculator')
  // Budget Calculator state
  const [simBudget, setSimBudget] = useState(5000)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('fintrack_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
  }

  const openModal = (mode) => {
    setModalMode(mode)
    setIsModalOpen(true)
    setErrorMessage('')
    setEmail('')
    setPassword('')
    setShowPassword(false)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.includes('@') || password.length < 8) {
      setErrorMessage('Please enter a valid email and at least 8 characters for password.')
      return
    }

    setLoading(true)
    setErrorMessage('')
    const endpoint = modalMode === 'login' ? '/api/auth/login' : '/api/auth/register'

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed. Please verify your credentials.')
      }

      // Sync active theme to the dashboard
      localStorage.setItem('fintrack_theme', theme)
      window.location.href = '/dashboard.html'
    } catch (err) {
      setErrorMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Budget calculations for simulator
  const simSavings = simBudget * 0.3
  const simRent = simBudget * 0.4
  const simFood = simBudget * 0.2
  const simFree = simBudget * 0.1

  return (
    <div style={styles.container}>
      {/* Navigation Header */}
      <header style={styles.navbar}>
        <div style={styles.logo}>
          <i className="fa-solid fa-money-bill-trend-up" style={styles.logoIcon}></i>
          <span>FinTrack Enterprise</span>
        </div>
        <nav style={styles.nav}>
          <a href="#about" style={styles.navLink}>About Platform</a>
          <a href="#features" style={styles.navLink}>Core Engines</a>
          <a href="#stats" style={styles.navLink}>Risk Metrics</a>
        </nav>
        <div style={styles.rightNavContainer}>
          {/* Gorgeous Sun/Moon Theme Toggle */}
          <button onClick={toggleTheme} style={styles.themeToggleBtn} title="Toggle Dark/Light Mode">
            {theme === 'light' ? (
              <i className="fa-solid fa-moon" style={{ color: 'var(--brand-dark)' }}></i>
            ) : (
              <i className="fa-solid fa-sun" style={{ color: '#fbbf24' }}></i>
            )}
          </button>
          <div style={styles.authButtons}>
            <button className="btn-ui btn-outline" onClick={() => openModal('login')}>Sign In</button>
            <button className="btn-ui btn-solid" onClick={() => openModal('register')}>Create Account</button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={styles.heroSection} id="about">
        <div style={styles.heroContent}>
          <span style={styles.heroTag}>
            <i className="fa-solid fa-sparkles" style={{ marginRight: '6px' }}></i> 
            Now Driven by Deep OCR AI Layout Engines
          </span>
          <h1 style={styles.heroTitle}>
            Automate Your Corporate <span style={styles.heroTitleSpan}>Wealth Ledger</span> Instantly.
          </h1>
          <p style={styles.heroDesc}>
            Ditch manual data input variables. Take control of your daily financial logs, track remaining liquidity balance targets, and monitor budget metrics in real-time through intelligent file analysis grids.
          </p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="btn-ui btn-solid" style={styles.heroBtnMain} onClick={() => openModal('register')}>
              Get Started Free <i className="fa-solid fa-arrow-right" style={{ marginLeft: '6px' }}></i>
            </button>
            <a href="#features" className="btn-ui btn-outline" style={styles.heroBtnSub}>
              Explore Capabilities
            </a>
          </div>
        </div>

        {/* Interactive Hero Visual Tab Widget */}
        <div style={styles.heroVisual}>
          <div style={styles.heroWidgetContainer}>
            <div style={styles.widgetTabBar}>
              <button 
                onClick={() => setWidgetTab('calculator')}
                style={{
                  ...styles.widgetTabBtn,
                  backgroundColor: widgetTab === 'calculator' ? 'var(--brand-primary)' : 'transparent',
                  color: widgetTab === 'calculator' ? 'white' : 'var(--text-slate)'
                }}
              >
                <i className="fa-solid fa-calculator" style={{ marginRight: '6px' }}></i>
                Budget Previewer
              </button>
              <button 
                onClick={() => setWidgetTab('security')}
                style={{
                  ...styles.widgetTabBtn,
                  backgroundColor: widgetTab === 'security' ? 'var(--brand-primary)' : 'transparent',
                  color: widgetTab === 'security' ? 'white' : 'var(--text-slate)'
                }}
              >
                <i className="fa-solid fa-shield-halved" style={{ marginRight: '6px' }}></i>
                Risk Guard
              </button>
            </div>

            {/* Tab Contents */}
            {widgetTab === 'calculator' ? (
              <div style={styles.calculatorWidget}>
                <h3 style={styles.widgetTitle}>Interactive Budget Simulator</h3>
                <p style={styles.widgetDesc}>Slide the gauge to see recommended asset allocations dynamically.</p>
                
                <div style={styles.sliderWrapper}>
                  <div style={styles.sliderHeader}>
                    <span>Monthly Budget Target</span>
                    <strong style={{ color: 'var(--brand-primary)', fontSize: '20px' }}>
                      ${simBudget.toLocaleString()}
                    </strong>
                  </div>
                  <input 
                    type="range" 
                    min="1000" 
                    max="30000" 
                    step="500"
                    value={simBudget}
                    onChange={(e) => setSimBudget(Number(e.target.value))}
                    style={styles.rangeSlider}
                  />
                </div>

                <div style={styles.simResults}>
                  <div style={styles.simRow}>
                    <span style={styles.simLabel}><i className="fa-solid fa-piggy-bank" style={{ color: 'var(--success)', width: '20px' }}></i> Capital Reserve (30%)</span>
                    <strong>${simSavings.toLocaleString(undefined, { minimumFractionDigits: 0 })}</strong>
                  </div>
                  <div style={styles.simBarBg}><div style={{ ...styles.simBarFill, width: '30%', backgroundColor: 'var(--success)' }}></div></div>

                  <div style={styles.simRow}>
                    <span style={styles.simLabel}><i className="fa-solid fa-house" style={{ color: '#6366f1', width: '20px' }}></i> Rent & Housing (40%)</span>
                    <strong>${simRent.toLocaleString(undefined, { minimumFractionDigits: 0 })}</strong>
                  </div>
                  <div style={styles.simBarBg}><div style={{ ...styles.simBarFill, width: '40%', backgroundColor: '#6366f1' }}></div></div>

                  <div style={styles.simRow}>
                    <span style={styles.simLabel}><i className="fa-solid fa-utensils" style={{ color: '#ef4444', width: '20px' }}></i> Food & Dining (20%)</span>
                    <strong>${simFood.toLocaleString(undefined, { minimumFractionDigits: 0 })}</strong>
                  </div>
                  <div style={styles.simBarBg}><div style={{ ...styles.simBarFill, width: '20%', backgroundColor: '#ef4444' }}></div></div>

                  <div style={styles.simRow}>
                    <span style={styles.simLabel}><i className="fa-solid fa-compass" style={{ color: '#f59e0b', width: '20px' }}></i> Petty Cash (10%)</span>
                    <strong>${simFree.toLocaleString(undefined, { minimumFractionDigits: 0 })}</strong>
                  </div>
                  <div style={styles.simBarBg}><div style={{ ...styles.simBarFill, width: '10%', backgroundColor: '#f59e0b' }}></div></div>
                </div>
              </div>
            ) : (
              <div style={styles.securityWidget}>
                <i className="fa-solid fa-shield-halved" style={styles.mockupIcon}></i>
                <h3 style={styles.mockupTitle}>Institutional Security</h3>
                <p style={styles.mockupDesc}>
                  Your tracking assets are encrypted. Features include automated real-time transaction blocking guardrails alongside client account mapping rulesets built into the platform architecture stack.
                </p>
                <div style={styles.securityBadges}>
                  <span><i className="fa-solid fa-lock"></i> SSL Encrypted</span>
                  <span><i className="fa-solid fa-database"></i> MySQL Core</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Global Risk Metrics Stats Panel */}
      <section style={styles.statsSection} id="stats">
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <h3>$4.8B+</h3>
            <p>Ledger Capital Safeguarded</p>
          </div>
          <div style={styles.statCard}>
            <h3>924k+</h3>
            <p>Receipt Audits Executed</p>
          </div>
          <div style={styles.statCard}>
            <h3>1.2M</h3>
            <p>Impulse Transactions Blocked</p>
          </div>
          <div style={styles.statCard}>
            <h3>99.99%</h3>
            <p>Uptime Risk Containment</p>
          </div>
        </div>
      </section>

      {/* Core Capabilities Grid */}
      <section style={styles.featuresSection} id="features">
        <h2 style={styles.featuresHeading}>Engineered for High-Density Financial Audits</h2>
        <div style={styles.featuresGrid}>
          <div style={styles.featureCard}>
            <div style={styles.featureIconBox}>
              <i className="fa-solid fa-expand"></i>
            </div>
            <h3 style={styles.featureCardTitle}>Optical AI Character Scan</h3>
            <p style={styles.featureCardDesc}>
              Upload raw receipt document photos. Our structural OCR regex engine isolates merchant titles and final item prices automatically.
            </p>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureIconBox}>
              <i className="fa-solid fa-bolt"></i>
            </div>
            <h3 style={styles.featureCardTitle}>Smart Impulse Blockers</h3>
            <p style={styles.featureCardDesc}>
              Our backend logic layer monitors entries in real-time. Transactions over $100 flag instant budget boundary errors.
            </p>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureIconBox}>
              <i className="fa-solid fa-chart-line"></i>
            </div>
            <h3 style={styles.featureCardTitle}>Liquid Metrics Matrix</h3>
            <p style={styles.featureCardDesc}>
              Monitor Monthly Budgets, Aggregate Spending Sums, and Liquid Running Balances inside a unified dashboard grid display.
            </p>
          </div>
        </div>
      </section>

      {/* Authentication Modal */}
      <div className={`modal-overlay ${isModalOpen ? 'active' : ''}`} onClick={closeModal}>
        <div className="modal-window" onClick={(e) => e.stopPropagation()} style={styles.modalWindowOverride}>
          <button className="close-modal-btn" onClick={closeModal}>
            <i className="fa-solid fa-xmark"></i>
          </button>
          
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>
              {modalMode === 'login' ? 'Access Enterprise Portal' : 'Initialize New Ledger'}
            </h3>
            <p style={styles.modalSubtitle}>
              {modalMode === 'login' 
                ? 'Input your verification credentials below.' 
                : 'Deploy private profile credentials.'}
            </p>
          </div>

          {errorMessage && (
            <div style={styles.errorAlert}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Account Username Email</label>
              <input 
                type="email" 
                className="input-control"
                placeholder="e.g., admin@fintrack.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="input-group" style={{ position: 'relative' }}>
              <label>Secure Keyphrase Password</label>
              <input 
                type={showPassword ? 'text' : 'password'} 
                className="input-control"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
            
            <button 
              type="submit" 
              className="btn-ui btn-solid" 
              style={styles.modalSubmitBtn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>
                  Validating...
                </>
              ) : (
                modalMode === 'login' ? 'Finalize Validation Session' : 'Deploy New Environment'
              )}
            </button>
          </form>

          <p style={styles.switchAuthText}>
            {modalMode === 'login' ? (
              <>
                New to the environment?{' '}
                <span style={styles.switchAuthLink} onClick={() => openModal('register')}>
                  Register Profile
                </span>
              </>
            ) : (
              <>
                Already registered?{' '}
                <span style={styles.switchAuthLink} onClick={() => openModal('login')}>
                  Return to Sign In
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--brand-light)',
    transition: 'background-color 0.3s, color 0.3s',
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 80px',
    position: 'fixed',
    width: '100%',
    top: 0,
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(16px)',
    zIndex: 100,
    borderBottom: '1px solid var(--border)',
    transition: 'background-color 0.3s, border-color 0.3s',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--brand-dark)',
  },
  logoIcon: {
    color: 'var(--brand-primary)',
    fontSize: '24px',
  },
  nav: {
    display: 'flex',
    gap: '36px',
  },
  navLink: {
    textDecoration: 'none',
    color: 'var(--text-slate)',
    fontWeight: '600',
    fontSize: '15px',
    transition: 'color 0.2s',
  },
  rightNavContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  themeToggleBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  },
  authButtons: {
    display: 'flex',
    gap: '16px',
  },
  heroSection: {
    padding: '180px 80px 100px 80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: '1300px',
    margin: '0 auto',
    gap: '80px',
  },
  heroContent: {
    flex: 1.1,
    animation: 'fadeIn 0.6s ease-out',
    textAlign: 'left',
  },
  heroTag: {
    background: 'rgba(99, 102, 241, 0.15)',
    color: 'var(--brand-primary)',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '700',
    display: 'inline-flex',
    alignItems: 'center',
    marginBottom: '24px',
  },
  heroTitle: {
    fontSize: '54px',
    fontWeight: '800',
    lineHeight: '1.15',
    marginBottom: '24px',
    letterSpacing: '-1.5px',
    color: 'var(--brand-dark)',
  },
  heroTitleSpan: {
    background: 'linear-gradient(135deg, var(--brand-primary) 0%, #4f46e5 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  heroDesc: {
    fontSize: '18px',
    color: 'var(--text-slate)',
    lineHeight: '1.65',
    marginBottom: '36px',
  },
  heroBtnMain: {
    padding: '16px 32px',
    fontSize: '15px',
    boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
  },
  heroBtnSub: {
    padding: '16px 32px',
    fontSize: '15px',
  },
  heroVisual: {
    flex: 0.9,
    display: 'flex',
    justifyContent: 'center',
    animation: 'fadeIn 0.8s ease-out',
  },
  heroWidgetContainer: {
    background: 'var(--card-bg)',
    borderRadius: '24px',
    boxShadow: 'var(--shadow-xl)',
    border: '1px solid var(--border)',
    width: '100%',
    maxWidth: '460px',
    padding: '30px',
    transition: 'all 0.3s',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  widgetTabBar: {
    display: 'flex',
    background: 'var(--brand-light)',
    padding: '6px',
    borderRadius: '12px',
    gap: '6px',
  },
  widgetTabBtn: {
    flex: 1,
    border: 'none',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calculatorWidget: {
    textAlign: 'left',
    animation: 'fadeIn 0.3s ease-out',
  },
  widgetTitle: {
    fontSize: '20px',
    fontWeight: '800',
    color: 'var(--brand-dark)',
    marginBottom: '6px',
  },
  widgetDesc: {
    fontSize: '13.5px',
    color: 'var(--text-slate)',
    marginBottom: '24px',
  },
  sliderWrapper: {
    marginBottom: '28px',
  },
  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-slate)',
    marginBottom: '10px',
  },
  rangeSlider: {
    width: '100%',
    accentColor: 'var(--brand-primary)',
    cursor: 'pointer',
  },
  simResults: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  simRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13.5px',
  },
  simLabel: {
    color: 'var(--text-slate)',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
  },
  simBarBg: {
    background: 'var(--brand-light)',
    height: '6px',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  simBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  securityWidget: {
    textAlign: 'center',
    animation: 'fadeIn 0.3s ease-out',
    padding: '10px 0',
  },
  mockupIcon: {
    fontSize: '50px',
    color: 'var(--brand-primary)',
    marginBottom: '20px',
  },
  mockupTitle: {
    fontSize: '20px',
    fontWeight: '800',
    color: 'var(--brand-dark)',
    marginBottom: '10px',
  },
  mockupDesc: {
    color: 'var(--text-slate)',
    fontSize: '14px',
    lineHeight: '1.65',
    marginBottom: '24px',
  },
  securityBadges: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
  },
  statsSection: {
    padding: '40px 80px',
    background: 'var(--card-bg)',
    borderTop: '1px solid var(--border)',
    borderBottom: '1px solid var(--border)',
    transition: 'background-color 0.3s, border-color 0.3s',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '32px',
    maxWidth: '1300px',
    margin: '0 auto',
  },
  statCard: {
    textAlign: 'center',
    padding: '12px',
  },
  featuresSection: {
    padding: '80px',
    maxWidth: '1300px',
    margin: '0 auto 80px auto',
    textAlign: 'center',
  },
  featuresHeading: {
    fontSize: '34px',
    fontWeight: '800',
    marginBottom: '50px',
    letterSpacing: '-0.8px',
    color: 'var(--brand-dark)',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '32px',
  },
  featureCard: {
    background: 'var(--card-bg)',
    padding: '40px 32px',
    borderRadius: '20px',
    border: '1px solid var(--border)',
    textAlign: 'left',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: 'var(--shadow-sm)',
  },
  featureIconBox: {
    width: '52px',
    height: '52px',
    background: 'rgba(99, 102, 241, 0.12)',
    color: 'var(--brand-primary)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    marginBottom: '24px',
  },
  featureCardTitle: {
    fontSize: '19px',
    fontWeight: '700',
    marginBottom: '12px',
    color: 'var(--brand-dark)',
  },
  featureCardDesc: {
    color: 'var(--text-slate)',
    fontSize: '14.5px',
    lineHeight: '1.6',
  },
  modalWindowOverride: {
    padding: '40px 32px',
    animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    background: 'var(--card-bg)',
    color: 'var(--brand-dark)',
  },
  modalHeader: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '800',
    color: 'var(--brand-dark)',
    marginBottom: '6px',
  },
  modalSubtitle: {
    fontSize: '14px',
    color: 'var(--text-slate)',
  },
  errorAlert: {
    background: '#fee2e2',
    color: 'var(--danger)',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13.5px',
    fontWeight: '600',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    borderLeft: '4px solid var(--danger)',
  },
  modalSubmitBtn: {
    width: '100%',
    justifyContent: 'center',
    marginTop: '12px',
    padding: '14px',
  },
  switchAuthText: {
    textAlign: 'center',
    fontSize: '13.5px',
    color: 'var(--text-slate)',
    marginTop: '20px',
  },
  switchAuthLink: {
    color: 'var(--brand-primary)',
    fontWeight: '700',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '36px',
    background: 'none',
    border: 'none',
    color: 'var(--text-slate)',
    cursor: 'pointer',
    fontSize: '16px',
  }
}
