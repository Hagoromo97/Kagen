import { useState, useEffect } from "react"
import { ArrowRight, CalendarDays, MapPin, Package, Layers, Users, Sun, Moon } from "lucide-react"
import { useTheme } from "@/hooks/use-theme"

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
  const { mode, toggleMode } = useTheme()
  const isDark = mode === "dark"

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
      className={`fixed inset-0 z-50 flex flex-col overflow-y-auto transition-opacity duration-300 ease-in-out ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Exit overlay */}
      <div
        className={`pointer-events-none absolute inset-0 z-50 bg-black transition-opacity duration-400 ease-in-out ${exiting ? "opacity-100" : "opacity-0"}`}
      />

      {/* Background */}
      {isDark ? (
        <>
          <div className="absolute inset-0 bg-[hsl(var(--background))]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,hsl(var(--primary)/0.18),transparent_38%),radial-gradient(circle_at_80%_70%,hsl(var(--accent)/0.14),transparent_42%)]" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[hsl(var(--background))]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.16),transparent_42%),radial-gradient(circle_at_78%_75%,hsl(var(--accent)/0.11),transparent_40%)]" />
        </>
      )}

      {/* Theme toggle */}
      <div className="relative z-10 flex justify-end px-5 sm:px-8 pt-5">
        <button
          onClick={toggleMode}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium border transition-all duration-200 active:scale-[0.94] ${
            isDark
              ? "border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.7)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary)/0.9)] hover:text-[hsl(var(--foreground))]"
              : "border-[hsl(var(--border))] bg-[hsl(var(--card)/0.8)] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--card))] hover:text-[hsl(var(--foreground))] shadow-sm"
          }`}
        >
          {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          {isDark ? "Light" : "Dark"}
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-start sm:justify-center min-h-[calc(100%-3rem)] px-5 sm:px-8 pt-8 pb-16 sm:py-16">
        {/* Hero Section */}
        <div className="w-full max-w-3xl mx-auto text-center space-y-8">
          {/* Main Title */}
          <h1
            className={`mx-auto max-w-[14ch] px-2 text-[clamp(1.4rem,7.2vw,2.2rem)] sm:text-2xl lg:text-3xl font-bold tracking-tight break-words [text-wrap:balance] transition-all duration-700 ${
              isDark ? "text-slate-300" : "text-[hsl(var(--foreground))]"
            } ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
            style={{ transitionDelay: visible ? "100ms" : "0ms" }}
          >
            Data Brutal
          </h1>

          {/* Description */}
          <p
            className={`text-[15px] sm:text-[17px] max-w-2xl mx-auto leading-relaxed transition-all duration-700 ${
              isDark ? "text-slate-400" : "text-[hsl(var(--muted-foreground))]"
            } ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
            style={{ transitionDelay: visible ? "150ms" : "0ms" }}
          >
            Streamline your delivery routes, track locations, and manage operations with a single powerful tool.
          </p>

          {/* CTA Button */}
          <button
            onClick={handleEnter}
            className={`landing-cta relative inline-flex items-center gap-2 overflow-hidden px-5 py-2.5 rounded-lg font-semibold text-[13px] border active:scale-[0.96] transition-all duration-200 ${
              isDark
                ? "bg-transparent text-slate-300 border-slate-500/80 hover:bg-slate-700/20 hover:border-slate-400"
                : "bg-[hsl(var(--card)/0.9)] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--card))] hover:border-[hsl(var(--ring)/0.7)] shadow-sm"
            } ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
            style={{ transitionDelay: visible ? "200ms" : "0ms" }}
          >
            <span className="relative z-10">Get Started</span>
            <ArrowRight className="landing-cta-arrow relative z-10 size-4" />
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
                className={`group relative p-5 rounded-2xl border backdrop-blur-[2px] transition-all duration-300 transform hover:scale-[1.02] cursor-default ${
                  isDark
                    ? "border-slate-600/60 bg-[hsl(var(--card)/0.5)] hover:bg-[hsl(var(--card)/0.72)]"
                    : "border-[hsl(var(--border)/0.8)] bg-[hsl(var(--card)/0.78)] hover:bg-[hsl(var(--card))] shadow-sm hover:shadow-[0_10px_28px_-20px_hsl(var(--foreground)/0.45)]"
                }`}
              >
                <div className="mb-2.5 flex items-center gap-2.5">
                  <div className={color}>
                    <Icon className="size-5" />
                  </div>
                  <h3 className={`text-[15px] font-semibold text-left leading-none ${isDark ? "text-slate-300" : "text-[hsl(var(--foreground))]"}`}>{title}</h3>
                </div>
                <p className={`text-[13px] text-left mt-1.5 leading-relaxed ${isDark ? "text-slate-400" : "text-[hsl(var(--muted-foreground))]"}`}>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
