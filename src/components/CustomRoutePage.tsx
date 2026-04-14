import { useEffect, useMemo, useState } from "react"
import { Package, Plus, MapPin, X } from "lucide-react"
import bgDark from "../../icon/darkm.jpeg"
import bgLight from "../../icon/lightm.jpeg"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
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
const CARD_COLORS = ["#3B82F6", "#F97316", "#22C55E", "#A855F7", "#EC4899", "#EAB308", "#14B8A6"]
const PREVIEW_ROWS = 4

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
  const [addOpen, setAddOpen] = useState(false)
  const [draftName, setDraftName] = useState("")
  const [draftCode, setDraftCode] = useState("")
  const [draftShift, setDraftShift] = useState<ShiftType>("AM")
  const [allLocations, setAllLocations] = useState<ExistingLocationOption[]>([])
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [targetCardId, setTargetCardId] = useState<string | null>(null)
  const [selectedLocationCode, setSelectedLocationCode] = useState("")
  const [loadingLocations, setLoadingLocations] = useState(false)

  useEffect(() => {
    setCards(loadCards())
    setHasHydratedCards(true)
  }, [])

  useEffect(() => {
    if (!hasHydratedCards) return
    localStorage.setItem(LS_CUSTOM_ROUTE_CARDS, JSON.stringify(cards))
  }, [cards, hasHydratedCards])

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map((card, cardIndex) => {
            const markerColor = CARD_COLORS[cardIndex % CARD_COLORS.length]
            const grouped = card.locations.reduce<Record<string, number>>((acc, loc) => {
              acc[loc.delivery] = (acc[loc.delivery] ?? 0) + 1
              return acc
            }, {})

            return (
              <div key={card.id} style={{ display: "flex", justifyContent: "center", minWidth: 0 }}>
                <article
                  style={{
                    width: "100%",
                    maxWidth: 340,
                    minHeight: 440,
                    borderRadius: 22,
                    overflow: "hidden",
                    position: "relative",
                    background: "hsl(var(--card))",
                    border: `1.6px solid ${markerColor}${isDark ? "8a" : "72"}`,
                    boxShadow: `0 4px 14px ${markerColor}18, 0 0 0 1px ${markerColor}${isDark ? "2d" : "20"}`,
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

                  <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: 440 }}>
                    <div style={{ padding: "14px 14px 12px" }}>
                      <h3
                        style={{
                          margin: 0,
                          marginTop: "0.55rem",
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
                      <div style={{ height: 1, marginTop: "0.5rem", background: `linear-gradient(90deg, transparent, ${markerColor}55, transparent)` }} />

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.9rem" }}>
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

                    <div style={{ flex: 1, padding: "0.5rem 14px 0", display: "flex", flexDirection: "column", gap: "0.45rem", overflow: "hidden" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.38rem" }}>
                        {card.locations.slice(0, PREVIEW_ROWS).map((location, i) => (
                          <div
                            key={`${card.id}-${location.code}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.45rem",
                              background: "hsl(var(--muted)/0.5)",
                              borderRadius: 10,
                              padding: "0.32rem 0.4rem",
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
                                fontSize: "0.62rem",
                                fontWeight: 800,
                                flexShrink: 0,
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
                                fontSize: "0.72rem",
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
                                padding: 2,
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
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "1.45rem 0", color: "hsl(var(--muted-foreground))" }}>
                            <MapPin style={{ width: 13, height: 13, opacity: 0.4 }} />
                            <span style={{ fontSize: "0.74rem", fontStyle: "italic" }}>No delivery points yet</span>
                          </div>
                        )}
                      </div>

                      {card.locations.length > PREVIEW_ROWS && (
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
                            padding: "0.28rem 0.55rem",
                            width: "100%",
                            cursor: "default",
                          }}
                        >
                          +{card.locations.length - PREVIEW_ROWS} more locations
                        </button>
                      )}

                      {Object.keys(grouped).length > 0 && (
                        <>
                          <div style={{ height: 1, background: "hsl(var(--border)/0.5)", marginTop: "0.32rem" }} />
                          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", justifyContent: "center", paddingBottom: "0.15rem" }}>
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
                        </>
                      )}
                    </div>

                    <div style={{ padding: "0.45rem 14px 0.85rem", display: "flex", gap: "0.45rem", borderTop: `1px solid ${markerColor}55` }}>
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
    </div>
  )
}
