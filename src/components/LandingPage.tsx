import { useState, useEffect } from "react"
import { ArrowRight, CalendarDays, MapPin, Package, Layers, Users } from "lucide-react"
import landingBackground from "../../icon/landingp.jpeg"

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

  useEffect(() => {
    // Slight delay so the fade-in triggers after mount
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [])

  const handleEnter = () => {
    setVisible(false)
    setTimeout(onEnter, 280)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background transition-opacity duration-300 ease-in-out ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${landingBackground})` }}
      />
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px]" />

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-6 px-6 pt-16 pb-10 text-center">
        {/* App icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-700 to-blue-400 shadow-xl shadow-blue-500/30">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="4" width="18" height="17" rx="2.5" fill="white" opacity="0.15"/>
            <rect x="3" y="4" width="18" height="17" rx="2.5" stroke="white" strokeWidth="1.5"/>
            <path d="M3 9h18" stroke="white" strokeWidth="1.5"/>
            <circle cx="8" cy="6.5" r="1" fill="white"/>
            <circle cx="16" cy="6.5" r="1" fill="white"/>
            <rect x="7" y="12.5" width="3" height="3" rx="0.5" fill="white" opacity="0.9"/>
            <rect x="10.5" y="12.5" width="3" height="3" rx="0.5" fill="white" opacity="0.6"/>
            <rect x="14" y="12.5" width="3" height="3" rx="0.5" fill="white" opacity="0.4"/>
          </svg>
        </div>

        {/* Brand */}
        <div className="flex flex-col gap-2">
          <h1 className="text-[33px] font-bold tracking-tight text-white drop-shadow-sm">FCalendar</h1>
          <p className="max-w-xs text-base leading-relaxed text-white/82">
            Route planning &amp; delivery management — all in one place.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={handleEnter}
          className="inline-flex items-center gap-2.5 rounded-2xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-[0.97] transition-all duration-150"
        >
          Enter App
          <ArrowRight className="size-5" />
        </button>
      </div>

      {/* Divider */}
      <div className="relative z-10 mx-6 h-px bg-white/20" />

      {/* Features grid */}
      <div className="relative z-10 px-6 pt-8">
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-white/65">
          Key Features
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-lg mx-auto">
          {FEATURES.map(({ icon: Icon, title, description, color, bg }) => (
            <div
              key={title}
              className="flex items-start gap-3.5 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-md"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                <Icon className={`size-4.5 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug text-white">{title}</p>
                <p className="mt-0.5 text-xs leading-snug text-white/72">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <p className="relative z-10 mt-8 px-6 text-center text-[11px] text-white/55">
        FCalendar — internal tool for delivery route management
      </p>
    </div>
  )
}
