import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { FuelRecord, FleetVehicle } from '@/types/cab';
import { format } from 'date-fns';
import { FuelPriceManager } from '@/components/admin/fuel/FuelPriceManager';
import { FuelRecordForm } from '@/components/admin/fuel/FuelRecordForm';
import { 
  Fuel, 
  Trash, 
  Edit, 
  CreditCard, 
  Banknote, 
  CircleDollarSign,
  Gauge,
  ChevronDown,
  Download,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { FuelRecordsPDF } from '@/components/pdf/FuelRecordsPDF';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import AdminLayout from "@/components/admin/AdminLayout";

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function shiftIsoDay(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + days);
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${nextMonth}-${nextDay}`;
}

function formatIsoDayLabel(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function DateStrip({
  fromDate,
  toDate,
  onSelectDay,
  onSelectAll,
}: {
  fromDate: string;
  toDate: string;
  onSelectDay: (iso: string) => void;
  onSelectAll: () => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const start = todayIso();
  const pastDays = 180;
  const days = Array.from({ length: pastDays + 1 + 21 }, (_, index) => shiftIsoDay(start, index - pastDays));
  const allSelected = fromDate === '' && toDate === '';

  useEffect(() => {
    const node = stripRef.current;
    const today = node?.querySelector<HTMLElement>('[data-today="1"]');
    if (!node || !today) return;
    node.scrollLeft = today.offsetLeft;
  }, []);

  return (
    <div className="flex items-stretch gap-1">
      <button
        type="button"
        onClick={onSelectAll}
        className={`flex min-w-[52px] shrink-0 flex-col items-center justify-center rounded-lg px-2 py-1.5 text-[10px] font-semibold uppercase ${
          allSelected ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
        }`}
      >
        All
        <span className="text-[10px] font-medium normal-case">dates</span>
      </button>
      <div ref={stripRef} className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto pb-1">
      {days.map((iso) => {
        const [year, month, day] = iso.split('-').map(Number);
        const date = new Date(year, (month || 1) - 1, day || 1);
        const selected = fromDate === iso && toDate === iso;
        return (
          <button
            key={iso}
            type="button"
            data-today={iso === start ? '1' : undefined}
            onClick={() => onSelectDay(iso)}
            className={`flex min-w-[52px] shrink-0 flex-col items-center rounded-lg px-2 py-1 leading-tight ${
              selected ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
            }`}
          >
            <span className={`text-[10px] font-semibold uppercase ${selected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
              {date.toLocaleDateString('en-IN', { weekday: 'short' })}
            </span>
            <span className="text-base font-semibold tabular-nums">{String(day).padStart(2, '0')}</span>
            <span className={`text-[10px] font-semibold uppercase ${selected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
              {date.toLocaleDateString('en-IN', { month: 'short' })}
            </span>
          </button>
        );
      })}
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-card px-2 py-1.5">
      <div className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function SearchableFilter({
  allLabel,
  selectedLabel,
  options,
  onSelect,
}: {
  allLabel: string;
  selectedLabel: string;
  options: Array<{ value: string; label: string }>;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? options.filter((option) => option.label.toLowerCase().includes(needle))
    : options;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-9 w-full justify-between px-3 font-normal">
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-2" align="start">
        <Input
          autoFocus
          placeholder={`Search ${allLabel.toLowerCase()}`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="mt-2 max-h-60 overflow-y-auto">
          <button
            type="button"
            className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => {
              onSelect('');
              setOpen(false);
            }}
          >
            {allLabel}
          </button>
          {filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => {
                onSelect(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
          {filtered.length === 0 ? (
            <p className="px-2 py-2 text-sm text-muted-foreground">No matches</p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function FuelManagementPage() {
  const [activeTab, setActiveTab] = useState<string>("fuel");
  const [fuelData, setFuelData] = useState<FuelRecord[]>([]);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVehicle, setFilterVehicle] = useState("");
  const [filterDriver, setFilterDriver] = useState("");
  const [filterFuelType, setFilterFuelType] = useState<string>("all");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [editingRecord, setEditingRecord] = useState<FuelRecord | null>(null);
  const [confirmDeleteRecord, setConfirmDeleteRecord] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fillingSheet, setFillingSheet] = useState(false);
  const [fillProgress, setFillProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [sheetReport, setSheetReport] = useState<{
    filled: number;
    missing: Array<{ date: string; vehicle: string; amount: string; driver: string; reason: string }>;
    failed: Array<{ guest: string; doj: string; vehicle: string; reason: string }>;
  } | null>(null);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch vehicles
      const vehiclesResponse = await fetch('/api/admin/fleet_vehicles.php/vehicles');
      if (!vehiclesResponse.ok) throw new Error('Failed to fetch vehicles');
      const vehiclesJson = await vehiclesResponse.json();
      if (vehiclesJson.vehicles) {
        setVehicles(vehiclesJson.vehicles);
      }

      const driversResponse = await fetch('/api/admin/driver.php');
      if (driversResponse.ok) {
        const driversJson = await driversResponse.json();
        const rows = Array.isArray(driversJson.data) ? driversJson.data : [];
        setDrivers(rows
          .map((driver: { id?: string | number; name?: string }) => ({
            id: String(driver.id ?? ''),
            name: String(driver.name ?? '').trim(),
          }))
          .filter((driver: { id: string; name: string }) => driver.id !== '' && driver.name !== ''));
      }
      
      // Fetch fuel records
      const fuelResponse = await fetch('/api/admin/fuel_records.php');
      if (!fuelResponse.ok) throw new Error('Failed to fetch fuel records');
      const fuelJson = await fuelResponse.json();
      if (fuelJson.status === 'success' && fuelJson.data?.fuelRecords) {
        setFuelData(fuelJson.data.fuelRecords);
      } else if (fuelJson.records) {
        setFuelData(fuelJson.records);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error('Failed to load data from the server.');
    } finally {
      setIsLoading(false);
    }
  };

  const driverNameById = useMemo(() => {
    const names = new Map<string, string>();
    drivers.forEach((driver) => names.set(driver.id, driver.name));
    return names;
  }, [drivers]);

  const recordDriverName = (record: FuelRecord): string => {
    if (record.driverName) return record.driverName;
    if (record.driverId == null || record.driverId === '') return '';
    return driverNameById.get(String(record.driverId)) || '';
  };

  const recordDateKey = (fillDate: string): string => String(fillDate || '').slice(0, 10);

  const handleAddFuelRecord = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEditFuelRecord = (record: FuelRecord) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleSaveFuelRecord = async (record: Partial<FuelRecord>): Promise<void> => {
    try {
      if (!record.id) {
        // Add new record (POST)
        const response = await fetch('/api/admin/fuel_records.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'Failed to add record');
        toast.success('Fuel record added successfully');
      } else {
        // Update existing record (PUT)
        const response = await fetch(`/api/admin/fuel_records.php?id=${record.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'Failed to update record');
        toast.success('Fuel record updated successfully');
      }
      // Refresh data from backend
      fetchData();
    } catch (error) {
      console.error("Error saving fuel record:", error);
      toast.error('Failed to save fuel record');
      throw error;
    }
  };

  const handleDeleteFuelRecord = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/fuel_records.php?id=${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.status !== 'success') throw new Error(data.message || 'Failed to delete record');
      toast.success('Fuel record deleted successfully');
      setSelectedIds((current) => current.filter((selectedId) => selectedId !== id));
      fetchData();
    } catch (error) {
      console.error("Error deleting fuel record:", error);
      toast.error('Failed to delete fuel record');
    } finally {
      setConfirmDeleteRecord(null);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFilterVehicle("");
    setFilterDriver("");
    setFilterFuelType("all");
    setFilterPaymentMethod("all");
    setFromDate("");
    setToDate("");
  };

  const getVehicleDisplayName = (vehicleId: string): string => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return vehicleId;
    return `${vehicle.vehicleNumber} - ${vehicle.name} ${vehicle.model}`;
  };

  /** km/L since the previous fill of the same vehicle, including fills outside the current filter. */
  function calculateMileage(records: FuelRecord[]): FuelRecord[] {
    const MAX_KM_BETWEEN_FILLS = 4000;
    const grouped: { [vehicleId: string]: FuelRecord[] } = {};
    records.forEach(record => {
      if (!grouped[record.vehicleId]) grouped[record.vehicleId] = [];
      grouped[record.vehicleId].push(record);
    });
    Object.values(grouped).forEach(vehicleRecords => {
      vehicleRecords.sort((a, b) => {
        const td = new Date(a.fillDate).getTime() - new Date(b.fillDate).getTime();
        if (td !== 0) return td;
        return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
      });
      if (vehicleRecords.length > 0) vehicleRecords[0].calculatedMileage = null;
      for (let i = 1; i < vehicleRecords.length; i++) {
        const prev = vehicleRecords[i - 1];
        const curr = vehicleRecords[i];
        const fuel = curr.quantity;
        const prevOdo = prev.odometer;
        const currOdo = curr.odometer;
        let kmPerL: number | null = null;
        if (
          fuel > 0 &&
          prevOdo > 0 &&
          currOdo >= prevOdo
        ) {
          const distance = currOdo - prevOdo;
          if (distance > 0 && distance <= MAX_KM_BETWEEN_FILLS) {
            kmPerL = distance / fuel;
          }
        }
        curr.calculatedMileage = kmPerL;
      }
    });
    return records;
  }

  const recordsWithMileage = useMemo(() => {
    const withMileage = calculateMileage(fuelData);
    const search = searchTerm.trim().toLowerCase();
    return withMileage.filter((record) => {
      if (filterVehicle && String(record.vehicleId) !== filterVehicle) return false;
      if (filterDriver && String(record.driverId ?? '') !== filterDriver) return false;
      if (filterFuelType !== 'all' && record.fuelType !== filterFuelType) return false;
      if (filterPaymentMethod !== 'all' && record.paymentMethod !== filterPaymentMethod) return false;
      const day = recordDateKey(record.fillDate);
      if (fromDate && day < fromDate) return false;
      if (toDate && day > toDate) return false;
      if (!search) return true;
      const vehicleLabel = getVehicleDisplayName(record.vehicleId).toLowerCase();
      return (
        (record.fuelStation || '').toLowerCase().includes(search)
        || vehicleLabel.includes(search)
        || record.fuelType.toLowerCase().includes(search)
        || record.paymentMethod.toLowerCase().includes(search)
        || recordDriverName(record).toLowerCase().includes(search)
        || (record.vehicleNumber || '').toLowerCase().includes(search)
      );
    });
  }, [fuelData, searchTerm, filterVehicle, filterDriver, filterFuelType, filterPaymentMethod, fromDate, toDate, driverNameById, vehicles]);

  const totalFuelCost = recordsWithMileage.reduce((sum, record) => sum + record.totalCost, 0);
  const totalLiters = recordsWithMileage.reduce((sum, record) => sum + record.quantity, 0);
  const averageCostPerLiter = totalLiters > 0 ? totalFuelCost / totalLiters : 0;
  
  // Calculate average mileage from calculatedMileage
  const mileageRecords = recordsWithMileage.filter(r => r.calculatedMileage && r.calculatedMileage > 0);
  const averageMileage = mileageRecords.length > 0 
    ? mileageRecords.reduce((sum, r) => sum + r.calculatedMileage, 0) / mileageRecords.length
    : 0;

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  // Get payment method display with icon
  const getPaymentMethodDisplay = (method: string, details?: { bankName?: string, lastFourDigits?: string }) => {
    switch (method) {
      case 'Cash':
        return (
          <div className="flex items-center">
            <Banknote className="h-4 w-4 mr-1 text-green-600" />
            <span>Cash</span>
          </div>
        );
      case 'Card':
        return (
          <div className="flex items-center">
            <CreditCard className="h-4 w-4 mr-1 text-blue-600" />
            <span>
              {details?.bankName ? `${details.bankName}${details.lastFourDigits ? ` - ${details.lastFourDigits}` : ''}` : 'Card'}
            </span>
          </div>
        );
      case 'Company':
        return (
          <div className="flex items-center">
            <CircleDollarSign className="h-4 w-4 mr-1 text-purple-600" />
            <span>Company</span>
          </div>
        );
      case 'Customer':
        return (
          <div className="flex items-center">
            <CircleDollarSign className="h-4 w-4 mr-1 text-orange-600" />
            <span>Customer</span>
          </div>
        );
      default:
        return method;
    }
  };

  // Type-safe function to handle confirmation ID setting
  const handleConfirmDelete = (id: string | number) => {
    // Convert to string to ensure type compatibility with state
    setConfirmDeleteRecord(id.toString());
  };

  const exportRows = () => recordsWithMileage.map((record) => [
    formatDate(record.fillDate),
    recordDriverName(record) || '',
    getVehicleDisplayName(record.vehicleId),
    record.fuelType,
    record.quantity.toFixed(1),
    record.pricePerUnit.toFixed(2),
    record.totalCost.toFixed(2),
    String(record.odometer ?? ''),
    record.calculatedMileage ? record.calculatedMileage.toFixed(1) : '',
    record.paymentMethod,
    record.fuelStation || '',
  ]);

  const exportHeaders = ['Date', 'Driver', 'Vehicle', 'Fuel type', 'Liters', 'Price per liter', 'Total cost', 'Odometer', 'Mileage', 'Payment', 'Fuel station'];

  const downloadCsv = () => {
    const escapeCell = (value: string) => (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
    const lines = [exportHeaders, ...exportRows()].map((row) => row.map(escapeCell).join(','));
    const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `fuel-records-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const downloadPdf = async () => {
    try {
      const blob = await pdf(
        <FuelRecordsPDF
          subtitle={`${recordsWithMileage.length} record${recordsWithMileage.length === 1 ? '' : 's'}${fromDate || toDate ? ` · ${fromDate || 'start'} to ${toDate || 'latest'}` : ''}`}
          headers={exportHeaders}
          rows={exportRows()}
        />
      ).toBlob();
      saveAs(blob, `fuel-records-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error(error);
      toast.error('Could not download the PDF');
    }
  };

  const visibleIds = recordsWithMileage.map((record) => String(record.id));
  const selectedVisibleIds = visibleIds.filter((id) => selectedIds.includes(id));
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleIds.length === visibleIds.length;

  const toggleVisibleSelection = (checked: boolean) => {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, ...visibleIds]));
      return current.filter((id) => !visibleIds.includes(id));
    });
  };

  const toggleRowSelection = (id: string, checked: boolean) => {
    setSelectedIds((current) => (checked ? Array.from(new Set([...current, id])) : current.filter((selectedId) => selectedId !== id)));
  };

  const handleDeleteSelected = async () => {
    const ids = selectedVisibleIds;
    if (ids.length === 0) return;
    setIsDeleting(true);
    try {
      const results = await Promise.all(ids.map(async (id) => {
        const response = await fetch(`/api/admin/fuel_records.php?id=${id}`, { method: 'DELETE' });
        const data = await response.json();
        return data.status === 'success';
      }));
      const deleted = results.filter(Boolean).length;
      if (deleted === 0) throw new Error('Failed to delete records');
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
      toast.success(deleted === 1 ? '1 fuel record deleted' : `${deleted} fuel records deleted`);
      if (deleted < ids.length) toast.error(`${ids.length - deleted} records could not be deleted`);
      fetchData();
    } catch (error) {
      console.error("Error deleting fuel records:", error);
      toast.error('Failed to delete the selected fuel records');
    } finally {
      setIsDeleting(false);
      setConfirmBulkDelete(false);
    }
  };

  const fillSheet = async () => {
    const confirmed = window.confirm('Replace the fuel amounts on the sheet with the fuel already saved for each trip?');
    if (!confirmed) return;
    setFillingSheet(true);
    setFillProgress({ done: 0, total: 0, label: 'Starting…' });
    try {
      const response = await fetch('/api/admin/fuel_records.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fill-sheet', stream: true }),
      });
      const contentType = response.headers.get('content-type') || '';
      let data: {
        status?: string;
        message?: string;
        data?: {
          filled?: number;
          missing?: Array<{ date: string; vehicle: string; amount: string; driver: string; reason: string }>;
          failed?: Array<{ guest: string; doj: string; vehicle: string; reason: string }>;
        };
      } | null = null;
      if (contentType.includes('ndjson') && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        const take = (line: string) => {
          const trimmed = line.trim();
          if (!trimmed.startsWith('{')) return;
          const event = JSON.parse(trimmed) as {
            type?: string;
            done?: number;
            total?: number;
            label?: string;
            status?: string;
            message?: string;
            data?: NonNullable<typeof data>['data'];
          };
          if (event.type === 'progress') {
            setFillProgress({
              done: Number(event.done ?? 0),
              total: Number(event.total ?? 0),
              label: event.label || 'Updating the sheet',
            });
            return;
          }
          if (event.type === 'error') {
            throw new Error(event.message || 'Could not fill the sheet');
          }
          if (event.type === 'result' || event.status) {
            data = { status: event.status, message: event.message, data: event.data };
          }
        };
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          lines.forEach(take);
        }
        if (buffer.trim()) take(buffer);
      } else {
        data = await response.json();
      }
      if (!data || data.status !== 'success') {
        throw new Error(data?.message || 'Could not fill the sheet');
      }
      const missing = Array.isArray(data.data?.missing) ? data.data.missing : [];
      const failed = Array.isArray(data.data?.failed) ? data.data.failed : [];
      const filled = Number(data.data?.filled ?? 0);
      if (missing.length > 0 || failed.length > 0) {
        setSheetReport({ filled, missing, failed });
      }
      toast.success(data.message || 'Fuel written onto the sheet');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not fill the sheet');
    } finally {
      setFillingSheet(false);
      setFillProgress(null);
    }
  };

  const driverOptions = drivers
    .map((driver) => ({ value: driver.id, label: driver.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const vehicleOptions = vehicles.map((vehicle) => ({
    value: String(vehicle.id),
    label: `${vehicle.vehicleNumber} - ${vehicle.name} ${vehicle.model}`.replace(/\s+/g, ' ').trim(),
  }));
  const selectedDriverLabel = driverOptions.find((option) => option.value === filterDriver)?.label || 'All drivers';
  const selectedVehicleLabel = vehicleOptions.find((option) => option.value === filterVehicle)?.label || 'All vehicles';
  const filtersActive = Boolean(
    searchTerm || filterDriver || filterVehicle || fromDate || toDate || filterFuelType !== 'all' || filterPaymentMethod !== 'all'
  );
  const dateRangeLabel = !fromDate && !toDate
    ? 'All dates'
    : fromDate && toDate && fromDate === toDate
      ? formatIsoDayLabel(fromDate)
      : `${fromDate ? formatIsoDayLabel(fromDate) : 'Start'} to ${toDate ? formatIsoDayLabel(toDate) : 'latest'}`;

  return (
    <AdminLayout activeTab="fuel">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Fuel Management</h1>
            <p className="text-xs text-muted-foreground">Records for {dateRangeLabel}.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void fetchData();
              }}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing…' : 'Refresh'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => { void fillSheet(); }} disabled={fillingSheet}>
              {fillingSheet ? 'Filling…' : 'Fill sheet'}
            </Button>
            <Button type="button" size="sm" onClick={handleAddFuelRecord}>
              <Fuel className="mr-2 h-4 w-4" />
              Add record
            </Button>
          </div>
        </div>

        {fillingSheet && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>{fillProgress?.label || 'Updating the sheet…'}</span>
              <span>
                {fillProgress && fillProgress.total > 0
                  ? `${Math.min(fillProgress.done, fillProgress.total)} / ${fillProgress.total}`
                  : ''}
              </span>
            </div>
            <Progress
              value={fillProgress && fillProgress.total > 0 ? (fillProgress.done / fillProgress.total) * 100 : 0}
              className="h-2"
            />
          </div>
        )}

        <FuelPriceManager onPriceUpdate={fetchData} />

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
          <Metric title="Fuel cost" value={`₹${totalFuelCost.toFixed(0)}`} />
          <Metric title="Litres" value={`${totalLiters.toFixed(1)} L`} />
          <Metric title="Avg price" value={`₹${averageCostPerLiter.toFixed(2)}`} />
          <Metric title="Mileage" value={`${averageMileage.toFixed(1)} km/L`} />
        </div>

        <DateStrip
          fromDate={fromDate}
          toDate={toDate}
          onSelectDay={(iso) => {
            setFromDate(iso);
            setToDate(iso);
          }}
          onSelectAll={() => {
            setFromDate('');
            setToDate('');
          }}
        />

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Input
            className="h-9 w-44 shrink-0"
            placeholder="Driver, vehicle, station"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <div className="w-40 shrink-0">
            <SearchableFilter
              allLabel="All drivers"
              selectedLabel={selectedDriverLabel}
              options={driverOptions}
              onSelect={setFilterDriver}
            />
          </div>
          <div className="w-44 shrink-0">
            <SearchableFilter
              allLabel="All vehicles"
              selectedLabel={selectedVehicleLabel}
              options={vehicleOptions}
              onSelect={setFilterVehicle}
            />
          </div>
          <div className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-2">
            <span className="text-xs text-muted-foreground">From</span>
            <Input
              type="date"
              className="h-7 w-[128px] border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>
          <div className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-2">
            <span className="text-xs text-muted-foreground">To</span>
            <Input
              type="date"
              className="h-7 w-[128px] border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </div>
          <div className="w-32 shrink-0">
            <SearchableFilter
              allLabel="All fuel"
              selectedLabel={filterFuelType === 'all' ? 'All fuel' : filterFuelType}
              options={[
                { value: 'Petrol', label: 'Petrol' },
                { value: 'Diesel', label: 'Diesel' },
                { value: 'CNG', label: 'CNG' },
                { value: 'Electric', label: 'Electric' },
              ]}
              onSelect={(value) => setFilterFuelType(value || 'all')}
            />
          </div>
          <div className="w-36 shrink-0">
            <SearchableFilter
              allLabel="All payments"
              selectedLabel={filterPaymentMethod === 'all' ? 'All payments' : filterPaymentMethod}
              options={[
                { value: 'Cash', label: 'Cash' },
                { value: 'Card', label: 'Card' },
                { value: 'Company', label: 'Company' },
                { value: 'Customer', label: 'Customer' },
              ]}
              onSelect={(value) => setFilterPaymentMethod(value || 'all')}
            />
          </div>
          <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" onClick={resetFilters} disabled={!filtersActive}>
            Reset
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 py-3">
            <CardTitle className="text-base">Fuel records ({recordsWithMileage.length}) · {dateRangeLabel}</CardTitle>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={downloadCsv} disabled={recordsWithMileage.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => { void downloadPdf(); }} disabled={recordsWithMileage.length === 0}>
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setConfirmBulkDelete(true)}
                disabled={selectedVisibleIds.length === 0 || isDeleting}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete{selectedVisibleIds.length > 0 ? ` (${selectedVisibleIds.length})` : ''}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-auto pt-0">
            
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allVisibleSelected ? true : selectedVisibleIds.length > 0 ? 'indeterminate' : false}
                          onCheckedChange={(checked) => toggleVisibleSelection(checked === true)}
                          aria-label="Select all visible fuel records"
                          disabled={visibleIds.length === 0}
                        />
                      </TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Fuel Type</TableHead>
                      <TableHead className="text-right">Liters</TableHead>
                      <TableHead className="text-right">Price/L (₹)</TableHead>
                      <TableHead className="text-right">Total Cost (₹)</TableHead>
                      <TableHead className="text-right">Odometer</TableHead>
                      <TableHead className="text-right">Mileage</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Fuel Station</TableHead>
                      <TableHead>GPS</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recordsWithMileage.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={14} className="text-center py-8">
                          <p className="text-gray-500">No fuel records found. Add a new record or adjust your filters.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      recordsWithMileage.map((record) => (
                        <TableRow key={record.id} data-state={selectedIds.includes(String(record.id)) ? 'selected' : undefined}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(String(record.id))}
                              onCheckedChange={(checked) => toggleRowSelection(String(record.id), checked === true)}
                              aria-label={`Select fuel record for ${recordDriverName(record) || 'this driver'}`}
                            />
                          </TableCell>
                          <TableCell>{formatDate(record.fillDate)}</TableCell>
                          <TableCell>
                            <div>{recordDriverName(record) || '—'}</div>
                            {record.loggedAfterTripEnd === true ? (
                              <div className="text-[10px] text-gray-500">After trip end</div>
                            ) : record.loggedAfterTripEnd === false ? (
                              <div className="text-[10px] text-gray-500">Before trip end</div>
                            ) : null}
                          </TableCell>
                          <TableCell className="font-medium">{getVehicleDisplayName(record.vehicleId)}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              record.fuelType === 'Petrol' ? 'bg-green-100 text-green-800' :
                              record.fuelType === 'Diesel' ? 'bg-blue-100 text-blue-800' :
                              record.fuelType === 'CNG' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {record.fuelType}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{record.quantity.toFixed(1)}</TableCell>
                          <TableCell className="text-right">{record.pricePerUnit.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">₹{record.totalCost.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{record.odometer.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            {record.calculatedMileage ? (
                              <span className="inline-flex items-center">
                                <Gauge className="h-3 w-3 mr-1 text-green-600" />
                                {record.calculatedMileage.toFixed(1)}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{getPaymentMethodDisplay(record.paymentMethod, record.paymentDetails)}</TableCell>
                          <TableCell>{record.fuelStation}</TableCell>
                          <TableCell className="text-sm">
                            {record.latitude != null &&
                            record.longitude != null &&
                            !Number.isNaN(record.latitude) &&
                            !Number.isNaN(record.longitude) ? (
                              <a
                                href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {record.latitude.toFixed(4)}, {record.longitude.toFixed(4)}
                              </a>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditFuelRecord(record)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-500 hover:text-red-700" 
                                onClick={() => handleConfirmDelete(record.id)}
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fuel Record Form Dialog */}
        <FuelRecordForm 
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSaveFuelRecord}
          editingRecord={editingRecord}
        />

{/* Delete Confirmation Dialog */}
        <Dialog open={sheetReport != null} onOpenChange={(open) => !open && setSheetReport(null)}>
          <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Trips not synced to the sheet</DialogTitle>
              <DialogDescription>
                {sheetReport ? `${sheetReport.filled} trip${sheetReport.filled === 1 ? '' : 's'} updated.` : ''}
                {' '}A new row is added when that vehicle has no trip on the date. When several trips cover the date, the fuel is written on one of them.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              {sheetReport?.missing.map((item, index) => (
                <div key={`missing-${index}`} className="rounded-md border px-3 py-2">
                  <p className="font-medium">{item.date} · {item.vehicle} · {item.amount}</p>
                  <p className="text-muted-foreground">{item.driver ? `${item.driver}. ` : ''}{item.reason}</p>
                </div>
              ))}
              {sheetReport?.failed.map((item, index) => (
                <div key={`failed-${index}`} className="rounded-md border px-3 py-2">
                  <p className="font-medium">
                    {[item.doj, item.guest, item.vehicle].filter(Boolean).join(' · ') || 'Sheet update'}
                  </p>
                  <p className="text-muted-foreground">{item.reason}</p>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => setSheetReport(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={!!confirmDeleteRecord} onOpenChange={(open) => !open && setConfirmDeleteRecord(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Fuel Record</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this fuel record? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDeleteRecord(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => confirmDeleteRecord && handleDeleteFuelRecord(confirmDeleteRecord)}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmBulkDelete} onOpenChange={(open) => !open && !isDeleting && setConfirmBulkDelete(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete selected fuel records</DialogTitle>
              <DialogDescription>
                Delete {selectedVisibleIds.length} fuel record{selectedVisibleIds.length === 1 ? '' : 's'}? This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmBulkDelete(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => { void handleDeleteSelected(); }} disabled={isDeleting}>
                {isDeleting ? 'Deleting…' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
