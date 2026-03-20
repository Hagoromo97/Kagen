import { useMemo, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet"
import L from "leaflet"

const DELIVERY_COLORS: Record<string, string> = {
  Daily:      "#22c55e",
  "Alt 1":    "#f59e0b",
  "Alt 2":    "#a855f7",
  Weekday:   "#3b82f6",
  "Weekday 2": "#3b82f6",
  "Weekday 3": "#6366f1",
}

interface DeliveryPoint {
  code: string
  name: string
  delivery: string
  latitude: number
  longitude: number
  descriptions: { key: string; value: string }[]
  routeLabel?: string
  routeId?: string
}

interface DeliveryMapProps {
  deliveryPoints: DeliveryPoint[]
  scrollZoom?: boolean
  showPolyline?: boolean
  markerStyle?: "pin" | "dot" | "ring"
  startPoint?: { lat: number; lng: number }
  refitToken?: number
}

function createPinIcon(color: string, active = false): L.Icon {
  // Use the standard Leaflet marker images but tinted via a coloured shadow trick
  // with a small size (16×26 instead of default 25×41)
  const size: [number, number]   = active ? [20, 33] : [16, 26]
  const anchor: [number, number] = [size[0] / 2, size[1]]

  // Build a data-URI that recolours the default Leaflet pin SVG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 41" width="${size[0]}" height="${size[1]}">
    <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12.5" cy="12.5" r="4.5" fill="white" opacity="0.9"/>
  </svg>`
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

  return L.icon({
    iconUrl:    url,
    iconSize:   size,
    iconAnchor: anchor,
    popupAnchor: [0, -(size[1] + 4)],
  })
}

function createDotIcon(color: string, active = false): L.DivIcon {
  const size = active ? 14 : 10
  return L.divIcon({
    className: "",
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size + 4)],
    html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px ${color}88,0 2px 6px #00000030"></div>`,
  })
}

function createRingIcon(color: string, active = false): L.DivIcon {
  const outer = active ? 18 : 14
  const inner = active ? 8 : 6
  return L.divIcon({
    className: "",
    iconAnchor: [outer / 2, outer / 2],
    popupAnchor: [0, -(outer + 4)],
    html: `<div style="width:${outer}px;height:${outer}px;border-radius:999px;border:2px solid ${color};background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px #00000020"><div style="width:${inner}px;height:${inner}px;border-radius:999px;background:${color}"></div></div>`,
  })
}

function createMarkerIcon(style: "pin" | "dot" | "ring", color: string, active = false): L.Icon | L.DivIcon {
  if (style === "dot") return createDotIcon(color, active)
  if (style === "ring") return createRingIcon(color, active)
  return createPinIcon(color, active)
}

/** Fits map bounds whenever validPoints changes */
function BoundsController({ points, startPoint, refitToken }: { points: DeliveryPoint[]; startPoint?: { lat: number; lng: number }; refitToken?: number }) {
  const map = useMap()
  useMemo(() => {
    if (points.length === 0 && !startPoint) return

    if (points.length === 0 && startPoint) {
      map.setView([startPoint.lat, startPoint.lng], 14)
      return
    }

    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 14)
    } else {
      const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude]))
      if (startPoint) bounds.extend([startPoint.lat, startPoint.lng])
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, startPoint, refitToken])
  return null
}

export function DeliveryMap({ deliveryPoints, scrollZoom = false, showPolyline = false, markerStyle = "pin", startPoint, refitToken = 0 }: DeliveryMapProps) {
  const [activeCode, setActiveCode] = useState<string | null>(null)

  const validPoints = useMemo(
    () => deliveryPoints.filter(p => p.latitude !== 0 && p.longitude !== 0),
    [deliveryPoints]
  )

  const center = useMemo((): [number, number] => {
    if (startPoint) return [startPoint.lat, startPoint.lng]
    if (validPoints.length === 0) return [3.15, 101.65]
    return [
      validPoints.reduce((s, p) => s + p.latitude,  0) / validPoints.length,
      validPoints.reduce((s, p) => s + p.longitude, 0) / validPoints.length,
    ]
  }, [validPoints, startPoint])

  const polylineGroups = useMemo(() => {
    if (!showPolyline) return [] as Array<{ id: string; positions: [number, number][] }>

    const grouped = new Map<string, [number, number][]>();
    validPoints.forEach((point) => {
      const groupId = point.routeId ?? "single-route"
      const positions = grouped.get(groupId) ?? []
      positions.push([point.latitude, point.longitude])
      grouped.set(groupId, positions)
    })

    return Array.from(grouped.entries())
      .map(([id, positions]) => ({ id, positions }))
      .filter((item) => item.positions.length >= 2)
  }, [validPoints, showPolyline])

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom={scrollZoom}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <BoundsController points={validPoints} startPoint={startPoint} refitToken={refitToken} />
      {startPoint && (
        <Marker
          key="start-point"
          position={[startPoint.lat, startPoint.lng]}
          icon={createMarkerIcon(markerStyle, "#111111", false)}
        >
          <Popup autoPan={false}>
            <div style={{ fontFamily: "system-ui, sans-serif", minWidth: 120 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#111" }}>Starting Point</p>
            </div>
          </Popup>
        </Marker>
      )}
      {polylineGroups.map((group) => (
        <Polyline
          key={group.id}
          positions={group.positions}
          pathOptions={{ color: "#2563eb", weight: 3, opacity: 0.75 }}
        />
      ))}
      {validPoints.map(point => {
        const color = DELIVERY_COLORS[point.delivery] ?? "#6b7280"
        const isActive = point.code === activeCode
        return (
          <Marker
            key={point.code}
            position={[point.latitude, point.longitude]}
            icon={createMarkerIcon(markerStyle, color, isActive)}
            eventHandlers={{
              click: () => setActiveCode(prev => prev === point.code ? null : point.code),
            }}
          >
            {isActive && (
              <Popup
                onClose={() => setActiveCode(null)}
                autoPan={false}
              >
                <div style={{ fontFamily: "system-ui, sans-serif", minWidth: 148, padding: "2px 0" }}>
                  {point.routeLabel && (
                    <p style={{ fontSize: 10, fontWeight: 600, color: "#888", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>{point.routeLabel}</p>
                  )}
                  <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 5, color: "#111", lineHeight: 1.3 }}>{point.name}</p>
                  <div style={{ fontSize: 11, color: "#666", lineHeight: 1.7 }}>
                    <div>Code: <span style={{ fontWeight: 600, color: "#333", fontFamily: "monospace" }}>{point.code}</span></div>
                    <div>Delivery: <span style={{ fontWeight: 700, color }}>{point.delivery}</span></div>
                  </div>
                </div>
              </Popup>
            )}
          </Marker>
        )
      })}
    </MapContainer>
  )
}
