import type { ReactNode } from 'react'
import { createContext, useContext, useState, useEffect } from 'react'

export type Language = 'en' | 'he'

type LanguageContextValue = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
  isRTL: boolean
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

// Translation dictionary
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.solutions': 'Solutions',
    'nav.whoWeServe': 'Who we serve',
    'nav.value': 'Value',
    'nav.insights': 'Insights',
    'nav.about': 'About',
    'nav.myCarePlan': 'My Care Plan',
    'nav.managePatients': 'Manage Patients',
    'nav.login': 'Login',
    'nav.logout': 'Logout',
    'nav.userMenu': 'User menu',
    
    // Footer
    'footer.tagline': 'AI‑powered care for physical and mental health.',
    'footer.business': 'Business',
    'footer.members': 'Members',
    'footer.company': 'Company',
    'footer.employers': 'Employers',
    'footer.healthPlans': 'Health Plans',
    'footer.consultants': 'Consultants & Brokers',
    'footer.unions': 'Unions',
    'footer.individuals': 'Individuals',
    'footer.memberStories': 'Member Stories',
    'footer.mission': 'Our Mission',
    'footer.careers': 'Careers',
    'footer.trust': 'Trust Center',
    'footer.rights': 'All rights reserved.',
    'footer.terms': 'Terms',
    'footer.privacy': 'Privacy',
    'footer.cookies': 'Cookie Preferences',
  },
  he: {
    // Navigation
    'nav.solutions': 'פתרונות',
    'nav.whoWeServe': 'למי אנו משרתים',
    'nav.value': 'ערך',
    'nav.insights': 'תובנות',
    'nav.about': 'אודות',
    'nav.myCarePlan': 'תוכנית הטיפול שלי',
    'nav.managePatients': 'ניהול מטופלים',
    'nav.login': 'התחברות',
    'nav.logout': 'התנתקות',
    'nav.userMenu': 'תפריט משתמש',
    
    // Footer
    'footer.tagline': 'טיפול מונע בינה מלאכותית לבריאות פיזית ונפשית.',
    'footer.business': 'עסקים',
    'footer.members': 'חברים',
    'footer.company': 'חברה',
    'footer.employers': 'מעסיקים',
    'footer.healthPlans': 'תוכניות בריאות',
    'footer.consultants': 'יועצים וסוכנים',
    'footer.unions': 'איגודים',
    'footer.individuals': 'יחידים',
    'footer.memberStories': 'סיפורי חברים',
    'footer.mission': 'המשימה שלנו',
    'footer.careers': 'קריירה',
    'footer.trust': 'מרכז אמון',
    'footer.rights': 'כל הזכויות שמורות.',
    'footer.terms': 'תנאים',
    'footer.privacy': 'פרטיות',
    'footer.cookies': 'העדפות עוגיות',
  },
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Get saved language from localStorage or default to English
    const saved = localStorage.getItem('language') as Language
    return saved === 'he' || saved === 'en' ? saved : 'en'
  })

  useEffect(() => {
    // Save language preference
    localStorage.setItem('language', language)
    // Set HTML dir attribute for RTL support
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr'
    document.documentElement.lang = language
  }, [language])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
  }

  const t = (key: string): string => {
    return translations[language][key] || key
  }

  const isRTL = language === 'he'

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return ctx
}
