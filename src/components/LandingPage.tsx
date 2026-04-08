import { useState, useEffect } from "react"
import { ArrowRight, CalendarDays, MapPin, Package, Layers, Users } from "lucide-react"

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Route Calendar",
    description: "Plan and track daily delivery routes with colour-coded schedules.",
    color: "text-blue-500",
  },
  {
    icon: MapPin,
    title: "Location Tracking",
    description: "Log delivery locations and manage stop records efficiently.",
    color: "text-emerald-500",
  },
  {
    icon: Package,
    title: "VM Management",
    description: "Monitor vending machine stock, planograms, and movements.",
    color: "text-orange-500",
  },
  {
    icon: Users,
    title: "Rooster",
    description: "View shift schedules in weekly or monthly calendar view.",
    color: "text-purple-500",
  },
  {
    icon: Layers,
    title: "Gallery",
    description: "Store and browse VM photo albums organised by album.",
    color: "text-pink-500",
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
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className={`pointer-events-none absolute inset-0 z-50 bg-black transition-opacity duration-400 ease-in-out ${exiting ? "opacity-100" : "opacity-0"}`}
      />

      {/* Background */}
      <div className="absolute inset-0 bg-[#060a0f]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(59,130,246,0.10),transparent_38%),radial-gradient(circle_at_80%_70%,rgba(20,184,166,0.08),transparent_42%)]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-full px-5 sm:px-8 py-16 sm:py-20">
        {/* Hero Section */}
        <div className="w-full max-w-3xl mx-auto text-center space-y-8">
          {/* Main Title */}
          <h1
            className={`text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white transition-all duration-700 ${
              visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
            style={{ transitionDelay: visible ? "100ms" : "0ms" }}
          >
            Data Brutal
          </h1>

          {/* Description */}
          <p
            className={`text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed transition-all duration-700 ${
              visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
            style={{ transitionDelay: visible ? "150ms" : "0ms" }}
          >
            Streamline your delivery routes, track locations, and manage operations with a single powerful tool.
          </p>

          {/* CTA Button */}
          <button
            onClick={handleEnter}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-transparent text-[#A0A0A0] font-medium text-sm border border-[#A0A0A0] hover:bg-[#A0A0A0]/10 active:scale-[0.96] transition-all duration-200 ${
              visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
            style={{ transitionDelay: visible ? "200ms" : "0ms" }}
          >
            Get Started
            <ArrowRight className="size-4" />
          </button>

          {/* Features Grid */}
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-16 transition-all duration-700 ${
              visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
            style={{ transitionDelay: visible ? "250ms" : "0ms" }}
          >
            {FEATURES.map(({ icon: Icon, title, description, color }) => (
              <div
                key={title}
                className={`group relative p-5 rounded-2xl border border-slate-700/40 bg-slate-800/30 hover:bg-slate-800/50 transition-all duration-300 transform hover:scale-105 cursor-default`}
              >
                <div className={`flex items-start gap-3 mb-3`}>
                  <div className={`p-2.5 rounded-lg bg-slate-800 group-hover:bg-slate-700 transition-colors ${color}`}>
                    <Icon className="size-5" />
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-white text-left">{title}</h3>
                <p className="text-xs text-slate-400 text-left mt-1.5 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
