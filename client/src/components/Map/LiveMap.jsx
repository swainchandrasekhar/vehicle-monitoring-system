import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import useStore from '../../store/useStore';
import config from '../../config';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const vehicleIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3082/3082349.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
});

const accidentIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/179/179386.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  map.setView(center, zoom);
  return null;
};

const LiveMap = () => {
  const { vehicles, alerts, selectedVehicle } = useStore();

  return (
    <div className="h-full w-full rounded-lg overflow-hidden shadow-inner border-2 border-gray-200">
      <MapContainer 
        center={config.mapCenter} 
        zoom={config.mapZoom} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {selectedVehicle && (
          <ChangeView 
            center={[selectedVehicle.latitude, selectedVehicle.longitude]} 
            zoom={16} 
          />
        )}

        {vehicles.map((vehicle) => (
          vehicle.latitude && vehicle.longitude && (
            <Marker 
              key={vehicle.id} 
              position={[vehicle.latitude, vehicle.longitude]}
              icon={vehicleIcon}
            >
              <Popup>
                <div className="font-sans">
                  <h3 className="font-bold text-lg">{vehicle.registration_number}</h3>
                  <p><span className="font-semibold">Model:</span> {vehicle.make} {vehicle.model}</p>
                  <p><span className="font-semibold">Speed:</span> {parseFloat(vehicle.speed_kmh || 0).toFixed(1)} km/h</p>
                  <p><span className="font-semibold">Status:</span> 
                    <span className={`ml-1 ${vehicle.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                      {vehicle.status}
                    </span>
                  </p>
                </div>
              </Popup>
            </Marker>
          )
        ))}

        {alerts.map((alert) => (
          alert.latitude && alert.longitude && (
            <Marker 
              key={alert.id} 
              position={[alert.latitude, alert.longitude]}
              icon={accidentIcon}
            >
              <Popup>
                <div className="font-sans text-red-600">
                  <h3 className="font-bold text-lg">🚨 {alert.title}</h3>
                  <p className="text-gray-800">{alert.message}</p>
                  <p className="text-sm mt-1 text-gray-500 italic">
                    Severity: {alert.severity}
                  </p>
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
    </div>
  );
};

export default LiveMap;
