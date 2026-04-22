import * as React from "react"

export const MOBILE_BREAKPOINT = 768
export const TABLET_BREAKPOINT = 1024

export type DeviceType = "mobile" | "tablet" | "desktop"

function getDeviceType(width: number): DeviceType {
  if (width < MOBILE_BREAKPOINT) return "mobile"
  if (width < TABLET_BREAKPOINT) return "tablet"
  return "desktop"
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches
  })

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const update = () => {
      setIsMobile(mql.matches)
    }

    mql.addEventListener("change", update)
    window.addEventListener("resize", update)
    window.visualViewport?.addEventListener("resize", update)
    update()

    return () => {
      mql.removeEventListener("change", update)
      window.removeEventListener("resize", update)
      window.visualViewport?.removeEventListener("resize", update)
    }
  }, [])

  return isMobile
}

export function useDeviceType(): DeviceType {
  const [device, setDevice] = React.useState<DeviceType>(() =>
    typeof window !== "undefined" ? getDeviceType(window.innerWidth) : "desktop"
  )

  React.useEffect(() => {
    const update = () => setDevice(getDeviceType(window.innerWidth))
    window.addEventListener("resize", update)
    window.visualViewport?.addEventListener("resize", update)
    update()

    return () => {
      window.removeEventListener("resize", update)
      window.visualViewport?.removeEventListener("resize", update)
    }
  }, [])

  return device
}
