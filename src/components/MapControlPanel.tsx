"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MapPinned, MapPinX, Settings, Plus, Wrench, Zap, RotateCcw, Trash2 } from "lucide-react";

// Dynamic import for Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Polygon = dynamic(() => import('react-leaflet').then(mod => mod.Polygon), { ssr: false });

// Mock data types
interface PoleData {
  id: string;
  lat: number;
  lng: number;
  status: "healthy" | "faulty" | "isolated" | "maintenance";
  voltage: number;
  current: number;
  location: string;
  lastUpdated: string;
  faultType?: string;
  severity?: "low" | "medium" | "high";
  isolatedBy?: string;
  isolatedAt?: string;
}

interface Alert {
  id: string;
  poleId: string;
  message: string;
  timestamp: string;
  severity: "low" | "medium" | "high";
  isExpanded?: boolean;
  createdBy?: "system" | "manual";
}

// Mock data with enhanced statuses
const mockPoles: PoleData[] = [
  {
    id: "P001",
    lat: 10.8505,
    lng: 76.2711,
    status: "faulty",
    voltage: 210,
    current: 15,
    location: "Kochi Central",
    lastUpdated: "2024-01-15T10:30:00Z",
    faultType: "Voltage Drop",
    severity: "high"
  },
  {
    id: "P002",
    lat: 11.2588,
    lng: 75.7804,
    status: "healthy",
    voltage: 230,
    current: 18,
    location: "Kozhikode North",
    lastUpdated: "2024-01-15T10:29:00Z"
  },
  {
    id: "P003",
    lat: 8.5241,
    lng: 76.9366,
    status: "isolated",
    voltage: 0,
    current: 0,
    location: "Thiruvananthapuram East",
    lastUpdated: "2024-01-15T10:25:00Z",
    faultType: "Current Spike",
    severity: "medium",
    isolatedBy: "Admin",
    isolatedAt: "2024-01-15T09:45:00Z"
  },
  {
    id: "P004",
    lat: 9.9312,
    lng: 76.2673,
    status: "healthy",
    voltage: 235,
    current: 14,
    location: "Ernakulam",
    lastUpdated: "2024-01-15T10:28:00Z"
  },
  {
    id: "P005",
    lat: 10.5276,
    lng: 76.2144,
    status: "maintenance",
    voltage: 220,
    current: 10,
    location: "Thrissur",
    lastUpdated: "2024-01-15T10:27:00Z",
    faultType: "Scheduled Maintenance"
  }
];

const mockAlerts: Alert[] = [
  {
    id: "A001",
    poleId: "P001",
    message: "Pole #P001 - Voltage Drop Detected",
    timestamp: "2024-01-15T10:30:00Z",
    severity: "high"
  },
  {
    id: "A002",
    poleId: "P003",
    message: "Pole #P003 - Current Spike Warning",
    timestamp: "2024-01-15T10:25:00Z",
    severity: "medium"
  }
];

// Kerala state boundary (simplified coordinates)
const keralaBoundary = [
  [8.2904, 76.7854],
  [8.8973, 77.2959],
  [9.9312, 77.7524],
  [11.1271, 76.5074],
  [12.2431, 75.0572],
  [11.7401, 74.9949],
  [10.8505, 74.8567],
  [9.4981, 76.3182],
  [8.5241, 76.9366],
  [8.2904, 76.7854]
];

// Enhanced Interactive map component
const InteractiveMap = ({ 
  poles, 
  onMarkerClick, 
  selectedPoleId,
  className 
}: {
  poles: PoleData[];
  onMarkerClick: (pole: PoleData) => void;
  selectedPoleId?: string;
  className?: string;
}) => {
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [customIcons, setCustomIcons] = useState<any>({});
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // Ensure we're in the browser and DOM is ready
    if (typeof window !== 'undefined' && document.readyState === 'complete') {
      loadLeaflet();
    } else if (typeof window !== 'undefined') {
      window.addEventListener('load', loadLeaflet);
      return () => window.removeEventListener('load', loadLeaflet);
    }
  }, []);

  const loadLeaflet = async () => {
    try {
      // Load Leaflet CSS first
      await import('leaflet/dist/leaflet.css');
      
      // Then load Leaflet library
      const L = await import('leaflet');
      
      // Create custom icons for all statuses
      const healthyIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #22c55e; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const faultyIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #ef4444; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); animation: pulse 2s infinite;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const isolatedIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #6b7280; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const maintenanceIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #f59e0b; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      setCustomIcons({ 
        healthy: healthyIcon, 
        faulty: faultyIcon, 
        isolated: isolatedIcon,
        maintenance: maintenanceIcon 
      });
      
      setLeafletLoaded(true);
      
      // Small delay to ensure DOM is ready
      setTimeout(() => setMapReady(true), 100);
    } catch (error) {
      console.error('Failed to load Leaflet:', error);
    }
  };

  if (!leafletLoaded || !mapReady) {
    return (
      <div className={`relative bg-accent rounded-lg overflow-hidden ${className} flex items-center justify-center`}>
        <div className="text-center text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm">Loading Interactive Map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        .leaflet-container {
          height: 100%;
          width: 100%;
          border-radius: 0.5rem;
        }
        
        .custom-div-icon {
          background: transparent !important;
          border: none !important;
        }
        
        .leaflet-popup-content-wrapper {
          background: hsl(var(--card));
          color: hsl(var(--card-foreground));
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        
        .leaflet-popup-tip {
          background: hsl(var(--card));
        }
      `}</style>
      
      <MapContainer
        center={[10.5276, 76.2144]}
        zoom={7}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        whenReady={() => console.log('Map is ready')}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Kerala state boundary */}
        <Polygon
          positions={keralaBoundary}
          pathOptions={{
            color: '#8b5cf6',
            weight: 2,
            opacity: 0.8,
            fillColor: '#8b5cf6',
            fillOpacity: 0.1
          }}
        />
        
        {/* Enhanced pole markers */}
        {poles.map((pole) => (
          <Marker
            key={pole.id}
            position={[pole.lat, pole.lng]}
            icon={customIcons[pole.status]}
            eventHandlers={{
              click: () => onMarkerClick(pole)
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg">Pole {pole.id}</h3>
                  <Badge 
                    variant={pole.status === "healthy" ? "default" : pole.status === "isolated" ? "secondary" : pole.status === "maintenance" ? "outline" : "destructive"}
                    className={
                      pole.status === "healthy" ? "bg-green-500" : 
                      pole.status === "isolated" ? "bg-gray-500" :
                      pole.status === "maintenance" ? "bg-orange-500" : ""
                    }
                  >
                    {pole.status === "healthy" ? "Healthy" : 
                     pole.status === "isolated" ? "Isolated" :
                     pole.status === "maintenance" ? "Maintenance" :
                     pole.faultType || "Faulty"}
                  </Badge>
                </div>
                
                <div className="space-y-1 text-sm">
                  <p><strong>Location:</strong> {pole.location}</p>
                  <p><strong>Voltage:</strong> {pole.voltage}V</p>
                  <p><strong>Current:</strong> {pole.current}A</p>
                  <p><strong>Last Updated:</strong> {new Date(pole.lastUpdated).toLocaleTimeString()}</p>
                  {pole.isolatedBy && (
                    <p><strong>Isolated By:</strong> {pole.isolatedBy}</p>
                  )}
                </div>
                
                <div className="mt-3 pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Quick Actions:</p>
                  <div className="flex gap-1 flex-wrap">
                    {pole.status === "faulty" && (
                      <button 
                        className="text-xs bg-destructive text-destructive-foreground px-2 py-1 rounded hover:bg-destructive/90"
                        onClick={() => toast.info(`Isolating line ${pole.id}`)}
                      >
                        Isolate
                      </button>
                    )}
                    <button 
                      className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded hover:bg-secondary/90"
                      onClick={() => toast.info(`Viewing history for ${pole.id}`)}
                    >
                      History
                    </button>
                    {pole.status === "isolated" && (
                      <button 
                        className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                        onClick={() => toast.info(`Restoring line ${pole.id}`)}
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default function MapControlPanel({ className }: { className?: string }) {
  const [poles, setPoles] = useState<PoleData[]>(mockPoles);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [selectedPole, setSelectedPole] = useState<PoleData | null>(null);
  const [showPolePopup, setShowPolePopup] = useState(false);
  const [showIsolationModal, setShowIsolationModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showAddIssueModal, setShowAddIssueModal] = useState(false);
  const [showFixIssueModal, setShowFixIssueModal] = useState(false);
  const [showManualControlsModal, setShowManualControlsModal] = useState(false);
  const [isolationPoleId, setIsolationPoleId] = useState<string | null>(null);
  const [selectedPoleId, setSelectedPoleId] = useState<string>();

  const faultyPoles = useMemo(() => poles.filter(pole => pole.status === "faulty"), [poles]);
  const hasActiveFaults = faultyPoles.length > 0;

  const handleMarkerClick = useCallback((pole: PoleData) => {
    setSelectedPole(pole);
    setShowPolePopup(true);
    setSelectedPoleId(pole.id);
  }, []);

  const handleAddIssue = useCallback((poleId: string, issueData: any) => {
    setPoles(prev => prev.map(pole => 
      pole.id === poleId 
        ? { 
            ...pole, 
            status: "faulty" as const,
            faultType: issueData.faultType,
            severity: issueData.severity,
            lastUpdated: new Date().toISOString()
          }
        : pole
    ));
    
    // Add new alert
    const newAlert: Alert = {
      id: `A${Date.now()}`,
      poleId,
      message: `Pole #${poleId} - ${issueData.faultType} (Manual)`,
      timestamp: new Date().toISOString(),
      severity: issueData.severity,
      createdBy: "manual"
    };
    
    setAlerts(prev => [newAlert, ...prev]);
    toast.success(`Issue added to pole ${poleId}`);
  }, []);

  const handleFixIssue = useCallback((poleId: string) => {
    setPoles(prev => prev.map(pole => 
      pole.id === poleId 
        ? { 
            ...pole, 
            status: "healthy" as const,
            faultType: undefined,
            severity: undefined,
            lastUpdated: new Date().toISOString(),
            voltage: 230 + Math.random() * 10,
            current: 15 + Math.random() * 5
          }
        : pole
    ));
    
    // Remove related alerts
    setAlerts(prev => prev.filter(alert => alert.poleId !== poleId));
    toast.success(`Issue fixed for pole ${poleId}`);
  }, []);

  const handleIsolatePole = useCallback((poleId: string) => {
    setPoles(prev => prev.map(pole => 
      pole.id === poleId 
        ? { 
            ...pole, 
            status: "isolated" as const,
            voltage: 0,
            current: 0,
            isolatedBy: "Manual Control",
            isolatedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          }
        : pole
    ));
    toast.success(`Pole ${poleId} isolated`);
  }, []);

  const handleRestorePole = useCallback((poleId: string) => {
    setPoles(prev => prev.map(pole => 
      pole.id === poleId 
        ? { 
            ...pole, 
            status: "healthy" as const,
            voltage: 230 + Math.random() * 10,
            current: 15 + Math.random() * 5,
            isolatedBy: undefined,
            isolatedAt: undefined,
            faultType: undefined,
            severity: undefined,
            lastUpdated: new Date().toISOString()
          }
        : pole
    ));
    
    // Remove related alerts
    setAlerts(prev => prev.filter(alert => alert.poleId !== poleId));
    toast.success(`Pole ${poleId} restored`);
  }, []);

  const handleDeleteAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    toast.success("Alert deleted");
  }, []);

  const handleIsolateLine = useCallback((poleId: string) => {
    setIsolationPoleId(poleId);
    setShowIsolationModal(true);
    setShowPolePopup(false);
  }, []);

  const handleIsolationConfirm = useCallback(() => {
    // Update pole status optimistically
    toast.success("Isolation complete");
  }, []);

  const handleResetConfirm = useCallback(() => {
    // Reset system state
    setAlerts([]);
    toast.success("System reset complete");
  }, []);

  const handleToggleAlertExpand = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, isExpanded: !alert.isExpanded }
        : alert
    ));
  }, []);

  const handleFocusPole = useCallback((poleId: string) => {
    const pole = poles.find(p => p.id === poleId);
    if (pole) {
      setSelectedPoleId(poleId);
      toast.info(`Focused on pole ${poleId}`);
    }
  }, [poles]);

  const handleRemoteIsolate = useCallback(() => {
    if (faultyPoles.length > 0) {
      setIsolationPoleId(faultyPoles[0].id);
      setShowIsolationModal(true);
    }
  }, [faultyPoles]);

  return (
    <div className={`grid lg:grid-cols-3 gap-6 ${className}`}>
      {/* Interactive Map - Reduced height */}
      <div className="lg:col-span-2">
        <InteractiveMap
          poles={poles}
          onMarkerClick={handleMarkerClick}
          selectedPoleId={selectedPoleId}
          className="w-full h-[400px] lg:h-[500px]"
        />
      </div>

      {/* Enhanced Control Panel */}
      <div className="lg:col-span-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPinX className="w-5 h-5" />
                Control Panel
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowManualControlsModal(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Manual Actions */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => setShowAddIssueModal(true)}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Issue
                </Button>
                <Button
                  onClick={() => setShowFixIssueModal(true)}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={!hasActiveFaults}
                >
                  <Wrench className="w-3 h-3 mr-1" />
                  Fix Issue
                </Button>
              </div>
              
              <Button
                onClick={() => setShowIsolationModal(true)}
                disabled={!hasActiveFaults}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                <Zap className="w-4 h-4 mr-2" />
                Remote Isolate Faulty Line
              </Button>
              
              <Button
                onClick={() => setShowResetModal(true)}
                variant="secondary"
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset System
              </Button>
            </div>

            <Separator />

            {/* System Status Summary */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="text-center p-2 bg-green-50 rounded-lg">
                <div className="font-medium text-green-800">
                  {poles.filter(p => p.status === "healthy").length}
                </div>
                <div className="text-green-600 text-xs">Healthy</div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded-lg">
                <div className="font-medium text-red-800">
                  {poles.filter(p => p.status === "faulty").length}
                </div>
                <div className="text-red-600 text-xs">Faulty</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-800">
                  {poles.filter(p => p.status === "isolated").length}
                </div>
                <div className="text-gray-600 text-xs">Isolated</div>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded-lg">
                <div className="font-medium text-orange-800">
                  {poles.filter(p => p.status === "maintenance").length}
                </div>
                <div className="text-orange-600 text-xs">Maintenance</div>
              </div>
            </div>

            <Separator />

            {/* Enhanced Alerts Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Active Alerts</h3>
                <Badge variant="outline">{alerts.length}</Badge>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {hasActiveFaults ? (
                    alerts.map((alert) => (
                      <EnhancedAlertCard
                        key={alert.id}
                        alert={alert}
                        onToggleExpand={(alertId: string) => {
                          setAlerts(prev => prev.map(a => 
                            a.id === alertId ? { ...a, isExpanded: !a.isExpanded } : a
                          ));
                        }}
                        onFocusPole={(poleId: string) => {
                          const pole = poles.find(p => p.id === poleId);
                          if (pole) {
                            setSelectedPoleId(poleId);
                            toast.info(`Focused on pole ${poleId}`);
                          }
                        }}
                        onDeleteAlert={handleDeleteAlert}
                      />
                    ))
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center p-4 bg-green-50 border border-green-200 rounded-lg"
                    >
                      <p className="text-green-800 font-medium">All lines are healthy ✅</p>
                      <p className="text-green-600 text-sm mt-1">No active faults detected</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Modals */}
      <PolePopup
        pole={selectedPole}
        isOpen={showPolePopup}
        onClose={() => setShowPolePopup(false)}
        onViewHistory={(poleId: string) => toast.info(`Opening history for pole ${poleId}`)}
        onIsolateLine={handleIsolatePole}
        onRestoreLine={handleRestorePole}
        onFixIssue={handleFixIssue}
      />

      <AddIssueModal
        isOpen={showAddIssueModal}
        onClose={() => setShowAddIssueModal(false)}
        poles={poles}
        onAddIssue={handleAddIssue}
      />

      <FixIssueModal
        isOpen={showFixIssueModal}
        onClose={() => setShowFixIssueModal(false)}
        faultyPoles={faultyPoles}
        onFixIssue={handleFixIssue}
      />

      <ManualControlsModal
        isOpen={showManualControlsModal}
        onClose={() => setShowManualControlsModal(false)}
        poles={poles}
        onIsolatePole={handleIsolatePole}
        onRestorePole={handleRestorePole}
        onFixIssue={handleFixIssue}
        onAddIssue={(poleId: string) => {
          setShowManualControlsModal(false);
          setShowAddIssueModal(true);
        }}
      />

      <IsolationModal
        isOpen={showIsolationModal}
        onClose={() => setShowIsolationModal(false)}
        poleId={isolationPoleId}
        onConfirm={handleIsolationConfirm}
      />

      <ResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetConfirm}
      />
    </div>
  );
}

// Enhanced Alert Card Component
const EnhancedAlertCard = ({ 
  alert, 
  onToggleExpand, 
  onFocusPole,
  onDeleteAlert
}: {
  alert: Alert;
  onToggleExpand: (alertId: string) => void;
  onFocusPole: (poleId: string) => void;
  onDeleteAlert: (alertId: string) => void;
}) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "border-destructive bg-destructive/5";
      case "medium": return "border-orange-500 bg-orange-500/5";
      case "low": return "border-yellow-500 bg-yellow-500/5";
      default: return "border-border";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`border rounded-lg p-3 ${getSeverityColor(alert.severity)}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg">⚠️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{alert.message}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-muted-foreground">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </p>
            {alert.createdBy === "manual" && (
              <Badge variant="outline" className="text-xs">Manual</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFocusPole(alert.poleId)}
            className="shrink-0 h-6 w-6 p-0"
          >
            <MapPinned className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteAlert(alert.id)}
            className="shrink-0 h-6 w-6 p-0 text-destructive hover:text-destructive/90"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      <AnimatePresence>
        {alert.isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t"
          >
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Severity:</span>
                <Badge variant="outline" className="text-xs">
                  {alert.severity.toUpperCase()}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pole ID:</span>
                <span className="font-medium">{alert.poleId}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Add Issue Modal
const AddIssueModal = ({ 
  isOpen, 
  onClose, 
  poles,
  onAddIssue 
}: {
  isOpen: boolean;
  onClose: () => void;
  poles: PoleData[];
  onAddIssue: (poleId: string, issueData: any) => void;
}) => {
  const [selectedPoleId, setSelectedPoleId] = useState("");
  const [faultType, setFaultType] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!selectedPoleId || !faultType) {
      toast.error("Please fill in all required fields");
      return;
    }

    onAddIssue(selectedPoleId, {
      faultType,
      severity,
      description
    });

    // Reset form
    setSelectedPoleId("");
    setFaultType("");
    setSeverity("medium");
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Manual Issue
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="pole-select">Select Pole *</Label>
            <Select value={selectedPoleId} onValueChange={setSelectedPoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a pole" />
              </SelectTrigger>
              <SelectContent>
                {poles.filter(p => p.status === "healthy").map((pole) => (
                  <SelectItem key={pole.id} value={pole.id}>
                    {pole.id} - {pole.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="fault-type">Fault Type *</Label>
            <Select value={faultType} onValueChange={setFaultType}>
              <SelectTrigger>
                <SelectValue placeholder="Select fault type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Voltage Drop">Voltage Drop</SelectItem>
                <SelectItem value="Current Spike">Current Spike</SelectItem>
                <SelectItem value="Line Break">Line Break</SelectItem>
                <SelectItem value="Insulation Failure">Insulation Failure</SelectItem>
                <SelectItem value="Transformer Issue">Transformer Issue</SelectItem>
                <SelectItem value="Weather Damage">Weather Damage</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="severity">Severity</Label>
            <Select value={severity} onValueChange={(value: "low" | "medium" | "high") => setSeverity(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details about the issue..."
              rows={3}
            />
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1">
              Add Issue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Fix Issue Modal
const FixIssueModal = ({ 
  isOpen, 
  onClose, 
  faultyPoles,
  onFixIssue 
}: {
  isOpen: boolean;
  onClose: () => void;
  faultyPoles: PoleData[];
  onFixIssue: (poleId: string) => void;
}) => {
  const [selectedPoleId, setSelectedPoleId] = useState("");

  const handleSubmit = () => {
    if (!selectedPoleId) {
      toast.error("Please select a pole to fix");
      return;
    }

    onFixIssue(selectedPoleId);
    setSelectedPoleId("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Fix Issue
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="pole-select">Select Faulty Pole</Label>
            <Select value={selectedPoleId} onValueChange={setSelectedPoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a faulty pole" />
              </SelectTrigger>
              <SelectContent>
                {faultyPoles.map((pole) => (
                  <SelectItem key={pole.id} value={pole.id}>
                    {pole.id} - {pole.location} ({pole.faultType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPoleId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-medium text-blue-800 mb-1">Fix Action</h4>
              <p className="text-sm text-blue-700">
                This will mark the pole as healthy and restore normal operations.
              </p>
            </div>
          )}
          
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!selectedPoleId} className="flex-1">
              Fix Issue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Manual Controls Modal
const ManualControlsModal = ({ 
  isOpen, 
  onClose, 
  poles,
  onIsolatePole,
  onRestorePole,
  onFixIssue,
  onAddIssue
}: {
  isOpen: boolean;
  onClose: () => void;
  poles: PoleData[];
  onIsolatePole: (poleId: string) => void;
  onRestorePole: (poleId: string) => void;
  onFixIssue: (poleId: string) => void;
  onAddIssue: (poleId: string) => void;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Manual Control Center
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Pole Management Grid */}
          <div>
            <h3 className="font-semibold mb-3">Pole Management</h3>
            <div className="grid gap-3 max-h-60 overflow-y-auto">
              {poles.map((pole) => (
                <div key={pole.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      pole.status === "healthy" ? "bg-green-500" :
                      pole.status === "faulty" ? "bg-red-500" :
                      pole.status === "isolated" ? "bg-gray-500" :
                      "bg-orange-500"
                    }`} />
                    <div>
                      <p className="font-medium">{pole.id}</p>
                      <p className="text-sm text-muted-foreground">{pole.location}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {pole.status}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-1">
                    {pole.status === "healthy" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAddIssue(pole.id)}
                          className="text-xs"
                        >
                          Add Issue
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onIsolatePole(pole.id)}
                          className="text-xs"
                        >
                          Isolate
                        </Button>
                      </>
                    )}
                    {pole.status === "faulty" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onFixIssue(pole.id)}
                          className="text-xs"
                        >
                          Fix
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onIsolatePole(pole.id)}
                          className="text-xs"
                        >
                          Isolate
                        </Button>
                      </>
                    )}
                    {pole.status === "isolated" && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onRestorePole(pole.id)}
                        className="text-xs bg-green-600 hover:bg-green-700"
                      >
                        Restore
                      </Button>
                    )}
                    {pole.status === "maintenance" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRestorePole(pole.id)}
                        className="text-xs"
                      >
                        Complete Maintenance
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* System Statistics */}
          <div>
            <h3 className="font-semibold mb-3">System Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-800">
                  {poles.filter(p => p.status === "healthy").length}
                </div>
                <div className="text-green-600 text-sm">Healthy Poles</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-800">
                  {poles.filter(p => p.status === "faulty").length}
                </div>
                <div className="text-red-600 text-sm">Faulty Poles</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-800">
                  {poles.filter(p => p.status === "isolated").length}
                </div>
                <div className="text-gray-600 text-sm">Isolated Poles</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-800">
                  {poles.filter(p => p.status === "maintenance").length}
                </div>
                <div className="text-orange-600 text-sm">Under Maintenance</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Enhanced Pole Popup with all controls
const PolePopup = ({ 
  pole, 
  isOpen, 
  onClose, 
  onViewHistory, 
  onIsolateLine,
  onRestoreLine,
  onFixIssue
}: {
  pole: PoleData | null;
  isOpen: boolean;
  onClose: () => void;
  onViewHistory: (poleId: string) => void;
  onIsolateLine: (poleId: string) => void;
  onRestoreLine: (poleId: string) => void;
  onFixIssue: (poleId: string) => void;
}) => {
  if (!pole) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPinned className="w-5 h-5" />
            Pole {pole.id}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Location</Label>
            <p className="font-medium">{pole.location}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Voltage</Label>
              <p className="font-medium">{pole.voltage}V</p>
            </div>
            <div>
              <Label>Current</Label>
              <p className="font-medium">{pole.current}A</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Label>Status</Label>
            <Badge 
              variant={pole.status === "healthy" ? "default" : pole.status === "isolated" ? "secondary" : pole.status === "maintenance" ? "outline" : "destructive"}
              className={
                pole.status === "healthy" ? "bg-green-500" : 
                pole.status === "isolated" ? "bg-gray-500" :
                pole.status === "maintenance" ? "bg-orange-500" : ""
              }
            >
              {pole.status === "healthy" ? "Healthy" : 
               pole.status === "isolated" ? "Isolated" :
               pole.status === "maintenance" ? "Maintenance" :
               pole.faultType || "Faulty"}
            </Badge>
          </div>
          
          <div>
            <Label>Last Updated</Label>
            <p className="text-sm">{new Date(pole.lastUpdated).toLocaleString()}</p>
          </div>

          {pole.isolatedBy && (
            <div>
              <Label>Isolated By</Label>
              <p className="text-sm">{pole.isolatedBy} at {new Date(pole.isolatedAt!).toLocaleString()}</p>
            </div>
          )}
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onViewHistory(pole.id)}
            >
              View History
            </Button>
            
            {pole.status === "faulty" && (
              <>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => onFixIssue(pole.id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Fix Issue
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => onIsolateLine(pole.id)}
                  className="col-span-2"
                >
                  Isolate Line
                </Button>
              </>
            )}
            
            {pole.status === "isolated" && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => onRestoreLine(pole.id)}
                className="col-span-2 bg-green-600 hover:bg-green-700"
              >
                Restore Line
              </Button>
            )}

            {pole.status === "healthy" && (
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => onIsolateLine(pole.id)}
                className="col-span-2"
              >
                Isolate for Maintenance
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Isolation confirmation modal
const IsolationModal = ({ 
  isOpen, 
  onClose, 
  poleId, 
  onConfirm 
}: {
  isOpen: boolean;
  onClose: () => void;
  poleId: string | null;
  onConfirm: () => void;
}) => {
  const [confirmText, setConfirmText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (confirmText !== "ISOLATE") return;
    
    setIsLoading(true);
    
    toast.loading("Isolating faulty line...", { id: "isolate" });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.success("Line isolated successfully", { id: "isolate" });
    setIsLoading(false);
    setConfirmText("");
    onConfirm();
    onClose();
  }, [confirmText, onConfirm, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setConfirmText("");
      setIsLoading(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">⚡ Remote Isolate Faulty Line</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
            <h4 className="font-medium text-destructive mb-2">Critical Action Warning</h4>
            <div className="text-sm space-y-1">
              <p><strong>Affected Pole:</strong> {poleId}</p>
              <p><strong>Estimated Impact:</strong> 150-200 customers</p>
              <p><strong>Service Area:</strong> 2.5 km radius</p>
            </div>
          </div>
          
          <div>
            <Label htmlFor="confirm-text" className="text-sm font-medium">
              Type "ISOLATE" to confirm this action:
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type ISOLATE here"
              className="mt-2"
              disabled={isLoading}
            />
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirm}
              disabled={confirmText !== "ISOLATE" || isLoading}
              className="flex-1"
            >
              {isLoading ? "Isolating..." : "Confirm Isolation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// System reset modal
const ResetModal = ({ 
  isOpen, 
  onClose, 
  onConfirm 
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = useCallback(async () => {
    setIsLoading(true);
    
    toast.loading("Resetting system...", { id: "reset" });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    toast.success("System reset completed", { id: "reset" });
    setIsLoading(false);
    onConfirm();
    onClose();
  }, [onConfirm, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>🔄 Reset System</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">System-wide Reset</h4>
            <div className="text-sm text-yellow-700 space-y-1">
              <p>• All monitoring will be temporarily suspended</p>
              <p>• Active alerts will be cleared</p>
              <p>• System recalibration will take 5-10 minutes</p>
              <p>• Normal monitoring will resume automatically</p>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? "Resetting..." : "Confirm Reset"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};