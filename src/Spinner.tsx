/**
 * Reusable loading indicators used across the app.
 */

/** Small inline spinner. Size in px. */
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <span
      className="spinner"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  )
}

/** Centered loader with an optional message — use inside cards/sections. */
export function Loader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="loader-wrap">
      <Spinner size={26} />
      <span>{message}</span>
    </div>
  )
}

/** Full-page loader — use for route-level loading. */
export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="page-loader">
      <Spinner size={30} />
      <span>{message}</span>
    </div>
  )
}

/** Tiny white spinner for inside buttons while submitting. */
export function ButtonSpinner() {
  return <span className="spinner spinner-btn" role="status" aria-label="Submitting" />
}
