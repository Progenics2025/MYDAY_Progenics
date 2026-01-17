import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPoint {
    latitude: number;
    longitude: number;
    timestamp: string;
}

interface MapComponentProps {
    trail: LocationPoint[];
    visits: any[];
    selectedEmployeeName?: string;
}

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, 14);
    }, [center, map]);
    return null;
}

export default function MapComponent({ trail, visits, selectedEmployeeName }: MapComponentProps) {
    const [addresses, setAddresses] = useState<Record<string, string>>({});

    // Default center (Gurgaon) if no data
    const defaultCenter: [number, number] = [28.4595, 77.0266];
    const center = trail.length > 0
        ? [trail[trail.length - 1].latitude, trail[trail.length - 1].longitude] as [number, number]
        : defaultCenter;

    const polylinePositions = trail.map(p => [p.latitude, p.longitude] as [number, number]);

    // Reverse Geocoding Function
    const getAddress = async (lat: number, lng: number, key: string) => {
        if (addresses[key]) return; // Already fetched

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            setAddresses(prev => ({ ...prev, [key]: data.display_name }));
        } catch (error) {
            console.error('Geocoding failed', error);
        }
    };

    return (
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapUpdater center={center} />

            {/* Route Line */}
            <Polyline positions={polylinePositions} color="blue" />

            {/* Start Point */}
            {trail.length > 0 && (
                <Marker position={[trail[0].latitude, trail[0].longitude]}>
                    <Popup>
                        <strong>Start Point</strong><br />
                        {new Date(trail[0].timestamp).toLocaleTimeString()}
                    </Popup>
                </Marker>
            )}

            {/* Current/Last Point */}
            {trail.length > 0 && (
                <Marker position={[trail[trail.length - 1].latitude, trail[trail.length - 1].longitude]}>
                    <Popup
                        onOpen={() => getAddress(trail[trail.length - 1].latitude, trail[trail.length - 1].longitude, 'current')}
                    >
                        <strong>Current Location</strong><br />
                        {selectedEmployeeName}<br />
                        {new Date(trail[trail.length - 1].timestamp).toLocaleTimeString()}<br />
                        <div className="text-xs mt-1 text-gray-500">
                            {addresses['current'] || 'Loading address...'}
                        </div>
                    </Popup>
                </Marker>
            )}

            {/* Visits */}
            {visits.map((visit, idx) => (
                <Marker
                    key={visit.id || idx}
                    position={[visit.latitude, visit.longitude]}
                >
                    <Popup
                        onOpen={() => getAddress(visit.latitude, visit.longitude, visit.id)}
                    >
                        <strong>{visit.place_name || 'Visit'}</strong><br />
                        Type: {visit.visit_type}<br />
                        Arrival: {new Date(visit.arrival_time).toLocaleTimeString()}<br />
                        <div className="text-xs mt-1 text-gray-500">
                            {addresses[visit.id] || visit.address || 'Loading address...'}
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
