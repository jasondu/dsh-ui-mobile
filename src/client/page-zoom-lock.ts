import { MOBILE_QUERY } from './frame.ts'

/**
 * Prevent browser-level pinch zoom on phone-sized viewports. The injected
 * viewport tag handles the initial page; these event guards cover WebKit's
 * gesture events and browsers that still allow a multi-touch gesture.
 */
export function lockMobilePageZoom(): () => void {
  const isPhone = () => window.matchMedia(MOBILE_QUERY).matches
  const preventGesture = (event: Event) => {
    if (isPhone()) event.preventDefault()
  }
  const preventPinch = (event: TouchEvent) => {
    if (isPhone() && event.touches.length > 1) event.preventDefault()
  }

  document.addEventListener('gesturestart', preventGesture, { passive: false })
  document.addEventListener('gesturechange', preventGesture, { passive: false })
  document.addEventListener('gestureend', preventGesture, { passive: false })
  document.addEventListener('touchmove', preventPinch, { passive: false })
  return () => {
    document.removeEventListener('gesturestart', preventGesture)
    document.removeEventListener('gesturechange', preventGesture)
    document.removeEventListener('gestureend', preventGesture)
    document.removeEventListener('touchmove', preventPinch)
  }
}
