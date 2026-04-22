import * as React from "react"

export const MOBILE_BREAKPOINT = 768
export const TABLET_BREAKPOINT = 1024

export type DeviceType = "mobile" | "tablet" | "desktop"

function isTouchViewport() {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0
  )
}

function getResponsiveViewportWidth() {
  if (typeof window === "undefined") return TABLET_BREAKPOINT

  const visualViewport = window.visualViewport
  if (!visualViewport) return window.innerWidth

  if (isTouchViewport()) {
    return Math.min(window.innerWidth, visualViewport.width)
  }

  return visualViewport.width * visualViewport.scale
}

function getDeviceType(width: number): DeviceType {
  if (width < MOBILE_BREAKPOINT) return "mobile"
  if (width < TABLET_BREAKPOINT) return "tablet"
  return "desktop"
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return getResponsiveViewportWidth() < MOBILE_BREAKPOINT
  })

  React.useEffect(() => {
    const update = () => {
      setIsMobile(getResponsiveViewportWidth() < MOBILE_BREAKPOINT)
    }

    window.addEventListener("resize", update)
    window.visualViewport?.addEventListener("resize", update)
    update()

    return () => {
      window.removeEventListener("resize", update)
      window.visualViewport?.removeEventListener("resize", update)
    }
  }, [])

  return isMobile
}

export function useDeviceType(): DeviceType {
  const [device, setDevice] = React.useState<DeviceType>(() =>
    typeof window !== "undefined" ? getDeviceType(getResponsiveViewportWidth()) : "desktop"
  )

  React.useEffect(() => {
    const update = () => setDevice(getDeviceType(getResponsiveViewportWidth()))
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
