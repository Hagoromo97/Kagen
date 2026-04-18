import { useState, useEffect, lazy, Suspense, Component, type ErrorInfo, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { AppSidebar } from "@/components/app-sidebar"
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt"
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt"
import { LandingPage } from "@/components/LandingPage"
import { DeliveryMap } from "@/components/DeliveryMap"
import { useEditMode } from "@/contexts/EditModeContext"

const RouteList = lazy(() => import("@/components/RouteList").then(m => ({ default: m.RouteList })))
const Settings = lazy(() => import("@/components/Settings").then(m => ({ default: m.Settings })))
const PlanoVM = lazy(() => import("@/components/PlanoVM").then(m => ({ default: m.PlanoVM })))
const DeliveryTableDialog = lazy(() => import("@/components/Location").then(m => ({ default: m.DeliveryTableDialog })))
const Album = lazy(() => import("@/components/Album").then(m => ({ default: m.Album })))
const Rooster = lazy(() => import("@/components/Rooster").then(m => ({ default: m.Rooster })))
const CustomRoutePage = lazy(() => import("@/components/CustomRoutePage").then(m => ({ default: m.CustomRoutePage })))
import { EditModeProvider } from "@/contexts/EditModeContext"
import { DeviceProvider } from "@/contexts/DeviceContext"
import { Toaster } from "sonner"
import { Home, Package, Settings2, Images, ChevronDown, ChevronUp, ChevronsUpDown, ArrowUp, ArrowDown, Truck, List, Layers, MapPin, ClipboardList, Users, Globe, ExternalLink, Pin, X, Minus, Plus, Archive, ArchiveRestore, Search, Info, Cog, MapPinned, TableProperties, Expand, Shrink } from "lucide-react"
import { RowInfoModal } from "@/components/RowInfoModal"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

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

interface HomeRouteDialogPoint {
  code: string
  name: string
  delivery: string
  latitude: number
  longitude: number
  descriptions: { key: string; value: string }[]
  markerColor?: string
  qrCodeImageUrl?: string
  qrCodeDestinationUrl?: string
  avatarImageUrl?: string
  avatarImages?: string[]
}

type HomeTableColumn = 'no' | 'code' | 'name' | 'delivery' | 'km' | 'action'
type HomeTableSettingsTab = 'column' | 'sorting'
type HomeTableSort = 'default' | 'code-asc' | 'code-desc' | 'name-asc' | 'name-desc' | 'delivery-asc' | 'delivery-desc'
type HomeKmCalculateBy = 'hq' | 'previous'
interface HomeSavedRowOrder {
  id: string
  label: string
  order: string[]
}

const HOME_DEFAULT_MAP_CENTER = { lat: 3.06955, lng: 101.5469179 }

function homeHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function homeFormatKm(km: number): string {
  const rounded = Math.round(km * 10) / 10
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} Km`
}

function homeDeliveryLabel(value: string): string {
  if (value === "Weekday 2" || value === "Weekday 3") return "Weekday"
  return value
}

const DEFAULT_QUICK_ACCESS: QuickAccessId[] = []

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
  page,
  iconClass,
  onNavigate,
  showRemove = false,
  onRemove,
}: {
  icon: React.ElementType
  label: string
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
        className="group w-full rounded-2xl border border-border/80 bg-card/75 p-4 text-left shadow-sm hover:bg-card hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
      >
        <div className="flex items-center gap-2.5 pr-5">
          <Icon className={`size-5 shrink-0 ${iconClass ?? "text-primary"}`} />
          <p className="text-sm font-semibold text-foreground tracking-tight leading-snug truncate">{label}</p>
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
      className="group w-full rounded-2xl border border-dashed border-border/80 bg-card/40 p-4 text-left shadow-sm hover:border-primary/60 hover:bg-primary/5 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
    >
      <div className="flex items-center gap-2.5">
        <Plus className="size-5 shrink-0 text-primary" />
        <p className="text-sm font-semibold text-foreground tracking-tight leading-snug truncate">Add Card</p>
      </div>
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
  const [archiveState, setArchiveState] = useState<{ colorGuide: boolean; colorExpired: boolean; toolEquipment: boolean }>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_HOME_ARCHIVE) || "{}")
      return {
        colorGuide: stored?.colorGuide ?? true,
        colorExpired: stored?.colorExpired ?? true,
        toolEquipment: stored?.toolEquipment ?? true,
      }
    } catch {
      return { colorGuide: true, colorExpired: true, toolEquipment: true }
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
  const showToolEquipment = !archiveState.toolEquipment || isEditMode
  const hasHomeArchiveContent = showColorGuide || showColorExpired || showToolEquipment

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

  const toggleArchive = (key: "colorGuide" | "colorExpired" | "toolEquipment") => {
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

  const isQuickPickerModalOpen = isEditMode && showQuickPicker && quickAccess.length < QUICK_ACCESS_LIMIT
  const quickPickerModal = isQuickPickerModalOpen && typeof document !== "undefined"
    ? createPortal(
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <button
          type="button"
          aria-label="Close quick access picker"
          className="absolute inset-0 bg-black/45 backdrop-blur-sm"
          onClick={() => setShowQuickPicker(false)}
        />
        <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Add Quick Access</p>
              <p className="text-xs text-muted-foreground">Choose a card to add to Home.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowQuickPicker(false)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          {availableQuickOptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">All cards are already in use.</p>
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
      </div>,
      document.body
    )
    : null

  const [pinnedRoutes, setPinnedRoutes] = useState<Array<{ id: string; name: string; code: string; shift: string }>>(() => {
    try { return JSON.parse(localStorage.getItem("fcalendar_pinned_routes") || "[]") } catch { return [] }
  })
  const [homeRouteDialogOpen, setHomeRouteDialogOpen] = useState(false)
  const [homeRouteDialogLoading, setHomeRouteDialogLoading] = useState(false)
  const [homeRouteDialogError, setHomeRouteDialogError] = useState<string | null>(null)
  const [homeRouteDialogQuery, setHomeRouteDialogQuery] = useState("")
  const [homeRouteDialogRoute, setHomeRouteDialogRoute] = useState<{ id: string; name: string; code: string; shift: string } | null>(null)
  const [homeRouteDialogPoints, setHomeRouteDialogPoints] = useState<HomeRouteDialogPoint[]>([])
  const [homeRouteDialogView, setHomeRouteDialogView] = useState<'table' | 'map'>('table')
  const [homeRouteDialogFullscreen, setHomeRouteDialogFullscreen] = useState(false)
  const [homeRouteMapSettingsOpen, setHomeRouteMapSettingsOpen] = useState(false)
  const [homeRouteTableSettingsTab, setHomeRouteTableSettingsTab] = useState<HomeTableSettingsTab>('column')
  const [homeRouteDraftColumns, setHomeRouteDraftColumns] = useState<{ key: HomeTableColumn; label: string; visible: boolean }[]>([
    { key: 'no', label: 'No', visible: true },
    { key: 'code', label: 'Code', visible: true },
    { key: 'name', label: 'Name', visible: true },
    { key: 'delivery', label: 'Delivery', visible: true },
    { key: 'km', label: 'KM', visible: false },
    { key: 'action', label: 'Action', visible: true },
  ])
  const [homeRouteTableSort, setHomeRouteTableSort] = useState<HomeTableSort>('code-asc')
  const [homeRouteSavedRowOrders, setHomeRouteSavedRowOrders] = useState<HomeSavedRowOrder[]>([])
  const [homeRouteSavedSortId, setHomeRouteSavedSortId] = useState<string | null>(null)
  const [homeRouteKmCalculateBy, setHomeRouteKmCalculateBy] = useState<HomeKmCalculateBy>('hq')
  const [homeRouteMapStyle, setHomeRouteMapStyle] = useState<'google-streets' | 'google-satellite' | 'osm'>('google-streets')
  const [homeRouteMarkerStyle, setHomeRouteMarkerStyle] = useState<'pin' | 'dot' | 'ring'>('pin')
  const [homeRouteShowPolyline, setHomeRouteShowPolyline] = useState(false)
  const [homeRouteMapRefitToken, setHomeRouteMapRefitToken] = useState(0)
  const [homeRouteMapResizeToken, setHomeRouteMapResizeToken] = useState(0)
  const [homeRouteSelectedPoint, setHomeRouteSelectedPoint] = useState<HomeRouteDialogPoint | null>(null)
  const [homeRoutePointModalOpen, setHomeRoutePointModalOpen] = useState(false)
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
  const openPinnedRouteTable = async (routeId: string) => {
    const fallbackPinned = pinnedRoutes.find(route => route.id === routeId) ?? null
    setHomeRouteDialogRoute(fallbackPinned)
    setHomeRouteDialogPoints([])
    setHomeRouteDialogQuery("")
    setHomeRouteDialogError(null)
    setHomeRouteDialogOpen(true)
    setHomeRouteDialogLoading(true)
    setHomeRouteDialogView('table')
    setHomeRouteDialogFullscreen(false)
    setHomeRouteMapRefitToken(0)
    setHomeRouteMapResizeToken(0)
    setHomeRouteTableSort('code-asc')
    setHomeRouteSavedSortId(null)

    try {
      const stored = localStorage.getItem(`fcalendar_my_sorts_${routeId}`)
      const parsed = stored ? JSON.parse(stored) : []
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .filter((entry): entry is HomeSavedRowOrder => Boolean(entry && typeof entry === 'object' && typeof entry.id === 'string' && Array.isArray(entry.order)))
          .map((entry, index) => ({
            ...entry,
            label: typeof entry.label === 'string' && entry.label.trim() !== ''
              ? entry.label.trim()
              : `Order ${index + 1}`,
          }))
        setHomeRouteSavedRowOrders(normalized)
      } else {
        setHomeRouteSavedRowOrders([])
      }
    } catch {
      setHomeRouteSavedRowOrders([])
    }

    try {
      const response = await fetch("/api/routes")
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const payload = await response.json()
      const routes = payload?.data ?? payload ?? []
      const selected = Array.isArray(routes)
        ? routes.find((route: { id?: string }) => route?.id === routeId)
        : null

      if (!selected) {
        setHomeRouteDialogError("Route not found")
        return
      }

      setHomeRouteDialogRoute({
        id: selected.id,
        name: selected.name,
        code: selected.code,
        shift: selected.shift,
      })
      setHomeRouteDialogPoints(
        Array.isArray(selected.deliveryPoints)
          ? selected.deliveryPoints.map((point: {
              code?: string
              name?: string
              delivery?: string
              latitude?: number
              longitude?: number
              descriptions?: { key?: string; value?: string }[]
              markerColor?: string
              qrCodeImageUrl?: string
              qrCodeDestinationUrl?: string
              avatarImageUrl?: string
              avatarImages?: string[]
            }) => ({
              code: point.code ?? "",
              name: point.name ?? "",
              delivery: point.delivery ?? "",
              latitude: Number(point.latitude) || 0,
              longitude: Number(point.longitude) || 0,
              descriptions: Array.isArray(point.descriptions)
                ? point.descriptions
                    .map((item) => ({ key: item?.key ?? "", value: item?.value ?? "" }))
                    .filter((item) => item.key.trim() !== "")
                : [],
              markerColor: point.markerColor,
              qrCodeImageUrl: point.qrCodeImageUrl,
              qrCodeDestinationUrl: point.qrCodeDestinationUrl,
              avatarImageUrl: point.avatarImageUrl,
              avatarImages: Array.isArray(point.avatarImages) ? point.avatarImages : undefined,
            }))
          : []
      )
    } catch {
      setHomeRouteDialogError("Failed to load route details")
    } finally {
      setHomeRouteDialogLoading(false)
    }
  }

  const homeRouteDialogRows = homeRouteDialogPoints.filter((point) => {
    const query = homeRouteDialogQuery.trim().toLowerCase()
    if (!query) return true
    return (
      point.code.toLowerCase().includes(query)
      || point.name.toLowerCase().includes(query)
      || point.delivery.toLowerCase().includes(query)
    )
  })

  const homeRouteTableRows = [...homeRouteDialogRows].sort((left, right) => {
    if (homeRouteSavedSortId) {
      const saved = homeRouteSavedRowOrders.find(s => s.id === homeRouteSavedSortId)
      if (!saved) return 0
      const leftIndex = saved.order.indexOf(left.code)
      const rightIndex = saved.order.indexOf(right.code)
      return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex)
    }
    if (homeRouteTableSort === 'default') return left.code.localeCompare(right.code, undefined, { numeric: true, sensitivity: 'base' })
    if (homeRouteTableSort === 'code-asc') return left.code.localeCompare(right.code, undefined, { numeric: true, sensitivity: 'base' })
    if (homeRouteTableSort === 'code-desc') return right.code.localeCompare(left.code, undefined, { numeric: true, sensitivity: 'base' })
    if (homeRouteTableSort === 'name-asc') return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' })
    if (homeRouteTableSort === 'name-desc') return right.name.localeCompare(left.name, undefined, { numeric: true, sensitivity: 'base' })
    if (homeRouteTableSort === 'delivery-asc') return homeDeliveryLabel(left.delivery).localeCompare(homeDeliveryLabel(right.delivery), undefined, { sensitivity: 'base' })
    if (homeRouteTableSort === 'delivery-desc') return homeDeliveryLabel(right.delivery).localeCompare(homeDeliveryLabel(left.delivery), undefined, { sensitivity: 'base' })
    return 0
  })

  const getHomeRouteKmValue = (point: HomeRouteDialogPoint, index: number): string => {
    if (point.latitude === 0 && point.longitude === 0) return '-'

    if (homeRouteKmCalculateBy === 'previous' && index > 0) {
      const previousPoint = homeRouteTableRows[index - 1]
      if (previousPoint && (previousPoint.latitude !== 0 || previousPoint.longitude !== 0)) {
        return homeFormatKm(homeHaversineKm(previousPoint.latitude, previousPoint.longitude, point.latitude, point.longitude))
      }
    }

    return homeFormatKm(homeHaversineKm(HOME_DEFAULT_MAP_CENTER.lat, HOME_DEFAULT_MAP_CENTER.lng, point.latitude, point.longitude))
  }

  const moveHomeTableColumn = (index: number, dir: -1 | 1) => {
    setHomeRouteDraftColumns(prev => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  return (
    <div
      className="flex flex-col gap-5 px-4 pb-4 pt-6 md:px-6 md:pb-6 md:pt-8 max-w-2xl mx-auto w-full"
      style={{ paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom))" }}
    >
      {toolPopoverBackdrop}
      {quickPickerModal}

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
              className="inline-flex items-center gap-1 px-0 py-0 text-[10px] font-semibold text-primary/80 hover:text-primary transition-colors"
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
              const routeTitle = /^route\b/i.test(r.name.trim()) ? r.name.trim() : `Route ${r.name}`
              return (
                <div
                  key={r.id}
                  className="group w-full flex items-center justify-between gap-3 rounded-xl p-3.5 text-left border border-border bg-card hover:bg-muted/40 hover:border-border/80 transition-all duration-150"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isKL
                      ? <img src="/kl-flag.png" className="shrink-0 object-cover rounded shadow-sm ring-1 ring-black/10 dark:ring-white/10" style={{ width: 32, height: 20 }} alt="KL" />
                      : isSel
                      ? <img src="/selangor-flag.png" className="shrink-0 object-cover rounded shadow-sm ring-1 ring-black/10 dark:ring-white/10" style={{ width: 32, height: 20 }} alt="Selangor" />
                      : <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                        <Pin className="size-3.5 text-primary" />
                        </div>
                    }
                    <p className="text-sm font-semibold text-foreground tracking-tight leading-snug truncate">{routeTitle}</p>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      openPinnedRouteTable(r.id)
                    }}
                    className="inline-flex items-center gap-1 px-0 py-0 text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    <List className="size-3" />View
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Dialog
        open={homeRouteDialogOpen}
        onOpenChange={(open) => {
          setHomeRouteDialogOpen(open)
          if (!open) {
            setHomeRouteDialogQuery("")
            setHomeRouteDialogError(null)
            setHomeRouteDialogView('table')
            setHomeRouteDialogFullscreen(false)
            setHomeRouteMapSettingsOpen(false)
            setHomeRouteMapResizeToken(0)
            setHomeRouteMapRefitToken(0)
          }
        }}
      >
        <DialogContent
          className={`p-0 gap-0 flex flex-col overflow-hidden duration-300 ease-in-out ${
            homeRouteDialogFullscreen
              ? '!fixed !inset-0 !translate-x-0 !translate-y-0 !top-0 !left-0 !w-screen !max-w-none !h-dvh !rounded-none !border-0 !shadow-none'
              : 'transition-[width,height,max-width,border-radius]'
          }`}
          style={homeRouteDialogFullscreen
            ? {}
            : { width: '92vw', maxWidth: '56rem', height: 'calc(5 * 44px + 96px)', borderRadius: '0.75rem' }
          }
        >
          <DialogHeader className="border-b border-border bg-background px-5 py-3">
            <div className="flex items-center gap-3">
              {homeRouteDialogRoute && (() => {
                const routeText = `${homeRouteDialogRoute.name} ${homeRouteDialogRoute.code}`.toLowerCase()
                if (routeText.includes("kl")) {
                  return <img src="/kl-flag.png" className="object-cover shadow-sm ring-1 ring-black/10 dark:ring-white/10 shrink-0" style={{ width: 28, height: 17, borderRadius: 3 }} alt="KL" />
                }
                if (routeText.includes("sel")) {
                  return <img src="/selangor-flag.png" className="object-cover shadow-sm ring-1 ring-black/10 dark:ring-white/10 shrink-0" style={{ width: 28, height: 17, borderRadius: 3 }} alt="Selangor" />
                }
                return (
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-primary/15 ring-1 ring-primary/25">
                    <Truck className="size-4 text-primary" />
                  </div>
                )
              })()}
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-sm font-semibold tracking-tight truncate">
                  {homeRouteDialogRoute
                    ? `Route ${homeRouteDialogRoute.name}`
                    : "Pinned Route"}
                </DialogTitle>
              </div>

              <button
                onClick={() => setHomeRouteMapSettingsOpen(true)}
                title={homeRouteDialogView === 'map' ? 'Map Settings' : 'Table Settings'}
                className="shrink-0 w-[32px] h-[32px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <Cog className="size-[15px]" />
              </button>

              <button
                onClick={() => {
                  setHomeRouteDialogView((prev) => {
                    const next = prev === 'table' ? 'map' : 'table'
                    if (next === 'map') setHomeRouteMapRefitToken((t) => t + 1)
                    return next
                  })
                  setHomeRouteMapResizeToken((t) => t + 1)
                }}
                title={homeRouteDialogView === 'table' ? 'Switch to Map' : 'Switch to Table'}
                className="shrink-0 w-[32px] h-[32px] flex items-center justify-center rounded-lg transition-colors hover:bg-muted/60"
                style={{ color: homeRouteDialogView === 'map' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
              >
                {homeRouteDialogView === 'table' ? <MapPinned className="size-[15px]" /> : <TableProperties className="size-[15px]" />}
              </button>

              <button
                onClick={() => {
                  setHomeRouteDialogFullscreen((prev) => !prev)
                  if (homeRouteDialogView === 'map') setHomeRouteMapResizeToken((t) => t + 1)
                }}
                title={homeRouteDialogFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                className="shrink-0 w-[32px] h-[32px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                {homeRouteDialogFullscreen ? <Shrink className="size-[15px]" /> : <Expand className="size-[15px]" />}
              </button>
            </div>
          </DialogHeader>

          {homeRouteDialogView === 'table' ? (
            <>
              <div className="border-b border-border/70 bg-background/95 px-3 py-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    value={homeRouteDialogQuery}
                    onChange={(event) => setHomeRouteDialogQuery(event.target.value)}
                    placeholder="Search by code, name, delivery..."
                    className="h-8 pl-8 pr-8 text-[11px]"
                  />
                  {homeRouteDialogQuery && (
                    <button
                      type="button"
                      onClick={() => setHomeRouteDialogQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto min-h-0">
                {homeRouteDialogLoading ? (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground">Loading route table...</div>
                ) : homeRouteDialogError ? (
                  <div className="px-4 py-8 text-center text-xs text-destructive">{homeRouteDialogError}</div>
                ) : homeRouteDialogRows.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground">No matching location found.</div>
                ) : (
                  <table className="w-full border-collapse text-[11px] whitespace-nowrap min-w-max text-center">
                    <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
                      <tr>
                        {homeRouteDraftColumns.filter(c => c.visible).map(col => (
                          <th key={col.key} className="h-9 px-3 text-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/70">
                            {col.key === 'no' ? '#' : col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-[9px]">
                      {homeRouteTableRows.map((point, index) => (
                        <tr key={`${point.code}-${index}`} className="border-b border-border/50 odd:bg-muted/10 even:bg-background hover:bg-muted/25 transition-colors">
                          {homeRouteDraftColumns.filter(c => c.visible).map(col => {
                            if (col.key === 'no') return <td key="no" className="h-9 px-3 text-center font-semibold text-primary">{index + 1}</td>
                            if (col.key === 'code') return <td key="code" className="h-9 px-3 text-center font-semibold">{point.code}</td>
                            if (col.key === 'name') return <td key="name" className="h-9 px-3 text-center font-medium">{point.name}</td>
                            if (col.key === 'delivery') return <td key="delivery" className="h-9 px-3 text-center font-medium">{homeDeliveryLabel(point.delivery)}</td>
                            if (col.key === 'km') return (
                              <td key="km" className="h-9 px-3 text-center font-medium">
                                {getHomeRouteKmValue(point, index)}
                              </td>
                            )
                            if (col.key === 'action') return (
                              <td key="action" className="h-9 px-3 text-center">
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center size-7 rounded-lg text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                                  onClick={() => {
                                    setHomeRouteSelectedPoint(point)
                                    setHomeRoutePointModalOpen(true)
                                  }}
                                  title="View location details"
                                >
                                  <Info className="size-3.5" />
                                </button>
                              </td>
                            )
                            return null
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="border-t border-border bg-background/95 px-4 py-2.5 min-h-[52px] flex flex-wrap items-center justify-between gap-2 shrink-0 backdrop-blur-sm">
                <span className="font-medium text-[11px] text-muted-foreground">Location : {homeRouteDialogRows.length}</span>
              </div>
            </>
          ) : (
            <div className="flex-1 min-h-[400px] relative">
              <DeliveryMap
                deliveryPoints={homeRouteDialogPoints}
                scrollZoom={true}
                showPolyline={homeRouteShowPolyline}
                markerStyle={homeRouteMarkerStyle}
                mapStyle={homeRouteMapStyle}
                startPoint={HOME_DEFAULT_MAP_CENTER}
                includeStartInBounds={false}
                refitToken={homeRouteMapRefitToken}
                resizeToken={homeRouteMapResizeToken}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={homeRouteMapSettingsOpen} onOpenChange={setHomeRouteMapSettingsOpen}>
        <DialogContent className="w-[92vw] max-w-sm h-[56vh] max-h-[480px] overflow-hidden flex flex-col gap-0 p-0">
          <div className="px-5 pt-4 pb-3 border-b border-border shrink-0">
            <div className="text-center">
              <DialogTitle className="text-sm font-bold leading-tight">{homeRouteDialogView === 'map' ? 'Map Settings' : 'Table Settings'}</DialogTitle>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-4 space-y-4">
            {homeRouteDialogView === 'map' ? (
              <>
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Map Style</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'google-streets', label: 'Street' },
                      { key: 'google-satellite', label: 'Satellite' },
                      { key: 'osm', label: 'OSM' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`h-8 rounded-md text-[11px] font-medium border transition-colors ${homeRouteMapStyle === item.key ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background hover:bg-muted/50'}`}
                        onClick={() => setHomeRouteMapStyle(item.key as 'google-streets' | 'google-satellite' | 'osm')}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Marker Style</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'pin', label: 'Pin' },
                      { key: 'dot', label: 'Dot' },
                      { key: 'ring', label: 'Ring' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`h-8 rounded-md text-[11px] font-medium border transition-colors ${homeRouteMarkerStyle === item.key ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background hover:bg-muted/50'}`}
                        onClick={() => setHomeRouteMarkerStyle(item.key as 'pin' | 'dot' | 'ring')}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setHomeRouteShowPolyline((prev) => !prev)}
                  className={`h-8 px-3 rounded-md text-[11px] font-medium border transition-colors ${homeRouteShowPolyline ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background hover:bg-muted/50 text-muted-foreground'}`}
                >
                  Polyline: {homeRouteShowPolyline ? 'On' : 'Off'}
                </button>
              </>
            ) : (
              <>
                {/* Tab bar */}
                <div className="grid grid-cols-2 gap-2">
                  {(['column', 'sorting'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                        homeRouteTableSettingsTab === tab
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background hover:bg-muted/50 text-muted-foreground'
                      }`}
                      onClick={() => setHomeRouteTableSettingsTab(tab)}
                    >
                      {tab === 'column' ? 'Column' : 'Sorting'}
                    </button>
                  ))}
                </div>

                {/* Column tab */}
                {homeRouteTableSettingsTab === 'column' && (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-border bg-background p-2.5">
                      <p className="text-[11px] text-muted-foreground">Toggle visibility and reorder columns.</p>
                    </div>
                    <div className="space-y-2">
                      {homeRouteDraftColumns.map((col, idx) => (
                        <div key={col.key} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-background">
                          <input
                            type="checkbox"
                            checked={col.visible}
                            onChange={() =>
                              setHomeRouteDraftColumns(prev =>
                                prev.map((c, i) => i === idx ? { ...c, visible: !c.visible } : c)
                              )
                            }
                            className="w-4 h-4 cursor-pointer accent-primary"
                          />
                          <span className="flex-1 text-xs font-medium">{col.label}</span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              className="inline-flex items-center justify-center size-8 rounded-md hover:bg-muted/60 transition-colors disabled:opacity-30"
                              disabled={idx === 0}
                              onClick={() => moveHomeTableColumn(idx, -1)}
                            >
                              <ArrowUp className="size-4" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center size-8 rounded-md hover:bg-muted/60 transition-colors disabled:opacity-30"
                              disabled={idx === homeRouteDraftColumns.length - 1}
                              onClick={() => moveHomeTableColumn(idx, 1)}
                            >
                              <ArrowDown className="size-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sorting tab */}
                {homeRouteTableSettingsTab === 'sorting' && (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-border bg-background p-2.5 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">KM Calculate By</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {([
                          { key: 'hq' as const, label: 'HQ' },
                          { key: 'previous' as const, label: 'Previous Row' },
                        ]).map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setHomeRouteKmCalculateBy(item.key)}
                            className={`h-8 rounded-md border text-[11px] font-medium transition-colors ${
                              homeRouteKmCalculateBy === item.key
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-background hover:bg-muted/50 text-foreground'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-background p-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sort by Column</p>
                    </div>
                    <div className="rounded-xl border border-border overflow-hidden bg-background">
                      {([
                        { col: 'code' as const, label: 'Code', asc: 'code-asc' as HomeTableSort, desc: 'code-desc' as HomeTableSort },
                        { col: 'name' as const, label: 'Name', asc: 'name-asc' as HomeTableSort, desc: 'name-desc' as HomeTableSort },
                        { col: 'delivery' as const, label: 'Delivery', asc: 'delivery-asc' as HomeTableSort, desc: 'delivery-desc' as HomeTableSort },
                      ]).map(({ col, label, asc, desc }, i, arr) => {
                        const isAsc = homeRouteTableSort === asc
                        const isDesc = homeRouteTableSort === desc
                        const isActive = isAsc || isDesc
                        return (
                          <button
                            key={col}
                            type="button"
                            onClick={() => {
                              setHomeRouteSavedSortId(null)
                              if (isAsc) setHomeRouteTableSort(desc)
                              else if (isDesc) setHomeRouteTableSort(asc)
                              else setHomeRouteTableSort(asc)
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs transition-colors${
                              i < arr.length - 1 ? ' border-b border-border/50' : ''
                            }${
                              isActive
                                ? ' text-primary font-semibold bg-primary/5'
                                : ' text-foreground hover:bg-muted/60'
                            }`}
                          >
                            <span>{label}</span>
                            {isAsc
                              ? <ChevronUp className="w-4 h-4" />
                              : isDesc
                              ? <ChevronDown className="w-4 h-4" />
                              : <ChevronsUpDown className="w-4 h-4 text-muted-foreground/40" />}
                          </button>
                        )
                      })}
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="rounded-xl border border-border bg-background p-2.5 space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Sort List</p>
                        <p className="text-xs text-muted-foreground">Saved custom row orders from Route List for this route.</p>
                      </div>
                      {homeRouteSavedRowOrders.length === 0 ? (
                        <div className="text-center py-5 text-muted-foreground text-xs bg-muted/20 rounded-xl border border-border/50">
                          <p>No saved sort orders yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {homeRouteSavedRowOrders.map((saved) => {
                            const isActive = homeRouteSavedSortId === saved.id
                            return (
                              <button
                                key={saved.id}
                                type="button"
                                onClick={() => {
                                  setHomeRouteTableSort('code-asc')
                                  setHomeRouteSavedSortId(saved.id)
                                }}
                                className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-xs transition-colors ${
                                  isActive
                                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                                    : 'border-border bg-background hover:bg-muted/50 text-foreground'
                                }`}
                              >
                                {saved.label}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {(homeRouteTableSort !== 'code-asc' || homeRouteSavedSortId !== null) && (
                      <button
                        type="button"
                        onClick={() => {
                          setHomeRouteTableSort('code-asc')
                          setHomeRouteSavedSortId(null)
                        }}
                        className="w-full h-8 rounded-lg border border-border bg-background text-[11px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                      >
                        Reset to Default
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {homeRouteSelectedPoint && (
        <RowInfoModal
          open={homeRoutePointModalOpen}
          onOpenChange={setHomeRoutePointModalOpen}
          point={homeRouteSelectedPoint}
          isEditMode={false}
        />
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

        {quickAccess.length === 0 && (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-4 text-center">
            <p className="text-sm font-semibold text-foreground">Quick Access is empty</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {isEditMode
                ? "Tap Add Card to place your navigation shortcuts on Home."
                : "Turn on Edit Mode to add navigation shortcuts here for faster access."}
            </p>
          </div>
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
            <div
              className="grid items-end border-b border-border bg-card px-4 py-3 gap-2"
              style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}
            >
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground text-center">Day</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground text-center">In</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground text-center">Front</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground text-center">Out</span>
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
                      <div
                        className={`grid items-center px-4 py-3 gap-2${i < DAYS.length - 1 ? ' border-b border-border/60' : ''}`}
                        style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr' }}
                      >
                        <div className="min-w-0 text-center">
                          <p className={`text-[11px] font-semibold truncate ${isToday ? "text-primary" : "text-foreground"}`}>{day.en}</p>
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
      {showToolEquipment && (
      <div className={archiveState.toolEquipment ? "opacity-60" : undefined}>
        <div className="mb-3 flex items-center justify-between gap-2 px-0.5">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Tool &amp; Equipment</p>
          {isEditMode && (
            <button
              type="button"
              onClick={() => toggleArchive("toolEquipment")}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              title={archiveState.toolEquipment ? "Unarchive Tool & Equipment" : "Archive Tool & Equipment"}
            >
              {archiveState.toolEquipment ? <ArchiveRestore className="size-3" /> : <Archive className="size-3" />}
              {archiveState.toolEquipment ? "Unarchive" : "Archive"}
            </button>
          )}
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
      )}
    </div>
  )
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState("home")
  const [isTransitioning, setIsTransitioning] = useState(false)
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
      case "custom":
        return <CustomRoutePage />
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
        return <Rooster />
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
      case "custom":
        return { parent: { label: "Vending Machine", icon: Package }, current: "Custom" }
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

        </header>
        <Suspense fallback={null}>
          <div className={`flex flex-col flex-1 min-h-0 ${(currentPage === "deliveries" || currentPage === "route-list") ? "overflow-hidden" : "overflow-y-auto"} ${isTransitioning ? "page-fade-out" : "page-fade-in"}`}>
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
        <PWAUpdatePrompt />
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
