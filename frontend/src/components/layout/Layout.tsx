import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import '../../styles/App.css'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { useTheme } from '../../context/ThemeContext'
import Avatar from '../common/Avatar'

type LayoutProps = {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const { isAuthenticated, role, name, firstName, lastName, email, avatarUrl, logout } = useAuth()
  const { language, setLanguage, t, isRTL } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const languageMenuRef = useRef<HTMLDivElement>(null)

  const handleLoginClick = () => {
    navigate('/login', { state: { from: window.location.pathname } })
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setShowLanguageMenu(false)
      }
    }

    if (showDropdown || showLanguageMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown, showLanguageMenu])

  const handleLogout = () => {
    logout()
    setShowDropdown(false)
    navigate('/')
  }

  return (
    <div className="fuji36-app">
      <header className="fuji36-header">
        <div className="fuji36-header-inner">
          <div className="fuji36-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <img src="/favicon-v4.png" alt="Fuji36" className="fuji36-logo-icon" />
            <span>fuji36</span>
          </div>
          <nav className="fuji36-nav">
            <Link to="/solutions">{t('nav.solutions')}</Link>
            <Link to="/who-we-serve">{t('nav.whoWeServe')}</Link>
            <Link to="/value">{t('nav.value')}</Link>
            <Link to="/insights">{t('nav.insights')}</Link>
            <Link to="/about">{t('nav.about')}</Link>
            {isAuthenticated && role === 'patient' && (
              <Link to="/patient-care-board">{t('nav.myCarePlan')}</Link>
            )}
            {isAuthenticated && role === 'therapist' && (
              <Link to="/therapist-care-board">{t('nav.managePatients')}</Link>
            )}
          </nav>
          <div className="fuji36-header-cta">
            <button
              type="button"
              onClick={toggleTheme}
              className="theme-toggle-button"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? (
                <svg className="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg className="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <div className="language-selector-wrapper" ref={languageMenuRef}>
              <button
                className="language-selector-button"
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                aria-label="Select language"
                title="Select language"
              >
                <span className="language-code">{language.toUpperCase()}</span>
                <svg
                  className="language-chevron"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {showLanguageMenu && (
                <div className="language-menu">
                  <button
                    className={`language-option ${language === 'en' ? 'active' : ''}`}
                    onClick={() => {
                      setLanguage('en')
                      setShowLanguageMenu(false)
                    }}
                  >
                    <span>English</span>
                    {language === 'en' && (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                  </button>
                  <button
                    className={`language-option ${language === 'he' ? 'active' : ''}`}
                    onClick={() => {
                      setLanguage('he')
                      setShowLanguageMenu(false)
                    }}
                  >
                    <span>עברית</span>
                    {language === 'he' && (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>
            <div className="user-icon-wrapper" ref={dropdownRef}>
              <button
                className="user-icon-button"
                onClick={() => {
                  if (isAuthenticated) {
                    setShowDropdown(!showDropdown)
                  } else {
                    handleLoginClick()
                  }
                }}
                aria-label={isAuthenticated ? t('nav.userMenu') : t('nav.login')}
              >
                {isAuthenticated ? (
                  <Avatar
                    firstName={firstName}
                    lastName={lastName}
                    email={email}
                    avatarUrl={avatarUrl}
                    size="small"
                    className="header-avatar"
                  />
                ) : (
                  <svg
                    className="user-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
                    <path
                      d="M6 21c0-3.314 2.686-6 6-6s6 2.686 6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                )}
                {isAuthenticated && role && (
                  <span className="user-icon-badge">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </span>
                )}
              </button>

              {isAuthenticated && showDropdown && (
                <div className="user-dropdown">
                  <div className="user-dropdown-header">
                    <Avatar
                      firstName={firstName}
                      lastName={lastName}
                      email={email}
                      avatarUrl={avatarUrl}
                      size="medium"
                      className="user-dropdown-avatar"
                    />
                    <div className="user-dropdown-info">
                      <div className="user-dropdown-name">{name}</div>
                      <div className="user-dropdown-role">{role}</div>
                    </div>
                  </div>
                  <div className="user-dropdown-divider"></div>
                  <div className="user-dropdown-menu">
                    <button className="user-dropdown-item" onClick={handleLogout}>
                      {t('nav.logout')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="fuji36-footer">
        <div className="footer-top">
          <div>
            <div className="fuji36-logo">Fuji36</div>
            <p>{t('footer.tagline')}</p>
          </div>
          <div className="footer-links">
            <div>
              <h4>{t('footer.business')}</h4>
              <a href="#employers">{t('footer.employers')}</a>
              <a href="#health-plans">{t('footer.healthPlans')}</a>
              <a href="#consultants">{t('footer.consultants')}</a>
              <a href="#unions">{t('footer.unions')}</a>
            </div>
            <div>
              <h4>{t('footer.members')}</h4>
              <a href="#individuals">{t('footer.individuals')}</a>
              <a href="#stories">{t('footer.memberStories')}</a>
            </div>
            <div>
              <h4>{t('footer.company')}</h4>
              <a href="#mission">{t('footer.mission')}</a>
              <a href="#careers">{t('footer.careers')}</a>
              <a href="#trust">{t('footer.trust')}</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Fuji36. {t('footer.rights')}</p>
          <div className="footer-legal">
            <a href="#terms">{t('footer.terms')}</a>
            <a href="#privacy">{t('footer.privacy')}</a>
            <a href="#cookies">{t('footer.cookies')}</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
