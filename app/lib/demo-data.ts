export type AssetTone = "healthy" | "due" | "warning";

export type AssetRecord = {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  category: string;
  location: string;
  installedOn: string;
  warrantyUntil: string;
  status: string;
  tone: AssetTone;
  health: number;
  uptime: number;
  metricLabel: string;
  metric: string;
  maintenanceLabel: string;
  maintenance: string;
  dataSource: string;
  connectivity: string;
  lastSeen: string;
  owner: string;
  project: string;
  acquisitionCost: number;
  residualValue: number;
  usefulLifeYears: number;
  purchaseDate: string;
  imageData?: string;
  insured?: boolean;
  openBox?: boolean;
  damagePercent?: number;
  financialVisible?: boolean;
  warningCount?: number;
  quantity?: number;
  notes?: string;
  sourceLink?: string;
  purchaseOrderId?: string;
};

export const demoAssets: AssetRecord[] = [
  {
    id: "3DP-00123",
    name: "Bambu Lab 3D Printer",
    manufacturer: "Bambu Lab",
    model: "Exact model pending confirmation",
    serialNumber: "BBL-PILOT-00123",
    category: "FDM 3D Printer",
    location: "Main Technical Lab · 3D Printing Zone",
    installedOn: "2025-09-12",
    warrantyUntil: "2027-09-11",
    status: "Healthy",
    tone: "healthy",
    health: 92,
    uptime: 98.2,
    metricLabel: "Utilization",
    metric: "72%",
    maintenanceLabel: "Next maintenance",
    maintenance: "In 18 days",
    dataSource: "LAN telemetry + power monitor",
    connectivity: "Online",
    lastSeen: "2 minutes ago",
    owner: "Additive Manufacturing Team",
    project: "Ibtechar", acquisitionCost: 8200, residualValue: 820, usefulLifeYears: 4, purchaseDate: "2025-09-12", insured:true,
  },
  {
    id: "CNC-00078",
    name: "Monolab SR20 CNC",
    manufacturer: "Monolab",
    model: "SR20",
    serialNumber: "MSR20-PILOT-078",
    category: "CNC Router",
    location: "Main Technical Lab · CNC Zone",
    installedOn: "2024-11-03",
    warrantyUntil: "2026-11-02",
    status: "Maintenance due",
    tone: "due",
    health: 65,
    uptime: 91.5,
    metricLabel: "Spindle hours",
    metric: "1,248 h",
    maintenanceLabel: "Maintenance overdue",
    maintenance: "By 2 days",
    dataSource: "Vibration + temperature + power gateway",
    connectivity: "Online",
    lastSeen: "3 minutes ago",
    owner: "Digital Fabrication Team",
    project: "Sanea", acquisitionCost: 68000, residualValue: 6800, usefulLifeYears: 7, purchaseDate: "2024-11-03", insured:true,
  },
  {
    id: "LAS-00055",
    name: "Thunder Laser Bolt",
    manufacturer: "Thunder Laser",
    model: "Bolt Series · variant pending confirmation",
    serialNumber: "TLB-PILOT-00055",
    category: "RF CO₂ Laser Engraver",
    location: "Main Technical Lab · Laser Zone",
    installedOn: "2025-02-18",
    warrantyUntil: "2027-02-17",
    status: "Warning",
    tone: "warning",
    health: 48,
    uptime: 92.3,
    metricLabel: "Exhaust airflow",
    metric: "Low",
    maintenanceLabel: "Inspection due",
    maintenance: "Today",
    dataSource: "Airflow + enclosure temperature + power",
    connectivity: "Online · warning",
    lastSeen: "1 minute ago",
    owner: "Digital Fabrication Team",
    project: "Sanea", acquisitionCost: 42000, residualValue: 4200, usefulLifeYears: 6, purchaseDate: "2025-02-18", insured:false, damagePercent:20,
  },
  { id:"FUR-IBT-004", name:"Ibtechar Modular Maker Workbench", manufacturer:"Ibtechar Furniture", model:"Maker Bench 1800", serialNumber:"IBT-FUR-004", category:"Technical Furniture", location:"IBTECHAR_OFFICE", installedOn:"2026-02-14", warrantyUntil:"2028-02-13", status:"Healthy", tone:"healthy", health:96, uptime:100, metricLabel:"Condition score", metric:"96%", maintenanceLabel:"Next inspection", maintenance:"In 92 days", dataSource:"QR inspection + condition checklist", connectivity:"QR managed", lastSeen:"Inspection 12 days ago", owner:"Facilities & Technical Services", project:"Ibtechar", acquisitionCost:6450, residualValue:645, usefulLifeYears:8, purchaseDate:"2026-02-14", insured:true },
  { id:"ST5-3DP-011", name:"Studio 5 Ultimaker S5", manufacturer:"Ultimaker", model:"S5", serialNumber:"ST5-UMS5-011", category:"FDM 3D Printer", location:"STUDIO 5", installedOn:"2024-02-01", warrantyUntil:"2026-01-31", status:"Warning", tone:"warning", health:58, uptime:78.4, metricLabel:"Condition score", metric:"58%", maintenanceLabel:"Assessment required", maintenance:"This week", dataSource:"Service inspection + usage history", connectivity:"Manual inspection", lastSeen:"Inspection 4 days ago", owner:"Studio 5 Operations", project:"Studio 5", acquisitionCost:24500, residualValue:2450, usefulLifeYears:5, purchaseDate:"2024-02-01", insured:false, openBox:true, damagePercent:25 },
  { id:"ST5-LAS-021", name:"Studio 5 Sanea Junior Laser", manufacturer:"Sanea", model:"Junior Laser", serialNumber:"ST5-SJ-021", category:"Laser Cutter", location:"STUDIO 5", installedOn:"2025-01-10", warrantyUntil:"2027-01-09", status:"Healthy", tone:"healthy", health:88, uptime:96.2, metricLabel:"Laser hours", metric:"376 h", maintenanceLabel:"Optics inspection", maintenance:"In 9 days", dataSource:"Usage counter + checklist", connectivity:"QR managed", lastSeen:"Today", owner:"Studio 5 Operations", project:"Studio 5", acquisitionCost:17500, residualValue:1750, usefulLifeYears:6, purchaseDate:"2025-01-10", insured:true },
];

export const demoProjects = [
  { id:"PRJ-IBT", name:"Ibtechar", manager:"Technical Services", approvedBudget:390000, committed:176300, spent:151850, status:"Active", assets:2 },
  { id:"PRJ-SANEA", name:"Sanea", manager:"Digital Fabrication", approvedBudget:420000, committed:316000, spent:273500, status:"Active", assets:2 },
  { id:"PRJ-ST5", name:"Studio 5", manager:"Studio 5 Operations", approvedBudget:1250000, committed:1045600, spent:926750, status:"Active", assets:2 },
  { id:"PRJ-DIC", name:"DIC", manager:"Projects Office", approvedBudget:250000, committed:0, spent:0, status:"Planning", assets:0 },
];
export const demoParts = [
  { sku:"BBL-NOZ-04", name:"Bambu Lab 0.4 mm Hotend Assembly", category:"3D Printer", onHand:4, reorderPoint:2, unitCost:195, location:"Technical Stores · A-03", linkedAssets:"Bambu Lab Printer" },
  { sku:"CNC-COL-06", name:"ER20 Collet Set", category:"CNC", onHand:2, reorderPoint:2, unitCost:360, location:"Technical Stores · B-12", linkedAssets:"Monolab SR20 CNC" },
  { sku:"LAS-LENS-20", name:"CO₂ Focus Lens 20 mm", category:"Laser", onHand:1, reorderPoint:2, unitCost:285, location:"Technical Stores · C-04", linkedAssets:"Thunder Laser Bolt · Sanea Junior" },
  { sku:"FUR-CAST-75", name:"Workbench Locking Caster", category:"Furniture", onHand:8, reorderPoint:4, unitCost:95, location:"Facilities Store · F-02", linkedAssets:"Ibtechar Modular Maker Workbench" },
];
export function depreciationFor(asset:AssetRecord, asOf=new Date("2026-08-04")){const start=new Date(asset.purchaseDate);const months=Math.max(0,(asOf.getFullYear()-start.getFullYear())*12+asOf.getMonth()-start.getMonth());const usefulMonths=asset.usefulLifeYears*12;const depreciable=asset.acquisitionCost-asset.residualValue;const accumulated=Math.min(depreciable,depreciable*(months/usefulMonths));return{months,usefulMonths,accumulated,netBookValue:Math.max(asset.residualValue,asset.acquisitionCost-accumulated),percent:Math.min(100,Math.round((accumulated/depreciable)*100))};}

export const demoWorkOrders = [
  { id: "WO-1042", assetId: "CNC-00078", title: "Inspect spindle lubrication and vibration", description: "Lubrication cycle overdue; vibration trend increased by 11% over baseline.", status: "Open", priority: "High", assignee: "Ahmed Hassan", dueDate: "2026-08-04", createdAt: "2026-08-01" },
  { id: "WO-1043", assetId: "3DP-00123", title: "Calibrate extrusion and inspect nozzle", description: "Preventive calibration after 500 print hours.", status: "In progress", priority: "Normal", assignee: "Mona Ali", dueDate: "2026-08-05", createdAt: "2026-08-02" },
  { id: "WO-1045", assetId: "LAS-00055", title: "Clean optics and verify exhaust airflow", description: "Inspect lens, mirrors and exhaust path; confirm airflow after cleaning.", status: "Scheduled", priority: "High", assignee: "Omar Salem", dueDate: "2026-08-03", createdAt: "2026-08-03" },
];

export const demoMaintenanceTasks = [
  { id: "MT-301", assetId: "3DP-00123", title: "Clean build plate and inspect nozzle", cadence: "Every 100 print hours", nextDue: "2026-08-21", status: "Upcoming", source: "Model-specific schedule to be confirmed" },
  { id: "MT-302", assetId: "3DP-00123", title: "Clean and lubricate motion system", cadence: "Monthly / by model", nextDue: "2026-08-21", status: "Upcoming", source: "Bambu Lab maintenance guide" },
  { id: "MT-310", assetId: "CNC-00078", title: "Inspect spindle, collet and lubrication", cadence: "Every 250 spindle hours", nextDue: "2026-08-01", status: "Overdue", source: "Pilot schedule · verify with SR20 manual" },
  { id: "MT-311", assetId: "CNC-00078", title: "Clean rails and verify dust extraction", cadence: "Weekly", nextDue: "2026-08-04", status: "Due soon", source: "Pilot safety checklist" },
  { id: "MT-320", assetId: "LAS-00055", title: "Inspect and clean lens and mirrors", cadence: "Daily inspection / usage based", nextDue: "2026-08-03", status: "Due today", source: "Thunder Laser optics guidance" },
  { id: "MT-321", assetId: "LAS-00055", title: "Clean exhaust fan and duct path", cadence: "Monthly / airflow based", nextDue: "2026-08-03", status: "Due today", source: "Thunder Laser support guidance" },
];

export const demoAlerts = [
  { id: "AL-501", assetId: "CNC-00078", severity: "warning", title: "Lubrication service overdue", message: "Scheduled spindle lubrication is two days overdue.", triggeredAt: "2026-08-01T09:00:00Z" },
  { id: "AL-502", assetId: "LAS-00055", severity: "critical", title: "Exhaust airflow below threshold", message: "Airflow proxy has remained below the pilot threshold for 15 minutes.", triggeredAt: "2026-08-03T19:55:00Z" },
  { id: "AL-503", assetId: "3DP-00123", severity: "info", title: "Maintenance forecast generated", message: "Motion-system service forecast in 18 days.", triggeredAt: "2026-08-03T08:20:00Z" },
];

export const demoServiceEvents = [
  { id: "SE-701", assetId: "3DP-00123", type: "Inspection", title: "Monthly printer inspection", performedBy: "Mona Ali", performedAt: "2026-07-21", notes: "Nozzle and build plate inspected. Motion system normal." },
  { id: "SE-702", assetId: "CNC-00078", type: "Repair", title: "Dust extraction hose replaced", performedBy: "Ahmed Hassan", performedAt: "2026-06-18", notes: "Damaged hose replaced; extraction flow restored." },
  { id: "SE-703", assetId: "LAS-00055", type: "Maintenance", title: "Lens and mirror cleaning", performedBy: "Omar Salem", performedAt: "2026-07-03", notes: "Optics cleaned and alignment spot checked." },
];

export function getAsset(id: string) {
  return demoAssets.find((asset) => asset.id === id);
}
