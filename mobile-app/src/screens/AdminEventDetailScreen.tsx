import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EventCreateSheet, type EventFormMode } from '../components/events/EventCreateSheet';
import { EventDateButton } from '../components/events/EventDateButton';
import { EventLiveBoard } from '../components/events/EventLiveBoard';
import { shareBase64File, shareCsvFile, sharePdfFile } from '../lib/eventReportExport';
import { WEB_APP_BASE_URL } from '../config';
import type { RootStackParamList } from '../navigation/types';
import {
  formatDutyDate,
  formatDutyDateRange,
  mobileEventAPI,
  type EventAssignmentRow,
  type EventAuditEntry,
  type EventDocInfo,
  type EventDocumentItem,
  type EventDutyRow,
  type EventFleetVehicle,
  type EventPerson,
  type EventShareToken,
  type MobileEvent,
} from '../services/eventDutyAPI';
import { colors, fonts } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminEventDetail'>;
type Tab = 'overview' | 'live' | 'vehicles' | 'drivers' | 'assignments' | 'duties' | 'documents' | 'reports' | 'share' | 'settings';
type Screen = 'home' | Tab;

const TILES: Array<{ id: Tab; label: string; hint: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = [
  { id: 'overview', label: 'Overview', hint: 'Event summary and insights', icon: 'stats-chart', color: '#2563eb', bg: '#dbeafe' },
  { id: 'live', label: 'Live', hint: 'Track vehicles in real time', icon: 'navigate', color: '#16a34a', bg: '#dcfce7' },
  { id: 'vehicles', label: 'Vehicles', hint: 'Manage event vehicles', icon: 'car-sport', color: '#ef4444', bg: '#fee2e2' },
  { id: 'drivers', label: 'Drivers', hint: 'View and manage drivers', icon: 'people', color: '#7c3aed', bg: '#ede9fe' },
  { id: 'assignments', label: 'Assignments', hint: 'Vehicle and driver assignments', icon: 'document-text', color: '#f97316', bg: '#ffedd5' },
  { id: 'duties', label: 'Duties', hint: 'Manage duty schedules', icon: 'calendar', color: '#2563eb', bg: '#dbeafe' },
  { id: 'documents', label: 'Documents', hint: 'Event documents and files', icon: 'folder-open', color: '#7c3aed', bg: '#ede9fe' },
  { id: 'reports', label: 'Daily Reports', hint: 'View duty reports', icon: 'newspaper', color: '#2563eb', bg: '#dbeafe' },
  { id: 'share', label: 'Share Event', hint: 'Share with team', icon: 'share-social', color: '#16a34a', bg: '#dcfce7' },
  { id: 'settings', label: 'Settings', hint: 'Event configuration', icon: 'settings-outline', color: '#64748b', bg: '#f1f5f9' },
];

const BOTTOM: Array<{ id: Screen; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'live', label: 'Live', icon: 'location' },
  { id: 'duties', label: 'Duties', icon: 'calendar' },
  { id: 'reports', label: 'Reports', icon: 'document-text' },
];

const FILTER_TABS: Tab[] = ['overview', 'vehicles', 'drivers', 'assignments', 'duties', 'documents', 'reports'];

function addModeFor(tab: Tab): EventFormMode | null {
  if (tab === 'vehicles') return 'vehicle';
  if (tab === 'drivers') return 'driver';
  if (tab === 'assignments') return 'assignment';
  return null;
}

export function AdminEventDetailScreen({ route }: Props) {
  const { eventId, name } = route.params;
  const navigation = useNavigation();
  const [screen, setScreen] = useState<Screen>('home');
  const [moreOpen, setMoreOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [latestFirst, setLatestFirst] = useState(true);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [event, setEvent] = useState<MobileEvent | null>(null);
  const [assignments, setAssignments] = useState<EventAssignmentRow[]>([]);
  const [duties, setDuties] = useState<EventDutyRow[]>([]);
  const [documents, setDocuments] = useState<EventDocumentItem[]>([]);
  const [vehicles, setVehicles] = useState<EventFleetVehicle[]>([]);
  const [drivers, setDrivers] = useState<EventPerson[]>([]);
  const [tokens, setTokens] = useState<EventShareToken[]>([]);
  const [audit, setAudit] = useState<EventAuditEntry[]>([]);
  const [rejectFor, setRejectFor] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loadingOffice, setLoadingOffice] = useState(true);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [formMode, setFormMode] = useState<EventFormMode | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<EventAssignmentRow | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<EventFleetVehicle | null>(null);
  const [vehicle, setVehicle] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const datesReady = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void mobileEventAPI.ensureShareToken(eventId).then((value) => {
      if (!cancelled) setToken(value);
    }).catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Could not open this event');
    });
    return () => { cancelled = true; };
  }, [eventId]);

  const loadOffice = useCallback(async () => {
    setLoadingOffice(true);
    try {
      const [loaded, assignmentRows, dutyRows, documentRows, fleet, shareTokens, auditRows] = await Promise.all([
        mobileEventAPI.getEvent(eventId),
        mobileEventAPI.listAssignments(eventId),
        mobileEventAPI.listDuties(eventId),
        mobileEventAPI.listDocuments(eventId),
        mobileEventAPI.fleetOptions(eventId),
        mobileEventAPI.listShareTokens(eventId).catch(() => [] as EventShareToken[]),
        mobileEventAPI.audit(eventId).catch(() => [] as EventAuditEntry[]),
      ]);
      setEvent(loaded);
      if (!datesReady.current) {
        setFrom(loaded.startDate);
        setTo(loaded.endDate);
        datesReady.current = true;
      }
      setAssignments(assignmentRows);
      setDuties(dutyRows);
      setDocuments(documentRows);
      setVehicles(fleet.vehicles);
      setDrivers(fleet.drivers);
      setTokens(shareTokens);
      setAudit(auditRows);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the event office');
    } finally {
      setLoadingOffice(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadOffice();
  }, [loadOffice]);

  const inRange = useCallback((date?: string | null) => {
    if (!date) return true;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  }, [from, to]);

  const filteredAssignments = useMemo(() => assignments.filter((row) => {
    if (vehicle !== 'all' && (row.vehicleNumber || '') !== vehicle) return false;
    const rowDates = row.dates || [];
    if (rowDates.length === 0) return true;
    return rowDates.some((date) => inRange(date));
  }), [assignments, inRange, vehicle]);

  const filteredDuties = useMemo(() => duties.filter((row) => {
    if (row.status === 'cancelled') return false;
    if (vehicle !== 'all' && (row.vehicleNumber || '') !== vehicle) return false;
    return inRange(row.dutyDate);
  }), [duties, inRange, vehicle]);

  const filteredDocuments = useMemo(() => documents.filter((row) => {
    if (vehicle !== 'all' && (row.vehicleNumber || '') !== vehicle) return false;
    return inRange(row.dutyDate);
  }), [documents, inRange, vehicle]);

  const filteredVehicles = useMemo(() => vehicles.filter((row) => vehicle === 'all' || row.vehicleNumber === vehicle), [vehicle, vehicles]);

  const filteredDrivers = useMemo(() => drivers.filter((row) => {
    if (vehicle === 'all') return true;
    return assignments.some((item) => (item.driverName === row.name || item.driverMobile === row.phone) && item.vehicleNumber === vehicle);
  }), [assignments, drivers, vehicle]);

  const vehicleOptions = useMemo(() => {
    const numbers = new Set<string>();
    for (const row of [...assignments, ...vehicles, ...duties]) {
      if (row.vehicleNumber) numbers.add(row.vehicleNumber);
    }
    return ['all', ...[...numbers].sort()];
  }, [assignments, duties, vehicles]);

  const completed = filteredDuties.filter((row) => row.status === 'completed').length;
  const totalKm = filteredDuties.reduce((sum, row) => sum + (Number(row.totalKm) || 0), 0);
  const requirements = (event?.requirementGroups ?? []).filter((group) => {
    const rowDates = group.dates || [];
    if (rowDates.length === 0) return true;
    return rowDates.some((date) => inRange(date));
  });
  const shareUrl = token ? `${WEB_APP_BASE_URL.replace(/\/$/, '')}/event/share/${token}` : '';

  const listedDuties = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = filteredDuties.filter((row) => {
      if (!q) return true;
      return `${row.vehicleNumber || ''} ${row.driverName || ''} ${row.dutySlipNo || ''}`.toLowerCase().includes(q);
    });
    return [...rows].sort((a, b) => {
      const cmp = (a.dutyDate || '').localeCompare(b.dutyDate || '');
      return latestFirst ? -cmp : cmp;
    });
  }, [filteredDuties, latestFirst, query]);

  const reportRows = useMemo(() => {
    const grouped = new Map<string, { vehicle: string; driver: string; days: number; km: number }>();
    for (const duty of filteredDuties) {
      const vehicle = duty.vehicleNumber || 'Unassigned';
      const driver = duty.driverName || 'No driver';
      const key = `${vehicle}::${driver}`;
      const current = grouped.get(key) ?? { vehicle, driver, days: 0, km: 0 };
      current.days += 1;
      current.km += Number(duty.totalKm) || 0;
      grouped.set(key, current);
    }
    return [...grouped.values()];
  }, [filteredDuties]);

  const loadTemplate = async () => {
    setApplyingTemplate(true);
    try {
      const updated = await mobileEventAPI.applyOctoberTemplate(eventId);
      setEvent(updated);
      await loadOffice();
    } catch (err) {
      Alert.alert('Could not load requirements', err instanceof Error ? err.message : 'Try again');
    } finally {
      setApplyingTemplate(false);
    }
  };

  const archiveEvent = () => {
    Alert.alert('Archive event', 'This hides the event from the active list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        onPress: () => {
          void mobileEventAPI.archiveEvent(eventId).then(() => navigation.goBack()).catch((err: unknown) => {
            Alert.alert('Could not archive', err instanceof Error ? err.message : 'Try again');
          });
        },
      },
    ]);
  };

  const deleteEvent = () => {
    Alert.alert('Delete event', 'Unstarted duties will be removed. Started duties must be cancelled first.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void mobileEventAPI.deleteEvent(eventId).then(() => navigation.goBack()).catch((err: unknown) => {
            Alert.alert('Could not delete', err instanceof Error ? err.message : 'Try again');
          });
        },
      },
    ]);
  };

  const openFile = async (id: number, title: string) => {
    try {
      const file = await mobileEventAPI.downloadDocument(id);
      const ext = file.mime.includes('pdf') ? 'pdf' : file.mime.includes('png') ? 'png' : 'jpg';
      await shareBase64File(`${title}.${ext}`, file.data, file.mime);
    } catch (err) {
      Alert.alert('Could not open the file', err instanceof Error ? err.message : 'Try again');
    }
  };

  const downloadAssignmentFiles = async (row: EventAssignmentRow) => {
    const files = Object.entries({ ...row.driverDocuments, ...row.vehicleDocuments })
      .filter((entry): entry is [string, EventDocInfo] => Boolean(entry[1]?.id));
    if (files.length === 0) {
      Alert.alert('No files', 'Nothing has been uploaded for this vehicle and driver yet.');
      return;
    }
    for (const [type, info] of files) {
      await openFile(info.id, `${row.vehicleNumber || 'vehicle'}-${prettyDoc(type)}`);
    }
  };

  const exportRows = async (kind: 'excel' | 'pdf') => {
    const code = (event?.eventCode || 'event').replace(/[^a-zA-Z0-9\-_.]/g, '_');
    const name = event?.name || 'Event';
    const range = `${vehicle === 'all' ? 'All vehicles' : vehicle} \u00B7 ${formatDutyDate(from) || 'start'} \u2013 ${formatDutyDate(to) || 'end'}`;
    const dash = '\u2014';
    try {
      if (screen === 'vehicles') {
        const headers = ['SL.No', 'Vehicle', 'Model', 'RC', 'Insurance'];
        const rows = filteredVehicles.map((row, index) => [
          String(index + 1),
          row.vehicleNumber || dash,
          row.name || labelType(row.vehicleType) || dash,
          row.documents?.rc ? 'yes' : dash,
          row.documents?.insurance ? 'yes' : dash,
        ]);
        if (kind === 'excel') await shareCsvFile(`${code}-vehicles.csv`, headers, rows);
        else await sharePdfFile(`${code}-vehicles.pdf`, { heading: `${name} vehicles`, subtitle: range, headers, rows });
        return;
      }
      if (screen === 'documents') {
        const headers = ['SL.No', 'Vehicle', 'Driver', 'Date', 'Document', 'Status'];
        const rows = filteredDocuments.map((row, index) => [
          String(index + 1),
          row.vehicleNumber || dash,
          row.driverName || dash,
          row.dutyDate ? formatDutyDate(row.dutyDate) : dash,
          prettyDoc(row.docType),
          row.status || dash,
        ]);
        if (kind === 'excel') await shareCsvFile(`${code}-documents.csv`, headers, rows);
        else await sharePdfFile(`${code}-documents.pdf`, { heading: `${name} documents`, subtitle: range, headers, rows });
        return;
      }
      if (screen === 'assignments' || screen === 'drivers') {
        const headers = ['SL.No', 'Vehicle', 'Type', 'Driver', 'Mobile', 'Dates'];
        const rows = filteredAssignments.map((row, index) => [
          String(index + 1),
          row.vehicleNumber || dash,
          labelType(row.vehicleTypeLabel || row.vehicleType) || dash,
          row.driverName || dash,
          row.driverMobile || dash,
          formatDutyDateRange(row.dates || []),
        ]);
        if (kind === 'excel') await shareCsvFile(`${code}-assignments.csv`, headers, rows);
        else await sharePdfFile(`${code}-assignments.pdf`, { heading: `${name} assignments`, subtitle: range, headers, rows });
        return;
      }
      const headers = ['SL.No', 'Date', 'Slip', 'Vehicle', 'Driver', 'Opening KM', 'Closing KM', 'Total KM', 'Reported', 'Closing', 'Status'];
      const rows = filteredDuties.map((row, index) => [
        String(index + 1),
        row.dutyDate ? formatDutyDate(row.dutyDate) : dash,
        row.dutySlipNo || dash,
        row.vehicleNumber || dash,
        row.driverName || dash,
        row.openingKm != null ? String(row.openingKm) : dash,
        row.closingKm != null ? String(row.closingKm) : dash,
        row.totalKm != null ? String(row.totalKm) : dash,
        row.openingAt || dash,
        row.closingAt || dash,
        dutyStatus(row.status),
      ]);
      const slug = vehicle === 'all' ? 'all-vehicles' : vehicle;
      const dutyRange = `${formatDutyDate(from) || 'start'} \u2013 ${formatDutyDate(to) || 'end'} \u00B7 ${rows.length} duty day(s)`;
      if (kind === 'excel') await shareCsvFile(`${code}-${slug}-duties.csv`, headers, rows);
      else await sharePdfFile(`${code}-${slug}-duties.pdf`, {
        heading: vehicle === 'all' ? `${name} \u00B7 all vehicles` : `${name} \u00B7 ${vehicle}`,
        subtitle: dutyRange,
        headers,
        rows,
      });
    } catch (err) {
      Alert.alert('Could not download', err instanceof Error ? err.message : 'Try again');
    }
  };

  const sectionTitle = screen === 'home'
    ? (event?.name || name || 'Event')
    : (TILES.find((item) => item.id === screen)?.label || 'Event');
  const dutyDayCount = duties.filter((row) => row.status !== 'cancelled').length;
  const showFilters = screen !== 'home' && screen !== 'live' && FILTER_TABS.includes(screen);
  const openSection = (next: Screen) => {
    setMoreOpen(false);
    setScreen(next);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { if (screen === 'home') navigation.goBack(); else setScreen('home'); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>{sectionTitle}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {screen === 'home'
              ? (event?.eventCode || 'Loading event')
              : `${event?.name || name || 'Event'}${event?.eventCode ? ` · ${event.eventCode}` : ''}`}
          </Text>
        </View>
        {screen !== 'home' && addModeFor(screen) ? (
          <TouchableOpacity onPress={() => { setEditingVehicle(null); setEditingAssignment(null); setFormMode(addModeFor(screen)); }}>
            <Ionicons name="add-circle-outline" size={26} color="#2563eb" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setMoreOpen(true)} style={styles.backBtn}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.foreground} />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {screen === 'live' ? (
        <EventLiveBoard token={token || undefined} eventId={eventId} title={event?.name || name} startDate={event?.startDate} endDate={event?.endDate} />
      ) : loadingOffice && !event ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : screen === 'home' ? (
        <ScrollView contentContainerStyle={styles.list}>
          <View style={styles.rangePill}>
            <Ionicons name="calendar-outline" size={16} color="#64748b" />
            <Text style={styles.rangeText}>{event ? `${formatDutyDate(event.startDate)} – ${formatDutyDate(event.endDate)}` : 'Event dates'}</Text>
          </View>
          <View style={styles.statRow}>
            <HomeStat icon="car-sport" color="#2563eb" bg="#dbeafe" value={String(vehicles.length)} label="Vehicles" />
            <HomeStat icon="calendar" color="#16a34a" bg="#dcfce7" value={String(dutyDayCount)} label="Duty Days" />
            <HomeStat icon="people" color="#7c3aed" bg="#ede9fe" value={String(drivers.length)} label="Drivers" />
          </View>
          <View style={styles.grid}>
            {TILES.map((item) => (
              <TouchableOpacity key={item.id} style={styles.tile} onPress={() => openSection(item.id)}>
                <View style={[styles.tileIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <View style={styles.tileCopy}>
                  <Text style={styles.tileTitle}>{item.label}</Text>
                  <Text style={styles.tileHint}>{item.hint}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {showFilters ? (
            <View style={styles.filters}>
              <View style={styles.dateRow}>
                <EventDateButton
                  label="From"
                  value={from}
                  minimumDate={event?.startDate ? new Date(`${event.startDate}T00:00:00`) : undefined}
                  maximumDate={event?.endDate ? new Date(`${event.endDate}T00:00:00`) : undefined}
                  onChange={(iso) => {
                    setFrom(iso);
                    if (to && iso > to) setTo(iso);
                  }}
                />
                <EventDateButton
                  label="To"
                  value={to}
                  minimumDate={event?.startDate ? new Date(`${event.startDate}T00:00:00`) : undefined}
                  maximumDate={event?.endDate ? new Date(`${event.endDate}T00:00:00`) : undefined}
                  onChange={(iso) => {
                    setTo(iso);
                    if (from && iso < from) setFrom(iso);
                  }}
                />
              </View>
              {screen === 'reports' || screen === 'duties' || screen === 'assignments' ? (
                <TextInput
                  style={styles.search}
                  placeholder="Search vehicle number or driver name"
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                />
              ) : null}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {vehicleOptions.map((item) => (
                  <TouchableOpacity key={item} style={[styles.chip, vehicle === item && styles.chipOn]} onPress={() => setVehicle(item)}>
                    <Text style={[styles.chipText, vehicle === item && styles.chipTextOn]}>{item === 'all' ? 'All vehicles' : item}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {screen === 'reports' || screen === 'duties' ? (
                <View style={styles.reportHead}>
                  <Text style={styles.reportCount}>{listedDuties.length} duty days · {reportRows.length} vehicles</Text>
                  <TouchableOpacity onPress={() => setLatestFirst((current) => !current)}>
                    <Text style={styles.sortText}>{latestFirst ? 'Date (Latest)' : 'Date (Oldest)'}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={styles.actions}>
                <Action label="Excel" onPress={() => { void exportRows('excel'); }} />
                <Action label="PDF" onPress={() => { void exportRows('pdf'); }} />
              </View>
              {screen === 'assignments' ? (
                <View style={styles.actions}>
                  <Action label="Add vehicle to event" onPress={() => { setEditingAssignment(null); setFormMode('assignment'); }} />
                  <Action label="Bulk requirement" onPress={() => { setEditingAssignment(null); setFormMode('bulk'); }} />
                </View>
              ) : null}
            </View>
          ) : null}
          {renderTab({
            tab: screen,
            event,
            assignments: filteredAssignments.filter((row) => {
              const q = query.trim().toLowerCase();
              if (!q || screen !== 'assignments') return true;
              return `${row.vehicleNumber || ''} ${row.driverName || ''}`.toLowerCase().includes(q);
            }),
            duties: listedDuties,
            documents: filteredDocuments,
            vehicles: filteredVehicles,
            drivers: filteredDrivers,
            requirements,
            completed,
            totalKm,
            reportRows,
            shareUrl,
            applyingTemplate,
            onTemplate: () => { void loadTemplate(); },
            onArchive: archiveEvent,
            onDelete: deleteEvent,
            tokens,
            audit,
            onShare: () => { if (shareUrl) void Share.share({ message: shareUrl }); },
            onReload: () => { void loadOffice(); },
            onReject: (id: number) => { setRejectReason(''); setRejectFor(id); },
            onOpenFile: (id: number, title: string) => { void openFile(id, title); },
            onDownloadFiles: (row: EventAssignmentRow) => { void downloadAssignmentFiles(row); },
            onEditVehicle: (row: EventFleetVehicle) => { setEditingVehicle(row); setFormMode('vehicle'); },
            onAssignmentAction: (next: EventFormMode, row: EventAssignmentRow) => { setEditingAssignment(row); setFormMode(next); },
          })}
        </ScrollView>
      )}
      <View style={styles.bottom}>
        {BOTTOM.map((item) => {
          const on = screen === item.id;
          return (
            <TouchableOpacity key={item.id} style={styles.bottomItem} onPress={() => openSection(item.id)}>
              <Ionicons name={on ? item.icon : `${item.icon}-outline` as keyof typeof Ionicons.glyphMap} size={22} color={on ? '#2563eb' : '#94a3b8'} />
              <Text style={[styles.bottomLabel, on && styles.bottomLabelOn]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={styles.bottomItem} onPress={() => setMoreOpen(true)}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#94a3b8" />
          <Text style={styles.bottomLabel}>More</Text>
        </TouchableOpacity>
      </View>
      <Modal visible={moreOpen} animationType="fade" transparent onRequestClose={() => setMoreOpen(false)}>
        <TouchableOpacity style={styles.modal} activeOpacity={1} onPress={() => setMoreOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>More</Text>
            {TILES.filter((item) => !BOTTOM.some((bar) => bar.id === item.id)).map((item) => (
              <TouchableOpacity key={item.id} style={styles.moreRow} onPress={() => openSection(item.id)}>
                <View style={[styles.tileIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={16} color={item.color} />
                </View>
                <Text style={styles.moreLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
      <EventCreateSheet
        mode={formMode}
        eventId={eventId}
        startDate={event?.startDate}
        endDate={event?.endDate}
        vehicles={vehicles}
        drivers={drivers}
        assignment={editingAssignment}
        editingVehicle={editingVehicle}
        onClose={() => { setFormMode(null); setEditingAssignment(null); setEditingVehicle(null); }}
        onSaved={(saved) => {
          setFormMode(null);
          setEditingAssignment(null);
          setEditingVehicle(null);
          void loadOffice();
          if (saved === 'assignment') setScreen('assignments');
          if (saved === 'vehicle') setScreen('vehicles');
          if (saved === 'driver') setScreen('drivers');
        }}
      />
      <Modal visible={rejectFor != null} animationType="fade" transparent>
        <View style={styles.modal}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Reject document</Text>
            <TextInput style={styles.input} placeholder="Reason" value={rejectReason} onChangeText={setRejectReason} />
            <TouchableOpacity
              style={styles.save}
              onPress={() => {
                if (!rejectFor || !rejectReason.trim()) {
                  Alert.alert('Reason', 'Enter why this document is rejected.');
                  return;
                }
                const id = rejectFor;
                setRejectFor(null);
                void mobileEventAPI.rejectDocument(id, rejectReason.trim()).then(() => loadOffice()).catch((err: unknown) => {
                  Alert.alert('Could not reject', err instanceof Error ? err.message : 'Try again');
                });
              }}
            >
              <Text style={styles.saveText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRejectFor(null)}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function renderTab(props: {
  tab: Tab;
  event: MobileEvent | null;
  assignments: EventAssignmentRow[];
  duties: EventDutyRow[];
  documents: EventDocumentItem[];
  vehicles: EventFleetVehicle[];
  drivers: EventPerson[];
  requirements: NonNullable<MobileEvent['requirementGroups']>;
  completed: number;
  totalKm: number;
  reportRows: Array<{ vehicle: string; driver: string; days: number; km: number }>;
  shareUrl: string;
  tokens: EventShareToken[];
  audit: EventAuditEntry[];
  applyingTemplate: boolean;
  onTemplate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onShare: () => void;
  onReload: () => void;
  onReject: (id: number) => void;
  onOpenFile: (id: number, title: string) => void;
  onDownloadFiles: (row: EventAssignmentRow) => void;
  onEditVehicle: (row: EventFleetVehicle) => void;
  onAssignmentAction: (mode: 'dates' | 'edit' | 'replace', row: EventAssignmentRow) => void;
}) {
  const { tab } = props;
  switch (tab) {
    case 'overview':
      return (
        <View>
          <View style={styles.stats}>
            <Stat label="Assignments" value={String(props.assignments.length)} />
            <Stat label="Duty days" value={String(props.duties.length)} />
            <Stat label="Completed" value={String(props.completed)} />
            <Stat label="Total KM" value={String(props.totalKm)} />
          </View>
          <Text style={styles.section}>Requirements</Text>
          {props.requirements.map((group) => (
            <View key={group.id} style={styles.card}>
              <Text style={styles.cardTitle}>{group.quantity} × {group.vehicleTypeLabel}</Text>
              <Text style={styles.cardMeta}>
                {group.passengerCount ? `${group.passengerCount} pax · ` : ''}{formatDutyDateRange(group.dates)}
              </Text>
            </View>
          ))}
          {props.requirements.length === 0 ? <Text style={styles.empty}>No vehicle requirements yet.</Text> : null}
          <TouchableOpacity style={styles.outline} disabled={props.applyingTemplate} onPress={props.onTemplate}>
            <Text style={styles.outlineText}>{props.applyingTemplate ? 'Loading…' : 'Load October 2026 vehicle requirements'}</Text>
          </TouchableOpacity>
        </View>
      );
    case 'live':
      return null;
    case 'vehicles':
      return props.vehicles.length === 0 ? <Text style={styles.empty}>No event vehicles yet. Tap + to add one, with RC and insurance.</Text> : (
        <>
          {props.vehicles.map((row) => (
            <View key={row.id} style={styles.card}>
              <Text style={styles.cardTitle}>{row.vehicleNumber} · {labelType(row.vehicleType)}</Text>
              <Text style={styles.cardMeta}>{row.ownerName || 'No owner'}{row.ownerMobile ? ` · ${row.ownerMobile}` : ''}</Text>
              <Text style={styles.cardMeta}>{vehicleDocs(row.documents)}</Text>
              <FileLinks docs={row.documents} onOpen={props.onOpenFile} />
              <View style={styles.actions}>
                <Action label="Edit" onPress={() => props.onEditVehicle(row)} />
                <Action label="Delete" danger onPress={() => confirm('Remove this vehicle from the event?', () => mobileEventAPI.deleteVehicle(row.id, props.event?.id ?? 0).then(() => props.onReload()))} />
              </View>
            </View>
          ))}
        </>
      );
    case 'drivers':
      return props.drivers.length === 0 ? <Text style={styles.empty}>No drivers yet. Tap + to add a driver.</Text> : (
        <>
          {props.drivers.map((row) => {
            const assigned = props.assignments.find((item) => item.driverMobile === row.phone || item.driverName === row.name);
            return (
              <View key={row.id} style={styles.card}>
                <Text style={styles.cardTitle}>{row.name}{row.phone ? ` · ${row.phone}` : ''}</Text>
                <Text style={styles.cardMeta}>{assigned?.vehicleNumber || 'No vehicle'} · {labelType(assigned?.vehicleTypeLabel || assigned?.vehicleType)}</Text>
                <Text style={styles.cardMeta}>{driverDocs(row.documents)}{row.aadhaarMasked ? ` · ${row.aadhaarMasked}` : ''}</Text>
                <FileLinks docs={row.documents} onOpen={props.onOpenFile} />
                <View style={styles.actions}>
                  <Action label="Remove" danger onPress={() => {
                    if (!props.event) return;
                    confirm('Remove this driver from the event?', () => mobileEventAPI.removeDriver(props.event!.id, row.id).then(() => props.onReload()));
                  }} />
                </View>
              </View>
            );
          })}
        </>
      );
    case 'assignments':
      return props.assignments.length === 0 ? <Text style={styles.empty}>No assignments yet. Tap + to assign a vehicle and driver.</Text> : (
        <>
          {props.assignments.map((row) => (
            <View key={row.id} style={styles.card}>
              <Text style={styles.cardTitle}>{row.vehicleNumber || 'No vehicle number'}</Text>
              <Text style={styles.cardMeta}>{labelType(row.vehicleTypeLabel || row.vehicleType)}</Text>
              <Text style={styles.cardMeta}>{row.driverName || 'No driver'}{row.driverMobile ? ` · ${row.driverMobile}` : ''}</Text>
              <Text style={styles.cardMeta}>{formatDutyDateRange(row.dates || [])}</Text>
              <Text style={styles.cardMeta}>{driverDocs(row.driverDocuments)}</Text>
              <Text style={styles.cardMeta}>{vehicleDocs(row.vehicleDocuments)}</Text>
              <FileLinks docs={{ ...row.driverDocuments, ...row.vehicleDocuments }} onOpen={props.onOpenFile} />
              <TouchableOpacity style={styles.downloadBtn} onPress={() => props.onDownloadFiles(row)}>
                <Ionicons name="download-outline" size={16} color="#2563eb" />
                <Text style={styles.downloadText}>Download files</Text>
              </TouchableOpacity>
              <View style={styles.actions}>
                <Action label="Add dates" onPress={() => props.onAssignmentAction('dates', row)} />
                <Action label="Edit" onPress={() => props.onAssignmentAction('edit', row)} />
                <Action label="Replace" onPress={() => props.onAssignmentAction('replace', row)} />
                <Action label="Send registration" onPress={() => {
                  void mobileEventAPI.createDriverLink(row.id).then((url) => Share.share({ message: url })).then(() => props.onReload()).catch((err: unknown) => {
                    Alert.alert('Could not send registration', err instanceof Error ? err.message : 'Try again');
                  });
                }} />
                <Action label="Delete" danger onPress={() => confirm('Delete this assignment?', () => mobileEventAPI.deleteAssignment(row.id).then(() => props.onReload()))} />
              </View>
            </View>
          ))}
        </>
      );
    case 'duties':
      return props.duties.length === 0 ? <Text style={styles.empty}>No duty days yet.</Text> : (
        <>
          {props.duties.map((row) => (
            <DutyCard key={row.id} row={row} onReload={props.onReload} onOpenFile={props.onOpenFile} />
          ))}
        </>
      );
    case 'documents':
      return props.documents.length === 0 ? <Text style={styles.empty}>No documents uploaded yet.</Text> : (
        <>
          {props.documents.map((row) => (
            <View key={row.id} style={styles.card}>
              <Text style={styles.cardTitle}>{prettyDoc(row.docType)}</Text>
              <Text style={styles.cardMeta}>{row.vehicleNumber || 'No vehicle'} · {row.driverName || 'No driver'}</Text>
              <Text style={styles.cardMeta}>{row.dutyDate ? formatDutyDate(row.dutyDate) : 'No date'} · {row.status}</Text>
              <View style={styles.actions}>
                <Action label="View" onPress={() => props.onOpenFile(row.id, prettyDoc(row.docType))} />
                <Action label="Verify" onPress={() => {
                  void mobileEventAPI.verifyDocument(row.id).then(() => props.onReload()).catch((err: unknown) => {
                    Alert.alert('Could not verify', err instanceof Error ? err.message : 'Try again');
                  });
                }} />
                <Action label="Reject" onPress={() => props.onReject(row.id)} />
                <Action label="Delete" danger onPress={() => confirm('Delete this document?', () => mobileEventAPI.deleteDocument(row.id).then(() => props.onReload()))} />
              </View>
            </View>
          ))}
        </>
      );
    case 'reports':
      return props.duties.length === 0 ? <Text style={styles.empty}>No duty days to report yet.</Text> : (
        <>
          {props.duties.map((row) => (
            <DutyCard key={row.id} row={row} onReload={props.onReload} onOpenFile={props.onOpenFile} />
          ))}
        </>
      );
    case 'share':
      return (
        <View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Share with event manager</Text>
            <Text style={styles.cardMeta}>Read-only. Aadhaar, driving licence, and vehicle documents are never shown.</Text>
            <TouchableOpacity
              style={styles.outline}
              onPress={() => {
                if (!props.event) return;
                void mobileEventAPI.createShare(props.event.id).then((url) => Share.share({ message: url })).then(() => props.onReload()).catch((err: unknown) => {
                  Alert.alert('Could not create the link', err instanceof Error ? err.message : 'Try again');
                });
              }}
            >
              <Text style={styles.outlineText}>Create / rotate share link</Text>
            </TouchableOpacity>
          </View>
          {props.tokens.map((row) => (
            <View key={row.id} style={styles.card}>
              <Text style={styles.cardTitle}>{row.active ? 'Active' : 'Revoked'}</Text>
              <Text style={styles.cardMeta}>Created {formatStamp(row.createdAt)}</Text>
              {row.active ? (
                <View style={styles.actions}>
                  <Action label="Copy link" onPress={() => { if (row.url) void Share.share({ message: row.url }); }} />
                  <Action label="Revoke" danger onPress={() => {
                    if (!props.event) return;
                    confirm('Revoke this share link?', () => mobileEventAPI.revokeShare(row.id, props.event!.id).then(() => props.onReload()));
                  }} />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      );
    case 'settings':
      return (
        <View>
          <Text style={styles.section}>Audit trail</Text>
          {props.audit.length === 0 ? <Text style={styles.empty}>No audit entries yet.</Text> : props.audit.map((row) => (
            <View key={row.id} style={styles.card}>
              <Text style={styles.cardTitle}>{formatStamp(row.createdAt)}</Text>
              <Text style={styles.cardMeta}>{row.actorType} {row.actorId || ''} · {row.action.replace(/_/g, ' ')}</Text>
              <Text style={styles.cardMeta}>{row.entityType} #{row.entityId}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.outline} onPress={props.onArchive}>
            <Text style={styles.outlineText}>Archive</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.danger} onPress={props.onDelete}>
            <Text style={styles.dangerText}>Delete event</Text>
          </TouchableOpacity>
        </View>
      );
    default: {
      const unreachable: never = tab;
      return unreachable;
    }
  }
}

function labelType(value?: string | null): string {
  if (!value) return 'Vehicle';
  return value.replace(/_/g, ' ');
}

function prettyDoc(value: string): string {
  return value.replace(/_/g, ' ');
}

function mark(docs: Record<string, EventDocInfo> | undefined, key: string, label: string): string {
  const doc = docs?.[key];
  if (!doc) return `${label} —`;
  return `${label} ${doc.status === 'verified' ? '✓' : doc.status}`;
}

function driverDocs(docs?: Record<string, EventDocInfo>): string {
  return [
    mark(docs, 'driver_photo', 'Photo'),
    mark(docs, 'dl_front', 'DL'),
    docs?.dl_back ? '+back' : '',
    mark(docs, 'aadhaar', 'Aadhaar'),
    docs?.aadhaar_back ? '+back' : '',
  ].filter(Boolean).join(' · ');
}

function vehicleDocs(docs?: Record<string, EventDocInfo>): string {
  return [
    mark(docs, 'rc', 'RC'),
    docs?.rc_back ? '+back' : '',
    mark(docs, 'insurance', 'Insurance'),
    docs?.insurance_back ? '+back' : '',
  ].filter(Boolean).join(' · ');
}

function formatStamp(value?: string | null): string {
  if (!value) return 'Not yet';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function dutyStatus(status?: string): string {
  if (!status) return '';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function confirm(message: string, run: () => Promise<unknown>) {
  Alert.alert(message, undefined, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Confirm',
      style: 'destructive',
      onPress: () => {
        void run().catch((err: unknown) => {
          Alert.alert('Could not update', err instanceof Error ? err.message : 'Try again');
        });
      },
    },
  ]);
}

function FileLinks({ docs, onOpen }: { docs?: Record<string, EventDocInfo>; onOpen: (id: number, title: string) => void }) {
  const files = Object.entries(docs || {}).filter((entry): entry is [string, EventDocInfo] => Boolean(entry[1]?.id));
  if (files.length === 0) return null;
  return (
    <View style={styles.actions}>
      {files.map(([type, info]) => (
        <Action key={`${type}-${info.id}`} label={prettyDoc(type)} onPress={() => onOpen(info.id, prettyDoc(type))} />
      ))}
    </View>
  );
}

function Action({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={[styles.action, danger && styles.actionDanger]} onPress={onPress}>
      <Text style={[styles.actionText, danger && styles.actionDangerText]}>{label}</Text>
    </TouchableOpacity>
  );
}

function DutyCard({ row, onReload, onOpenFile }: { row: EventDutyRow; onReload: () => void; onOpenFile: (id: number, title: string) => void }) {
  const started = Boolean(row.openingAt);
  const closed = Boolean(row.closingAt);
  const badge = row.status === 'completed' ? 'Completed' : row.status === 'in_progress' ? 'In progress' : 'Not reported';
  const badgeStyle = row.status === 'completed' ? styles.badgeOk : row.status === 'in_progress' ? styles.badgeRun : styles.badgeBad;
  const badgeText = row.status === 'completed' ? styles.badgeOkText : row.status === 'in_progress' ? styles.badgeRunText : styles.badgeBadText;
  const openMenu = () => {
    const buttons: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }> = [];
    if (row.openingPhotoId) buttons.push({ text: 'Opening photo', onPress: () => onOpenFile(row.openingPhotoId!, 'Opening photo') });
    if (row.closingPhotoId) buttons.push({ text: 'Closing photo', onPress: () => onOpenFile(row.closingPhotoId!, 'Closing photo') });
    if ((row.status === 'completed' || row.closingAt) && row.openingAt) {
      buttons.push({
        text: 'Continue duty',
        onPress: () => {
          confirm('Continue this duty? The ending odometer is removed and hours start counting again.', () => (
            mobileEventAPI.resumeDuty(row.id).then(() => onReload())
          ));
        },
      });
    }
    if (row.status === 'in_progress') {
      buttons.push({
        text: row.endRequestedAt ? 'Remind to end' : 'Ask to end',
        onPress: () => {
          void mobileEventAPI.requestDutyEnd(row.id).then(() => onReload()).catch((err: unknown) => {
            Alert.alert('Could not remind the driver', err instanceof Error ? err.message : 'Try again');
          });
        },
      });
      if (row.endRequestedAt && !row.closingAt) {
        buttons.push({
          text: 'Revoke end request',
          onPress: () => {
            confirm('Revoke the end request? Time starts counting again.', () => (
              mobileEventAPI.revokeDutyEnd(row.id).then(() => onReload())
            ));
          },
        });
      }
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(row.dutySlipNo || 'Duty', undefined, buttons);
  };
  return (
    <View style={styles.dutyCard}>
      <View style={styles.dutyTop}>
        <View style={styles.dutyDate}>
          <Ionicons name="calendar-outline" size={16} color="#64748b" />
          <View>
            <Text style={styles.dutyDateText}>{row.dutyDate ? formatDutyDate(row.dutyDate) : 'Duty'}</Text>
            <Text style={styles.dutySlip}>{row.dutySlipNo || ''}</Text>
          </View>
        </View>
        <View style={styles.dutyTopRight}>
          <Text style={[styles.badge, badgeStyle, badgeText]}>{badge}</Text>
          <TouchableOpacity onPress={openMenu} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.dutyLine}>
        <Ionicons name="car-sport-outline" size={16} color="#64748b" />
        <Text style={styles.dutyStrong}>{row.vehicleNumber || 'No vehicle'}</Text>
      </View>
      <View style={styles.dutyLine}>
        <Ionicons name="person-outline" size={16} color="#64748b" />
        <Text style={styles.dutyMeta}>{row.driverName || 'No driver'}</Text>
      </View>
      <View style={styles.dutyMetrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>KM</Text>
          <Text style={styles.metricValue}>{row.openingKm ?? '—'} → {row.closingKm ?? '—'}</Text>
          <Text style={started ? styles.metricOk : styles.metricBad}>{row.totalKm != null ? `${row.totalKm} km` : 'Not started'}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Reporting</Text>
          <Text style={styles.metricValue}>{started ? formatStamp(row.openingAt) : 'Not started'}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Closing</Text>
          <Text style={styles.metricValue}>{closed ? formatStamp(row.closingAt) : 'Not yet'}</Text>
        </View>
      </View>
      <View style={styles.dutyFoot}>
        <Text style={styles.dutyMeta}>Odometer {row.openingPhotoId || row.closingPhotoId ? 'Uploaded' : 'Not started'}</Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => confirm('Delete this duty?', () => mobileEventAPI.deleteDuty(row.id).then(() => onReload()))}>
          <Ionicons name="trash-outline" size={14} color="#dc2626" />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function HomeStat({ icon, color, bg, value, label }: { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; value: string; label: string }) {
  return (
    <View style={styles.homeStat}>
      <View style={[styles.tileIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.homeStatValue}>{value}</Text>
      <Text style={styles.homeStatLabel}>{label}</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backBtn: { padding: 4, marginRight: 8 },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontFamily: fonts.bold, color: colors.foreground },
  subtitle: { color: '#64748b', fontSize: 12, fontFamily: fonts.regular, marginTop: 2 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: '#fff' },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#e2e8f0' },
  tabOn: { backgroundColor: '#2563eb' },
  tabText: { color: '#334155', fontFamily: fonts.bold, fontSize: 13 },
  tabTextOn: { color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#b91c1c', paddingHorizontal: 16, paddingTop: 8 },
  list: { padding: 16, paddingBottom: 32 },
  filters: { marginBottom: 12 },
  filterLabel: { color: '#64748b', fontFamily: fonts.semiBold, fontSize: 12, marginBottom: 6 },
  dateRow: { flexDirection: 'row', gap: 8 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  stat: { width: '47%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  statLabel: { color: '#64748b', fontSize: 12, fontFamily: fonts.medium },
  statValue: { color: '#0f172a', fontSize: 22, fontFamily: fonts.bold, marginTop: 4 },
  section: { fontSize: 18, fontFamily: fonts.bold, color: '#0f172a', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 16, fontFamily: fonts.bold, color: '#0f172a' },
  cardMeta: { color: '#475569', marginTop: 4, fontFamily: fonts.regular },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  action: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#e2e8f0' },
  actionDanger: { backgroundColor: '#fee2e2' },
  actionText: { color: '#0f172a', fontFamily: fonts.semiBold, fontSize: 12 },
  actionDangerText: { color: '#b91c1c' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 12, marginBottom: 12, fontFamily: fonts.regular },
  outline: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8, backgroundColor: '#fff' },
  outlineText: { color: '#0f172a', fontFamily: fonts.semiBold },
  danger: { borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8, backgroundColor: '#fff' },
  dangerText: { color: '#b91c1c', fontFamily: fonts.semiBold },
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  sheetTitle: { fontSize: 18, fontFamily: fonts.bold, marginBottom: 12 },
  chips: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: '#e2e8f0' },
  chipOn: { backgroundColor: '#2563eb' },
  chipText: { color: '#334155', fontFamily: fonts.semiBold },
  chipTextOn: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 12 },
  save: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontFamily: fonts.bold },
  cancel: { textAlign: 'center', color: '#64748b', marginTop: 12, marginBottom: 8, fontFamily: fonts.medium },
  rangePill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 12, marginBottom: 12 },
  rangeText: { color: '#0f172a', fontFamily: fonts.semiBold, fontSize: 14 },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  homeStat: { flex: 1, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, alignItems: 'flex-start', gap: 6 },
  homeStatValue: { fontSize: 22, fontFamily: fonts.bold, color: '#0f172a' },
  homeStatLabel: { fontSize: 12, fontFamily: fonts.medium, color: '#64748b' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  tile: { width: '48.5%', marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 12 },
  tileIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tileCopy: { flex: 1 },
  tileTitle: { fontFamily: fonts.bold, color: '#0f172a', fontSize: 14 },
  tileHint: { fontFamily: fonts.regular, color: '#64748b', fontSize: 11, marginTop: 2 },
  search: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10, fontFamily: fonts.regular },
  reportHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  reportCount: { fontFamily: fonts.bold, color: '#0f172a', fontSize: 14 },
  sortText: { color: '#64748b', fontFamily: fonts.medium, fontSize: 12 },
  bottom: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#fff', paddingTop: 6 },
  bottomItem: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 },
  bottomLabel: { fontSize: 11, fontFamily: fonts.medium, color: '#94a3b8' },
  bottomLabelOn: { color: '#2563eb' },
  moreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  moreLabel: { fontFamily: fonts.semiBold, color: '#0f172a', fontSize: 15 },
  downloadBtn: { marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  downloadText: { color: '#2563eb', fontFamily: fonts.bold, fontSize: 13 },
  dutyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  dutyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  dutyDate: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dutyDateText: { fontFamily: fonts.bold, color: '#0f172a', fontSize: 15 },
  dutySlip: { color: '#94a3b8', fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  dutyTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { overflow: 'hidden', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontFamily: fonts.bold },
  badgeBad: { backgroundColor: '#fee2e2' },
  badgeBadText: { color: '#dc2626' },
  badgeRun: { backgroundColor: '#dbeafe' },
  badgeRunText: { color: '#1d4ed8' },
  badgeOk: { backgroundColor: '#dcfce7' },
  badgeOkText: { color: '#15803d' },
  dutyLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  dutyStrong: { fontFamily: fonts.bold, color: '#0f172a', fontSize: 15 },
  dutyMeta: { fontFamily: fonts.regular, color: '#475569', fontSize: 13 },
  dutyMetrics: { flexDirection: 'row', gap: 8, marginTop: 12 },
  metric: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 8 },
  metricLabel: { color: '#94a3b8', fontSize: 11, fontFamily: fonts.medium },
  metricValue: { color: '#0f172a', fontFamily: fonts.semiBold, fontSize: 12, marginTop: 4 },
  metricBad: { color: '#dc2626', fontFamily: fonts.bold, fontSize: 11, marginTop: 4 },
  metricOk: { color: '#15803d', fontFamily: fonts.bold, fontSize: 11, marginTop: 4 },
  dutyFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  deleteText: { color: '#dc2626', fontFamily: fonts.bold, fontSize: 12 },
});
