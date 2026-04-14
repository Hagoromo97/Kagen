import { useEffect, useMemo, useState } from "react"
import { Package, Plus, MapPin, X, List, Cog, MapPinned, TableProperties, Expand, Shrink } from "lucide-react"
import bgDark from "../../icon/darkm.jpeg"
import bgLight from "../../icon/lightm.jpeg"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { DeliveryMap } from "@/components/DeliveryMap"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type ShiftType = "AM" | "PM"

interface RoutePoint {
  code: string
  name: string
  delivery: string
  latitude: number
  longitude: number
}

interface ApiRoute {
  id: string
  name: string
  code: string
  shift: string
  deliveryPoints: RoutePoint[]
}

interface SelectedLocation {
  code: string
  name: string
  delivery: string
  sourceRouteName: string
  latitude: number
  longitude: number
}

interface ExistingLocationOption extends SelectedLocation {
  latitude: number
  longitude: number
}

interface CustomRouteCard {
  id: string
  name: string
  code: string
  shift: ShiftType
  locations: SelectedLocation[]
}

const LS_CUSTOM_ROUTE_CARDS = "fcalendar_custom_route_cards"
const LS_MAP_STYLE = "fcalendar_map_style"
const CARD_COLORS = ["#3B82F6", "#F97316", "#22C55E", "#A855F7", "#EC4899", "#EAB308", "#14B8A6"]
const PREVIEW_ROWS = 4

type DialogView = "table" | "map"
type MarkerStyle = "pin" | "dot" | "ring"
type MapStyle = "google-streets" | "google-satellite" | "osm"

const getMapStyle = (): MapStyle => {
  try {
    const value = localStorage.getItem(LS_MAP_STYLE)
    if (value === "google-streets" || value === "google-satellite" || value === "osm") return value
  } catch {
    // ignore storage read errors
  }
  return "google-streets"
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function loadCards(): CustomRouteCard[] {
  try {
    const raw = localStorage.getItem(LS_CUSTOM_ROUTE_CARDS)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((item: unknown) => {
        const itemRecord = toRecord(item)
        if (!itemRecord) return null
        const name = toTrimmedString(itemRecord.name)
        const code = toTrimmedString(itemRecord.code)
        const shift = itemRecord.shift === "PM" ? "PM" : "AM"

        const rawLocations = Array.isArray(itemRecord.locations) ? itemRecord.locations : []
        const locations = rawLocations
              .map((loc: unknown) => {
                const locRecord = toRecord(loc)
                if (!locRecord) return null
                const locCode = toTrimmedString(locRecord.code)
                const locName = toTrimmedString(locRecord.name)
                const delivery = toTrimmedString(locRecord.delivery)
                const sourceRouteName = toTrimmedString(locRecord.sourceRouteName)
                if (!locCode || !locName) return null
                return {
                  code: locCode,
                  name: locName,
                  delivery: delivery || "Daily",
                  sourceRouteName: sourceRouteName || "Unknown",
                  latitude: Number(locRecord.latitude) || 0,
                  longitude: Number(locRecord.longitude) || 0,
                } as SelectedLocation
              })
              .filter((loc: SelectedLocation | null): loc is SelectedLocation => Boolean(loc))

        if (!name || !code) return null
        const parsedId = toTrimmedString(itemRecord.id)
        const id = parsedId || `${Date.now()}-${Math.random()}`
        return { id, name, code, shift, locations } as CustomRouteCard
      })
      .filter((item): item is CustomRouteCard => Boolean(item))
  } catch {
    return []
  }
}

export function CustomRoutePage() {
  const [cards, setCards] = useState<CustomRouteCard[]>([])
  const [hasHydratedCards, setHasHydratedCards] = useState(false)
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"))
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [draftName, setDraftName] = useState("")
  const [draftCode, setDraftCode] = useState("")
  const [draftShift, setDraftShift] = useState<ShiftType>("AM")
  const [allLocations, setAllLocations] = useState<ExistingLocationOption[]>([])
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [targetCardId, setTargetCardId] = useState<string | null>(null)
  const [selectedLocationCode, setSelectedLocationCode] = useState("")
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [detailFullscreen, setDetailFullscreen] = useState(false)
  const [currentDetailCardId, setCurrentDetailCardId] = useState<string | null>(null)
  const [dialogView, setDialogView] = useState<DialogView>("table")
  const [mapSettingsOpen, setMapSettingsOpen] = useState(false)
  const [tableSettingsOpen, setTableSettingsOpen] = useState(false)
  const [mapStyle, setMapStyle] = useState<MapStyle>(getMapStyle)
  const [markerStyle, setMarkerStyle] = useState<MarkerStyle>("pin")
  const [showPolyline, setShowPolyline] = useState(false)
  const [mapRefitToken, setMapRefitToken] = useState(0)
  const [mapResizeToken, setMapResizeToken] = useState(0)
  const [columnVisibility, setColumnVisibility] = useState({
    no: true,
    code: true,
    name: true,
    delivery: true,
    source: true,
    coordinate: false,
  })

  useEffect(() => {
    setCards(loadCards())
    setHasHydratedCards(true)
  }, [])

  useEffect(() => {
    if (!hasHydratedCards) return
    localStorage.setItem(LS_CUSTOM_ROUTE_CARDS, JSON.stringify(cards))
  }, [cards, hasHydratedCards])

  useEffect(() => {
    try {
      localStorage.setItem(LS_MAP_STYLE, mapStyle)
    } catch {
      // ignore storage write errors
    }
  }, [mapStyle])

  useEffect(() => {
    const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains("dark")))
    obs.observe(document.documentElement, { attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const fetchLocations = async () => {
      setLoadingLocations(true)
      try {
        const res = await fetch("/api/routes")
        if (!res.ok) throw new Error("Failed to load routes")
        const json = await res.json()
        const routes: ApiRoute[] = Array.isArray(json?.data) ? json.data : []

        const byCode = new Map<string, ExistingLocationOption>()
        routes.forEach((route) => {
          ;(route.deliveryPoints ?? []).forEach((point) => {
            if (!point || typeof point.code !== "string" || typeof point.name !== "string") return
            const code = point.code.trim()
            const name = point.name.trim()
            if (!code || !name || byCode.has(code)) return
            byCode.set(code, {
              code,
              name,
              delivery: point.delivery || "Daily",
              latitude: Number(point.latitude) || 0,
              longitude: Number(point.longitude) || 0,
              sourceRouteName: route.name || "Unknown",
            })
          })
        })

        const options = Array.from(byCode.values()).sort((a, b) =>
          a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" })
        )
        setAllLocations(options)
      } catch {
        setAllLocations([])
      } finally {
        setLoadingLocations(false)
      }
    }

    fetchLocations()
  }, [])

  const persistCards = (nextCards: CustomRouteCard[]) => {
    setCards(nextCards)
  }

  const createCardRoute = () => {
    const name = draftName.trim()
    const code = draftCode.trim()
    if (!name || !code) return

    const newCard: CustomRouteCard = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      name,
      code,
      shift: draftShift,
      locations: [],
    }

    persistCards([...cards, newCard])
    setDraftName("")
    setDraftCode("")
    setDraftShift("AM")
    setAddOpen(false)
  }

  const openLocationDialog = (cardId: string) => {
    setTargetCardId(cardId)
    setSelectedLocationCode("")
    setLocationDialogOpen(true)
  }

  const targetCard = useMemo(
    () => cards.find((card) => card.id === targetCardId) ?? null,
    [cards, targetCardId]
  )

  const locationOptionsForTarget = useMemo(() => {
    if (!targetCard) return []
    const usedCodes = new Set(targetCard.locations.map((loc) => loc.code))
    return allLocations.filter((loc) => !usedCodes.has(loc.code))
  }, [allLocations, targetCard])

  const addLocationToCard = () => {
    if (!targetCardId || !selectedLocationCode) return
    const selected = allLocations.find((loc) => loc.code === selectedLocationCode)
    if (!selected) return

    const nextCards = cards.map((card) => {
      if (card.id !== targetCardId) return card
      if (card.locations.some((loc) => loc.code === selected.code)) return card
      return {
        ...card,
        locations: [
          ...card.locations,
          {
            code: selected.code,
            name: selected.name,
            delivery: selected.delivery,
            sourceRouteName: selected.sourceRouteName,
            latitude: selected.latitude,
            longitude: selected.longitude,
          },
        ],
      }
    })

    persistCards(nextCards)
    setSelectedLocationCode("")
    setLocationDialogOpen(false)
    setTargetCardId(null)
  }

  const removeLocationFromCard = (cardId: string, locationCode: string) => {
    const nextCards = cards.map((card) => {
      if (card.id !== cardId) return card
      return {
        ...card,
        locations: card.locations.filter((loc) => loc.code !== locationCode),
      }
    })

    persistCards(nextCards)
  }

  const openDetailDialog = (cardId: string) => {
    setCurrentDetailCardId(cardId)
    setDialogView("table")
    setDetailFullscreen(false)
    setDetailDialogOpen(true)
    setMapRefitToken((value) => value + 1)
    setMapResizeToken((value) => value + 1)
  }

  const detailCard = useMemo(
    () => cards.find((card) => card.id === currentDetailCardId) ?? null,
    [cards, currentDetailCardId]
  )

  const detailCardColor = useMemo(() => {
    if (!detailCard) return CARD_COLORS[0]
    const idx = cards.findIndex((card) => card.id === detailCard.id)
    return CARD_COLORS[(idx < 0 ? 0 : idx) % CARD_COLORS.length]
  }, [cards, detailCard])

  const detailMapPoints = useMemo(() => {
    if (!detailCard) return []
    return detailCard.locations.map((location) => ({
      code: location.code,
      name: location.name,
      delivery: location.delivery,
      latitude: location.latitude,
      longitude: location.longitude,
      descriptions: [],
      markerColor: detailCardColor,
      routeLabel: `Route ${detailCard.name}`,
      routeId: detailCard.id,
    }))
  }, [detailCard, detailCardColor])

  const visibleColumns = useMemo(() => {
    const cols = [
      { key: "no", label: "No", visible: columnVisibility.no },
      { key: "code", label: "Code", visible: columnVisibility.code },
      { key: "name", label: "Name", visible: columnVisibility.name },
      { key: "delivery", label: "Delivery", visible: columnVisibility.delivery },
      { key: "source", label: "Source Route", visible: columnVisibility.source },
      { key: "coordinate", label: "Coordinate", visible: columnVisibility.coordinate },
    ]
    const filtered = cols.filter((column) => column.visible)
    return filtered.length > 0 ? filtered : [{ key: "name", label: "Name", visible: true }]
  }, [columnVisibility])

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4 p-4 md:p-6 overflow-y-auto">
      <div className="shrink-0">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-3">
            <Package className="size-4 shrink-0 text-primary" />
            <h2 className="text-base font-semibold tracking-tight text-foreground">Custom</h2>
          </div>
          <Button size="sm" className="h-8 px-3 text-[11px]" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5 mr-1" />
            Add Card Route
          </Button>
        </div>
        <p className="ml-7 text-sm text-muted-foreground leading-relaxed">Start from empty page and create your own route cards.</p>
        <Separator className="mt-4" />
      </div>

      {cards.length === 0 ? (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="w-full rounded-xl border-2 border-dashed border-border bg-card/40 p-8 text-left hover:border-primary/60 hover:bg-primary/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Plus className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Add Card Route</p>
              <p className="text-xs text-muted-foreground">No card yet. Click to create your first card route.</p>
            </div>
          </div>
        </button>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
            gap: "clamp(1rem, 2vw, 1.75rem)",
            alignItems: "start",
          }}
        >
          {cards.map((card, cardIndex) => {
            const markerColor = CARD_COLORS[cardIndex % CARD_COLORS.length]
            const isCardHovered = hoveredCardId === card.id
            const cardBorderColor = isCardHovered
              ? `${markerColor}${isDark ? "a8" : "94"}`
              : `${markerColor}${isDark ? "88" : "74"}`
            const cardBorderWidth = isCardHovered ? 1.75 : 1.5
            const cardShadow = isCardHovered
              ? `0 7px 20px ${markerColor}${isDark ? "20" : "1b"}, 0 0 0 1px ${markerColor}${isDark ? "42" : "36"}`
              : `0 2px 10px ${markerColor}12, 0 0 0 1px ${markerColor}${isDark ? "26" : "1a"}`
            const grouped = card.locations.reduce<Record<string, number>>((acc, loc) => {
              acc[loc.delivery] = (acc[loc.delivery] ?? 0) + 1
              return acc
            }, {})

            return (
              <div key={card.id} style={{ display: "flex", justifyContent: "center", minWidth: 0 }}>
                <article
                  onMouseEnter={() => setHoveredCardId(card.id)}
                  onMouseLeave={() => setHoveredCardId((prev) => (prev === card.id ? null : prev))}
                  style={{
                    width: "100%",
                    maxWidth: 340,
                    height: 440,
                    borderRadius: 22,
                    overflow: "hidden",
                    position: "relative",
                    background: "hsl(var(--card))",
                    border: `${cardBorderWidth}px solid ${cardBorderColor}`,
                    boxShadow: cardShadow,
                    transition: "border-color 180ms ease, box-shadow 180ms ease, border-width 180ms ease",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage: `url(${isDark ? bgDark : bgLight})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      opacity: 0.18,
                      zIndex: 0,
                      pointerEvents: "none",
                    }}
                  />

                  <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
                    <div style={{ position: "relative", background: "transparent", overflow: "hidden", flexShrink: 0, padding: "14px 14px 16px" }}>
                      <h3
                        style={{
                          margin: 0,
                          marginTop: "0.5rem",
                          fontSize: "1.03rem",
                          fontWeight: 800,
                          color: "hsl(var(--foreground))",
                          lineHeight: 1.25,
                          textAlign: "center",
                          wordBreak: "break-word",
                        }}
                      >
                        Route {card.name}
                      </h3>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: "0.77rem", fontWeight: 700, color: "hsl(var(--muted-foreground))" }}>{card.code}</span>
                        <span style={{ fontSize: "0.77rem", fontWeight: 700, color: "hsl(var(--muted-foreground))" }}>.</span>
                        <span style={{ fontSize: "0.77rem", fontWeight: 800, color: card.shift === "AM" ? "#16a34a" : "#c2410c" }}>{card.shift}</span>
                      </div>
                      <div style={{ height: 1, marginTop: "0.44rem", background: `linear-gradient(90deg, transparent, ${markerColor}55, transparent)` }} />

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1.1rem" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            background: `${markerColor}18`,
                            border: `1px solid ${markerColor}55`,
                            borderRadius: 10,
                            padding: "0.33rem 0.55rem",
                            fontSize: "0.67rem",
                            fontWeight: 700,
                            color: markerColor,
                          }}
                        >
                          <MapPin style={{ width: 12, height: 12 }} /> Custom
                        </span>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                          <span style={{ fontSize: "1rem", fontWeight: 900, color: isDark ? "#c0c7d0" : markerColor, lineHeight: 1 }}>{card.locations.length}</span>
                          <span style={{ fontSize: "0.64rem", fontWeight: 700, color: isDark ? "#c0c7d0" : markerColor, opacity: isDark ? 0.86 : 0.65, textTransform: "uppercase", letterSpacing: "0.08em" }}>stops</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ flex: 1, padding: "0.45rem 14px 0", display: "flex", flexDirection: "column", gap: "0.45rem", overflow: "hidden" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        {card.locations.slice(0, PREVIEW_ROWS).map((location, i) => (
                          <div
                            key={`${card.id}-${location.code}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              background: "hsl(var(--muted)/0.5)",
                              borderRadius: 10,
                              padding: "0.3rem 0.45rem",
                              border: "1px solid hsl(var(--border)/0.6)",
                            }}
                          >
                            <span
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 6,
                                background: `linear-gradient(135deg, ${markerColor}dd, ${markerColor}88)`,
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.61rem",
                                fontWeight: 800,
                                flexShrink: 0,
                                boxShadow: `0 1px 3px ${markerColor}22`,
                              }}
                            >
                              {i + 1}
                            </span>
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                flex: 1,
                                color: "hsl(var(--foreground))",
                                fontWeight: 600,
                                fontSize: "0.73rem",
                                minWidth: 0,
                              }}
                              title={`${location.code} - ${location.name}`}
                            >
                              {location.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeLocationFromCard(card.id, location.code)}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "hsl(var(--muted-foreground))",
                                padding: 1,
                                cursor: "pointer",
                                borderRadius: 6,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              aria-label={`Remove ${location.code}`}
                              title="Remove"
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        ))}

                        {card.locations.length === 0 && (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "1.5rem 0", color: "hsl(var(--muted-foreground))" }}>
                            <MapPin style={{ width: 13, height: 13, opacity: 0.4 }} />
                            <span style={{ fontSize: "0.75rem", fontStyle: "italic" }}>No delivery points yet</span>
                          </div>
                        )}
                      </div>

                      {card.locations.length > PREVIEW_ROWS && (
                        <>
                          <button
                            type="button"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.4rem",
                              fontSize: "0.69rem",
                              fontWeight: 700,
                              color: isDark ? "#a0aab4" : markerColor,
                              background: isDark ? "rgba(160,170,180,0.08)" : `${markerColor}12`,
                              border: isDark ? "1px dashed rgba(160,170,180,0.3)" : `1px dashed ${markerColor}50`,
                              borderRadius: 8,
                              padding: "0.3rem 0.6rem",
                              width: "100%",
                              cursor: "default",
                            }}
                          >
                            +{card.locations.length - PREVIEW_ROWS} more locations
                          </button>
                          <div style={{ height: 1, background: isDark ? "rgba(160,170,180,0.15)" : "hsl(var(--border)/0.5)", margin: "0" }} />
                        </>
                      )}

                      {Object.keys(grouped).length > 0 && (
                        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", justifyContent: "center", paddingBottom: "0.2rem" }}>
                          {Object.entries(grouped).map(([deliveryType, count]) => (
                            <span
                              key={`${card.id}-${deliveryType}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                fontSize: "0.64rem",
                                fontWeight: 700,
                                color: isDark ? "#d1d5db" : "#525866",
                                background: isDark ? "linear-gradient(135deg, #434b59, #2f3744)" : "linear-gradient(135deg, #eef1f4, #d3d9e1)",
                                padding: "2px 9px",
                                borderRadius: "6px",
                                border: `1px solid ${isDark ? "#626d7d" : "#b7c0cc"}`,
                                letterSpacing: "0.03em",
                              }}
                            >
                              {deliveryType}&nbsp;<span style={{ opacity: isDark ? 0.45 : 0.55, fontWeight: 500 }}>&bull;</span>&nbsp;<span style={{ fontWeight: 700 }}>{count}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ padding: "0.45rem 14px 0.85rem", display: "flex", gap: "0.45rem", borderTop: `1px solid ${markerColor}55` }}>
                      <button
                        type="button"
                        onClick={() => openDetailDialog(card.id)}
                        style={{
                          flex: 1,
                          borderRadius: 11,
                          fontSize: "0.74rem",
                          fontWeight: 800,
                          padding: "0.5rem 0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.38rem",
                          background: "hsl(var(--muted))",
                          color: "hsl(var(--foreground))",
                          border: "1px solid hsl(var(--border))",
                          cursor: "pointer",
                        }}
                      >
                        <List style={{ width: 12, height: 12 }} /> View
                      </button>
                      <button
                        type="button"
                        onClick={() => openLocationDialog(card.id)}
                        style={{
                          flex: 1,
                          borderRadius: 11,
                          fontSize: "0.74rem",
                          fontWeight: 800,
                          padding: "0.5rem 0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.38rem",
                          background: `linear-gradient(135deg, ${markerColor} 0%, ${markerColor}cc 100%)`,
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                          boxShadow: `0 2px 7px ${markerColor}30`,
                          letterSpacing: "0.02em",
                        }}
                      >
                        <MapPin style={{ width: 12, height: 12 }} /> Add Location
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Card Route</DialogTitle>
            <DialogDescription>Add your own route card details.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Route Name</label>
              <Input
                placeholder="Enter route name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Route Code</label>
              <Input
                placeholder="Enter route code"
                value={draftCode}
                onChange={(e) => setDraftCode(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Shift</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-[11px] shadow-xs outline-none"
                value={draftShift}
                onChange={(e) => setDraftShift(e.target.value === "PM" ? "PM" : "AM")}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={createCardRoute} disabled={!draftName.trim() || !draftCode.trim()}>
              Create Card Route
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={locationDialogOpen}
        onOpenChange={(open) => {
          setLocationDialogOpen(open)
          if (!open) {
            setTargetCardId(null)
            setSelectedLocationCode("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Existing Location</DialogTitle>
            <DialogDescription>
              {targetCard
                ? `Choose existing location for ${targetCard.name}`
                : "Choose existing location"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-sm font-medium">Existing Location</label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-[11px] shadow-xs outline-none"
              value={selectedLocationCode}
              onChange={(e) => setSelectedLocationCode(e.target.value)}
              disabled={loadingLocations || locationOptionsForTarget.length === 0}
            >
              <option value="">
                {loadingLocations
                  ? "Loading locations..."
                  : locationOptionsForTarget.length === 0
                    ? "No available location"
                    : "Choose location..."}
              </option>
              {locationOptionsForTarget.map((location) => (
                <option key={location.code} value={location.code}>
                  {location.code} - {location.name} ({location.sourceRouteName})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLocationDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={addLocationToCard}
              disabled={!selectedLocationCode || loadingLocations || locationOptionsForTarget.length === 0}
            >
              Add Location
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailDialogOpen}
        onOpenChange={(open) => {
          setDetailDialogOpen(open)
          if (!open) {
            setCurrentDetailCardId(null)
            setDetailFullscreen(false)
            setDialogView("table")
            setMapResizeToken(0)
            setMapRefitToken(0)
          }
        }}
      >
        <DialogContent
          className={`p-0 gap-0 flex flex-col overflow-hidden duration-300 ease-in-out ${
            detailFullscreen
              ? "!fixed !inset-0 !translate-x-0 !translate-y-0 !top-0 !left-0 !w-screen !max-w-none !h-dvh !rounded-none !border-0 !shadow-none"
              : "transition-[width,height,max-width,border-radius]"
          }`}
          style={detailFullscreen ? {} : { width: "92vw", maxWidth: "56rem", height: "78vh", borderRadius: "0.75rem" }}
        >
          {detailCard ? (
            <>
              <div className="shrink-0 border-b border-border bg-background">
                <div className="px-5 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${detailCardColor}25`, boxShadow: `0 0 0 1.5px ${detailCardColor}50` }}>
                    <Package className="size-4" style={{ color: detailCardColor }} />
                  </div>
                  <h1 className="flex-1 min-w-0 text-base font-bold leading-tight truncate">Route {detailCard.name}</h1>
                  <button
                    onClick={() => {
                      if (dialogView === "map") {
                        setMapSettingsOpen(true)
                      } else {
                        setTableSettingsOpen(true)
                      }
                    }}
                    title={dialogView === "map" ? "Map Settings" : "Table Settings"}
                    className="shrink-0 w-[32px] h-[32px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <Cog className="size-[15px]" />
                  </button>
                  <button
                    onClick={() => {
                      setDialogView((prev) => {
                        const next = prev === "table" ? "map" : "table"
                        if (next === "map") setMapRefitToken((token) => token + 1)
                        return next
                      })
                      setMapResizeToken((token) => token + 1)
                    }}
                    title={dialogView === "table" ? "Switch to Map" : "Switch to Table"}
                    className="shrink-0 w-[32px] h-[32px] flex items-center justify-center rounded-lg transition-colors hover:bg-muted/60"
                    style={{ color: dialogView === "map" ? detailCardColor : "hsl(var(--muted-foreground))" }}
                  >
                    {dialogView === "table" ? <MapPinned className="size-[15px]" /> : <TableProperties className="size-[15px]" />}
                  </button>
                  <button
                    onClick={() => {
                      setDetailFullscreen((value) => !value)
                      if (dialogView === "map") setMapResizeToken((token) => token + 1)
                    }}
                    title={detailFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    className="shrink-0 w-[32px] h-[32px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    {detailFullscreen ? <Shrink className="size-[15px]" /> : <Expand className="size-[15px]" />}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {dialogView === "map" ? (
                  <div className="h-full min-h-[420px] relative">
                    <DeliveryMap
                      deliveryPoints={detailMapPoints}
                      scrollZoom={true}
                      showPolyline={showPolyline}
                      markerStyle={markerStyle}
                      mapStyle={mapStyle}
                      includeStartInBounds={false}
                      refitToken={mapRefitToken}
                      resizeToken={mapResizeToken}
                    />
                  </div>
                ) : (
                  <div className="h-full overflow-auto">
                    <table className="border-collapse text-[11px] whitespace-nowrap min-w-max w-full text-center">
                      <thead className="sticky top-0 z-10 backdrop-blur-sm" style={{ background: "hsl(var(--background)/0.92)" }}>
                        <tr>
                          {visibleColumns.map((column) => (
                            <th key={column.key} className="px-4 h-10 text-center text-[9px] font-bold uppercase tracking-wider bg-background/95 border-b border-border/70" style={{ color: "hsl(var(--foreground)/0.72)" }}>
                              {column.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {detailCard.locations.map((location, index) => (
                          <tr key={`${detailCard.id}-${location.code}`} className={index % 2 === 0 ? "border-b border-border/50 bg-background" : "border-b border-border/50 bg-muted/20"}>
                            {visibleColumns.map((column) => {
                              if (column.key === "no") {
                                return (
                                  <td key={`${location.code}-no`} className="px-4 h-10 text-center">
                                    <span className="text-[10px] font-semibold tabular-nums" style={{ color: detailCardColor }}>{index + 1}</span>
                                  </td>
                                )
                              }
                              if (column.key === "code") {
                                return <td key={`${location.code}-code`} className="px-4 h-10 text-center text-[10px] font-semibold">{location.code}</td>
                              }
                              if (column.key === "name") {
                                return <td key={`${location.code}-name`} className="px-4 h-10 text-center text-[10px] font-semibold">{location.name}</td>
                              }
                              if (column.key === "delivery") {
                                return <td key={`${location.code}-delivery`} className="px-4 h-10 text-center text-[10px] font-semibold">{location.delivery}</td>
                              }
                              if (column.key === "source") {
                                return <td key={`${location.code}-source`} className="px-4 h-10 text-center text-[10px]">{location.sourceRouteName}</td>
                              }
                              return (
                                <td key={`${location.code}-coordinate`} className="px-4 h-10 text-center text-[10px] font-mono">
                                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">No card selected</div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={tableSettingsOpen} onOpenChange={setTableSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Table Settings</DialogTitle>
            <DialogDescription>Choose which columns are visible in custom route table.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-1">
            {[
              { key: "no", label: "No" },
              { key: "code", label: "Code" },
              { key: "name", label: "Name" },
              { key: "delivery", label: "Delivery" },
              { key: "source", label: "Source Route" },
              { key: "coordinate", label: "Coordinate" },
            ].map((item) => (
              <label key={item.key} className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm">
                <span>{item.label}</span>
                <input
                  type="checkbox"
                  checked={columnVisibility[item.key as keyof typeof columnVisibility]}
                  onChange={(event) => {
                    const nextValue = event.target.checked
                    setColumnVisibility((prev) => ({
                      ...prev,
                      [item.key]: nextValue,
                    }))
                  }}
                  className="h-4 w-4 accent-primary"
                />
              </label>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setTableSettingsOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={mapSettingsOpen} onOpenChange={setMapSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Map Settings</DialogTitle>
            <DialogDescription>Customize map style and marker display for custom route.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <label className="text-sm font-medium">Map Style</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-[11px] shadow-xs outline-none"
                value={mapStyle}
                onChange={(event) => setMapStyle(event.target.value as MapStyle)}
              >
                <option value="google-streets">Google Streets</option>
                <option value="google-satellite">Google Satellite</option>
                <option value="osm">OSM</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Marker Style</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-[11px] shadow-xs outline-none"
                value={markerStyle}
                onChange={(event) => setMarkerStyle(event.target.value as MarkerStyle)}
              >
                <option value="pin">Pin</option>
                <option value="dot">Dot</option>
                <option value="ring">Ring</option>
              </select>
            </div>

            <label className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm">
              <span>Show Polyline</span>
              <input
                type="checkbox"
                checked={showPolyline}
                onChange={(event) => setShowPolyline(event.target.checked)}
                className="h-4 w-4 accent-primary"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMapSettingsOpen(false)}>Close</Button>
            <Button
              onClick={() => {
                setMapRefitToken((value) => value + 1)
                setMapResizeToken((value) => value + 1)
                setMapSettingsOpen(false)
              }}
            >
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
