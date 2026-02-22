/**
 * DraggableZoneOverlay - Draggable and resizable zone rectangle on the camera view
 */
import { useRef, useCallback } from 'react'
import type { NormalizedRect } from './conesTypes'
import '../../styles/App.css'

interface DraggableZoneOverlayProps {
  zone: NormalizedRect
  label: string
  color: string
  onZoneChange: (zone: NormalizedRect) => void
  disabled?: boolean
}

const MIN_SIZE = 0.08
const CLAMP = (v: number) => Math.max(0, Math.min(1, v))

export default function DraggableZoneOverlay({
  zone,
  label,
  color,
  onZoneChange,
  disabled = false
}: DraggableZoneOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef<{ x: number; y: number; zone: NormalizedRect } | null>(null)
  const resizeHandleRef = useRef<'nw' | 'ne' | 'sw' | 'se' | 'move' | null>(null)

  const toNorm = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const el = containerRef.current
    if (!el) return { x: 0.5, y: 0.5 }
    const rect = el.getBoundingClientRect()
    return {
      x: CLAMP((clientX - rect.left) / rect.width),
      y: CLAMP((clientY - rect.top) / rect.height)
    }
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle: 'nw' | 'ne' | 'sw' | 'se' | 'move') => {
      if (disabled) return
      e.preventDefault()
      e.stopPropagation()
      const { x, y } = toNorm(e.clientX, e.clientY)
      dragStartRef.current = { x, y, zone: { ...zone } }
      resizeHandleRef.current = handle
    },
    [disabled, zone, toNorm]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const start = dragStartRef.current
      const handle = resizeHandleRef.current
      if (!start || !handle) return

      const { x, y } = toNorm(e.clientX, e.clientY)
      const dx = x - start.x
      const dy = y - start.y

      let next: NormalizedRect = { ...start.zone }

      if (handle === 'move') {
        const w = start.zone.x2 - start.zone.x1
        const h = start.zone.y2 - start.zone.y1
        next.x1 = CLAMP(start.zone.x1 + dx)
        next.y1 = CLAMP(start.zone.y1 + dy)
        next.x2 = CLAMP(next.x1 + w)
        next.y2 = CLAMP(next.y1 + h)
      } else {
        if (handle.includes('n')) {
          next.y1 = CLAMP(start.zone.y1 + dy)
          if (next.y2 - next.y1 < MIN_SIZE) next.y1 = next.y2 - MIN_SIZE
        }
        if (handle.includes('s')) {
          next.y2 = CLAMP(start.zone.y2 + dy)
          if (next.y2 - next.y1 < MIN_SIZE) next.y2 = next.y1 + MIN_SIZE
        }
        if (handle.includes('w')) {
          next.x1 = CLAMP(start.zone.x1 + dx)
          if (next.x2 - next.x1 < MIN_SIZE) next.x1 = next.x2 - MIN_SIZE
        }
        if (handle.includes('e')) {
          next.x2 = CLAMP(start.zone.x2 + dx)
          if (next.x2 - next.x1 < MIN_SIZE) next.x2 = next.x1 + MIN_SIZE
        }
      }

      onZoneChange(next)
    },
    [toNorm, onZoneChange]
  )

  const handleMouseUp = useCallback(() => {
    dragStartRef.current = null
    resizeHandleRef.current = null
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  const startDrag = useCallback(
    (e: React.MouseEvent, handle: 'nw' | 'ne' | 'sw' | 'se' | 'move') => {
      handleMouseDown(e, handle)
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [handleMouseDown, handleMouseMove, handleMouseUp]
  )

  const x1 = Math.min(zone.x1, zone.x2)
  const x2 = Math.max(zone.x1, zone.x2)
  const y1 = Math.min(zone.y1, zone.y2)
  const y2 = Math.max(zone.y1, zone.y2)
  const w = Math.max(MIN_SIZE, x2 - x1)
  const h = Math.max(MIN_SIZE, y2 - y1)

  const style: React.CSSProperties = {
    left: `${x1 * 100}%`,
    top: `${y1 * 100}%`,
    width: `${w * 100}%`,
    height: `${h * 100}%`,
    borderColor: color,
    pointerEvents: disabled ? 'none' : 'auto'
  }

  return (
    <div
      ref={containerRef}
      className="cones-zone-overlay-container"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <div
        className="cones-zone-overlay"
        style={{ ...style, pointerEvents: disabled ? 'none' : 'auto' }}
        onMouseDown={(e) => !disabled && startDrag(e, 'move')}
      >
        <span className="cones-zone-label" style={{ color }}>
          {label}
        </span>
        {!disabled && (
          <>
            <div
              className="cones-zone-resize-handle nw"
              onMouseDown={(e) => { e.stopPropagation(); startDrag(e, 'nw') }}
            />
            <div
              className="cones-zone-resize-handle ne"
              onMouseDown={(e) => { e.stopPropagation(); startDrag(e, 'ne') }}
            />
            <div
              className="cones-zone-resize-handle sw"
              onMouseDown={(e) => { e.stopPropagation(); startDrag(e, 'sw') }}
            />
            <div
              className="cones-zone-resize-handle se"
              onMouseDown={(e) => { e.stopPropagation(); startDrag(e, 'se') }}
            />
          </>
        )}
      </div>
    </div>
  )
}
