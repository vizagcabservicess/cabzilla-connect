
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface LedgerTab {
  id: string;
  label: string;
  count?: number;
}

interface LedgerTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  tabs: LedgerTab[];
}

export function LedgerTabs({ activeTab, onTabChange, tabs }: LedgerTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="w-full">
        {tabs.map(tab => (
          <TabsTrigger key={tab.id} value={tab.id} className="flex-1">
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <Badge variant="outline" className="ml-2">
                {tab.count}
              </Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
