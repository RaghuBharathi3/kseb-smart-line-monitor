"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartSpline, ChartArea, ChartColumnBig, LayoutPanelTop } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Mock data generators
const generateTrendData = (hours: number) => {
  const data = [];
  const now = new Date();
  for (let i = 0; i < hours; i++) {
    const time = new Date(now.getTime() - (hours - i) * 60 * 60 * 1000);
    data.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      voltage: 220 + Math.sin(i * 0.1) * 5 + Math.random() * 3,
      current: 15 + Math.cos(i * 0.15) * 3 + Math.random() * 2,
      timestamp: time.getTime()
    });
  }
  return data;
};

const generateFaultHistory = () => {
  const history = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const faultCount = Math.floor(Math.random() * 4);
    const events = [];
    
    for (let j = 0; j < faultCount; j++) {
      events.push({
        id: `fault-${i}-${j}`,
        time: new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
        description: ['Voltage drop', 'Current spike', 'Temperature alert', 'Line fault'][Math.floor(Math.random() * 4)],
        duration: Math.floor(Math.random() * 120) + 5
      });
    }
    
    history.push({
      date: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      faultCount,
      totalDuration: events.reduce((sum, event) => sum + event.duration, 0),
      events: events.sort((a, b) => a.time.localeCompare(b.time))
    });
  }
  return history;
};

const generateRiskData = () => ({
  score: Math.floor(Math.random() * 100),
  confidence: 85 + Math.floor(Math.random() * 15),
  lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  factors: [
    { name: 'Rising Current Trend', weight: 35, status: 'warning' },
    { name: 'Transformer Temperature', weight: 28, status: 'normal' },
    { name: 'Weather Conditions', weight: 22, status: 'caution' }
  ],
  explanation: 'Current levels have increased 15% over the past 6 hours, indicating potential load stress. Recent weather patterns suggest increased demand.'
});

interface AnalyticsSectionProps {
  onSelectionChange?: (type: 'pole' | 'timeline' | 'risk', data: any) => void;
}

export default function AnalyticsSection({ onSelectionChange }: AnalyticsSectionProps) {
  // Live Trends state
  const [timeRange, setTimeRange] = useState('24');
  const [trendData, setTrendData] = useState(generateTrendData(24));
  const [selectedSeries, setSelectedSeries] = useState<string[]>(['voltage', 'current']);
  const [isLoading, setIsLoading] = useState(false);

  // Fault History state
  const [faultHistory, setFaultHistory] = useState(generateFaultHistory());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [severityFilter, setSeverityFilter] = useState('all');

  // Predictive Risk state
  const [riskData, setRiskData] = useState(generateRiskData());
  const [showExplanation, setShowExplanation] = useState(false);

  // Update trend data when time range changes
  useEffect(() => {
    setIsLoading(true);
    const timeout = setTimeout(() => {
      setTrendData(generateTrendData(parseInt(timeRange)));
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timeout);
  }, [timeRange]);

  // Polling for live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTrendData(generateTrendData(parseInt(timeRange)));
      setRiskData(generateRiskData());
    }, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const handleSeriesToggle = useCallback((series: string) => {
    setSelectedSeries(prev => {
      const newSelection = prev.includes(series) 
        ? prev.filter(s => s !== series)
        : [...prev, series];
      
      onSelectionChange?.('pole', { series: newSelection });
      return newSelection;
    });
  }, [onSelectionChange]);

  const handleDayClick = useCallback((dayIndex: number) => {
    setSelectedDay(selectedDay === dayIndex ? null : dayIndex);
    onSelectionChange?.('timeline', { day: dayIndex, data: faultHistory[dayIndex] });
  }, [selectedDay, faultHistory, onSelectionChange]);

  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-600';
    if (score < 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskBgColor = (score: number) => {
    if (score < 30) return 'bg-green-100';
    if (score < 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'warning': return 'bg-red-100 text-red-700';
      case 'caution': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  const filteredEvents = selectedDay !== null 
    ? faultHistory[selectedDay].events.filter(event => 
        severityFilter === 'all' || event.severity.toLowerCase() === severityFilter
      )
    : [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'voltage' ? 'Voltage' : 'Current'}: {entry.value.toFixed(2)}
              {entry.dataKey === 'voltage' ? 'V' : 'A'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Live Trends Chart */}
      <Card className="lg:col-span-2 bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <ChartSpline className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Live Trends - Last {timeRange}h</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1h</SelectItem>
                <SelectItem value="6">6h</SelectItem>
                <SelectItem value="24">24h</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant={selectedSeries.includes('voltage') ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSeriesToggle('voltage')}
              className="h-8"
            >
              <div className="w-3 h-3 bg-chart-1 rounded-full mr-2" />
              Voltage
            </Button>
            <Button
              variant={selectedSeries.includes('current') ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSeriesToggle('current')}
              className="h-8"
            >
              <div className="w-3 h-3 bg-chart-2 rounded-full mr-2" />
              Current
            </Button>
          </div>
          
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="time" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  yAxisId="voltage"
                  orientation="left"
                  stroke="#6b7280"
                  fontSize={12}
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <YAxis 
                  yAxisId="current"
                  orientation="right"
                  stroke="#6b7280"
                  fontSize={12}
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                <Tooltip content={<CustomTooltip />} />
                {selectedSeries.includes('voltage') && (
                  <Line
                    yAxisId="voltage"
                    type="monotone"
                    dataKey="voltage"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                )}
                {selectedSeries.includes('current') && (
                  <Line
                    yAxisId="current"
                    type="monotone"
                    dataKey="current"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Fault History Timeline */}
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <ChartArea className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Fault History - 7 Days</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {faultHistory.map((day, index) => (
              <div key={index} className="space-y-2">
                <Button
                  variant="ghost"
                  className={`w-full justify-between p-3 h-auto ${
                    selectedDay === index ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                  onClick={() => handleDayClick(index)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{day.date}</span>
                    {day.faultCount === 0 ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        No faults ✓
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">
                          {day.faultCount} faults
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {day.totalDuration}min
                        </span>
                      </div>
                    )}
                  </div>
                </Button>

                {selectedDay === index && day.events.length > 0 && (
                  <div className="ml-4 space-y-2 animate-accordion-down">
                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue placeholder="Filter severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {filteredEvents.map((event) => (
                        <div key={event.id} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{event.time}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                event.severity === 'High' ? 'border-red-500 text-red-700' :
                                event.severity === 'Medium' ? 'border-yellow-500 text-yellow-700' :
                                'border-green-500 text-green-700'
                              }`}
                            >
                              {event.severity}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{event.description}</div>
                            <div className="text-muted-foreground">{event.duration}min</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Predictive Risk Indicator */}
      <Card className="lg:col-start-3 bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <LayoutPanelTop className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold">AI Risk Assessment</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${getRiskBgColor(riskData.score)} mb-2`}>
              <span className={`text-2xl font-bold ${getRiskColor(riskData.score)}`}>
                {riskData.score}
              </span>
            </div>
            <div className="space-y-1">
              <p className={`font-semibold ${getRiskColor(riskData.score)}`}>
                {riskData.score < 30 ? 'Low Risk' : riskData.score < 70 ? 'Medium Risk' : 'High Risk'}
              </p>
              <p className="text-xs text-muted-foreground">
                {riskData.confidence}% confidence • Updated {riskData.lastUpdated}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Contributing Factors:</p>
            {riskData.factors.map((factor, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(factor.status).split(' ')[0]}`} />
                  <span className="text-sm">{factor.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{factor.weight}%</span>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExplanation(!showExplanation)}
            className="w-full"
          >
            {showExplanation ? 'Hide' : 'Explain'} Prediction
          </Button>

          {showExplanation && (
            <div className="p-3 bg-muted rounded-lg text-sm animate-accordion-down">
              <p className="text-muted-foreground">{riskData.explanation}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}