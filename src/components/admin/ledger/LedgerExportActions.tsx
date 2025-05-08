
import React, { useState } from 'react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ledgerAPI } from '@/services/api/ledgerAPI';
import { DateRange } from 'react-day-picker';

interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  filters?: any;
}

interface LedgerExportActionsProps {
  dateRange: DateRange | undefined;
  activeTab: string;
}

export function LedgerExportActions({ dateRange, activeTab }: LedgerExportActionsProps) {
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      setIsExporting(true);
      
      // Get the current filters based on active tab and date range
      const filters = {
        dateRange,
        type: activeTab === 'all' ? 'all' : activeTab === 'payments' ? 'income' : activeTab === 'expenses' ? 'expense' : activeTab === 'emis' ? 'emi' : undefined
      };
      
      // Call the API to export
      await ledgerAPI.exportLedger(format, filters);
      
      // In a real app, this would trigger a download
      toast.success(`Ledger data exported as ${format.toUpperCase()}`, {
        description: "Your file is ready to download"
      });
    } catch (error) {
      console.error(`Error exporting as ${format}:`, error);
      toast.error("Export failed", {
        description: "There was an error exporting your data. Please try again."
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleScheduleExport = async () => {
    if (!email) {
      toast.error("Email required", { description: "Please enter an email address" });
      return;
    }
    
    try {
      await ledgerAPI.scheduleExport(exportFormat, email, frequency);
      
      toast.success("Export scheduled", {
        description: `${exportFormat.toUpperCase()} will be sent to ${email} ${frequency}`
      });
      
      setIsScheduleOpen(false);
    } catch (error) {
      console.error("Error scheduling export:", error);
      toast.error("Scheduling failed", {
        description: "There was an error scheduling your export. Please try again."
      });
    }
  };

  return (
    <div className="flex space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isExporting}>
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => handleExport('csv')}>
              CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('excel')}>
              Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('pdf')}>
              PDF
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setIsScheduleOpen(true)}
              className="border-t border-gray-100 mt-2 pt-2"
            >
              Schedule Export...
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Regular Exports</DialogTitle>
            <DialogDescription>
              Set up automated exports to be delivered to your email.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="format">Format</Label>
                <Select value={exportFormat} onValueChange={(value: 'pdf' | 'excel' | 'csv') => setExportFormat(value)}>
                  <SelectTrigger id="format">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={frequency} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setFrequency(value)}>
                  <SelectTrigger id="frequency">
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsScheduleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleExport}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
