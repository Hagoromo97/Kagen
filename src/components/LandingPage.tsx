import { useState, useEffect } from "react"
import { ArrowRight, CalendarDays, MapPin, Package, Layers, Users } from "lucide-react"
import landingBackground from "../../icon/landingp.jpeg"
import weedLogo from "../../icon/weed.png"

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Route Calendar",
    description: "Plan and track daily delivery routes with colour-coded schedules.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: MapPin,
    title: "Location Tracking",
    description: "Log delivery locations and manage stop records efficiently.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Package,
    title: "VM Management",
    description: "Monitor vending machine stock, planograms, and movements.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: Users,
    title: "Rooster",
    description: "View shift schedules in weekly or monthly calendar view.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: Layers,
    title: "Gallery",
    description: "Store and browse VM photo albums organised by album.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
]

export function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    // Slight delay so the fade-in triggers after mount
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  const handleEnter = () => {
    setExiting(true)
    setTimeout(onEnter, 450)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background transition-opacity duration-300 ease-in-out ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ paddingBottom: "calc(3rem + env(safe-area-inset-bottom))" }}
    >
      {/* Fade-out overlay on enter */}
      <div
        className={`pointer-events-none absolute inset-0 z-50 bg-black transition-opacity duration-400 ease-in-out ${exiting ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${landingBackground})` }}
      />
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px]" />
      
      {/* Top gradient overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/40 via-black/20 to-transparent" />
      
      {/* Bottom gradient overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-7 px-5 sm:px-6 pt-20 sm:pt-24 pb-12 sm:pb-16 text-center">
        {/* App icon with animation */}
        <img
          src={weedLogo}
          alt="logo"
          style={{ width: 90, height: 90 }}
          className={`object-contain transition-all duration-700 ${
            visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        />

        {/* Brand with animation */}
        <div className={`flex flex-col gap-3 transition-all duration-700 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white drop-shadow-lg">
            FCalendar
          </h1>
          <p className="max-w-sm text-sm sm:text-base leading-relaxed text-white/85">
            Route planning &amp; delivery management — all in one place.
          </p>
        </div>

        {/* CTA with animation */}
        <button
          onClick={handleEnter}
          className={`inline-flex items-center gap-2.5 rounded-2xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-xl shadow-primary/40 hover:bg-primary/90 hover:shadow-2xl hover:shadow-primary/50 active:scale-[0.97] transition-all duration-200 ${
            visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
          style={{
            transitionDelay: visible ? "100ms" : "0ms"
          }}
        >
          Enter App
          <ArrowRight className="size-5" />
        </button>
      </div>

      {/* Divider with gradient */}
      <div className="relative z-10 flex items-center gap-4 mx-6 sm:mx-8 my-4 sm:my-8">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <span className="text-white/40 text-xs font-semibold tracking-wider">FEATURES</span>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/30 to-transparent" />
      </div>

      {/* Features grid */}
      <div className="relative z-10 px-5 sm:px-6 pb-8 sm:pb-12">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 max-w-6xl mx-auto">
          {FEATURES.map(({ icon: Icon, title, description, color }, index) => (
            <div
              key={title}
              className={`group flex flex-col gap-3 rounded-2xl border border-white/15 hover:border-white/30 bg-white/8 hover:bg-white/12 backdrop-blur-md p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 ${
                visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
              style={{
                transitionDelay: visible ? `${150 + index * 50}ms` : "0ms"
              }}
            >
              <div className={`${color} transition-transform duration-300 group-hover:scale-125`}>
                <Icon className={`size-6`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug text-white">{title}</p>
                <p className="mt-1 text-xs leading-snug text-white/70">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className={`relative z-10 mt-auto px-5 sm:px-6 py-6 text-center transition-all duration-700 ${
        visible ? "opacity-100" : "opacity-0"
      }`}>
        <p className="text-xs text-white/50 font-medium tracking-wider">
          FCalendar — internal tool for delivery route management
        </p>
      </div>
    </div>
  )
}
