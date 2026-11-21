import { useEffect, useRef, useState } from 'react'
import './CustomCursor.css'

export type CursorHoverType =
  | ''
  | 'hover-button'
  | 'hover-link'
  | 'hover-card'
  | 'hover-media'
  | 'hover-input'

/**
 * KhelGrid Premium Animated Cursor
 *
 * Implements a high-performance, athletic, hardware-accelerated cursor
 * with smooth pointer tracking, contextual hover states, restrained click pulse,
 * and complete zero-interference with clicks, scrolling, and text selection.
 *
 * Automatically disabled on touch devices and respects prefers-reduced-motion.
 */
function checkPointerCapability(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reducedMotion) {
    return false
  }
  // Exclude purely touch-only devices without hover capability (e.g. mobile phones, iPads without mouse)
  const isTouchOnly = window.matchMedia('(hover: none) and (pointer: coarse)').matches
  if (isTouchOnly) {
    return false
  }
  // Desktop/laptop with mouse, trackpad, or any fine pointer (including Windows touchscreen laptops)
  const hasPointer =
    window.matchMedia('(pointer: fine)').matches ||
    window.matchMedia('(any-pointer: fine)').matches ||
    window.matchMedia('(hover: hover)').matches ||
    window.matchMedia('(any-hover: hover)').matches
  return hasPointer
}

export default function CustomCursor() {
  const [isEnabled, setIsEnabled] = useState<boolean>(checkPointerCapability)
  const [isVisible, setIsVisible] = useState<boolean>(false)
  const [isClicking, setIsClicking] = useState<boolean>(false)
  const [hoverType, setHoverType] = useState<CursorHoverType>('')

  const containerRef = useRef<HTMLDivElement | null>(null)
  const dotRef = useRef<HTMLDivElement | null>(null)
  const followerRef = useRef<HTMLDivElement | null>(null)
  const rippleRef = useRef<HTMLDivElement | null>(null)

  // Mutable animation state (stored in refs to avoid layout thrashing and re-renders)
  const mousePos = useRef({ x: -100, y: -100 })
  const followerPos = useRef({ x: -100, y: -100 })
  const rafId = useRef<number | null>(null)
  const isLoopRunning = useRef<boolean>(false)

  // Listen for media query changes (e.g. pointer type or accessibility preferences)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const touchOnlyQuery = window.matchMedia('(hover: none) and (pointer: coarse)')

    const updateCapability = () => {
      setIsEnabled(checkPointerCapability())
    }

    reducedMotionQuery.addEventListener?.('change', updateCapability)
    touchOnlyQuery.addEventListener?.('change', updateCapability)

    // Fallback: If user moves a fine pointer (mouse/trackpad), ensure enabled immediately
    const handleInitialMove = (e: MouseEvent | PointerEvent) => {
      if ('pointerType' in e && e.pointerType === 'touch') {
        return
      }
      if (!reducedMotionQuery.matches) {
        setIsEnabled(true)
      }
    }
    window.addEventListener('mousemove', handleInitialMove, { once: true, passive: true })
    window.addEventListener('pointermove', handleInitialMove, { once: true, passive: true })

    return () => {
      reducedMotionQuery.removeEventListener?.('change', updateCapability)
      touchOnlyQuery.removeEventListener?.('change', updateCapability)
      window.removeEventListener('mousemove', handleInitialMove)
      window.removeEventListener('pointermove', handleInitialMove)
    }
  }, [])

  // Animation and interaction handlers
  useEffect(() => {
    if (!isEnabled) {
      return
    }

    const lerpFactor = 0.18

    const renderLoop = () => {
      const targetX = mousePos.current.x
      const targetY = mousePos.current.y
      let currentX = followerPos.current.x
      let currentY = followerPos.current.y

      // Lerp outer follower towards pointer
      const dx = targetX - currentX
      const dy = targetY - currentY
      currentX += dx * lerpFactor
      currentY += dy * lerpFactor

      followerPos.current.x = currentX
      followerPos.current.y = currentY

      if (followerRef.current) {
        followerRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`
      }

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`
      }

      // Check distance to settle and pause RAF loop when stationary to conserve CPU
      const distance = Math.hypot(dx, dy)
      if (distance < 0.08) {
        followerPos.current.x = targetX
        followerPos.current.y = targetY
        if (followerRef.current) {
          followerRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`
        }
        isLoopRunning.current = false
        rafId.current = null
        return
      }

      rafId.current = requestAnimationFrame(renderLoop)
    }

    const wakeUpLoop = () => {
      if (!isLoopRunning.current) {
        isLoopRunning.current = true
        rafId.current = requestAnimationFrame(renderLoop)
      }
    }

    const updateHoverState = (clientX: number, clientY: number, fallbackTarget: Element | null) => {
      // ElementFromPoint pierces through pointer-events: none elements directly
      let target: Element | null = null
      if (typeof document !== 'undefined' && document.elementFromPoint && clientX >= 0 && clientY >= 0) {
        target = document.elementFromPoint(clientX, clientY)
      }
      if (!target && fallbackTarget && 'closest' in fallbackTarget) {
        target = fallbackTarget
      }

      if (!target || !('closest' in target)) {
        setHoverType('')
        return
      }

      // Contextual element detection
      if (target.closest('input, textarea, select, [contenteditable="true"]')) {
        setHoverType('hover-input')
      } else if (
        target.closest(
          'button, [role="button"], input[type="submit"], input[type="button"], .btn, [data-cursor="button"]'
        )
      ) {
        setHoverType('hover-button')
      } else if (
        target.closest('a, [role="link"], .primary-link, .nav-item, [data-cursor="link"]')
      ) {
        setHoverType('hover-link')
      } else if (
        target.closest(
          '.card, [data-card], article, .listing-card, .sports-card, .venue-card, .academy-card, [data-cursor="card"]'
        )
      ) {
        setHoverType('hover-card')
      } else if (
        target.closest('img, video, .media-preview, [data-cursor="media"]')
      ) {
        setHoverType('hover-media')
      } else {
        setHoverType('')
      }
    }

    const handlePointerMove = (e: PointerEvent | MouseEvent) => {
      if ('pointerType' in e && e.pointerType === 'touch') {
        return
      }

      // Viewport boundary clamp
      const x = Math.max(0, Math.min(window.innerWidth, e.clientX))
      const y = Math.max(0, Math.min(window.innerHeight, e.clientY))

      // If initial position, snap follower immediately without sliding from (-100, -100)
      if (mousePos.current.x === -100 && mousePos.current.y === -100) {
        followerPos.current.x = x
        followerPos.current.y = y
        if (followerRef.current) {
          followerRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
        }
        if (dotRef.current) {
          dotRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`
        }
      }

      mousePos.current.x = x
      mousePos.current.y = y

      setIsVisible(true)
      updateHoverState(x, y, e.target as Element | null)
      wakeUpLoop()
    }

    const handlePointerDown = (e: PointerEvent | MouseEvent) => {
      if ('pointerType' in e && e.pointerType === 'touch') {
        return
      }
      setIsVisible(true)
      setIsClicking(true)
      if (containerRef.current) {
        containerRef.current.classList.add('is-clicking')
      }

      const clientX = e.clientX ?? mousePos.current.x
      const clientY = e.clientY ?? mousePos.current.y

      // Trigger ripple pulse at exact pointer coordinates
      if (rippleRef.current) {
        rippleRef.current.style.transform = `translate3d(${clientX}px, ${clientY}px, 0)`
        rippleRef.current.classList.remove('is-pulsing')
        // Force reflow to restart CSS animation cleanly
        void rippleRef.current.offsetWidth
        rippleRef.current.classList.add('is-pulsing')
      }
    }

    const handlePointerUp = () => {
      setIsClicking(false)
      if (containerRef.current) {
        containerRef.current.classList.remove('is-clicking')
      }
    }

    const handlePointerOver = (e: PointerEvent | MouseEvent) => {
      updateHoverState(e.clientX, e.clientY, e.target as Element | null)
    }

    const handleDocMouseLeave = (e: MouseEvent) => {
      // Hide cursor only when genuinely leaving document viewport
      if (!e.relatedTarget && !(e as unknown as { toElement?: Element }).toElement) {
        setIsVisible(false)
      }
    }

    const handleDocMouseEnter = () => {
      setIsVisible(true)
    }

    const handleWindowBlur = () => {
      setIsVisible(false)
    }

    const handleWindowFocus = () => {
      setIsVisible(true)
    }

    // Capture phase listeners ensure reliable event observation across all elements
    window.addEventListener('pointermove', handlePointerMove, { capture: true, passive: true })
    window.addEventListener('mousemove', handlePointerMove, { capture: true, passive: true })
    window.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true })
    window.addEventListener('mousedown', handlePointerDown, { capture: true, passive: true })
    window.addEventListener('pointerup', handlePointerUp, { capture: true, passive: true })
    window.addEventListener('mouseup', handlePointerUp, { capture: true, passive: true })
    window.addEventListener('pointerover', handlePointerOver, { capture: true, passive: true })
    window.addEventListener('mouseover', handlePointerOver, { capture: true, passive: true })
    document.addEventListener('mouseleave', handleDocMouseLeave)
    document.addEventListener('mouseenter', handleDocMouseEnter)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', handleWindowFocus)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove, { capture: true })
      window.removeEventListener('mousemove', handlePointerMove, { capture: true })
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true })
      window.removeEventListener('mousedown', handlePointerDown, { capture: true })
      window.removeEventListener('pointerup', handlePointerUp, { capture: true })
      window.removeEventListener('mouseup', handlePointerUp, { capture: true })
      window.removeEventListener('pointerover', handlePointerOver, { capture: true })
      window.removeEventListener('mouseover', handlePointerOver, { capture: true })
      document.removeEventListener('mouseleave', handleDocMouseLeave)
      document.removeEventListener('mouseenter', handleDocMouseEnter)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('focus', handleWindowFocus)

      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
        rafId.current = null
      }
      isLoopRunning.current = false
    }
  }, [isEnabled])

  if (!isEnabled) {
    return null
  }

  const containerClasses = [
    'kg-custom-cursor-container',
    isVisible ? 'is-visible' : '',
    isClicking ? 'is-clicking' : '',
    hoverType,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      aria-hidden="true"
      data-testid="kg-custom-cursor"
    >
      <div ref={rippleRef} className="kg-cursor-ripple" />
      <div ref={followerRef} className="kg-cursor-follower" />
      <div ref={dotRef} className="kg-cursor-dot" />
    </div>
  )
}
