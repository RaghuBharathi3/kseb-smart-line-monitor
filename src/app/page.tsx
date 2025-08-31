"use client";

import { useState, useCallback } from "react";
import { Search, User, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import MapControlPanel from "@/components/MapControlPanel";
import AnalyticsSection from "@/components/AnalyticsSection";
import MobileFieldAppShell from "@/components/MobileFieldAppShell";

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  const handleAnalyticsSelection = useCallback((type: 'pole' | 'timeline' | 'risk', data: any) => {
    console.log(`Analytics selection - Type: ${type}`, data);
  }, []);

  if (showMobilePreview) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-sm mx-auto border-x border-border bg-card">
          <div className="p-4 border-b border-border bg-accent/50 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Mobile Field App Preview
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowMobilePreview(false)}
            >
              Back to Desktop Dashboard
            </Button>
          </div>
          <MobileFieldAppShell />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Logo and Title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">K</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">KSEB</h1>
                <p className="text-sm text-muted-foreground">Smart LT Line Monitor</p>
              </div>
            </div>
          </div>

          {/* Search and Quick Filter */}
          <div className="flex items-center gap-4 flex-1 justify-center max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search poles, locations, alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>
          </div>

          {/* User Status Area */}
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowMobilePreview(true)}
              className="hidden md:flex"
            >
              📱 Mobile Preview
            </Button>
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                3
              </Badge>
            </Button>
            <Button variant="ghost" size="sm">
              <User className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto px-6 py-6 space-y-8">
        {/* Two-Column Layout: Map + Control Panel */}
        <section>
          <MapControlPanel className="w-full" />
        </section>

        {/* Bottom Analytics Strip */}
        <section className="w-full">
          <AnalyticsSection onSelectionChange={handleAnalyticsSelection} />
        </section>
      </main>
    </div>
  );
}