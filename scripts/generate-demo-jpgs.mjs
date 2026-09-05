/**
 * High-Resolution Demo Document Generator
 * Generates enterprise-grade .jpg files for live demonstrations of RazorChain AI:
 * 1. 1_clean_delivery_challan.jpg (Matches PO-2026-1045 / RC-DEMO-1045)
 * 2. 2_commercial_tax_invoice.jpg (Matches PO-2026-1045)
 * 3. 3_carrier_bluedart_airwaybill.jpg (Official Logistics Consignment Proof)
 * 4. 4_tampered_quantity_fraud.jpg (Aegis Security Firewall & Triage Demo)
 * 5. 5_cnc_actuators_delivery_proof.jpg (Matches RC-RESIL-GEMINI-881 / PO-2026-AI-881)
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'sample-docs');

const WIDTH = 1240;
const HEIGHT = 1754;

// Helper to wrap SVG in Sharp and export high-quality JPEG
async function exportJpeg(svgString, fileName) {
  const filePath = path.join(OUTPUT_DIR, fileName);
  await sharp(Buffer.from(svgString))
    .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
    .toFile(filePath);
  console.log(`Generated: ${filePath}`);
}

// --------------------------------------------------------------------------
// 1. Clean Delivery Challan (Matches PO-2026-1045 / 500 Bearings)
// --------------------------------------------------------------------------
function generateCleanDeliveryChallan() {
  return `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg" style="background:#fcfdfd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.08"/>
    </filter>
  </defs>

  <!-- Document Canvas / Border -->
  <rect x="30" y="30" width="1180" height="1694" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" rx="4"/>
  <rect x="50" y="50" width="1140" height="1654" fill="none" stroke="#f1f5f9" stroke-width="1"/>

  <!-- Corporate Header -->
  <rect x="50" y="50" width="1140" height="140" fill="#0f172a"/>
  
  <text x="90" y="105" font-size="30" font-weight="800" fill="#ffffff" letter-spacing="1">APEX PRECISION ENGINEERING LTD</text>
  <text x="90" y="135" font-size="15" fill="#94a3b8">Industrial Area Phase 2, Peenya, Bengaluru, Karnataka 560058 | GSTIN: 29AAACA1234Z1ZA</text>
  <text x="90" y="160" font-size="13" fill="#64748b">Email: dispatch@apexprecision.in | Tel: +91 80 4129 8800 | ISO 9001:2015 Certified</text>

  <rect x="910" y="80" width="240" height="75" rx="8" fill="#1e293b"/>
  <text x="930" y="110" font-size="13" font-weight="600" fill="#94a3b8">DOCUMENT TYPE</text>
  <text x="930" y="138" font-size="20" font-weight="800" fill="#38bdf8">DELIVERY CHALLAN</text>

  <!-- Meta Info Grid -->
  <rect x="80" y="220" width="1080" height="130" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="6"/>
  
  <text x="110" y="255" font-size="14" font-weight="700" fill="#475569">CHALLAN NUMBER</text>
  <text x="110" y="285" font-size="20" font-weight="800" fill="#0f172a">DC-2026-1045-A</text>
  <text x="110" y="325" font-size="13" fill="#64748b">Dispatch: 2026-09-04 09:30 IST</text>

  <text x="390" y="255" font-size="14" font-weight="700" fill="#475569">REFERENCE PO</text>
  <text x="390" y="285" font-size="20" font-weight="800" fill="#2563eb">PO-2026-1045</text>
  <text x="390" y="325" font-size="13" fill="#64748b">Order Date: 2026-09-01</text>

  <text x="670" y="255" font-size="14" font-weight="700" fill="#475569">DELIVERY DATE</text>
  <text x="670" y="285" font-size="20" font-weight="800" fill="#0f172a">2026-09-05</text>
  <text x="670" y="325" font-size="13" fill="#059669">On-Time SLA Delivery</text>

  <text x="920" y="255" font-size="14" font-weight="700" fill="#475569">CARRIER &amp; AWB</text>
  <text x="920" y="285" font-size="17" font-weight="800" fill="#0f172a">BLUEDART</text>
  <text x="920" y="325" font-size="13" font-family="monospace" fill="#2563eb">BD-88992211-IN</text>

  <!-- Consignor & Consignee Box -->
  <rect x="80" y="380" width="520" height="210" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <rect x="80" y="380" width="520" height="38" fill="#f1f5f9" rx="6"/>
  <text x="100" y="405" font-size="14" font-weight="700" fill="#334155">CONSIGNOR (SUPPLIER)</text>
  <text x="100" y="445" font-size="17" font-weight="700" fill="#0f172a">Apex Precision Engineering Ltd</text>
  <text x="100" y="475" font-size="14" fill="#475569">Plot 18, Phase 2, Peenya Industrial Area</text>
  <text x="100" y="500" font-size="14" fill="#475569">Bengaluru, Karnataka 560058</text>
  <text x="100" y="530" font-size="13" font-weight="600" fill="#64748b">GSTIN: 29AAACA1234Z1ZA | PAN: AAACA1234Z</text>
  <text x="100" y="555" font-size="13" fill="#64748b">State: Karnataka (29)</text>

  <rect x="640" y="380" width="520" height="210" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <rect x="640" y="380" width="520" height="38" fill="#f1f5f9" rx="6"/>
  <text x="660" y="405" font-size="14" font-weight="700" fill="#334155">CONSIGNEE (DELIVER TO)</text>
  <text x="660" y="445" font-size="17" font-weight="700" fill="#0f172a">Acme Manufacturing Corp</text>
  <text x="660" y="475" font-size="14" fill="#475569">Manufacturing Plant 4, Warehouse Gate 3</text>
  <text x="660" y="500" font-size="14" fill="#475569">Electronic City Phase 2, Bengaluru 560100</text>
  <text x="660" y="530" font-size="13" font-weight="600" fill="#64748b">GSTIN: 29BBBCB5678Y1ZB | Contact: Rajesh Kumar</text>
  <text x="660" y="555" font-size="13" fill="#64748b">Designation: General Warehouse Manager</text>

  <!-- Items Table Header -->
  <rect x="80" y="620" width="1080" height="46" fill="#1e293b" rx="4"/>
  <text x="105" y="650" font-size="13" font-weight="700" fill="#ffffff">#</text>
  <text x="145" y="650" font-size="13" font-weight="700" fill="#ffffff">ITEM DESCRIPTION &amp; SPECIFICATIONS</text>
  <text x="620" y="650" font-size="13" font-weight="700" fill="#ffffff">HSN / SAC</text>
  <text x="760" y="650" font-size="13" font-weight="700" fill="#ffffff">ORDERED</text>
  <text x="890" y="650" font-size="13" font-weight="700" fill="#ffffff">DELIVERED</text>
  <text x="1030" y="650" font-size="13" font-weight="700" fill="#ffffff">CONDITION</text>

  <!-- Table Row 1 -->
  <rect x="80" y="666" width="1080" height="90" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <text x="105" y="705" font-size="15" font-weight="600" fill="#334155">1</text>
  <text x="145" y="700" font-size="16" font-weight="700" fill="#0f172a">Industrial Ball Bearings (6205-2RS Deep Groove)</text>
  <text x="145" y="725" font-size="13" fill="#64748b">Chrome Steel C3 Clearance, Double Rubber Sealed, High-Load Rated</text>
  <text x="145" y="745" font-size="12" fill="#2563eb">Batch Ref: BATCH-BRG-2026-991 | OEM Spec AX-110</text>
  <text x="620" y="715" font-size="14" fill="#334155">8482.10.00</text>
  <text x="760" y="715" font-size="16" font-weight="700" fill="#334155">500 units</text>
  <text x="890" y="715" font-size="18" font-weight="800" fill="#059669">500 units</text>
  <text x="1030" y="715" font-size="14" font-weight="700" fill="#059669">PASS (INTACT)</text>

  <!-- Table Sub-summary -->
  <rect x="80" y="756" width="1080" height="60" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
  <text x="105" y="792" font-size="14" font-weight="700" fill="#334155">TOTAL PACKAGES: 10 Corrugated Crates (50 Units / Crate)</text>
  <text x="760" y="792" font-size="15" font-weight="700" fill="#0f172a">TOTAL QUANTITY DELIVERED: 500 UNITS (100% FULFILLMENT)</text>

  <!-- Transport & Telemetry Box -->
  <rect x="80" y="845" width="1080" height="150" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <rect x="80" y="845" width="1080" height="34" fill="#f8fafc" rx="6"/>
  <text x="100" y="868" font-size="13" font-weight="700" fill="#475569">LOGISTICS DISPATCH &amp; TELEMETRY ATTESTATION</text>
  
  <text x="100" y="905" font-size="13" font-weight="600" fill="#334155">Carrier Name: <tspan font-weight="400">BlueDart Express Freight</tspan></text>
  <text x="100" y="930" font-size="13" font-weight="600" fill="#334155">Vehicle Reg No: <tspan font-weight="400">KA-04-MB-4819 (GPS Tracked)</tspan></text>
  <text x="100" y="955" font-size="13" font-weight="600" fill="#334155">Driver Name: <tspan font-weight="400">Sunil Gowda (Lic: KA0420180019283)</tspan></text>
  <text x="100" y="980" font-size="13" font-weight="600" fill="#334155">Dispatch Hub: <tspan font-weight="400">Peenya Central Distribution Hub</tspan></text>

  <text x="560" y="905" font-size="13" font-weight="600" fill="#334155">AWB Tracking No: <tspan font-weight="400" font-family="monospace">BD-88992211-IN</tspan></text>
  <text x="560" y="930" font-size="13" font-weight="600" fill="#334155">GPS Coordinates: <tspan font-weight="400">12.9716° N, 77.5946° E</tspan></text>
  <text x="560" y="955" font-size="13" font-weight="600" fill="#334155">Arrival Timestamp: <tspan font-weight="400">2026-09-05 14:15:22 IST</tspan></text>
  <text x="560" y="980" font-size="13" font-weight="600" fill="#334155">Security Gate Token: <tspan font-weight="400">GATE-EC-9921</tspan></text>

  <!-- Inspection Declaration -->
  <rect x="80" y="1025" width="1080" height="90" fill="#f0fdf4" stroke="#86efac" stroke-width="1" rx="6"/>
  <text x="105" y="1055" font-size="14" font-weight="700" fill="#166534">CONSIGNEE VERIFICATION STATEMENT</text>
  <text x="105" y="1085" font-size="13" fill="#15803d">"We hereby confirm that 500 units of Industrial Ball Bearings (PO-2026-1045) have been inspected, counted, and verified against delivery specifications in sound condition with factory packaging seals intact."</text>

  <!-- Signatures and Rubber Stamps Area -->
  <rect x="80" y="1145" width="520" height="340" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <text x="105" y="1180" font-size="14" font-weight="700" fill="#475569">DISPATCHED BY (SUPPLIER)</text>
  <text x="105" y="1210" font-size="13" fill="#64748b">For Apex Precision Engineering Ltd</text>

  <!-- Supplier Corporate Stamp -->
  <g transform="translate(110, 1250) rotate(-4)">
    <rect x="0" y="0" width="260" height="120" rx="8" fill="#eff6ff" stroke="#2563eb" stroke-width="3" stroke-dasharray="8 4"/>
    <text x="130" y="35" text-anchor="middle" font-size="13" font-weight="800" fill="#1e40af">APEX PRECISION ENGG LTD</text>
    <text x="130" y="60" text-anchor="middle" font-size="12" font-weight="700" fill="#2563eb">★ STORES &amp; DISPATCH ★</text>
    <text x="130" y="85" text-anchor="middle" font-size="11" fill="#1e40af">PEENYA PLANT - BENGALURU</text>
    <text x="130" y="105" text-anchor="middle" font-size="11" font-weight="600" fill="#059669">DISPATCH CLEARED</text>
  </g>
  
  <!-- Supplier Signature -->
  <path d="M 400 1340 Q 430 1300 460 1330 T 500 1310 T 540 1350" stroke="#1d4ed8" stroke-width="3" fill="none" stroke-linecap="round"/>
  <text x="400" y="1370" font-size="12" font-weight="600" fill="#64748b">Authorized Signatory</text>
  <text x="400" y="1390" font-size="11" fill="#94a3b8">Date: 2026-09-04</text>

  <!-- Receiver Stamp & Signature -->
  <rect x="640" y="1145" width="520" height="340" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <text x="665" y="1180" font-size="14" font-weight="700" fill="#475569">RECEIVED &amp; VERIFIED BY (BUYER / CONSIGNEE)</text>
  <text x="665" y="1210" font-size="13" fill="#64748b">For Acme Manufacturing Corp</text>

  <!-- Receiver Emerald Stamp -->
  <g transform="translate(670, 1245) rotate(3)">
    <rect x="0" y="0" width="270" height="130" rx="10" fill="#ecfdf5" stroke="#059669" stroke-width="3.5"/>
    <text x="135" y="32" text-anchor="middle" font-size="14" font-weight="900" fill="#065f46" letter-spacing="1">ACME MANUFACTURING CORP</text>
    <text x="135" y="58" text-anchor="middle" font-size="12" font-weight="800" fill="#047857">WAREHOUSE GATE 3 - BENGALURU</text>
    <text x="135" y="82" text-anchor="middle" font-size="13" font-weight="900" fill="#059669">★ GOODS RECEIVED &amp; VERIFIED ★</text>
    <text x="135" y="104" text-anchor="middle" font-size="12" font-weight="700" fill="#065f46">DATE: 05-SEP-2026</text>
    <text x="135" y="120" text-anchor="middle" font-size="10" fill="#047857">PHYSICAL CONSIGNMENT OK</text>
  </g>

  <!-- Receiver Real Cursive Signature -->
  <g transform="translate(950, 1260)">
    <path d="M 10 70 Q 30 10 50 50 Q 80 15 110 40 T 140 30 Q 160 80 180 50" stroke="#1e3a8a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <text x="35" y="100" font-size="20" font-family="'Brush Script MT', 'Segoe Script', cursive" fill="#1e3a8a">Rajesh Kumar</text>
    <text x="35" y="120" font-size="12" font-weight="700" fill="#334155">Rajesh Kumar</text>
    <text x="35" y="136" font-size="11" fill="#64748b">General Warehouse Manager</text>
  </g>

  <!-- Footer & Cryptographic Anchor Notice -->
  <rect x="50" y="1530" width="1140" height="150" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
  
  <!-- Simulated Barcode -->
  <g transform="translate(80, 1555)">
    <rect x="0" y="0" width="4" height="60" fill="#0f172a"/>
    <rect x="8" y="0" width="8" height="60" fill="#0f172a"/>
    <rect x="20" y="0" width="4" height="60" fill="#0f172a"/>
    <rect x="28" y="0" width="12" height="60" fill="#0f172a"/>
    <rect x="46" y="0" width="4" height="60" fill="#0f172a"/>
    <rect x="54" y="0" width="8" height="60" fill="#0f172a"/>
    <rect x="68" y="0" width="16" height="60" fill="#0f172a"/>
    <rect x="90" y="0" width="4" height="60" fill="#0f172a"/>
    <rect x="100" y="0" width="10" height="60" fill="#0f172a"/>
    <rect x="116" y="0" width="6" height="60" fill="#0f172a"/>
    <rect x="128" y="0" width="14" height="60" fill="#0f172a"/>
    <rect x="148" y="0" width="4" height="60" fill="#0f172a"/>
    <rect x="156" y="0" width="8" height="60" fill="#0f172a"/>
    <rect x="170" y="0" width="16" height="60" fill="#0f172a"/>
    <rect x="192" y="0" width="6" height="60" fill="#0f172a"/>
    <rect x="204" y="0" width="10" height="60" fill="#0f172a"/>
    <rect x="220" y="0" width="8" height="60" fill="#0f172a"/>
    <rect x="234" y="0" width="12" height="60" fill="#0f172a"/>
    <text x="115" y="80" text-anchor="middle" font-size="12" font-family="monospace" fill="#334155">* PO-2026-1045-DC-01 *</text>
  </g>

  <text x="360" y="1575" font-size="12" font-weight="700" fill="#0f172a">AUTONOMOUS SETTLEMENT CLEARANCE</text>
  <text x="360" y="1598" font-size="12" fill="#475569">This digital delivery challan is verified via RazorChain AI Multi-Agent Vision OCR &amp; Aegis Security Shield.</text>
  <text x="360" y="1618" font-size="12" fill="#64748b">Tamper-Evident SHA-256 Digest &amp; GPS Telemetry recorded on Polygon Immutable Audit Ledger.</text>
  <text x="360" y="1638" font-size="11" font-family="monospace" fill="#2563eb">Smart Contract Anchor: 0x7c49a0d81992bf0c2e88a319f001b692</text>
</svg>
`;
}

// --------------------------------------------------------------------------
// 2. Commercial Tax Invoice (Matches PO-2026-1045 / Rs. 10,000)
// --------------------------------------------------------------------------
function generateCommercialTaxInvoice() {
  return `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg" style="background:#fcfdfd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <rect x="30" y="30" width="1180" height="1694" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" rx="4"/>

  <!-- Top Blue Accent -->
  <rect x="30" y="30" width="1180" height="14" fill="#2563eb"/>

  <!-- Invoice Header -->
  <text x="70" y="95" font-size="34" font-weight="900" fill="#0f172a" letter-spacing="1">TAX INVOICE</text>
  <text x="70" y="125" font-size="14" font-weight="700" fill="#2563eb">ORIGINAL FOR RECIPIENT | B2B SUPPLY UNDER GST RULES</text>

  <!-- Company Logo / Header Right -->
  <text x="1130" y="85" text-anchor="end" font-size="24" font-weight="800" fill="#0f172a">APEX PRECISION ENGINEERING LTD</text>
  <text x="1130" y="110" text-anchor="end" font-size="13" fill="#64748b">Peenya Industrial Area, Bengaluru, Karnataka 560058</text>
  <text x="1130" y="130" text-anchor="end" font-size="13" font-weight="600" fill="#334155">GSTIN: 29AAACA1234Z1ZA | PAN: AAACA1234Z</text>

  <line x1="70" y1="160" x2="1130" y2="160" stroke="#e2e8f0" stroke-width="2"/>

  <!-- Invoice Metadata Grid -->
  <rect x="70" y="180" width="1060" height="110" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="6"/>

  <text x="100" y="215" font-size="12" font-weight="700" fill="#64748b">INVOICE NUMBER</text>
  <text x="100" y="245" font-size="20" font-weight="800" fill="#0f172a">INV-2026-08492</text>
  <text x="100" y="272" font-size="12" fill="#64748b">Date: 2026-09-04</text>

  <text x="380" y="215" font-size="12" font-weight="700" fill="#64748b">PURCHASE ORDER NO.</text>
  <text x="380" y="245" font-size="20" font-weight="800" fill="#2563eb">PO-2026-1045</text>
  <text x="380" y="272" font-size="12" fill="#64748b">PO Date: 2026-09-01</text>

  <text x="660" y="215" font-size="12" font-weight="700" fill="#64748b">PAYMENT ESCROW VAN</text>
  <text x="660" y="245" font-size="18" font-weight="800" fill="#0f172a">VAN-AXIS-RC1045</text>
  <text x="660" y="272" font-size="12" fill="#059669">Nodal Escrow Protected</text>

  <text x="940" y="215" font-size="12" font-weight="700" fill="#64748b">DUE DATE / TERMS</text>
  <text x="940" y="245" font-size="18" font-weight="800" fill="#0f172a">2026-09-05</text>
  <text x="940" y="272" font-size="12" fill="#64748b">Net Autonomous Capture</text>

  <!-- Parties Bill to & Ship to -->
  <rect x="70" y="320" width="510" height="200" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <rect x="70" y="320" width="510" height="34" fill="#f1f5f9" rx="6"/>
  <text x="90" y="343" font-size="13" font-weight="700" fill="#334155">BILLED TO (BUYER)</text>
  <text x="90" y="380" font-size="17" font-weight="700" fill="#0f172a">Acme Manufacturing Corp</text>
  <text x="90" y="410" font-size="13" fill="#475569">Manufacturing Plant 4, Electronic City Phase 2</text>
  <text x="90" y="432" font-size="13" fill="#475569">Bengaluru, Karnataka 560100, India</text>
  <text x="90" y="460" font-size="13" font-weight="600" fill="#334155">GSTIN: 29BBBCB5678Y1ZB | State: Karnataka (29)</text>
  <text x="90" y="485" font-size="12" fill="#64748b">Attn: Procurement &amp; Accounts Payable</text>

  <rect x="620" y="320" width="510" height="200" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <rect x="620" y="320" width="510" height="34" fill="#f1f5f9" rx="6"/>
  <text x="640" y="343" font-size="13" font-weight="700" fill="#334155">SHIPPED TO (CONSIGNEE)</text>
  <text x="640" y="380" font-size="17" font-weight="700" fill="#0f172a">Acme Manufacturing Corp</text>
  <text x="640" y="410" font-size="13" fill="#475569">Warehouse Gate 3, Electronic City Phase 2</text>
  <text x="640" y="432" font-size="13" fill="#475569">Bengaluru, Karnataka 560100, India</text>
  <text x="640" y="460" font-size="13" font-weight="600" fill="#334155">Delivery Challan Ref: DC-2026-1045-A</text>
  <text x="640" y="485" font-size="12" fill="#64748b">Carrier: BlueDart Express (AWB: BD-88992211-IN)</text>

  <!-- Items Table Header -->
  <rect x="70" y="550" width="1060" height="42" fill="#0f172a" rx="4"/>
  <text x="90" y="576" font-size="12" font-weight="700" fill="#ffffff">#</text>
  <text x="125" y="576" font-size="12" font-weight="700" fill="#ffffff">DESCRIPTION OF GOODS</text>
  <text x="560" y="576" font-size="12" font-weight="700" fill="#ffffff">HSN CODE</text>
  <text x="680" y="576" font-size="12" font-weight="700" fill="#ffffff">QTY</text>
  <text x="770" y="576" font-size="12" font-weight="700" fill="#ffffff">RATE (₹)</text>
  <text x="890" y="576" font-size="12" font-weight="700" fill="#ffffff">TAXABLE (₹)</text>
  <text x="1030" y="576" font-size="12" font-weight="700" fill="#ffffff">TOTAL (₹)</text>

  <!-- Table Row -->
  <rect x="70" y="592" width="1060" height="90" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <text x="90" y="635" font-size="14" font-weight="600" fill="#334155">1</text>
  <text x="125" y="628" font-size="15" font-weight="700" fill="#0f172a">Industrial Ball Bearings (6205-2RS Deep Groove)</text>
  <text x="125" y="650" font-size="12" fill="#64748b">Chrome Steel, Sealed, High RPM Rating. PO Match: PO-2026-1045</text>
  <text x="560" y="640" font-size="13" fill="#334155">8482.10.00</text>
  <text x="680" y="640" font-size="15" font-weight="700" fill="#0f172a">500 Nos</text>
  <text x="770" y="640" font-size="14" fill="#334155">16.949</text>
  <text x="890" y="640" font-size="14" font-weight="600" fill="#0f172a">8,474.58</text>
  <text x="1030" y="640" font-size="16" font-weight="800" fill="#0f172a">10,000.00</text>

  <!-- Tax Breakdown Table -->
  <rect x="70" y="710" width="600" height="170" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="6"/>
  <text x="90" y="735" font-size="13" font-weight="700" fill="#334155">GST TAX COMPUTATION BREAKDOWN</text>
  <line x1="90" y1="748" x2="650" y2="748" stroke="#e2e8f0" stroke-width="1"/>
  
  <text x="90" y="775" font-size="13" fill="#475569">Central GST (CGST @ 9.0%):</text>
  <text x="350" y="775" font-size="13" font-family="monospace" fill="#0f172a">₹ 762.71</text>

  <text x="90" y="805" font-size="13" fill="#475569">State GST (SGST @ 9.0%):</text>
  <text x="350" y="805" font-size="13" font-family="monospace" fill="#0f172a">₹ 762.71</text>

  <text x="90" y="835" font-size="13" fill="#475569">Integrated GST (IGST @ 0.0%):</text>
  <text x="350" y="835" font-size="13" font-family="monospace" fill="#64748b">₹ 0.00 (Intra-State Supply)</text>

  <text x="90" y="865" font-size="13" font-weight="700" fill="#0f172a">Total Tax Amount (18%):</text>
  <text x="350" y="865" font-size="14" font-weight="700" font-family="monospace" fill="#0f172a">₹ 1,525.42</text>

  <!-- Total Summary Box -->
  <rect x="710" y="710" width="420" height="170" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  
  <text x="740" y="745" font-size="14" fill="#64748b">Sub Total (Taxable Value):</text>
  <text x="1100" y="745" text-anchor="end" font-size="15" font-weight="600" fill="#334155">₹ 8,474.58</text>

  <text x="740" y="780" font-size="14" fill="#64748b">Total Tax (CGST + SGST):</text>
  <text x="1100" y="780" text-anchor="end" font-size="15" font-weight="600" fill="#334155">₹ 1,525.42</text>

  <line x1="740" y1="805" x2="1100" y2="805" stroke="#cbd5e1" stroke-width="1.5"/>

  <text x="740" y="845" font-size="16" font-weight="800" fill="#0f172a">TOTAL INVOICE VALUE:</text>
  <text x="1100" y="845" text-anchor="end" font-size="26" font-weight="900" fill="#2563eb">₹ 10,000.00</text>
  <text x="1100" y="870" text-anchor="end" font-size="12" fill="#059669">INR Ten Thousand Only (Exact Match PO-2026-1045)</text>

  <!-- Bank & Escrow Settlement Info -->
  <rect x="70" y="910" width="1060" height="150" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1" rx="6"/>
  <text x="100" y="940" font-size="14" font-weight="800" fill="#1e40af">NODAL ESCROW SETTLEMENT ROUTING INSTRUCTIONS</text>
  
  <text x="100" y="975" font-size="13" font-weight="600" fill="#1e3a8a">Partner Escrow Bank: <tspan font-weight="400">Axis Bank Nodal Settlement Division</tspan></text>
  <text x="100" y="1000" font-size="13" font-weight="600" fill="#1e3a8a">Virtual Account No (VAN): <tspan font-weight="700" font-family="monospace">VAN-AXIS-RC1045</tspan></text>
  <text x="100" y="1025" font-size="13" font-weight="600" fill="#1e3a8a">IFSC Code: <tspan font-weight="700" font-family="monospace">UTIB0000001</tspan> | Branch: Corporate Banking Central</text>

  <text x="640" y="975" font-size="13" font-weight="600" fill="#1e3a8a">Payment Engine: <tspan font-weight="400">Razorpay / RazorChain Autonomous Escrow</tspan></text>
  <text x="640" y="1000" font-size="13" font-weight="600" fill="#1e3a8a">Settlement Rule: <tspan font-weight="400">Irrevocable Auto-Disburse on AI Vision Verification</tspan></text>
  <text x="640" y="1025" font-size="13" font-weight="600" fill="#1e3a8a">Governing Law: <tspan font-weight="400">Information Technology Act 2000 &amp; RBI Nodal Guidelines</tspan></text>

  <!-- Signatures and Stamps Area -->
  <rect x="70" y="1090" width="510" height="280" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <text x="95" y="1120" font-size="13" font-weight="700" fill="#475569">TERMS &amp; COMMERCIAL CONDITIONS</text>
  <text x="95" y="1150" font-size="12" fill="#64748b">1. Goods once sold are covered under 12-month manufacturer replacement warranty.</text>
  <text x="95" y="1175" font-size="12" fill="#64748b">2. Delivery verified against consignee signed challan DC-2026-1045-A.</text>
  <text x="95" y="1200" font-size="12" fill="#64748b">3. Immediate settlement release authorized under purchase contract PO-2026-1045.</text>
  <text x="95" y="1225" font-size="12" fill="#64748b">4. Subject to Bengaluru jurisdiction.</text>

  <rect x="620" y="1090" width="510" height="280" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <text x="645" y="1120" font-size="13" font-weight="700" fill="#475569">AUTHORIZED SIGNATORY (SELLER)</text>
  <text x="645" y="1145" font-size="13" fill="#64748b">For Apex Precision Engineering Ltd</text>

  <!-- Stamp -->
  <g transform="translate(660, 1175) rotate(-3)">
    <circle cx="65" cy="65" r="55" fill="#eff6ff" stroke="#2563eb" stroke-width="2.5"/>
    <text x="65" y="45" text-anchor="middle" font-size="9" font-weight="800" fill="#1e40af">APEX PRECISION</text>
    <text x="65" y="65" text-anchor="middle" font-size="13" font-weight="900" fill="#2563eb">AUTHORIZED</text>
    <text x="65" y="82" text-anchor="middle" font-size="9" font-weight="700" fill="#1e40af">ENGG LTD</text>
    <text x="65" y="98" text-anchor="middle" font-size="8" fill="#059669">GST REGISTERED</text>
  </g>

  <!-- Signature -->
  <g transform="translate(830, 1200)">
    <path d="M 10 50 Q 40 10 70 40 T 110 30 T 150 60" stroke="#1d4ed8" stroke-width="3" fill="none" stroke-linecap="round"/>
    <text x="30" y="80" font-size="18" font-family="'Brush Script MT', 'Segoe Script', cursive" fill="#1d4ed8">V. Rao</text>
    <text x="30" y="105" font-size="12" font-weight="700" fill="#334155">Vikramaditya Rao</text>
    <text x="30" y="122" font-size="11" fill="#64748b">Director of Commercial Operations</text>
  </g>

  <!-- QR / Cryptographic Footer -->
  <rect x="70" y="1400" width="1060" height="150" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="4"/>
  
  <!-- Stylized QR Code placeholder -->
  <g transform="translate(95, 1420)">
    <rect x="0" y="0" width="110" height="110" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
    <rect x="10" y="10" width="30" height="30" fill="#0f172a"/>
    <rect x="16" y="16" width="18" height="18" fill="#ffffff"/>
    <rect x="70" y="10" width="30" height="30" fill="#0f172a"/>
    <rect x="76" y="16" width="18" height="18" fill="#ffffff"/>
    <rect x="10" y="70" width="30" height="30" fill="#0f172a"/>
    <rect x="16" y="76" width="18" height="18" fill="#ffffff"/>
    <rect x="46" y="46" width="18" height="18" fill="#0f172a"/>
    <rect x="46" y="15" width="12" height="12" fill="#0f172a"/>
    <rect x="15" y="46" width="12" height="12" fill="#0f172a"/>
    <rect x="75" y="75" width="22" height="22" fill="#0f172a"/>
  </g>

  <text x="235" y="1445" font-size="13" font-weight="800" fill="#0f172a">CRYPTOGRAPHIC VERIFICATION COMPLIANCE</text>
  <text x="235" y="1470" font-size="12" fill="#475569">Invoice electronically registered in RazorChain AI B2B settlement ledger.</text>
  <text x="235" y="1490" font-size="12" fill="#64748b">IRN (Invoice Reference Number): 4d8b9e0a1738c892bf0c2e88a319f001b692</text>
  <text x="235" y="1510" font-size="11" font-family="monospace" fill="#2563eb">HMAC-SHA256 Signed: b8615fdb-d540-4c6d-a0ec-25181bb8a6d4</text>
</svg>
`;
}

// --------------------------------------------------------------------------
// 3. Official Logistics Air Waybill / POD (BlueDart Express)
// --------------------------------------------------------------------------
function generateAirWaybill() {
  return `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg" style="background:#fcfdfd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <rect x="30" y="30" width="1180" height="1694" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" rx="4"/>

  <!-- BlueDart Blue/Yellow Header Banner -->
  <rect x="30" y="30" width="1180" height="30" fill="#003399"/>
  <rect x="30" y="60" width="1180" height="120" fill="#f8fafc"/>

  <text x="70" y="125" font-size="38" font-weight="900" fill="#003399" letter-spacing="1">BLUEDART</text>
  <text x="320" y="115" font-size="18" font-weight="800" fill="#d97706">EXPRESS LOGISTICS</text>
  <text x="320" y="140" font-size="13" font-weight="600" fill="#475569">PROOF OF DELIVERY &amp; CONSIGNMENT NOTE</text>

  <rect x="800" y="80" width="350" height="85" fill="#ffffff" stroke="#003399" stroke-width="2" rx="6"/>
  <text x="820" y="108" font-size="12" font-weight="700" fill="#64748b">AIR WAYBILL (AWB) NUMBER</text>
  <text x="820" y="140" font-size="22" font-weight="900" font-family="monospace" fill="#003399">BD-9821471029-IN</text>

  <line x1="50" y1="190" x2="1190" y2="190" stroke="#cbd5e1" stroke-width="1.5"/>

  <!-- Barcode Graphic -->
  <g transform="translate(420, 210)">
    <rect x="0" y="0" width="5" height="70" fill="#000000"/>
    <rect x="10" y="0" width="10" height="70" fill="#000000"/>
    <rect x="25" y="0" width="5" height="70" fill="#000000"/>
    <rect x="35" y="0" width="15" height="70" fill="#000000"/>
    <rect x="55" y="0" width="5" height="70" fill="#000000"/>
    <rect x="65" y="0" width="10" height="70" fill="#000000"/>
    <rect x="80" y="0" width="20" height="70" fill="#000000"/>
    <rect x="105" y="0" width="5" height="70" fill="#000000"/>
    <rect x="115" y="0" width="12" height="70" fill="#000000"/>
    <rect x="135" y="0" width="8" height="70" fill="#000000"/>
    <rect x="150" y="0" width="16" height="70" fill="#000000"/>
    <rect x="175" y="0" width="5" height="70" fill="#000000"/>
    <rect x="185" y="0" width="10" height="70" fill="#000000"/>
    <rect x="200" y="0" width="20" height="70" fill="#000000"/>
    <rect x="225" y="0" width="8" height="70" fill="#000000"/>
    <rect x="240" y="0" width="12" height="70" fill="#000000"/>
    <rect x="260" y="0" width="10" height="70" fill="#000000"/>
    <rect x="275" y="0" width="15" height="70" fill="#000000"/>
    <rect x="295" y="0" width="5" height="70" fill="#000000"/>
    <text x="150" y="92" text-anchor="middle" font-size="14" font-family="monospace" font-weight="700" fill="#0f172a">* BD-9821471029-IN *</text>
  </g>

  <!-- Telemetry Row -->
  <rect x="70" y="325" width="1080" height="110" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="6"/>
  <text x="100" y="360" font-size="12" font-weight="700" fill="#64748b">ORIGIN HUB</text>
  <text x="100" y="390" font-size="18" font-weight="800" fill="#0f172a">PEENYA (BLR-N)</text>
  <text x="100" y="415" font-size="12" fill="#64748b">Dep: 04-Sep-2026 10:15</text>

  <text x="380" y="360" font-size="12" font-weight="700" fill="#64748b">DESTINATION HUB</text>
  <text x="380" y="390" font-size="18" font-weight="800" fill="#0f172a">E-CITY (BLR-S)</text>
  <text x="380" y="415" font-size="12" fill="#64748b">Arr: 05-Sep-2026 14:00</text>

  <text x="660" y="360" font-size="12" font-weight="700" fill="#64748b">STATUS</text>
  <text x="660" y="390" font-size="18" font-weight="900" fill="#059669">DELIVERED</text>
  <text x="660" y="415" font-size="12" fill="#059669">POD Confirmed &amp; Signed</text>

  <text x="940" y="360" font-size="12" font-weight="700" fill="#64748b">PURCHASE CONTRACT</text>
  <text x="940" y="390" font-size="18" font-weight="800" fill="#2563eb">PO-2026-1045</text>
  <text x="940" y="415" font-size="12" fill="#64748b">Challan: DC-2026-1045-A</text>

  <!-- Consignor & Consignee -->
  <rect x="70" y="460" width="520" height="200" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <rect x="70" y="460" width="520" height="34" fill="#f1f5f9" rx="6"/>
  <text x="90" y="483" font-size="13" font-weight="700" fill="#334155">SHIPPER DETAILS</text>
  <text x="90" y="520" font-size="16" font-weight="700" fill="#0f172a">Apex Precision Engineering Ltd</text>
  <text x="90" y="550" font-size="13" fill="#475569">Peenya Industrial Area Phase 2, Bengaluru</text>
  <text x="90" y="575" font-size="13" fill="#64748b">Contact: Dispatch Manager (+91 80 4129 8800)</text>
  <text x="90" y="600" font-size="13" fill="#64748b">GSTIN: 29AAACA1234Z1ZA</text>

  <rect x="630" y="460" width="520" height="200" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <rect x="630" y="460" width="520" height="34" fill="#f1f5f9" rx="6"/>
  <text x="650" y="483" font-size="13" font-weight="700" fill="#334155">RECEIVER (DELIVERED TO)</text>
  <text x="650" y="520" font-size="16" font-weight="700" fill="#0f172a">Acme Manufacturing Corp</text>
  <text x="650" y="550" font-size="13" fill="#475569">Warehouse Gate 3, Electronic City Phase 2</text>
  <text x="650" y="575" font-size="13" fill="#475569">Bengaluru, Karnataka 560100</text>
  <text x="650" y="600" font-size="13" font-weight="600" fill="#0f172a">Signatory: Rajesh Kumar (General Manager)</text>

  <!-- Consignment Summary -->
  <rect x="70" y="680" width="1080" height="150" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <rect x="70" y="680" width="1080" height="34" fill="#0f172a" rx="6"/>
  <text x="90" y="703" font-size="13" font-weight="700" fill="#ffffff">SHIPMENT PARTICULARS</text>

  <text x="90" y="745" font-size="13" font-weight="600" fill="#334155">Item Description: <tspan font-weight="700" fill="#0f172a">Industrial Ball Bearings (6205-2RS)</tspan></text>
  <text x="90" y="775" font-size="13" font-weight="600" fill="#334155">Total Packages: <tspan font-weight="700" fill="#0f172a">10 Corrugated Boxes</tspan></text>
  <text x="90" y="805" font-size="13" font-weight="600" fill="#334155">Gross Weight: <tspan font-weight="700" fill="#0f172a">125.50 KG</tspan></text>

  <text x="600" y="745" font-size="13" font-weight="600" fill="#334155">Units In Consignment: <tspan font-weight="800" fill="#059669">500 Units (Full Delivery)</tspan></text>
  <text x="600" y="775" font-size="13" font-weight="600" fill="#334155">Seal Integrity: <tspan font-weight="700" fill="#059669">Verified Intact (Seal #BLR-9821)</tspan></text>
  <text x="600" y="805" font-size="13" font-weight="600" fill="#334155">Declared Value: <tspan font-weight="700" fill="#0f172a">₹ 10,000.00</tspan></text>

  <!-- BlueDart Official Proof of Delivery Rubber Stamp -->
  <rect x="70" y="860" width="1080" height="360" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <text x="100" y="900" font-size="15" font-weight="800" fill="#003399">OFFICIAL CARRIER PROOF OF DELIVERY (POD) ATTESTATION</text>

  <g transform="translate(120, 940) rotate(-2)">
    <rect x="0" y="0" width="380" height="180" rx="12" fill="#eff6ff" stroke="#003399" stroke-width="3.5"/>
    <text x="190" y="40" text-anchor="middle" font-size="18" font-weight="900" fill="#003399">BLUEDART EXPRESS LTD</text>
    <text x="190" y="70" text-anchor="middle" font-size="14" font-weight="800" fill="#d97706">ELECTRONIC CITY DELIVERY HUB</text>
    <text x="190" y="100" text-anchor="middle" font-size="15" font-weight="900" fill="#059669">★ DELIVERED &amp; SIGNED ★</text>
    <text x="190" y="130" text-anchor="middle" font-size="13" font-weight="700" fill="#003399">DATE: 05-SEP-2026 | TIME: 14:15</text>
    <text x="190" y="155" text-anchor="middle" font-size="12" fill="#334155">DELIVERY AGENT: SURESH K. (ID 8821)</text>
  </g>

  <!-- Consignee Stamp & Signature on POD -->
  <g transform="translate(560, 940) rotate(1)">
    <rect x="0" y="0" width="460" height="180" rx="12" fill="#ffffff" stroke="#059669" stroke-width="3"/>
    <text x="230" y="38" text-anchor="middle" font-size="15" font-weight="900" fill="#065f46">ACME MANUFACTURING CORP</text>
    <text x="230" y="65" text-anchor="middle" font-size="13" font-weight="700" fill="#047857">WAREHOUSE RECEIVING SECTION</text>
    <text x="230" y="90" text-anchor="middle" font-size="13" fill="#334155">Received 500 pcs Bearings in Good Condition</text>
    
    <!-- Signature inside POD box -->
    <path d="M 130 140 Q 160 90 200 130 T 260 110 T 310 145" stroke="#1e3a8a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <text x="230" y="165" text-anchor="middle" font-size="13" font-weight="800" fill="#1e3a8a">Rajesh Kumar (Warehouse Manager)</text>
  </g>

  <!-- Bottom Details -->
  <text x="100" y="1270" font-size="12" fill="#64748b">BlueDart Telemetry Server Sync: 2026-09-05T14:15:32.891Z | Handheld Scanner Model: Zebra TC57X</text>
  <text x="100" y="1295" font-size="12" fill="#64748b">Verified GPS Lock: 12.9716° N, 77.5946° E (±4.2m) | Consignee Identity Verified via Govt Corporate ID</text>
</svg>
`;
}

// --------------------------------------------------------------------------
// 4. Tampered Quantity Fraud Document (For Aegis & Triage Demo)
// --------------------------------------------------------------------------
function generateTamperedFraudDocument() {
  return `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg" style="background:#fcfdfd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <rect x="30" y="30" width="1180" height="1694" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" rx="4"/>

  <!-- Warning Banner -->
  <rect x="30" y="30" width="1180" height="40" fill="#dc2626"/>
  <text x="620" y="55" text-anchor="middle" font-size="16" font-weight="900" fill="#ffffff" letter-spacing="2">DEMONSTRATION OF TAMPERED FORGERY EVIDENCE (FRAUD INTERCEPTION)</text>

  <!-- Document Header -->
  <text x="70" y="120" font-size="28" font-weight="800" fill="#0f172a">DELIVERY CHALLAN &amp; INVOICE</text>
  <text x="70" y="150" font-size="14" fill="#64748b">Apex Precision Engineering Ltd | Dispatch Copy</text>

  <rect x="70" y="180" width="1060" height="100" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="6"/>
  <text x="90" y="220" font-size="14" font-weight="700" fill="#475569">PO REFERENCE:</text>
  <text x="220" y="220" font-size="16" font-weight="800" fill="#2563eb">PO-2026-1045</text>

  <text x="90" y="255" font-size="14" font-weight="700" fill="#475569">BUYER:</text>
  <text x="220" y="255" font-size="15" font-weight="600" fill="#0f172a">Acme Manufacturing Corp (Bengaluru)</text>

  <!-- Items Table Header -->
  <rect x="70" y="320" width="1060" height="40" fill="#1e293b" rx="4"/>
  <text x="90" y="345" font-size="13" font-weight="700" fill="#ffffff">DESCRIPTION</text>
  <text x="600" y="345" font-size="13" font-weight="700" fill="#ffffff">AUTHORIZED QTY</text>
  <text x="850" y="345" font-size="13" font-weight="700" fill="#ffffff">DELIVERED QTY</text>

  <!-- Row with Tampering -->
  <rect x="70" y="360" width="1060" height="120" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <text x="90" y="420" font-size="16" font-weight="700" fill="#0f172a">Industrial Ball Bearings (6205-2RS)</text>
  <text x="600" y="420" font-size="16" font-weight="700" fill="#475569">500 units</text>
  
  <!-- Crossed out original quantity -->
  <text x="820" y="420" font-size="16" font-weight="700" fill="#94a3b8" text-decoration="line-through">500 units</text>

  <!-- FORGERY TAMPER BOX -->
  <rect x="800" y="375" width="220" height="90" fill="#fef2f2" stroke="#dc2626" stroke-width="3" stroke-dasharray="6 3" rx="4"/>
  <text x="910" y="405" text-anchor="middle" font-size="11" font-weight="900" fill="#dc2626">ALTERED / INPAINTED</text>
  <text x="910" y="445" text-anchor="middle" font-size="28" font-weight="900" fill="#b91c1c">9,999 units</text>

  <!-- Altered Total Amount -->
  <rect x="70" y="520" width="1060" height="80" fill="#fff1f2" stroke="#fecdd3" stroke-width="2" rx="6"/>
  <text x="100" y="565" font-size="16" font-weight="700" fill="#9f1239">CLAIMED REIMBURSEMENT AMOUNT:</text>
  <text x="800" y="570" font-size="32" font-weight="900" fill="#b91c1c">₹ 1,99,980.00</text>
  <text x="100" y="590" font-size="12" fill="#be123c">(Contract PO Amount was ₹ 10,000.00 - Unlawful 1999% inflation detected)</text>

  <!-- Suspicious / Forged Signature Area -->
  <rect x="70" y="640" width="1060" height="260" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <text x="100" y="675" font-size="14" font-weight="700" fill="#475569">FORGED RECEIVER ATTESTATION</text>

  <rect x="100" y="700" width="400" height="150" fill="#f8fafc" stroke="#dc2626" stroke-width="2" rx="6"/>
  <!-- Crude digital text pretending to be signature -->
  <text x="130" y="760" font-size="32" font-family="'Courier New', monospace" font-weight="700" fill="#b91c1c">Rajesh Kumar [SIG]</text>
  <text x="130" y="800" font-size="12" font-weight="700" fill="#b91c1c">CRUDE DIGITAL INPAINTING (NO BIOMETRIC STROKE)</text>

  <!-- AI Aegis Detection Annotation Overlay -->
  <rect x="550" y="700" width="550" height="180" fill="#fef2f2" stroke="#dc2626" stroke-width="2" rx="8"/>
  <text x="575" y="735" font-size="15" font-weight="900" fill="#991b1b">AEGIS ANTI-FRAUD INTERCEPTION SIGNALS:</text>
  <text x="575" y="765" font-size="13" font-weight="700" fill="#b91c1c">⚠ QUANTITY_DEVIATION_CRITICAL: +1,899.8% discrepancy</text>
  <text x="575" y="790" font-size="13" font-weight="700" fill="#b91c1c">⚠ INPAINTING_DETECTED: Inconsistent JPEG quantization matrix</text>
  <text x="575" y="815" font-size="13" font-weight="700" fill="#b91c1c">⚠ SIGNATURE_SYNTHETIC: Font glyph matched to standard courier</text>
  <text x="575" y="845" font-size="14" font-weight="800" fill="#7f1d1d">AUTOMATED ACTION: Escrow Frozen -> Routed to Admin Triage</text>
</svg>
`;
}

// --------------------------------------------------------------------------
// 5. CNC Servo Actuators Delivery Challan (High-Value Resilience Order)
// --------------------------------------------------------------------------
function generateCncActuatorsDeliveryProof() {
  return `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg" style="background:#fcfdfd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <rect x="30" y="30" width="1180" height="1694" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" rx="4"/>
  <rect x="50" y="50" width="1140" height="140" fill="#1e1b4b"/>
  
  <text x="90" y="105" font-size="30" font-weight="800" fill="#ffffff">APEX PRECISION ENGINEERING LTD</text>
  <text x="90" y="135" font-size="15" fill="#a5b4fc">AEROSPACE &amp; ROBOTICS ACTUATOR DIVISION | BENGALURU 560058</text>
  
  <rect x="880" y="80" width="270" height="75" rx="8" fill="#312e81"/>
  <text x="900" y="110" font-size="12" font-weight="600" fill="#c7d2fe">DOCUMENT TYPE</text>
  <text x="900" y="138" font-size="20" font-weight="800" fill="#38bdf8">DELIVERY CHALLAN</text>

  <!-- Meta Info -->
  <rect x="80" y="220" width="1080" height="120" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="6"/>
  <text x="110" y="255" font-size="13" font-weight="700" fill="#64748b">TRANSACTION REF</text>
  <text x="110" y="285" font-size="20" font-weight="800" fill="#0f172a">RC-RESIL-GEMINI-881</text>
  <text x="110" y="315" font-size="12" fill="#64748b">Invoice: INV-AX-881</text>

  <text x="430" y="255" font-size="13" font-weight="700" fill="#64748b">PURCHASE ORDER</text>
  <text x="430" y="285" font-size="20" font-weight="800" fill="#2563eb">PO-2026-AI-881</text>
  <text x="430" y="315" font-size="12" fill="#64748b">Dated: 2026-09-02</text>

  <text x="760" y="255" font-size="13" font-weight="700" fill="#64748b">TOTAL VALUE</text>
  <text x="760" y="285" font-size="22" font-weight="900" fill="#059669">₹ 4,50,000.00</text>
  <text x="760" y="315" font-size="12" fill="#059669">Escrow Reserved in Nodal Chamber</text>

  <!-- Items Table Header -->
  <rect x="80" y="370" width="1080" height="42" fill="#1e1b4b" rx="4"/>
  <text x="105" y="396" font-size="13" font-weight="700" fill="#ffffff">#</text>
  <text x="150" y="396" font-size="13" font-weight="700" fill="#ffffff">CONSIGNMENT ITEM &amp; SPECIFICATIONS</text>
  <text x="680" y="396" font-size="13" font-weight="700" fill="#ffffff">ORDERED</text>
  <text x="860" y="396" font-size="13" font-weight="700" fill="#ffffff">DELIVERED</text>
  <text x="1020" y="396" font-size="13" font-weight="700" fill="#ffffff">STATUS</text>

  <!-- Row -->
  <rect x="80" y="412" width="1080" height="90" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <text x="105" y="455" font-size="14" font-weight="600" fill="#334155">1</text>
  <text x="150" y="445" font-size="16" font-weight="700" fill="#0f172a">High-Precision CNC Servo Actuators (Model AX-900)</text>
  <text x="150" y="470" font-size="13" fill="#64748b">Brushless DC, Optical Encoder 24-bit, 48V High-Torque Precision Drive</text>
  <text x="680" y="460" font-size="16" font-weight="700" fill="#334155">500 units</text>
  <text x="860" y="460" font-size="18" font-weight="800" fill="#059669">500 units</text>
  <text x="1020" y="460" font-size="15" font-weight="800" fill="#059669">VERIFIED</text>

  <!-- Deliver To Info -->
  <rect x="80" y="530" width="1080" height="150" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="6"/>
  <text x="110" y="565" font-size="14" font-weight="700" fill="#475569">DESTINATION ADDRESS (PER CONTRACT)</text>
  <text x="110" y="595" font-size="17" font-weight="800" fill="#0f172a">Acme Manufacturing Corp - Plant 4</text>
  <text x="110" y="622" font-size="14" fill="#475569">Electronic City Phase 2, Bengaluru 560100, Karnataka</text>
  <text x="110" y="647" font-size="13" fill="#64748b">Delivered via BlueDart Express (Tracking: BD-88992211-IN) | Date: 2026-09-05</text>

  <!-- Rubber Stamp & Signature -->
  <g transform="translate(100, 720) rotate(-2)">
    <rect x="0" y="0" width="360" height="140" rx="10" fill="#ecfdf5" stroke="#059669" stroke-width="3.5"/>
    <text x="180" y="35" text-anchor="middle" font-size="14" font-weight="900" fill="#065f46">ACME ROBOTICS DIVISION</text>
    <text x="180" y="65" text-anchor="middle" font-size="13" font-weight="800" fill="#047857">PHYSICAL CONSIGNMENT ACCEPTED</text>
    <text x="180" y="95" text-anchor="middle" font-size="15" font-weight="900" fill="#059669">500 UNITS VERIFIED 100%</text>
    <text x="180" y="122" text-anchor="middle" font-size="12" fill="#065f46">DATE: 05-SEP-2026</text>
  </g>

  <g transform="translate(560, 740)">
    <path d="M 10 50 Q 40 10 80 40 T 130 25 T 180 55" stroke="#1d4ed8" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <text x="35" y="85" font-size="20" font-family="'Brush Script MT', 'Segoe Script', cursive" fill="#1d4ed8">R. S. Sharma</text>
    <text x="35" y="110" font-size="13" font-weight="700" fill="#334155">R. S. Sharma</text>
    <text x="35" y="130" font-size="12" fill="#64748b">Quality Assurance &amp; Receiving Head</text>
  </g>
</svg>
`;
}

async function main() {
  console.log('Generating high-resolution live demo .jpg documents...');
  await exportJpeg(generateCleanDeliveryChallan(), '1_clean_delivery_challan.jpg');
  await exportJpeg(generateCommercialTaxInvoice(), '2_commercial_tax_invoice.jpg');
  await exportJpeg(generateAirWaybill(), '3_carrier_bluedart_airwaybill.jpg');
  await exportJpeg(generateTamperedFraudDocument(), '4_tampered_quantity_fraud.jpg');
  await exportJpeg(generateCncActuatorsDeliveryProof(), '5_cnc_actuators_delivery_proof.jpg');
  console.log('All 5 high-resolution demonstration .jpg files generated successfully!');
}

main().catch((err) => {
  console.error('Error generating demo jpgs:', err);
  process.exit(1);
});
