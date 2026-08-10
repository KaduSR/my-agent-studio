import { beforeEach } from 'vitest'
import { setLogSink } from '../js/lib/logger.js'
import { setAnalyticsHandler } from '../js/lib/analytics.js'

// The console seams exist so they can be redirected; tests take them to /dev/null
// to keep failures readable. Assertions that care about logging can install
// their own sink for the duration of a test.
setLogSink(() => {})
setAnalyticsHandler(() => {})

beforeEach(() => {
  if (typeof document !== 'undefined') {
    document.body.replaceChildren()

    const toastRegion = document.createElement('div')
    toastRegion.id = 'toast-region'
    document.body.appendChild(toastRegion)

    const liveRegion = document.createElement('div')
    liveRegion.id = 'live-region'
    document.body.appendChild(liveRegion)
  }

  if (typeof localStorage !== 'undefined') localStorage.clear()
})
