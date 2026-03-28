import { useState, useEffect, lazy, Suspense, Component, type ErrorInfo, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { AppSidebar } from "@/components/app-sidebar"
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt"
import { LandingPage } from "@/components/LandingPage"
import { useEditMode } from "@/contexts/EditModeContext"

const RouteList = lazy(() => import("@/components/RouteList").then(m => ({ default: m.RouteList })))
const Settings = lazy(() => import("@/components/Settings").then(m => ({ default: m.Settings })))
const PlanoVM = lazy(() => import("@/components/PlanoVM").then(m => ({ default: m.PlanoVM })))
const DeliveryTableDialog = lazy(() => import("@/components/Location").then(m => ({ default: m.DeliveryTableDialog })))
const Album = lazy(() => import("@/components/Album").then(m => ({ default: m.Album })))
const Rooster = lazy(() => import("@/components/Rooster").then(m => ({ default: m.Rooster })))
import { EditModeProvider } from "@/contexts/EditModeContext"
import { DeviceProvider } from "@/contexts/DeviceContext"
import { Toaster } from "sonner"
import { Home, Package, Settings2, Images, ChevronDown, Truck, List, Layers, MapPin, ClipboardList, Users, Globe, ExternalLink, Pin, X, Minus, Plus, Archive, ArchiveRestore } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const DAYS = [
  { en: "Monday",    my: "Isnin"  },
  { en: "Tuesday",   my: "Selasa" },
  { en: "Wednesday", my: "Rabu"   },
  { en: "Thursday",  my: "Khamis" },
  { en: "Friday",    my: "Jumaat" },
  { en: "Saturday",  my: "Sabtu"  },
  { en: "Sunday",    my: "Ahad"   },
]

const STOCK_IN_COLORS  = ["#3B82F6","#F97316","#92400E","#22C55E","#A855F7","#EC4899","#EAB308"]
const MOVE_FRONT_COLORS = ["#EAB308","#3B82F6","#F97316","#92400E","#22C55E","#A855F7","#EC4899"]
const EXPIRED_COLORS   = ["#EC4899","#EAB308","#3B82F6","#F97316","#92400E","#22C55E","#A855F7"]

const COLOR_LABELS: Record<string, string> = {
  "#3B82F6": "Blue",
  "#F97316": "Orange",
  "#92400E": "Brown",
  "#22C55E": "Green",
  "#A855F7": "Purple",
  "#EC4899": "Pink",
  "#EAB308": "Yellow",
}

type QuickAccessId = "route-list" | "deliveries" | "rooster" | "plano-vm" | "gallery-album" | "settings-profile"

type QuickAccessOption = {
  id: QuickAccessId
  icon: React.ElementType
  label: string
  description: string
  iconClass?: string
}

const LS_HOME_QUICK_ACCESS = "fcalendar_home_quick_access"
const LS_HOME_ARCHIVE = "fcalendar_home_archive"
const QUICK_ACCESS_LIMIT = 4

const QUICK_ACCESS_OPTIONS: QuickAccessOption[] = [
  { id: "route-list",       icon: ClipboardList, label: "Route List", description: "Manage vending routes", iconClass: "text-violet-500" },
  { id: "deliveries",       icon: MapPin,        label: "Location",   description: "Delivery records",     iconClass: "text-emerald-500" },
  { id: "rooster",          icon: Users,         label: "Rooster",    description: "Team schedule",        iconClass: "text-orange-500" },
  { id: "plano-vm",         icon: Package,       label: "Plano VM",   description: "Planogram tools",      iconClass: "text-sky-500" },
  { id: "gallery-album",    icon: Images,        label: "Album",      description: "Photo gallery",        iconClass: "text-pink-500" },
  { id: "settings-profile", icon: Settings2,     label: "Settings",   description: "Profile settings",     iconClass: "text-indigo-500" },
]

const DEFAULT_QUICK_ACCESS: QuickAccessId[] = ["route-list", "deliveries", "rooster", "plano-vm"]

function isQuickAccessId(value: unknown): value is QuickAccessId {
  return QUICK_ACCESS_OPTIONS.some(opt => opt.id === value)
}

function ColorPill({ color, size = "md" }: { color: string; size?: "sm" | "md" | "lg" }) {
  const label = COLOR_LABELS[color] ?? color
  const sizeClasses = size === "lg"
    ? "w-10 h-10"
    : size === "sm"
    ? "w-5 h-5"
    : "w-7 h-7"
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full shrink-0 ${sizeClasses}`}
      style={{ backgroundColor: color }}
      title={label}
    />
  )
}

function QuickActionCard({
  icon: Icon,
  label,
  description,
  page,
  iconClass,
  onNavigate,
  showRemove = false,
  onRemove,
}: {
  icon: React.ElementType
  label: string
  description: string
  page: string
  iconClass?: string
  onNavigate: (page: string) => void
  showRemove?: boolean
  onRemove?: () => void
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onNavigate(page)}
        className="group w-full flex flex-col items-start gap-2.5 rounded-xl p-3.5 text-left border border-border bg-card hover:bg-muted/40 hover:border-border/80 active:scale-[0.97] transition-all duration-150"
      >
        <Icon className={`size-5 shrink-0 ${iconClass ?? "text-muted-foreground"}`} />
        <div className="min-w-0 pr-5">
          <p className="text-sm font-semibold text-foreground tracking-tight leading-snug">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
        </div>
      </button>

      {showRemove && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border-0 bg-transparent text-red-600 hover:text-red-700 transition-colors"
          aria-label={`Remove ${label}`}
          title={`Remove ${label}`}
        >
          <Minus className="size-3" />
        </button>
      )}
    </div>
  )
}

function AddQuickAccessCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[112px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-card/40 p-3 text-center hover:border-primary/60 hover:bg-primary/5 transition-colors"
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Plus className="size-4" />
      </span>
      <p className="text-xs font-semibold text-foreground">Tambah Card</p>
      <p className="text-[11px] text-muted-foreground">Maksimum 4</p>
    </button>
  )
}

function HomePage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { isEditMode } = useEditMode()
  const [tableExpanded, setTableExpanded] = useState(false)
  const [legendOpen, setLegendOpen] = useState(false)
  const [confirmingLink, setConfirmingLink] = useState<string | null>(null)
  const [isRymnetPopoverOpen, setIsRymnetPopoverOpen] = useState(false)
  const [showQuickPicker, setShowQuickPicker] = useState(false)
  const [quickAccess, setQuickAccess] = useState<QuickAccessId[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_HOME_QUICK_ACCESS) || "[]")
      if (!Array.isArray(stored)) return DEFAULT_QUICK_ACCESS
      const normalized = stored.filter(isQuickAccessId)
      const unique = normalized.filter((id, index) => normalized.indexOf(id) === index)
      return unique.slice(0, QUICK_ACCESS_LIMIT).length > 0 ? unique.slice(0, QUICK_ACCESS_LIMIT) : DEFAULT_QUICK_ACCESS
    } catch {
      return DEFAULT_QUICK_ACCESS
    }
  })
  const [archiveState, setArchiveState] = useState<{ colorGuide: boolean; colorExpired: boolean }>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_HOME_ARCHIVE) || "{}")
      return {
        colorGuide: Boolean(stored?.colorGuide),
        colorExpired: Boolean(stored?.colorExpired),
      }
    } catch {
      return { colorGuide: false, colorExpired: false }
    }
  })
  const todayIndex = (new Date().getDay() + 6) % 7
  const isToolPopoverOpen = confirmingLink !== null || isRymnetPopoverOpen

  const quickAccessById = QUICK_ACCESS_OPTIONS.reduce<Record<QuickAccessId, QuickAccessOption>>((acc, option) => {
    acc[option.id] = option
    return acc
  }, {} as Record<QuickAccessId, QuickAccessOption>)

  const quickAccessCards = quickAccess
    .map(id => quickAccessById[id])
    .filter(Boolean)

  const availableQuickOptions = QUICK_ACCESS_OPTIONS.filter(opt => !quickAccess.includes(opt.id))
  const showColorGuide = !archiveState.colorGuide || isEditMode
  const showColorExpired = !archiveState.colorExpired || isEditMode
  const hasHomeArchiveContent = showColorGuide || showColorExpired

  const updateQuickAccess = (next: QuickAccessId[]) => {
    const limited = next.slice(0, QUICK_ACCESS_LIMIT)
    setQuickAccess(limited)
    localStorage.setItem(LS_HOME_QUICK_ACCESS, JSON.stringify(limited))
  }

  const addQuickAccess = (id: QuickAccessId) => {
    if (quickAccess.includes(id) || quickAccess.length >= QUICK_ACCESS_LIMIT) return
    updateQuickAccess([...quickAccess, id])
    setShowQuickPicker(false)
  }

  const removeQuickAccess = (id: QuickAccessId) => {
    updateQuickAccess(quickAccess.filter(item => item !== id))
  }

  const toggleArchive = (key: "colorGuide" | "colorExpired") => {
    setArchiveState(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(LS_HOME_ARCHIVE, JSON.stringify(next))
      return next
    })
  }
  const toolPopoverBackdrop = isToolPopoverOpen && typeof document !== "undefined"
    ? createPortal(
      <button
        type="button"
        aria-label="Close popover"
        onClick={() => {
          setConfirmingLink(null)
          setIsRymnetPopoverOpen(false)
        }}
        className="fixed inset-0 z-[45] bg-black/45 backdrop-blur-md transition-opacity duration-200"
      />,
      document.body
    )
    : null

  const [pinnedRoutes, setPinnedRoutes] = useState<Array<{ id: string; name: string; code: string; shift: string }>>(() => {
    try { return JSON.parse(localStorage.getItem("fcalendar_pinned_routes") || "[]") } catch { return [] }
  })
  useEffect(() => {
    const sync = () => {
      try { setPinnedRoutes(JSON.parse(localStorage.getItem("fcalendar_pinned_routes") || "[]")) } catch {}
    }
    window.addEventListener("fcalendar_pins_changed", sync)
    window.addEventListener("focus", sync)
    return () => {
      window.removeEventListener("fcalendar_pins_changed", sync)
      window.removeEventListener("focus", sync)
    }
  }, [])

  const pinnedRoutesOrdered = [...pinnedRoutes].sort((a, b) => {
    const rank = (shift: string) => (shift === "AM" ? 0 : shift === "PM" ? 1 : 2)
    const byShift = rank(a.shift) - rank(b.shift)
    if (byShift !== 0) return byShift
    return a.name.localeCompare(b.name)
  })
  const pinnedAM = pinnedRoutesOrdered.filter(r => r.shift === "AM").length
  const pinnedPM = pinnedRoutesOrdered.filter(r => r.shift === "PM").length

  return (
    <div
      className="flex flex-col gap-5 p-4 md:p-6 max-w-2xl mx-auto w-full"
      style={{ paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom))" }}
    >
      {toolPopoverBackdrop}

      {/* ── Pinned Routes ─────────────────────────────────────── */}
      {pinnedRoutes.length > 0 && (
        <div>
          <div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Pinned Routes</p>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {pinnedRoutesOrdered.length}
              </span>
            </div>
            <button
              onClick={() => onNavigate("route-list")}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
            >
              <List className="size-3" />Open List
            </button>
          </div>

          <div className="mb-2.5 flex items-center gap-2 px-0.5">
            <span className="rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">AM {pinnedAM}</span>
            <span className="rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">PM {pinnedPM}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pinnedRoutesOrdered.map((r) => {
              const isKL  = (r.name + " " + r.code).toLowerCase().includes("kl")
              const isSel = (r.name + " " + r.code).toLowerCase().includes("sel")
              return (
                <button
                  key={r.id}
                  type="button"
                  className="group w-full flex flex-col items-start gap-2.5 rounded-xl p-3.5 text-left border border-border bg-card hover:bg-muted/40 hover:border-border/80 active:scale-[0.97] transition-all duration-150"
                  onClick={() => { sessionStorage.setItem("fcalendar_open_route", r.id); onNavigate("route-list") }}
                >
                  <div className="flex items-center gap-2.5 w-full">
                    {isKL
                      ? <img src="/kl-flag.png" className="shrink-0 object-cover rounded shadow-sm ring-1 ring-black/10 dark:ring-white/10" style={{ width: 32, height: 20 }} alt="KL" />
                      : isSel
                      ? <img src="/selangor-flag.png" className="shrink-0 object-cover rounded shadow-sm ring-1 ring-black/10 dark:ring-white/10" style={{ width: 32, height: 20 }} alt="Selangor" />
                      : <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                        <Pin className="size-3.5 text-primary" />
                        </div>
                    }
                    <p className="flex-1 text-sm font-semibold text-foreground tracking-tight leading-snug line-clamp-1 min-w-0">{r.name}</p>
                  </div>

                  <div className="flex items-center justify-between gap-2 w-full pr-1">
                    <span className="text-[10px] font-mono text-muted-foreground">{r.code}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full text-white tracking-wide ${
                      r.shift === "AM" ? "bg-blue-500" : r.shift === "PM" ? "bg-orange-600" : "bg-muted text-muted-foreground"
                    }`}>{r.shift || "—"}</span>
                  </div>

                  <div className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                    <List className="size-3" />View
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <div>
        <div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Quick Access</p>
          <span className="rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {quickAccess.length}/{QUICK_ACCESS_LIMIT}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {quickAccessCards.map(card => (
            <QuickActionCard
              key={card.id}
              icon={card.icon}
              label={card.label}
              description={card.description}
              page={card.id}
              iconClass={card.iconClass}
              onNavigate={onNavigate}
              showRemove={isEditMode}
              onRemove={() => removeQuickAccess(card.id)}
            />
          ))}
          {isEditMode && quickAccess.length < QUICK_ACCESS_LIMIT && (
            <AddQuickAccessCard onClick={() => setShowQuickPicker(v => !v)} />
          )}
        </div>

        {isEditMode && showQuickPicker && quickAccess.length < QUICK_ACCESS_LIMIT && (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-card/50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Pilih card untuk ditambah</p>
            {availableQuickOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Semua card sudah dipakai.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableQuickOptions.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => addQuickAccess(option.id)}
                    className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-left hover:bg-muted/40 transition-colors"
                  >
                    <option.icon className={`size-4 shrink-0 ${option.iconClass ?? "text-muted-foreground"}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{option.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{option.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isEditMode && quickAccess.length === 0 && (
          <p className="mt-3 text-xs text-muted-foreground px-0.5">Tiada card. Tekan `+` untuk tambah Quick Access.</p>
        )}
      </div>

      {hasHomeArchiveContent && <hr className="border-border/40" />}

      {/* ── Color Guide Table ─────────────────────────────────── */}
      {showColorGuide && (
        <div className={archiveState.colorGuide ? "opacity-60" : undefined}>
          <div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Colour Guide</p>
            {isEditMode && (
              <button
                type="button"
                onClick={() => toggleArchive("colorGuide")}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                title={archiveState.colorGuide ? "Unarchive Colour Guide" : "Archive Colour Guide"}
              >
                {archiveState.colorGuide ? <ArchiveRestore className="size-3" /> : <Archive className="size-3" />}
                {archiveState.colorGuide ? "Unarchive" : "Archive"}
              </button>
            )}
          </div>

          <div className="rounded-xl overflow-hidden border border-border bg-card shadow-sm">
            {/* Header */}
            <div className="grid grid-cols-4 items-end border-b border-border bg-card px-4 py-3 gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Day</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">Stock In</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">Move Front</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">Expired</span>
            </div>
            {/* Rows */}
            <div className="flex flex-col">
              {DAYS.map((day, i) => {
                const isToday = i === todayIndex
                const visible = isToday || tableExpanded
                return (
                  <div
                    key={day.en}
                    style={{
                      display: 'grid',
                      gridTemplateRows: visible ? '1fr' : '0fr',
                      transition: 'grid-template-rows 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
                    }}
                  >
                    <div className="overflow-hidden">
                      <div className={`grid grid-cols-4 items-center px-4 py-3 gap-2${i < DAYS.length - 1 ? ' border-b border-border/60' : ''}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          {isToday && (
                            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold truncate ${isToday ? "text-primary" : "text-foreground"}`}>{day.en}</p>
                          </div>
                        </div>
                        <div className="flex justify-center"><ColorPill color={STOCK_IN_COLORS[i]} size="sm" /></div>
                        <div className="flex justify-center"><ColorPill color={MOVE_FRONT_COLORS[i]} size="sm" /></div>
                        <div className="flex justify-center"><ColorPill color={EXPIRED_COLORS[i]} size="sm" /></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Expand toggle */}
            <button
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted/70 transition-colors duration-200 ease-in-out border-t border-border"
              onClick={() => setTableExpanded(v => !v)}
            >
              <ChevronDown className={`size-3.5 transition-transform duration-200 ${tableExpanded ? "rotate-180" : ""}`} />
              {tableExpanded ? "Show less" : "Show all days"}
            </button>
          </div>
        </div>
      )}

      {/* ── Colour Legend ─────────────────────────────────────── */}
      {showColorExpired && (
      <div className={`relative rounded-xl overflow-hidden border border-border bg-card shadow-sm ${archiveState.colorExpired ? "opacity-60" : ""}`}>
        {isEditMode && (
          <button
            type="button"
            onClick={() => toggleArchive("colorExpired")}
            className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border border-border bg-background/90 px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            title={archiveState.colorExpired ? "Unarchive Colour Expired" : "Archive Colour Expired"}
          >
            {archiveState.colorExpired ? <ArchiveRestore className="size-3" /> : <Archive className="size-3" />}
            {archiveState.colorExpired ? "Unarchive" : "Archive"}
          </button>
        )}
        <button
          className="group w-full flex items-center gap-3 px-3.5 py-3.5 hover:bg-muted/40 active:scale-[0.99] transition-all duration-150 text-left"
          onClick={() => setLegendOpen(v => !v)}
        >
          <Layers className="size-5 text-violet-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground tracking-tight leading-snug">Colour Expired</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">Colour codes for stock activities</p>
          </div>
          <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${legendOpen ? "rotate-180" : ""}`} />
        </button>
        <div
          style={{
            display: 'grid',
            gridTemplateRows: legendOpen ? '1fr' : '0fr',
            transition: 'grid-template-rows 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
          }}
        >
          <div className="overflow-hidden">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2 p-3 border-t border-border">
              {[
                { color: "#3B82F6", label: "Blue" },
                { color: "#F97316", label: "Orange" },
                { color: "#92400E", label: "Brown" },
                { color: "#22C55E", label: "Green" },
                { color: "#A855F7", label: "Purple" },
                { color: "#EC4899", label: "Pink" },
                { color: "#EAB308", label: "Yellow" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-2.5 hover:bg-muted/40 transition-colors">
                  <ColorPill color={color} size="sm" />
                  <span className="text-xs text-foreground font-medium leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {hasHomeArchiveContent && <hr className="border-border/40" />}

      {/* ── Tool & Equipment ──────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-1.5 mb-3 px-0.5">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Tool &amp; Equipment</p>
        </div>
        <div className="rounded-2xl overflow-hidden border border-border/60 shadow-sm bg-card divide-y divide-border/40">
          {[
            {
              label: "Checklist Lorry",
              description: "Daily lorry inspection form",
              href: "https://forms.office.com/pages/responsepage.aspx?id=WpvaAItOlUG0kNCIr1ybGYfFldfcInxMv9330lw425VUN1hGWVhOVFY0SlkwSk1PRENWVzJQNkREUy4u&origin=QRCode&route=shorturl",
              icon: Truck,
              bootstrapIconClass: "bi bi-check2-all",
              accentClass: "bg-orange-500/15 ring-1 ring-orange-500/25",
              iconClass: "text-orange-500",
            },
            {
              label: "Checklist Driver",
              description: "Driver daily check form",
              href: "https://form.jotform.com/213008086383453",
              icon: ClipboardList,
              imageSrc: "/jotform1.png",
              imageClass: "w-9 h-9 object-contain scale-[2.25]",
              accentClass: "bg-blue-500/15 ring-1 ring-blue-500/25",
              iconClass: "text-blue-500",
            },
            {
              label: "Web Portal",
              description: "FamilyMart vending portal",
              href: "https://fmvending.web.app/",
              icon: Globe,
              imageSrc: "/FamilyMart.png",
              imageClass: "w-9 h-9 rounded-xl object-cover",
              accentClass: "bg-violet-500/15 ring-1 ring-violet-500/25",
              iconClass: "text-violet-500",
            },
          ].map(({ label, description, href, icon: Icon, imageSrc, imageClass, iconClass, bootstrapIconClass }) => {
            const iconEl = (
              <div className="shrink-0 w-10 h-10 flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-[1.07]">
                {imageSrc ? (
                  <img src={imageSrc} alt={`${label} icon`} className={imageClass ?? "w-9 h-9 object-contain"} />
                ) : bootstrapIconClass ? (
                  <i className={`${bootstrapIconClass} text-lg leading-none ${iconClass}`} aria-hidden="true" />
                ) : (
                  <Icon className={`size-5 ${iconClass}`} />
                )}
              </div>
            )

            const rowContent = (
              <>
                {iconEl}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
                </div>

              </>
            )

            return (
              <Popover key={label} open={confirmingLink === label} onOpenChange={(open) => !open && setConfirmingLink(null)}>
                <PopoverTrigger asChild>
                  <button
                    onClick={() => setConfirmingLink(label)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 active:scale-[0.99] transition-all duration-150 group text-left"
                  >
                    {rowContent}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-60 p-0 overflow-hidden"
                  side="top"
                  align="center"
                  sideOffset={8}
                  collisionPadding={12}
                >
                  {/* Header */}
                  <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/30">
                    <div className="shrink-0 w-8 h-8 flex items-center justify-center overflow-hidden">
                      {imageSrc ? (
                        <img src={imageSrc} alt="" className={imageClass ?? "w-7 h-7 object-contain"} />
                      ) : bootstrapIconClass ? (
                        <i className={`${bootstrapIconClass} text-sm leading-none ${iconClass}`} aria-hidden="true" />
                      ) : (
                        <Icon className={`size-4 ${iconClass}`} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground leading-tight truncate">{label}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">Opens in browser</p>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex divide-x divide-border">
                    <button
                      onClick={() => setConfirmingLink(null)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                    >
                      <X className="size-3" />Cancel
                    </button>
                    <button
                      onClick={() => {
                        setConfirmingLink(null)
                        window.open(href, '_blank', 'noopener,noreferrer')
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                    >
                      <ExternalLink className="size-3" />Open
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            )
          })}

          <Popover open={isRymnetPopoverOpen} onOpenChange={setIsRymnetPopoverOpen}>
            <PopoverTrigger asChild>
              <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 active:scale-[0.99] transition-all duration-150 group text-left">
                <div className="shrink-0 w-10 h-10 flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-[1.07]">
                  <img src="/rymnet1.png" alt="Rymnet Apps icon" className="w-9 h-9 object-contain scale-[2.5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">Rymnet Apps</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">HRMS mobile app download</p>
                </div>
                <div className="shrink-0 flex items-center text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                  <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </button>
            </PopoverTrigger>

            <PopoverContent
              side="top"
              align="center"
              sideOffset={8}
              collisionPadding={12}
              className="w-64 p-0 overflow-hidden"
            >
              {/* Mini header */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border bg-muted/30">
                <div className="w-7 h-7 flex items-center justify-center overflow-hidden shrink-0">
                  <img src="/rymnet1.png" alt="" className="w-7 h-7 object-contain scale-[2.5]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground leading-tight">Rymnet HRMS</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Download for your device</p>
                </div>
              </div>
              {/* Store links */}
              <div className="p-1.5 flex flex-col gap-0.5">
                <a
                  href="https://apps.apple.com/us/app/rymnet-hrms/id6475796139"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors group"
                >
                  <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    <i className="bi bi-apple text-base leading-none" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-tight">App Store</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">iOS &amp; macOS</p>
                  </div>
                  <ExternalLink className="size-3 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0" />
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.rnrymnet.prod"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors group"
                >
                  <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    <i className="bi bi-android2 text-base leading-none text-green-500" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-tight">Play Store</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">Android</p>
                  </div>
                  <ExternalLink className="size-3 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0" />
                </a>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState("home")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [roosterViewMode, setRoosterViewMode] = useState<"month" | "week">("week")
  const { open, openMobile, isMobile, toggleSidebar, setOpen, setOpenMobile } = useSidebar()
  const isSidebarActive = (isMobile && openMobile) || (!isMobile && open)

  const handlePageChange = (page: string) => {
    if (page === currentPage) return
    // Auto-close sidebar on navigation
    if (isMobile) setOpenMobile(false)
    else setOpen(false)
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentPage(page)
      setIsTransitioning(false)
    }, 200)
  }

  const renderContent = () => {
    switch (currentPage) {
      case "route-list":
        return <RouteList />
      case "deliveries":
        return (
          <div className="flex flex-col flex-1 min-h-0 gap-4 p-4 md:p-6">
            <div className="shrink-0">
              <div className="flex items-center gap-3 mb-1">
                <MapPin className="size-4 shrink-0 text-primary" />
                <h2 className="text-base font-semibold tracking-tight text-foreground">Location</h2>
              </div>
              <p className="ml-7 text-sm text-muted-foreground leading-relaxed">View and manage delivery records.</p>
              <Separator className="mt-4" />
            </div>
            <DeliveryTableDialog />
          </div>
        )
      case "rooster":
        return <Rooster viewMode={roosterViewMode} />
      case "settings":
      case "settings-profile":
        return <Settings section="profile" />
      case "settings-notifications":
        return <Settings section="notifications" />
      case "settings-appearance-font":
        return <Settings section="appearance-font" />
      case "settings-route-colors":
        return <Settings section="route-colors" />
      case "settings-storage":
        return <Settings section="storage" />
      case "settings-security":
        return <Settings section="security" />
      case "plano-vm":
        return <PlanoVM />
      case "gallery-album":
        return <Album />
      case "home":
      default:
        return <HomePage onNavigate={handlePageChange} />
    }
  }

  const getPageBreadcrumbs = (): { parent?: { label: string; icon: React.ElementType }; current: string } => {
    switch (currentPage) {
      case "route-list":
        return { parent: { label: "Vending Machine", icon: Package }, current: "Route List" }
      case "deliveries":
        return { parent: { label: "Vending Machine", icon: Package }, current: "Location" }
      case "rooster":
        return { parent: { label: "Schedule", icon: Users }, current: "Rooster" }
      case "settings":
      case "settings-profile":
        return { parent: { label: "Settings", icon: Settings2 }, current: "Profile" }
      case "settings-notifications":
        return { parent: { label: "Settings", icon: Settings2 }, current: "Notifications" }
      case "settings-appearance-font":
        return { parent: { label: "Settings", icon: Settings2 }, current: "Font" }
      case "settings-route-colors":
        return { parent: { label: "Settings", icon: Settings2 }, current: "Route Colours" }
      case "settings-storage":
        return { parent: { label: "Settings", icon: Settings2 }, current: "Storage" }
      case "settings-security":
        return { parent: { label: "Settings", icon: Settings2 }, current: "Security" }
      case "plano-vm":
        return { parent: { label: "Gallery", icon: Images }, current: "Plano VM" }
      case "gallery-album":
        return { parent: { label: "Gallery", icon: Images }, current: "Album" }
      case "home":
      default:
        return { current: "Home" }
    }
  }

  return (
    <>
      <AppSidebar onNavigate={handlePageChange} currentPage={currentPage} />
      
      {/* Backdrop for desktop sidebar */}
      {!isMobile && (
        <div
          className={`fixed inset-0 z-40 bg-black/45 transition-all duration-350 ease-out ${open ? "opacity-100 backdrop-blur-md pointer-events-auto" : "opacity-0 backdrop-blur-0 pointer-events-none"}`}
          onClick={toggleSidebar}
        />
      )}
      
      <main
        className={`relative flex w-full flex-1 flex-col min-h-0 overflow-hidden bg-background origin-center transition-all duration-350 ease-out will-change-[transform,filter,opacity] ${isSidebarActive ? "opacity-70 scale-[0.955] blur-[3px] saturate-75" : "opacity-100 scale-100 blur-0 saturate-100"}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <header className="glass-header sticky top-0 z-30 flex shrink-0 items-center gap-2 px-3 md:px-5 transition-colors duration-300" style={{ paddingTop: 'max(env(safe-area-inset-top), 10px)', paddingBottom: '0.5rem', minHeight: 'calc(3.25rem + max(env(safe-area-inset-top), 10px))' }}>
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator orientation="vertical" className="mr-1 md:mr-2 h-4 shrink-0" />
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList>
              {currentPage !== "home" && (
                <BreadcrumbItem className="shrink-0">
                  <BreadcrumbLink
                    href="#"
                    onClick={() => handlePageChange("home")}
                    className="flex items-center gap-1.5 font-semibold text-foreground hover:text-foreground/80 transition-colors"
                  >
                    <Home className="size-4 shrink-0" />
                  </BreadcrumbLink>
                </BreadcrumbItem>
              )}
              {(() => {
                const { parent, current } = getPageBreadcrumbs()
                return (
                  <>
                    {parent && (
                      <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem
                          key={`parent-${currentPage}`}
                          className="hidden md:flex items-center gap-1 text-muted-foreground animate-in fade-in slide-in-from-left-2 duration-200"
                        >
                          <parent.icon className="size-3.5 shrink-0" />
                          <span>{parent.label}</span>
                        </BreadcrumbItem>
                      </>
                    )}
                    <BreadcrumbSeparator className={parent ? undefined : currentPage === "home" ? "hidden" : "hidden md:block"} />
                    <BreadcrumbItem
                      key={`current-${currentPage}`}
                      className="min-w-0 animate-in fade-in slide-in-from-left-2 duration-300"
                    >
                      <BreadcrumbPage className="truncate max-w-[120px] sm:max-w-[200px] md:max-w-none font-medium">
                        {current}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )
              })()}
            </BreadcrumbList>
          </Breadcrumb>

          {/* Rooster view toggle — cycles Month ↔ Week */}
          {currentPage === "rooster" && (
            <button
              onClick={() => setRoosterViewMode(v => v === "month" ? "week" : "month")}
              className="h-7 px-3 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted transition-colors shrink-0"
            >
              {roosterViewMode === "month" ? "Month" : "Week"}
            </button>
          )}

        </header>
        <Suspense fallback={null}>
          <div className={`flex flex-col flex-1 min-h-0 overflow-y-auto ${isTransitioning ? "page-fade-out" : "page-fade-in"}`}>
            {renderContent()}
          </div>
        </Suspense>
      </main>

      {/* Edit Mode controls moved to Settings page */}
    </>
  )
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-xl font-semibold">Ralat berlaku</h1>
          <pre className="max-w-xl rounded bg-muted p-4 text-left text-xs text-destructive overflow-auto">
            {this.state.error.message}
          </pre>
          <button
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export function App() {
  const [landed, setLanded] = useState(false)

  return (
    <DeviceProvider>
      <ErrorBoundary>
        {!landed && <LandingPage onEnter={() => setLanded(true)} />}
        {landed && (
          <SidebarProvider defaultOpen={false}>
            <EditModeProvider>
              <AppContent />
            </EditModeProvider>
          </SidebarProvider>
        )}
        <PWAInstallPrompt />
        <Toaster
          position="top-right"
          toastOptions={{
            classNames: {
              toast:
                "!border !border-border !bg-background !text-foreground !shadow-xl !rounded-xl",
              title: "!text-foreground !font-semibold !text-sm",
              description: "!text-muted-foreground !text-xs",
              success:
                "!border-green-500/50 [&_[data-icon]]:!text-green-500 [&_[data-icon]_svg]:!stroke-green-500 [&_[data-icon]_svg]:!text-green-500",
              error:
                "!border-red-500/50 [&_[data-icon]]:!text-red-500 [&_[data-icon]_svg]:!stroke-red-500 [&_[data-icon]_svg]:!text-red-500",
              warning:
                "!border-amber-400/50 [&_[data-icon]]:!text-amber-500 [&_[data-icon]_svg]:!stroke-amber-500 [&_[data-icon]_svg]:!text-amber-500",
              info:
                "!border-sky-400/50 [&_[data-icon]]:!text-sky-500 [&_[data-icon]_svg]:!stroke-sky-500 [&_[data-icon]_svg]:!text-sky-500",
              loader:
                "!border-primary/40 [&_[data-icon]]:!text-primary",
            },
          }}
        />
      </ErrorBoundary>
    </DeviceProvider>
  )
}

export default App
