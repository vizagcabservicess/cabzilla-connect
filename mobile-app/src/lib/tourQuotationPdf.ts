import { assemblePdf, pdfLiteral, textWidth, wrapText } from './eventReportPdf';
import { QUOTATION_LOGO } from './quotationLogo';

export type QuotePdfInput = {
  tours: Array<{ name: string; days?: number; price?: number }>;
  guest?: string;
  phone?: string;
  pickup?: string;
  whenLabel?: string;
  duration?: string;
  vehicle?: string;
  seats?: string;
  lastDrop?: string;
  nightStays?: string[];
  dayPlans?: Array<{ day: number; title: string; places?: string }>;
  itinerary?: Array<{ day: number; heading: string; section?: string; activities: string[]; halt?: string }>;
  transfers?: Array<{ direction: 'from-airport' | 'to-airport'; placeName: string }>;
  packageAmount?: number;
  carrierIncluded?: boolean;
  carrierAmount?: number;
  extraLabel?: string;
  extraAmount?: number;
  discountAmount?: number;
  payable?: number;
  included?: string;
  excluded?: string;
  notes?: string;
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 36;
const BOTTOM = 36;
const WIDTH = PAGE_W - MARGIN * 2;

const GREEN = '0.102 0.227 0.165';
const GOLD = '0.831 0.627 0.090';
const CREAM = '0.961 0.902 0.702';
const CREAM_ALT = '0.980 0.941 0.800';
const INK = '0.208 0.208 0.208';
const MUTED = '0.420 0.447 0.502';
const WHITE = '1 1 1';

const NOTES = [
  "Driver's food expenses are not included in the above cost.",
  'AC will be switched off while travelling through ghat roads and while the vehicle is on standby.',
  'Sightseeing will be covered subject to available time, weather, road conditions and local circumstances. We will not be responsible for delays caused by traffic, road closures, strikes, bandhs or other unforeseen circumstances.',
  'For places inaccessible by our vehicle, the cab will proceed only up to the designated parking area. Guests will need to use local jeeps or autos at their own expense.',
  'During peak season, parking may be restricted at popular viewpoints. Guests may need to walk or use local autos at their own expense.',
  'Any extension beyond the agreed vehicle duty hours/time limit will incur additional charges.',
  'All sightseeing is planned route-wise and subject to the operational timings and accessibility of each location. Pickup location, date and time will be confirmed before travel.',
  'GST 18% is applicable only when a GST invoice is raised.',
];

const TERMS = [
  'Spitting or vomiting inside the bus/car can be unpleasant and difficult to clean up. The cost of cleaning can range from Rs. 500 to Rs. 1,000.',
  'Loud sound systems are not allowed. If you are caught playing loud music, you could be fined.',
  'Damage to any part of the bus/car is not tolerated. You will be responsible for the cost of repairs.',
  'Smoking and drinking are not allowed inside the buses/cars.',
  'Keep your belongings close to you and do not leave them unattended.',
  'Please read the entire terms and conditions and itinerary before booking.',
];

function n(value: number): string {
  return value.toFixed(2);
}

function fareLabel(amount: number | undefined): string {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 'Quote on request';
  const digits = String(Math.round(value));
  const grouped = digits.length <= 3
    ? digits
    : `${digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${digits.slice(-3)}`;
  return `Rs. ${grouped}/-`;
}

export function buildTourQuotationPdf(input: QuotePdfInput): string {
  const pages: string[][] = [];
  let cmds: string[] = [];
  let y = PAGE_H - MARGIN;

  const paint = (command: string) => {
    cmds.push(command);
  };
  const breakPage = () => {
    pages.push(cmds);
    cmds = [];
    y = PAGE_H - MARGIN;
  };
  const need = (height: number) => {
    if (y - height < BOTTOM) breakPage();
  };
  const line = (value: string, x: number, baseline: number, size: number, bold: boolean, color: string) => {
    paint(`BT ${bold ? '/F2' : '/F1'} ${n(size)} Tf ${color} rg 1 0 0 1 ${n(x)} ${n(baseline)} Tm (${pdfLiteral(value)}) Tj ET`);
  };
  const fill = (x: number, bottom: number, width: number, height: number, color: string) => {
    paint(`${color} rg ${n(x)} ${n(bottom)} ${n(width)} ${n(height)} re f`);
  };
  const rule = (color: string, weight = 1) => {
    paint(`${color} RG ${n(weight)} w ${n(MARGIN)} ${n(y)} m ${n(MARGIN + WIDTH)} ${n(y)} l S`);
  };
  const paragraph = (value: string, size: number, bold: boolean, color: string, gap = 3) => {
    const lines = wrapText(value, WIDTH, size, bold);
    const step = size + gap;
    need(lines.length * step + 4);
    lines.forEach((row, index) => {
      line(row, MARGIN, y - size - index * step, size, bold, color);
    });
    y -= lines.length * step + 4;
  };
  const sectionHead = (title: string) => {
    need(18);
    line(title, MARGIN, y - 8, 8, true, GOLD);
    y -= 11;
    rule(CREAM, 0.8);
    y -= 8;
  };
  const centered = (value: string, baseline: number, size: number, bold: boolean, color: string) => {
    const shown = wrapText(value, WIDTH - 24, size, bold)[0] || value;
    line(shown, MARGIN + (WIDTH - textWidth(shown, size, bold)) / 2, baseline, size, bold, color);
  };

  const guest = input.guest?.trim() || 'Guest';
  const vehicle = input.vehicle?.trim() || 'Cab';
  const seat = input.seats?.trim();
  const duration = input.duration?.trim() || 'As per itinerary';
  const route = input.tours.map((tour) => tour.name).join(' · ') || 'As per itinerary';
  const total = fareLabel(input.payable || input.packageAmount);
  const prepared = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const days = input.itinerary && input.itinerary.length > 0
    ? input.itinerary
    : (input.dayPlans || []).map((day) => ({
        day: day.day,
        heading: day.title,
        section: '',
        activities: day.places ? [day.places] : [],
        halt: '',
      }));

  const logoW = 136;
  const logoH = 36;
  paint(`q ${n(logoW)} 0 0 ${n(logoH)} ${n(MARGIN)} ${n(y - logoH)} cm /${QUOTATION_LOGO.name} Do Q`);
  line('TRIP QUOTATION', MARGIN + logoW + 12, y - 24, 16, true, GREEN);
  const date = `Date: ${prepared}`;
  line(date, PAGE_W - MARGIN - textWidth(date, 8), y - 10, 8, false, MUTED);
  y -= logoH + 8;
  rule(GOLD, 2.4);
  y -= 12;
  line(`Dear ${guest},`, MARGIN, y - 12, 12, true, GREEN);
  const phone = input.phone?.trim() || '';
  if (phone) line(phone, PAGE_W - MARGIN - textWidth(phone, 10, true), y - 11, 10, true, GREEN);
  y -= 20;
  paragraph(
    `Thank you for choosing Vizag Taxi Hub. Please find below the quotation for your ${duration} in a ${vehicle}${seat ? ` (${seat})` : ' (AC)'}. ${input.included || 'Private cab, driver and fuel as per package are included'}. ${input.pickup ? `Pickup from ${input.pickup}${input.whenLabel ? ` on ${input.whenLabel}` : ''}. ` : ''}Duration: ${duration}.`,
    9,
    false,
    INK,
    3
  );

  const boxW = WIDTH / 4;
  const boxH = 64;
  need(boxH + 8);
  fill(MARGIN, y - boxH, WIDTH, boxH, GREEN);
  fill(MARGIN, y - 5, WIDTH, 5, GOLD);
  const stats = [
    ['VEHICLE', seat ? vehicle : `${vehicle} (AC)`, seat ? `${seat} · AC` : 'Private AC cab', false],
    ['DURATION', duration, 'As per the route', false],
    ['ROUTE', route, '', false],
    ['TOTAL FARE', total, input.discountAmount ? `After discount ${fareLabel(input.discountAmount)}` : 'Private cab package', true],
  ] as const;
  stats.forEach((stat, index) => {
    const x = MARGIN + index * boxW + 6;
    line(stat[0], x, y - 16, 6.5, true, GOLD);
    const valueSize = stat[3] ? 11 : 8;
    wrapText(stat[1], boxW - 14, valueSize, true).slice(0, 2).forEach((row, rowIndex) => {
      line(row, x, y - 28 - rowIndex * 10, valueSize, true, WHITE);
    });
    if (stat[2]) line(wrapText(stat[2], boxW - 14, 6.5)[0] || '', x, y - 54, 6.5, false, CREAM);
  });
  y -= boxH + 8;

  const routeLine = wrapText(route, WIDTH - 16, 7, true)[0] || route;
  need(20);
  fill(MARGIN, y - 18, WIDTH, 18, GREEN);
  paint(`${GOLD} RG 1.4 w ${n(MARGIN)} ${n(y - 18)} ${n(WIDTH)} 18 re S`);
  line(routeLine, MARGIN + (WIDTH - textWidth(routeLine, 7, true)) / 2, y - 13, 7, true, CREAM);
  y -= 24;
  const includeParts = [input.included ? `${input.included} - INCLUDED` : '', input.excluded ? `${input.excluded} - NOT INCLUDED` : ''].filter(Boolean);
  if (includeParts.length > 0) {
    const lines = includeParts.flatMap((part) => wrapText(part, WIDTH - 16, 7.5, true));
    const h = 10 + lines.length * 11;
    need(h);
    fill(MARGIN, y - h, WIDTH, h, GREEN);
    paint(`0.102 0.478 0.227 RG 1.2 w ${n(MARGIN)} ${n(y - h)} ${n(WIDTH)} ${n(h)} re S`);
    lines.forEach((row, index) => {
      line(row, MARGIN + (WIDTH - textWidth(row, 7.5, true)) / 2, y - 14 - index * 11, 7.5, true, '0.667 1 0.667');
    });
    y -= h + 10;
  }

  sectionHead('DAY-WISE ITINERARY');
  (input.transfers || []).filter((transfer) => transfer.direction === 'from-airport').forEach((transfer) => {
    drawDay(need, line, fill, () => y, (next) => { y = next; }, {
      label: 'AIRPORT',
      heading: 'Airport pickup',
      activities: [`From Alluri Sitarama Raju International Airport to ${transfer.placeName}`],
    });
  });
  days.forEach((day) => {
    drawDay(need, line, fill, () => y, (next) => { y = next; }, {
      label: `DAY ${day.day}`,
      heading: day.heading,
      section: day.section,
      activities: day.activities,
      halt: day.halt,
    });
  });
  (input.transfers || []).filter((transfer) => transfer.direction === 'to-airport').forEach((transfer) => {
    drawDay(need, line, fill, () => y, (next) => { y = next; }, {
      label: 'AIRPORT',
      heading: 'Airport drop',
      activities: [`From ${transfer.placeName} to Alluri Sitarama Raju International Airport`],
    });
  });

  sectionHead('TOUR COST');
  const packageDays = days.length || input.tours.reduce((sum, tour) => sum + (tour.days || 0), 0) || 1;
  const kicker = `${packageDays}-DAY TOUR PACKAGE · ${vehicle.toUpperCase()}${seat ? ` (${seat.toUpperCase()})` : ' (AC)'}`;
  const costSubs = [
    input.packageAmount && input.payable && input.packageAmount !== input.payable ? `Package ${fareLabel(input.packageAmount)}` : '',
    input.carrierIncluded ? (input.carrierAmount ? `Carrier + ${fareLabel(input.carrierAmount)}` : 'Carrier included') : '',
    input.extraAmount ? `${input.extraLabel?.trim() || 'Extra'} + ${fareLabel(input.extraAmount)}` : '',
    input.discountAmount ? `Discount - ${fareLabel(input.discountAmount)}` : '',
    route,
  ].filter(Boolean);
  const costIncluded = input.included ? `${input.included} - INCLUDED` : '';
  const kickerLines = wrapText(kicker, WIDTH - 24, 8.5, true);
  const subLines = costSubs.flatMap((row) => wrapText(row, WIDTH - 24, 7.5));
  const incLines = costIncluded ? wrapText(costIncluded, WIDTH - 24, 7.5, true) : [];
  const fareSize = 28;
  const costHeight = 18 + kickerLines.length * 12 + 10 + fareSize + 16 + subLines.length * 11 + incLines.length * 11 + 8;
  need(costHeight);
  fill(MARGIN, y - costHeight, WIDTH, costHeight, GREEN);
  fill(MARGIN, y - 3, WIDTH, 3, GOLD);
  let costY = y - 16;
  kickerLines.forEach((row) => {
    centered(row, costY - 8.5, 8.5, true, GOLD);
    costY -= 12;
  });
  costY -= 6;
  centered(total, costY - fareSize, fareSize, true, WHITE);
  costY -= fareSize + 14;
  subLines.forEach((row) => {
    centered(row, costY - 7.5, 7.5, false, CREAM);
    costY -= 11;
  });
  incLines.forEach((row) => {
    centered(row, costY - 7.5, 7.5, true, '0.667 1 0.667');
    costY -= 11;
  });
  y -= costHeight + 12;

  sectionHead('IMPORTANT NOTES');
  const noteSource = input.notes?.trim()
    ? [input.notes.trim(), ...NOTES]
    : NOTES.map((note, index) => (
        index === 0 && /driver/i.test(input.included || '') && /allowance/i.test(input.included || '')
          ? "Driver's allowance, including food, is included in the above cost."
          : note
      ));
  noteSource.forEach((note, index) => drawNote(need, line, fill, () => y, (next) => { y = next; }, index + 1, note, index % 2 === 0));

  sectionHead('TERMS AND CONDITIONS');
  TERMS.forEach((term, index) => drawNote(need, line, fill, () => y, (next) => { y = next; }, index + 1, term, index % 2 === 0));

  need(62);
  y -= 8;
  line('Vizag Taxi Hub', MARGIN, y - 12, 12, true, GREEN);
  line('+91 99663 63662 · www.vizagtaxihub.com', MARGIN, y - 26, 8, false, MUTED);
  wrapText('44-66-22/4, Near Singalamma Temple, Kailasapuram, Visakhapatnam - 530024', 280, 8).forEach((row, index) => {
    line(row, MARGIN, y - 38 - index * 10, 8, false, MUTED);
  });
  const invite = 'We look forward to your confirmation.';
  line(invite, PAGE_W - MARGIN - textWidth(invite, 9, true), y - 12, 9, true, GREEN);
  const hint = 'Please reply or WhatsApp to confirm your booking.';
  line(hint, PAGE_W - MARGIN - textWidth(hint, 8), y - 26, 8, false, MUTED);
  const cta = 'Confirm Your Booking';
  line(cta, PAGE_W - MARGIN - textWidth(cta, 10, true), y - 42, 10, true, GOLD);

  pages.push(cmds);
  const streams = pages.map((page, index) => {
    const label = `Vizag Taxi Hub · ${guest} · ${vehicle} · Page ${index + 1}`;
    const footer = [
      `${GREEN} rg 0 0 ${n(PAGE_W)} 22 re f`,
      `BT /F2 7 Tf ${GOLD} rg 1 0 0 1 ${n(MARGIN)} 8 Tm (${pdfLiteral(label)}) Tj ET`,
    ];
    return [...page, ...footer].join('\n');
  });
  return assemblePdf(streams, PAGE_W, PAGE_H, [QUOTATION_LOGO]);
}

function drawDay(
  need: (height: number) => void,
  line: (value: string, x: number, baseline: number, size: number, bold: boolean, color: string) => void,
  fill: (x: number, bottom: number, width: number, height: number, color: string) => void,
  getY: () => number,
  setY: (value: number) => void,
  day: { label: string; heading: string; section?: string; activities: string[]; halt?: string }
) {
  const body = [
    ...(day.section ? [day.section] : []),
    ...day.activities.map((item) => (item.startsWith('Pickup') || item.startsWith('Night') ? item : `- ${item}`)),
    ...(day.halt ? [`Night Halt - ${day.halt}`] : []),
  ];
  const rows = body.flatMap((item) => {
    const lines = wrapText(item, WIDTH - 28, 8);
    return lines.map((text, index) => (index === 0 ? text : `  ${text}`));
  });
  const height = 20 + Math.max(1, rows.length) * 12 + 8;
  need(height + 6);
  let y = getY();
  fill(MARGIN, y - 18, WIDTH, 18, GREEN);
  fill(MARGIN, y - height, 4, height, GOLD);
  line(day.label, MARGIN + 10, y - 13, 8, true, WHITE);
  const heading = wrapText(day.heading, WIDTH - 86, 8, true)[0] || day.heading;
  line(heading, MARGIN + 68, y - 13, 8, true, CREAM);
  y -= 18;
  fill(MARGIN + 4, y - (height - 18), WIDTH - 4, height - 18, WHITE);
  const shown = rows.length > 0 ? rows : ['- As per package itinerary'];
  shown.forEach((row, index) => {
    line(row, MARGIN + 8, y - 12 - index * 12, 8, row.startsWith('Night Halt'), INK);
  });
  setY(y - (height - 18) - 6);
}

function drawNote(
  need: (height: number) => void,
  line: (value: string, x: number, baseline: number, size: number, bold: boolean, color: string) => void,
  fill: (x: number, bottom: number, width: number, height: number, color: string) => void,
  getY: () => number,
  setY: (value: number) => void,
  number: number,
  text: string,
  alt: boolean
) {
  const rows = wrapText(text, WIDTH - 28, 8);
  const height = 8 + rows.length * 11;
  need(height);
  let y = getY();
  fill(MARGIN, y - height, WIDTH, height, alt ? CREAM : CREAM_ALT);
  line(String(number), MARGIN + 6, y - 12, 8, true, GREEN);
  rows.forEach((row, index) => line(row, MARGIN + 20, y - 12 - index * 11, 8, false, INK));
  setY(y - height);
}
