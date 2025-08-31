"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PanelBottomOpen, Smartphone, TabletSmartphone } from 'lucide-react';
import { toast } from "sonner";

interface AlertItem {
  id: string;
  title: string;
  location: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  description: string;
  coordinates: { lat: number; lng: number };
}

interface LiveDataItem {
  id: string;
  poleId: string;
  distance: number;
  voltage: number;
  current: number;
  status: 'normal' | 'warning' | 'critical';
}

interface FaultHistoryItem {
  id: string;
  date: string;
  faultCount: number;
  resolvedCount: number;
}

interface PredictionData {
  riskScore: number;
  suggestedActions: string[];
  nextInspectionDue: string;
}

const mockAlerts: AlertItem[] = [
  {
    id: '1',
    title: 'Voltage Drop Detected',
    location: 'Pole KTM-2847',
    severity: 'critical',
    timestamp: '2 min ago',
    description: 'Voltage has dropped below 220V threshold',
    coordinates: { lat: 10.0261, lng: 76.3125 }
  },
  {
    id: '2',
    title: 'High Current Load',
    location: 'Pole EKM-1934',
    severity: 'warning',
    timestamp: '15 min ago',
    description: 'Current load exceeding normal operating range',
    coordinates: { lat: 9.9312, lng: 76.2673 }
  },
  {
    id: '3',
    title: 'Communication Lost',
    location: 'Pole TCR-5623',
    severity: 'critical',
    timestamp: '32 min ago',
    description: 'Unable to establish connection with monitoring device',
    coordinates: { lat: 11.2588, lng: 75.7804 }
  }
];

const mockLiveData: LiveDataItem[] = [
  { id: '1', poleId: 'KTM-2847', distance: 0.2, voltage: 218, current: 12.5, status: 'critical' },
  { id: '2', poleId: 'EKM-1934', distance: 0.8, voltage: 230, current: 18.2, status: 'warning' },
  { id: '3', poleId: 'KTM-2849', distance: 1.2, voltage: 232, current: 8.1, status: 'normal' },
  { id: '4', poleId: 'KTM-2845', distance: 1.5, voltage: 228, current: 10.3, status: 'normal' }
];

const mockFaultHistory: FaultHistoryItem[] = [
  { id: '1', date: 'Today', faultCount: 3, resolvedCount: 1 },
  { id: '2', date: 'Yesterday', faultCount: 2, resolvedCount: 2 },
  { id: '3', date: '2 days ago', faultCount: 5, resolvedCount: 4 },
  { id: '4', date: '3 days ago', faultCount: 1, resolvedCount: 1 }
];

const mockPredictions: PredictionData = {
  riskScore: 72,
  suggestedActions: [
    'Inspect Pole KTM-2847 within 24 hours',
    'Schedule preventive maintenance for EKM-1934',
    'Monitor voltage trends in Kottayam sector'
  ],
  nextInspectionDue: '2024-01-15'
};

export default function MobileFieldAppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('live');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'isolate' | 'reset' | null; alertId?: string }>({ type: null });
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const criticalAlerts = mockAlerts.filter(alert => alert.severity === 'critical');

  const handleIsolate = (alertId?: string) => {
    setConfirmDialog({ type: null });
    if (!isOnline) {
      toast.info("Action queued - will execute when online");
      return;
    }
    toast.success("Remote isolation initiated successfully");
  };

  const handleReset = (alertId?: string) => {
    setConfirmDialog({ type: null });
    if (!isOnline) {
      toast.info("Action queued - will execute when online");
      return;
    }
    toast.success("System reset completed successfully");
  };

  const handleNavigateToAlert = (alert: AlertItem) => {
    toast.info(`Navigating to ${alert.location}`);
    // In real implementation, this would open device maps or center the map
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'warning': return 'bg-orange-500 text-white';
      default: return 'bg-primary text-primary-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-destructive';
      case 'warning': return 'text-orange-500';
      default: return 'text-primary';
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top Navbar */}
      <div className="flex items-center justify-between p-4 bg-card border-b border-border relative z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">K</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">KSEB Field</h1>
            <p className="text-xs text-muted-foreground">Smart LT Monitor</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Input
              placeholder="Search poles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-32 h-8 text-sm"
            />
          </div>
          {!isOnline && (
            <Badge variant="outline" className="text-xs">
              Offline
            </Badge>
          )}
        </div>
      </div>

      {/* Main Map View */}
      <div className="flex-1 relative bg-muted">
        {/* Mock Map Interface */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent to-muted flex items-center justify-center">
          <div className="text-center space-y-2">
            <TabletSmartphone className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Interactive Map View</p>
            <p className="text-xs text-muted-foreground">Pinch to zoom • Drag to pan</p>
          </div>

          {/* Mock Map Markers */}
          <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-destructive rounded-full animate-pulse"></div>
          <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
          <div className="absolute bottom-1/3 left-1/2 w-3 h-3 bg-primary rounded-full"></div>
        </div>

        {/* Floating Alert Badge */}
        <Button
          onClick={() => setDrawerOpen(true)}
          className="absolute top-4 right-4 w-12 h-12 rounded-full bg-destructive text-destructive-foreground shadow-lg z-40"
          size="sm"
        >
          {criticalAlerts.length}
        </Button>

        {/* Offline Indicator */}
        {!isOnline && (
          <div className="absolute top-16 left-4 right-4 bg-orange-500 text-white p-2 rounded-lg text-sm text-center">
            Working offline - actions will sync when connected
          </div>
        )}
      </div>

      {/* Bottom Drawer */}
      <div className={`absolute bottom-0 left-0 right-0 bg-card border-t border-border transition-transform duration-300 ease-out ${
        drawerOpen ? 'translate-y-0' : 'translate-y-[calc(100%-4rem)]'
      }`}>
        {/* Drawer Handle */}
        <div 
          className="flex justify-center py-2 cursor-pointer"
          onClick={() => setDrawerOpen(!drawerOpen)}
        >
          <div className="w-8 h-1 bg-muted-foreground rounded-full"></div>
        </div>

        {/* Drawer Header */}
        <div className="px-4 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Field Operations</h2>
              <p className="text-sm text-muted-foreground">{mockAlerts.length} active alerts</p>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setConfirmDialog({ type: 'isolate' })}
                className="text-xs px-3"
              >
                ⚡ Isolate
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setConfirmDialog({ type: 'reset' })}
                className="text-xs px-3"
              >
                🔄 Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Swipeable Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mx-4 mt-3">
            <TabsTrigger value="live" className="text-xs">Live Data</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
            <TabsTrigger value="predictions" className="text-xs">Predictions</TabsTrigger>
          </TabsList>

          <div className="h-80">
            <ScrollArea className="h-full">
              <TabsContent value="live" className="mt-3 px-4 space-y-3">
                {mockLiveData.map((item) => (
                  <Card key={item.id} className="border border-border">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{item.poleId}</p>
                          <p className="text-xs text-muted-foreground">{item.distance}km away</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${getStatusColor(item.status)}`}>
                            {item.voltage}V • {item.current}A
                          </p>
                          <Badge 
                            variant={item.status === 'normal' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="history" className="mt-3 px-4 space-y-3">
                {mockFaultHistory.map((item) => (
                  <Card key={item.id} className="border border-border">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{item.date}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.resolvedCount}/{item.faultCount} resolved
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{item.faultCount} faults</p>
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary"
                              style={{ width: `${(item.resolvedCount / item.faultCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="predictions" className="mt-3 px-4 space-y-3">
                <Card className="border border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Risk Assessment</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-center mb-4">
                      <div className={`text-3xl font-bold ${mockPredictions.riskScore > 70 ? 'text-destructive' : 'text-orange-500'}`}>
                        {mockPredictions.riskScore}%
                      </div>
                      <p className="text-xs text-muted-foreground">Risk Score</p>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Suggested Actions:</p>
                      {mockPredictions.suggestedActions.map((action, index) => (
                        <p key={index} className="text-xs text-muted-foreground">• {action}</p>
                      ))}
                    </div>

                    <div className="mt-4 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Next inspection: {mockPredictions.nextInspectionDue}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Active Alerts (always visible when drawer is open) */}
              {drawerOpen && (
                <div className="px-4 pt-4 pb-6 border-t border-border">
                  <h3 className="text-sm font-medium mb-3">Active Alerts</h3>
                  <div className="space-y-3">
                    {mockAlerts.map((alert) => (
                      <Card key={alert.id} className="border border-border">
                        <CardContent className="p-3">
                          <div 
                            className="cursor-pointer"
                            onClick={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className={`text-xs ${getSeverityColor(alert.severity)}`}>
                                    {alert.severity}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                                </div>
                                <p className="text-sm font-medium">{alert.title}</p>
                                <p className="text-xs text-muted-foreground">{alert.location}</p>
                              </div>
                              <PanelBottomOpen 
                                className={`w-4 h-4 text-muted-foreground transition-transform ${
                                  expandedAlert === alert.id ? 'rotate-180' : ''
                                }`} 
                              />
                            </div>
                          </div>
                          
                          {expandedAlert === alert.id && (
                            <div className="mt-3 pt-3 border-t border-border space-y-2">
                              <p className="text-xs text-muted-foreground">{alert.description}</p>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleNavigateToAlert(alert)}
                                  className="text-xs flex-1"
                                >
                                  Navigate
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setConfirmDialog({ type: 'isolate', alertId: alert.id })}
                                  className="text-xs flex-1"
                                >
                                  Isolate
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        </Tabs>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.type !== null} onOpenChange={() => setConfirmDialog({ type: null })}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle className="text-lg">
              Confirm {confirmDialog.type === 'isolate' ? 'Remote Isolation' : 'System Reset'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === 'isolate' 
                ? 'This will remotely isolate the affected circuit. Power will be interrupted until manually restored.'
                : 'This will reset all monitoring systems in the selected area. The process may take 2-3 minutes.'
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog({ type: null })}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => confirmDialog.type === 'isolate' ? handleIsolate(confirmDialog.alertId) : handleReset(confirmDialog.alertId)}
              className="flex-1"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}