import React, { useEffect } from 'react';
import useStore from '../../store/useStore';
import socketService from '../../services/socket';
import { vehicleAPI, accidentAPI } from '../../services/api';
import LiveMap from '../Map/LiveMap';

const Dashboard = () => {
  const { 
    user, logout, vehicles, setVehicles, 
    updateVehicleLocation, alerts, setAlerts, 
    addAlert, setSelectedVehicle 
  } = useStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const vRes = await vehicleAPI.getAll();
        setVehicles(vRes.data.vehicles);
        
        const aRes = await accidentAPI.getAlerts();
        setAlerts(aRes.data.alerts);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchData();

    // Setup Real-time
    const token = localStorage.getItem('token');
    if (token) {
      const socket = socketService.connect(token);
      socketService.subscribeToVehicles();
      socketService.subscribeToAlerts();

      socket.on('vehicle:location:update', (data) => {
        console.log('Vehicle update:', data);
        updateVehicleLocation(data);
      });

      socket.on('accident:new', (data) => {
        console.log('New accident:', data);
        addAlert(data);
      });
    }

    return () => socketService.disconnect();
  }, []);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-xl flex flex-col">
        <div className="p-6 border-b bg-blue-600 text-white">
          <h1 className="text-xl font-bold">🚗 Vehicle Monitor</h1>
          <p className="text-sm opacity-90 mt-1">{user?.fullName || 'User'}</p>
          <p className="text-xs opacity-75">{user?.role || 'viewer'}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase mb-3">
            Active Vehicles ({vehicles.length})
          </h2>
          <div className="space-y-2">
            {vehicles.map(v => (
              <div 
                key={v.id} 
                onClick={() => setSelectedVehicle(v)}
                className="p-3 bg-gray-50 rounded-lg border hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-700">{v.registration_number}</span>
                  <span className={`h-2 w-2 rounded-full ${v.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                </div>
                <p className="text-xs text-gray-500">{v.make} {v.model}</p>
                <p className="text-xs text-blue-600 mt-1">{parseFloat(v.speed_kmh || 0).toFixed(1)} km/h</p>
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={logout}
          className="m-4 p-3 bg-red-50 text-red-600 font-semibold rounded-lg hover:bg-red-100"
        >
          Logout
        </button>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 flex flex-col">
        <div className="absolute top-4 left-96 right-4 h-16 flex gap-4 z-[1000] pointer-events-none">
          <div className="bg-white shadow-lg rounded-xl p-4 flex-1 pointer-events-auto flex items-center justify-between border-l-4 border-blue-500">
            <div>
              <p className="text-xs text-gray-500 font-bold">VEHICLES</p>
              <p className="text-2xl font-black">{vehicles.length}</p>
            </div>
            <div className="text-3xl">🚙</div>
          </div>
          <div className="bg-white shadow-lg rounded-xl p-4 flex-1 pointer-events-auto flex items-center justify-between border-l-4 border-red-500">
            <div>
              <p className="text-xs text-gray-500 font-bold">ALERTS</p>
              <p className="text-2xl font-black text-red-600">{alerts.length}</p>
            </div>
            <div className="text-3xl animate-pulse">⚠️</div>
          </div>
        </div>

        <div className="flex-1">
          <LiveMap />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
