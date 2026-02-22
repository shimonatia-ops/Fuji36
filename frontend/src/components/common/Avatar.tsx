import '../../styles/App.css'

type AvatarProps = {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  avatarUrl?: string | null
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export default function Avatar({ 
  firstName, 
  lastName, 
  email, 
  avatarUrl, 
  size = 'medium',
  className = '' 
}: AvatarProps) {
  // Generate initials from firstName/lastName or email
  const getInitials = (): string => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (firstName) {
      return firstName[0].toUpperCase()
    }
    if (lastName) {
      return lastName[0].toUpperCase()
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return '?'
  }

  // Generate a color based on the name/email for consistent avatar colors
  const getAvatarColor = (): string => {
    const text = firstName || lastName || email || 'user'
    const colors = [
      '#2563eb', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#84cc16', // lime
    ]
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  const sizeClasses = {
    small: 'avatar-small',
    medium: 'avatar-medium',
    large: 'avatar-large'
  }

  const initials = getInitials()
  const bgColor = getAvatarColor()

  if (avatarUrl) {
    return (
      <div className={`avatar ${sizeClasses[size]} ${className}`}>
        <img 
          src={avatarUrl} 
          alt={`${firstName || ''} ${lastName || ''}`.trim() || email || 'User'} 
          onError={(e) => {
            // Fallback to initials if image fails to load
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            const parent = target.parentElement
            if (parent) {
              parent.innerHTML = `<span style="background-color: ${bgColor}; color: white; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border-radius: 50%; font-weight: 600;">${initials}</span>`
            }
          }}
        />
      </div>
    )
  }

  return (
    <div 
      className={`avatar ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: bgColor, color: '#ffffff' }}
    >
      <span>{initials}</span>
    </div>
  )
}
