/**
 * High-Resolution Demo Document Generator (Set 2)
 * Generates enterprise-grade .jpg files for live demonstrations of RazorChain AI:
 * 6. 6_goods_receipt_note_grn.jpg (Matches PO-2026-1045 / Warehouse Inward Inspection)
 * 7. 7_medical_stents_delivery_challan.jpg (Matches PO-2026-LOG-402 / Cold Chain Pharma)
 * 8. 8_medical_stents_tax_invoice.jpg (Matches PO-2026-LOG-402 / Pharma Tax Invoice)
 * 9. 9_solar_pv_cells_delivery_challan.jpg (Matches PO-2026-BANK-770 / Heavy Infrastructure)
 * 10. 10_address_mismatch_wrong_warehouse.jpg (AI Discrepancy Demo - Wrong City/Warehouse)
 * 11. 11_short_shipment_partial_delivery.jpg (AI Discrepancy Demo - 420 vs 500 Units)
 * 12. 12_expired_sla_delayed_delivery.jpg (AI Discrepancy Demo - 25 Days Late SLA Breach)
 * 13. 13_transporter_lorry_receipt_lr.jpg (Carrier Consignment Lorry Receipt / Bilty)
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_DOCS_DIR = path.join(__dirname, '..', 'sample-docs');
const PUBLIC_DOCS_DIR = path.join(__dirname, '..', 'public', 'demo-docs');

const WIDTH = 1240;
const HEIGHT = 1754;

async function exportJpeg(svgString, fileName) {
  const buf = await sharp(Buffer.from(svgString))
    .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
    .toBuffer();

  await fs.promises.writeFile(path.join(SAMPLE_DOCS_DIR, fileName), buf);
  await fs.promises.writeFile(path.join(PUBLIC_DOCS_DIR, fileName), buf);
  console.log(`Generated: ${fileName} -> sample-docs & public/demo-docs`);
}

// --------------------------------------------------------------------------
// 6. Goods Receipt Note (GRN) - Acme Manufacturing Inward Warehouse
// --------------------------------------------------------------------------
function generateGoodsReceiptNote() {
  return `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg" style="background:#fcfdfd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <rect x="30" y="30" width="1180" height="1694" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" rx="4"/>
  <rect x="30" y="30" width="1180" height="16" fill="#0284c7"/>

  <!-- Header -->
  <text x="70" y="95" font-size="32" font-weight="900" fill="#0f172a" letter-spacing="1">GOODS RECEIPT NOTE (GRN)</text>
  <text x="70" y="125" font-size="14" font-weight="700" fill="#0284c7">ACME ERP INWARD INVENTORY &amp; QUALITY INSPECTION REPORT</text>

  <text x="1130" y="85" text-anchor="end" font-size="22" font-weight="800" fill="#0f172a">ACME MANUFACTURING CORP</text>
  <text x="1130" y="110" text-anchor="end" font-size="13" fill="#64748b">Manufacturing Plant 4, Electronic City Phase 2</text>
  <text x="1130" y="130" text-anchor="end" font-size="13" font-weight="600" fill="#334155">Warehouse Gate 3, Bengaluru, Karnataka 560100</text>

  <line x1="70" y1="160" x2="1130" y2="160" stroke="#e2e8f0" stroke-width="2"/>

  <!-- Metadata Grid -->
  <rect x="70" y="180" width="1060" height="120" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="6"/>

  <text x="100" y="215" font-size="13" font-weight="700" fill="#64748b">GRN NUMBER</text>
  <text x="100" y="245" font-size="20" font-weight="800" fill="#0f172a">GRN-2026-0905-01</text>
  <text x="100" y="275" font-size="12" fill="#64748b">Inward Time: 14:30 IST</text>

  <text x="360" y="215" font-size="13" font-weight="700" fill="#64748b">PURCHASE ORDER REF</text>
  <text x="360" y="245" font-size="20" font-weight="800" fill="#2563eb">PO-2026-1045</text>
  <text x="360" y="275" font-size="12" fill="#64748b">PO Date: 2026-09-01</text>

  <text x="630" y="215" font-size="13" font-weight="700" fill="#64748b">INWARD / DELIVERY DATE</text>
  <text x="630" y="245" font-size="20" font-weight="800" fill="#059669">2026-09-05</text>
  <text x="630" y="275" font-size="12" fill="#059669">On-Time Fulfillment</text>

  <text x="900" y="215" font-size="13" font-weight="700" fill="#64748b">VENDOR CHALLAN</text>
  <text x="900" y="245" font-size="18" font-weight="800" fill="#0f172a">DC-2026-1045-A</text>
  <text x="900" y="275" font-size="12" fill="#64748b">Carrier: BlueDart BD-88992211</text>

  <!-- Parties -->
  <rect x="70" y="325" width="510" height="190" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <rect x="70" y="325" width="510" height="34" fill="#f1f5f9" rx="6"/>
  <text x="90" y="348" font-size="13" font-weight="700" fill="#334155">SUPPLIER / VENDOR DETAILS</text>
  <text x="90" y="385" font-size="16" font-weight="700" fill="#0f172a">Apex Precision Engineering Ltd</text>
  <text x="90" y="415" font-size="13" fill="#475569">Plot 18, Phase 2, Peenya Industrial Area</text>
  <text x="90" y="438" font-size="13" fill="#475569">Bengaluru, Karnataka 560058</text>
  <text x="90" y="465" font-size="13" font-weight="600" fill="#64748b">GSTIN: 29AAACA1234Z1ZA | Vendor Code: V-1092</text>
  <text x="90" y="490" font-size="12" fill="#64748b">Contact: dispatch@apexprecision.in</text>

  <rect x="620" y="325" width="510" height="190" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <rect x="620" y="325" width="510" height="34" fill="#f1f5f9" rx="6"/>
  <text x="640" y="348" font-size="13" font-weight="700" fill="#334155">RECEIVING DESTINATION (CONSIGNEE)</text>
  <text x="640" y="385" font-size="16" font-weight="700" fill="#0f172a">Acme Manufacturing Corp</text>
  <text x="640" y="415" font-size="13" fill="#475569">Manufacturing Plant 4, Warehouse Gate 3</text>
  <text x="640" y="438" font-size="13" fill="#475569">Electronic City Phase 2, Bengaluru 560100</text>
  <text x="640" y="465" font-size="13" font-weight="600" fill="#334155">Inward Gate Token: GT-EC-9921</text>
  <text x="640" y="490" font-size="12" fill="#64748b">Store Location: BIN-BRG-A04 (Production Inventory)</text>

  <!-- Items Table -->
  <rect x="70" y="540" width="1060" height="42" fill="#0f172a" rx="4"/>
  <text x="95" y="566" font-size="12" font-weight="700" fill="#ffffff">#</text>
  <text x="135" y="566" font-size="12" font-weight="700" fill="#ffffff">ITEM CODE &amp; DESCRIPTION</text>
  <text x="560" y="566" font-size="12" font-weight="700" fill="#ffffff">PO QTY</text>
  <text x="670" y="566" font-size="12" font-weight="700" fill="#ffffff">RECEIVED</text>
  <text x="790" y="566" font-size="12" font-weight="700" fill="#ffffff">ACCEPTED</text>
  <text x="910" y="566" font-size="12" font-weight="700" fill="#ffffff">REJECTED</text>
  <text x="1030" y="566" font-size="12" font-weight="700" fill="#ffffff">QC STATUS</text>

  <rect x="70" y="582" width="1060" height="90" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <text x="95" y="625" font-size="14" font-weight="600" fill="#334155">1</text>
  <text x="135" y="618" font-size="15" font-weight="700" fill="#0f172a">Industrial Ball Bearings (6205-2RS Deep Groove)</text>
  <text x="135" y="640" font-size="12" fill="#64748b">SKF/AX Equivalent, Double Rubber Seal, High Load Rated. PO: PO-2026-1045</text>
  <text x="560" y="630" font-size="15" font-weight="600" fill="#334155">500 Nos</text>
  <text x="670" y="630" font-size="15" font-weight="700" fill="#0f172a">500 Nos</text>
  <text x="790" y="630" font-size="17" font-weight="800" fill="#059669">500 Nos</text>
  <text x="910" y="630" font-size="15" font-weight="700" fill="#334155">0 Nos</text>
  <text x="1030" y="630" font-size="14" font-weight="800" fill="#059669">PASS</text>

  <!-- Inspection Quality Summary -->
  <rect x="70" y="700" width="1060" height="180" fill="#f0fdf4" stroke="#86efac" stroke-width="1" rx="6"/>
  <text x="95" y="730" font-size="14" font-weight="800" fill="#166534">INWARD QUALITY CONTROL (IQC) AUDIT VERIFICATION</text>
  <line x1="95" y1="745" x2="1105" y2="745" stroke="#bbf7d0" stroke-width="1"/>

  <text x="95" y="780" font-size="13" font-weight="600" fill="#15803d">Visual Inspection: <tspan font-weight="400">10 Crates intact, factory holographic seals verified undamaged.</tspan></text>
  <text x="95" y="810" font-size="13" font-weight="600" fill="#15803d">Dimensional Tolerance: <tspan font-weight="400">Sampling 20 units (Bore: 25mm, Outer: 52mm, Width: 15mm) -> 100% within tolerance.</tspan></text>
  <text x="95" y="840" font-size="13" font-weight="600" fill="#15803d">Manufacturer Test Certificate: <tspan font-weight="400">EN 10204 3.1 Attached &amp; Validated (Batch BATCH-BRG-2026-991).</tspan></text>
  <text x="95" y="865" font-size="13" font-weight="700" fill="#166534">Final Inward Decision: 100% CONSIGNMENT ACCEPTED INTO INVENTORY</text>

  <!-- Signatures Area -->
  <rect x="70" y="910" width="510" height="320" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <text x="95" y="945" font-size="13" font-weight="700" fill="#475569">INWARD GATE &amp; MATERIALS STORE</text>
  <text x="95" y="975" font-size="12" fill="#64748b">Store Inward Officer: B. Chandrashekar</text>
  <text x="95" y="995" font-size="12" fill="#64748b">Stock Register Entry: VOL-18 / PG-49</text>

  <g transform="translate(100, 1030) rotate(-2)">
    <rect x="0" y="0" width="260" height="110" rx="8" fill="#f0fdf4" stroke="#059669" stroke-width="3"/>
    <text x="130" y="32" text-anchor="middle" font-size="13" font-weight="900" fill="#065f46">ACME MANUFACTURING CORP</text>
    <text x="130" y="56" text-anchor="middle" font-size="12" font-weight="800" fill="#047857">WAREHOUSE GATE 3 - STORES</text>
    <text x="130" y="80" text-anchor="middle" font-size="14" font-weight="900" fill="#059669">★ GOODS INWARD VERIFIED ★</text>
    <text x="130" y="100" text-anchor="middle" font-size="11" fill="#065f46">DATE: 05-SEP-2026 | QTY: 500</text>
  </g>

  <rect x="620" y="910" width="510" height="320" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <text x="645" y="945" font-size="13" font-weight="700" fill="#475569">HEAD OF INWARD QUALITY &amp; RECEIVING</text>
  
  <g transform="translate(650, 990)">
    <path d="M 20 60 Q 50 10 90 40 T 150 25 T 210 55" stroke="#1d4ed8" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <text x="40" y="95" font-size="22" font-family="'Brush Script MT', 'Segoe Script', cursive" fill="#1d4ed8">Rajesh Kumar</text>
    <text x="40" y="125" font-size="14" font-weight="700" fill="#0f172a">Rajesh Kumar</text>
    <text x="40" y="145" font-size="12" fill="#64748b">General Warehouse Manager &amp; Receiving Head</text>
    <text x="40" y="165" font-size="11" fill="#059669">Verified Digital Inward Token: 0x9fa81c01</text>
  </g>

  <!-- Footer -->
  <rect x="70" y="1260" width="1060" height="120" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="6"/>
  <text x="95" y="1295" font-size="13" font-weight="700" fill="#0f172a">RAZORCHAIN ESCROW COMPLIANCE NOTICE</text>
  <text x="95" y="1320" font-size="12" fill="#475569">This Goods Receipt Note (GRN) confirms 100% physical delivery and technical acceptance of contract PO-2026-1045.</text>
  <text x="95" y="1340" font-size="12" fill="#64748b">Upon ingestion into RazorChain AI, settlement escrow is authorized for disbursement to vendor Apex Precision Engineering Ltd.</text>
</svg>
`;
}

// --------------------------------------------------------------------------
// 7. Medical Stents Delivery Challan (Matches PO-2026-LOG-402 / 1200 Stents)
// --------------------------------------------------------------------------
function generateMedicalStentsDeliveryChallan() {
  return `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg" style="background:#fcfdfd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <rect x="30" y="30" width="1180" height="1694" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" rx="4"/>
  <rect x="50" y="50" width="1140" height="140" fill="#042f2e"/>

  <text x="90" y="105" font-size="28" font-weight="800" fill="#ffffff">MEDTECH ADVANCED HEALTHCARE DEVICES LTD</text>
  <text x="90" y="135" font-size="14" fill="#5eead4">Peenya Life Sciences Zone, Bengaluru, Karnataka 560058 | GSTIN: 29AAACM9988K1Z5</text>
  <text x="90" y="160" font-size="13" fill="#99f6e4">ISO 13485:2016 Medical Devices Certified | Cold Chain Logistics Division</text>

  <rect x="880" y="80" width="270" height="75" rx="8" fill="#134e4a"/>
  <text x="900" y="110" font-size="12" font-weight="600" fill="#99f6e4">DOCUMENT TYPE</text>
  <text x="900" y="138" font-size="18" font-weight="800" fill="#2dd4bf">DELIVERY CHALLAN</text>

  <!-- Meta Info -->
  <rect x="80" y="220" width="1080" height="120" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="6"/>
  
  <text x="110" y="255" font-size="13" font-weight="700" fill="#475569">CHALLAN NUMBER</text>
  <text x="110" y="285" font-size="20" font-weight="800" fill="#0f172a">DC-MED-2026-402</text>
  <text x="110" y="315" font-size="12" fill="#64748b">Batch No: TS-99-COLD</text>

  <text x="390" y="255" font-size="13" font-weight="700" fill="#475569">REFERENCE PO</text>
  <text x="390" y="285" font-size="20" font-weight="800" fill="#0d9488">PO-2026-LOG-402</text>
  <text x="390" y="315" font-size="12" fill="#64748b">Dated: 2026-09-02</text>

  <text x="670" y="255" font-size="13" font-weight="700" fill="#475569">DELIVERY DATE</text>
  <text x="670" y="285" font-size="20" font-weight="800" fill="#059669">2026-09-05</text>
  <text x="670" y="315" font-size="12" fill="#059669">Cold Chain Validated</text>

  <text x="920" y="255" font-size="13" font-weight="700" fill="#475569">CARRIER &amp; TRACKING</text>
  <text x="920" y="285" font-size="17" font-weight="800" fill="#0f172a">BLUEDART COLD</text>
  <text x="920" y="315" font-size="12" font-family="monospace" fill="#0d9488">BD-9821471029-IN</text>

  <!-- Parties -->
  <rect x="80" y="370" width="520" height="200" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <rect x="80" y="370" width="520" height="34" fill="#f0fdfa" rx="6"/>
  <text x="100" y="393" font-size="13" font-weight="700" fill="#134e4a">CONSIGNOR (PHARMA SUPPLIER)</text>
  <text x="100" y="430" font-size="16" font-weight="700" fill="#0f172a">MedTech Advanced Devices Ltd</text>
  <text x="100" y="458" font-size="13" fill="#475569">Bio-Medical Zone, Peenya Industrial Area</text>
  <text x="100" y="480" font-size="13" fill="#475569">Bengaluru, Karnataka 560058</text>
  <text x="100" y="505" font-size="13" font-weight="600" fill="#64748b">Drug Mfg Lic: KTK/28/DRUG/2021 | GSTIN: 29AAACM9988K1Z5</text>

  <rect x="640" y="370" width="520" height="200" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <rect x="640" y="370" width="520" height="34" fill="#f0fdfa" rx="6"/>
  <text x="660" y="393" font-size="13" font-weight="700" fill="#134e4a">CONSIGNEE (DELIVER TO)</text>
  <text x="660" y="430" font-size="16" font-weight="700" fill="#0f172a">Acme Healthcare Logistics</text>
  <text x="660" y="458" font-size="13" fill="#475569">Warehouse 9, Hosur Road Logistics Park</text>
  <text x="660" y="480" font-size="13" fill="#475569">Bengaluru, Karnataka 560068</text>
  <text x="660" y="505" font-size="13" font-weight="600" fill="#334155">Attn: Dr. S. K. Nair (Chief Hospital Pharmacist)</text>

  <!-- Items -->
  <rect x="80" y="600" width="1080" height="42" fill="#134e4a" rx="4"/>
  <text x="105" y="626" font-size="12" font-weight="700" fill="#ffffff">#</text>
  <text x="150" y="626" font-size="12" font-weight="700" fill="#ffffff">PRODUCT DESCRIPTION &amp; MEDICAL SPECIFICATIONS</text>
  <text x="650" y="626" font-size="12" font-weight="700" fill="#ffffff">HSN CODE</text>
  <text x="780" y="626" font-size="12" font-weight="700" fill="#ffffff">ORDERED</text>
  <text x="920" y="626" font-size="12" font-weight="700" fill="#ffffff">DELIVERED</text>
  <text x="1050" y="626" font-size="12" font-weight="700" fill="#ffffff">STATUS</text>

  <rect x="80" y="642" width="1080" height="90" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <text x="105" y="685" font-size="14" font-weight="600" fill="#334155">1</text>
  <text x="150" y="675" font-size="15" font-weight="700" fill="#0f172a">Medical Grade Titanium Stents (Batch TS-99)</text>
  <text x="150" y="700" font-size="12" fill="#64748b">Sterile Single-Use Cardiovascular Stent Delivery System. PO: PO-2026-LOG-402</text>
  <text x="650" y="688" font-size="13" fill="#334155">9021.90.00</text>
  <text x="780" y="688" font-size="15" font-weight="700" fill="#334155">1,200 units</text>
  <text x="920" y="688" font-size="18" font-weight="800" fill="#059669">1,200 units</text>
  <text x="1050" y="688" font-size="14" font-weight="800" fill="#059669">PASS</text>

  <!-- Cold Chain Telemetry -->
  <rect x="80" y="755" width="1080" height="130" fill="#ecfeff" stroke="#a5f3fc" stroke-width="1" rx="6"/>
  <text x="105" y="785" font-size="14" font-weight="800" fill="#0e7490">COLD CHAIN LOGGER TELEMETRY &amp; TEMPERATURE ATTESTATION</text>
  <line x1="105" y1="800" x2="1140" y2="800" stroke="#cffafe" stroke-width="1"/>
  <text x="105" y="830" font-size="13" font-weight="600" fill="#155e75">Logger ID: <tspan font-weight="400">TL-4491 (Sensitech TempTale Ultra)</tspan> | Calibration Exp: <tspan font-weight="400">2027-01-15</tspan></text>
  <text x="105" y="855" font-size="13" font-weight="600" fill="#155e75">Transit Min/Max: <tspan font-weight="700" fill="#059669">+3.2°C to +4.4°C (Target: +2°C to +8°C) - ZERO ALARMS</tspan></text>

  <!-- Stamps & Signatures -->
  <rect x="80" y="910" width="520" height="300" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <text x="105" y="945" font-size="13" font-weight="700" fill="#475569">DISPATCHED BY (SUPPLIER)</text>
  <text x="105" y="975" font-size="12" fill="#64748b">For MedTech Advanced Healthcare Devices Ltd</text>

  <g transform="translate(110, 1010) rotate(-3)">
    <rect x="0" y="0" width="260" height="110" rx="8" fill="#f0fdfa" stroke="#0d9488" stroke-width="3"/>
    <text x="130" y="32" text-anchor="middle" font-size="13" font-weight="900" fill="#134e4a">MEDTECH ADVANCED DEVICES</text>
    <text x="130" y="56" text-anchor="middle" font-size="12" font-weight="800" fill="#0f766e">★ COLD CHAIN CLEARED ★</text>
    <text x="130" y="80" text-anchor="middle" font-size="12" fill="#115e59">BATCH TS-99 PASSED</text>
    <text x="130" y="100" text-anchor="middle" font-size="11" font-weight="600" fill="#0d9488">DATE: 04-SEP-2026</text>
  </g>

  <rect x="640" y="910" width="520" height="300" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <text x="665" y="945" font-size="13" font-weight="700" fill="#475569">RECEIVED &amp; VERIFIED (HOSPITAL / CONSIGNEE)</text>

  <g transform="translate(670, 990) rotate(2)">
    <rect x="0" y="0" width="280" height="120" rx="10" fill="#ecfdf5" stroke="#059669" stroke-width="3.5"/>
    <text x="140" y="32" text-anchor="middle" font-size="13" font-weight="900" fill="#065f46">ACME HEALTHCARE LOGISTICS</text>
    <text x="140" y="58" text-anchor="middle" font-size="12" font-weight="800" fill="#047857">WAREHOUSE 9 - HOSUR ROAD</text>
    <text x="140" y="82" text-anchor="middle" font-size="14" font-weight="900" fill="#059669">★ 1,200 UNITS ACCEPTED ★</text>
    <text x="140" y="106" text-anchor="middle" font-size="12" font-weight="700" fill="#065f46">DATE: 05-SEP-2026</text>
  </g>

  <g transform="translate(960, 1020)">
    <path d="M 10 50 Q 40 10 80 40 T 140 25" stroke="#0d9488" stroke-width="3" fill="none"/>
    <text x="25" y="80" font-size="18" font-family="'Brush Script MT', cursive" fill="#0d9488">Dr. S. K. Nair</text>
    <text x="25" y="105" font-size="13" font-weight="700" fill="#0f172a">Dr. S. K. Nair</text>
    <text x="25" y="125" font-size="11" fill="#64748b">Chief Hospital Pharmacist</text>
  </g>
</svg>
`;
}

// --------------------------------------------------------------------------
// 8. Medical Stents Commercial Tax Invoice (Matches PO-2026-LOG-402 / Rs. 12L)
// --------------------------------------------------------------------------
function generateMedicalStentsTaxInvoice() {
  return `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg" style="background:#fcfdfd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <rect x="30" y="30" width="1180" height="1694" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" rx="4"/>
  <rect x="30" y="30" width="1180" height="14" fill="#0d9488"/>

  <text x="70" y="95" font-size="34" font-weight="900" fill="#0f172a">TAX INVOICE</text>
  <text x="70" y="125" font-size="14" font-weight="700" fill="#0d9488">SUPPLY OF CRITICAL CARE MEDICAL DEVICES UNDER GST RULES</text>

  <text x="1130" y="85" text-anchor="end" font-size="22" font-weight="800" fill="#0f172a">MEDTECH ADVANCED DEVICES LTD</text>
  <text x="1130" y="110" text-anchor="end" font-size="13" fill="#64748b">Peenya Life Sciences Zone, Bengaluru 560058</text>
  <text x="1130" y="130" text-anchor="end" font-size="13" font-weight="600" fill="#334155">GSTIN: 29AAACM9988K1Z5 | PAN: AACM9988K</text>

  <line x1="70" y1="160" x2="1130" y2="160" stroke="#e2e8f0" stroke-width="2"/>

  <!-- Metadata Grid -->
  <rect x="70" y="180" width="1060" height="110" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="6"/>

  <text x="100" y="215" font-size="12" font-weight="700" fill="#64748b">INVOICE NUMBER</text>
  <text x="100" y="245" font-size="20" font-weight="800" fill="#0f172a">INV-MED-2026-402</text>
  <text x="100" y="272" font-size="12" fill="#64748b">Date: 2026-09-04</text>

  <text x="380" y="215" font-size="12" font-weight="700" fill="#64748b">PURCHASE ORDER NO.</text>
  <text x="380" y="245" font-size="20" font-weight="800" fill="#0d9488">PO-2026-LOG-402</text>
  <text x="380" y="272" font-size="12" fill="#64748b">PO Date: 2026-09-02</text>

  <text x="660" y="215" font-size="12" font-weight="700" fill="#64748b">ESCROW NODAL ACCOUNT</text>
  <text x="660" y="245" font-size="18" font-weight="800" fill="#0f172a">RC-ESCROW-402</text>
  <text x="660" y="272" font-size="12" fill="#059669">₹ 12,00,000 Reserved in Escrow</text>

  <text x="940" y="215" font-size="12" font-weight="700" fill="#64748b">DELIVERY / DUE DATE</text>
  <text x="940" y="245" font-size="18" font-weight="800" fill="#0f172a">2026-09-05</text>
  <text x="940" y="272" font-size="12" fill="#059669">Fulfillment Validated</text>

  <!-- Parties -->
  <rect x="70" y="320" width="510" height="200" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <rect x="70" y="320" width="510" height="34" fill="#f1f5f9" rx="6"/>
  <text x="90" y="343" font-size="13" font-weight="700" fill="#334155">BILLED TO (BUYER)</text>
  <text x="90" y="380" font-size="16" font-weight="700" fill="#0f172a">Acme Healthcare Logistics</text>
  <text x="90" y="410" font-size="13" fill="#475569">Warehouse 9, Hosur Road Logistics Park</text>
  <text x="90" y="432" font-size="13" fill="#475569">Bengaluru, Karnataka 560068</text>
  <text x="90" y="460" font-size="13" font-weight="600" fill="#334155">GSTIN: 29BBBCB5678Y1ZB</text>

  <rect x="620" y="320" width="510" height="200" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <rect x="620" y="320" width="510" height="34" fill="#f1f5f9" rx="6"/>
  <text x="640" y="343" font-size="13" font-weight="700" fill="#334155">SHIPPED TO (CONSIGNEE)</text>
  <text x="640" y="380" font-size="16" font-weight="700" fill="#0f172a">Acme Healthcare Logistics</text>
  <text x="640" y="410" font-size="13" fill="#475569">Warehouse 9, Hosur Road Logistics Park</text>
  <text x="640" y="432" font-size="13" fill="#475569">Bengaluru, Karnataka 560068</text>
  <text x="640" y="460" font-size="13" font-weight="600" fill="#334155">Challan Ref: DC-MED-2026-402</text>

  <!-- Items -->
  <rect x="70" y="550" width="1060" height="42" fill="#0f172a" rx="4"/>
  <text x="90" y="576" font-size="12" font-weight="700" fill="#ffffff">#</text>
  <text x="125" y="576" font-size="12" font-weight="700" fill="#ffffff">DESCRIPTION OF MEDICAL GOODS</text>
  <text x="560" y="576" font-size="12" font-weight="700" fill="#ffffff">HSN CODE</text>
  <text x="680" y="576" font-size="12" font-weight="700" fill="#ffffff">QTY</text>
  <text x="770" y="576" font-size="12" font-weight="700" fill="#ffffff">RATE (₹)</text>
  <text x="890" y="576" font-size="12" font-weight="700" fill="#ffffff">TAXABLE (₹)</text>
  <text x="1030" y="576" font-size="12" font-weight="700" fill="#ffffff">TOTAL (₹)</text>

  <rect x="70" y="592" width="1060" height="90" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <text x="90" y="635" font-size="14" font-weight="600" fill="#334155">1</text>
  <text x="125" y="628" font-size="15" font-weight="700" fill="#0f172a">Medical Grade Titanium Stents (Batch TS-99)</text>
  <text x="125" y="650" font-size="12" fill="#64748b">Sterile Implantable Stent System. Ref PO-2026-LOG-402</text>
  <text x="560" y="640" font-size="13" fill="#334155">9021.90.00</text>
  <text x="680" y="640" font-size="15" font-weight="700" fill="#0f172a">1,200 Nos</text>
  <text x="770" y="640" font-size="14" fill="#334155">847.457</text>
  <text x="890" y="640" font-size="14" font-weight="600" fill="#0f172a">10,16,949.15</text>
  <text x="1030" y="640" font-size="16" font-weight="800" fill="#0f172a">12,00,000.00</text>

  <!-- Total Summary -->
  <rect x="710" y="710" width="420" height="170" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <text x="740" y="745" font-size="14" fill="#64748b">Sub Total (Taxable):</text>
  <text x="1100" y="745" text-anchor="end" font-size="15" font-weight="600" fill="#334155">₹ 10,16,949.15</text>

  <text x="740" y="780" font-size="14" fill="#64748b">GST Tax (18%):</text>
  <text x="1100" y="780" text-anchor="end" font-size="15" font-weight="600" fill="#334155">₹ 1,83,050.85</text>

  <line x1="740" y1="805" x2="1100" y2="805" stroke="#cbd5e1" stroke-width="1.5"/>

  <text x="740" y="845" font-size="16" font-weight="800" fill="#0f172a">TOTAL INVOICE VALUE:</text>
  <text x="1100" y="845" text-anchor="end" font-size="26" font-weight="900" fill="#0d9488">₹ 12,00,000.00</text>
  <text x="1100" y="870" text-anchor="end" font-size="12" fill="#059669">INR Twelve Lakhs Only (Matches PO-2026-LOG-402)</text>
</svg>
`;
}

// --------------------------------------------------------------------------
// 9. Solar PV Cells Delivery Challan (Matches PO-2026-BANK-770 / Rs. 25L)
// --------------------------------------------------------------------------
function generateSolarPvCellsDeliveryChallan() {
  return `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg" style="background:#fcfdfd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <rect x="30" y="30" width="1180" height="1694" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" rx="4"/>
  <rect x="50" y="50" width="1140" height="140" fill="#ea580c"/>

  <text x="90" y="105" font-size="28" font-weight="800" fill="#ffffff">HELIOS SOLAR DYNAMICS LTD</text>
  <text x="90" y="135" font-size="14" fill="#ffedd5">Industrial Solar Hub, Bengaluru, Karnataka 560058 | GSTIN: 29AAACH7711Q1Z3</text>
  <text x="90" y="160" font-size="13" fill="#ffedd5">Renewable Infrastructure Division | Utility Scale PV Modules</text>

  <rect x="880" y="80" width="270" height="75" rx="8" fill="#9a3412"/>
  <text x="900" y="110" font-size="12" font-weight="600" fill="#fed7aa">DOCUMENT TYPE</text>
  <text x="900" y="138" font-size="18" font-weight="800" fill="#ffffff">DELIVERY CHALLAN</text>

  <!-- Meta Info -->
  <rect x="80" y="220" width="1080" height="120" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="6"/>
  
  <text x="110" y="255" font-size="13" font-weight="700" fill="#475569">CHALLAN NUMBER</text>
  <text x="110" y="285" font-size="20" font-weight="800" fill="#0f172a">DC-SOLAR-2026-770</text>
  <text x="110" y="315" font-size="12" fill="#64748b">Consignment: 100 Pallets</text>

  <text x="390" y="255" font-size="13" font-weight="700" fill="#475569">REFERENCE PO</text>
  <text x="390" y="285" font-size="20" font-weight="800" fill="#ea580c">PO-2026-BANK-770</text>
  <text x="390" y="315" font-size="12" fill="#64748b">Contract Dated: 2026-08-28</text>

  <text x="670" y="255" font-size="13" font-weight="700" fill="#475569">DELIVERY DATE</text>
  <text x="670" y="285" font-size="20" font-weight="800" fill="#059669">2026-09-04</text>
  <text x="670" y="315" font-size="12" fill="#059669">Contract Milestone Met</text>

  <text x="920" y="255" font-size="13" font-weight="700" fill="#475569">TOTAL VALUE</text>
  <text x="920" y="285" font-size="20" font-weight="900" fill="#0f172a">₹ 25,00,000</text>
  <text x="920" y="315" font-size="12" fill="#059669">Escrow Reserved</text>

  <!-- Parties -->
  <rect x="80" y="370" width="520" height="200" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <rect x="80" y="370" width="520" height="34" fill="#fff7ed" rx="6"/>
  <text x="100" y="393" font-size="13" font-weight="700" fill="#9a3412">CONSIGNOR (SUPPLIER)</text>
  <text x="100" y="430" font-size="16" font-weight="700" fill="#0f172a">Helios Solar Dynamics Ltd</text>
  <text x="100" y="458" font-size="13" fill="#475569">Industrial Solar Hub, Peenya Phase 2</text>
  <text x="100" y="480" font-size="13" fill="#475569">Bengaluru, Karnataka 560058</text>
  <text x="100" y="505" font-size="13" font-weight="600" fill="#64748b">GSTIN: 29AAACH7711Q1Z3</text>

  <rect x="640" y="370" width="520" height="200" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <rect x="640" y="370" width="520" height="34" fill="#fff7ed" rx="6"/>
  <text x="660" y="393" font-size="13" font-weight="700" fill="#9a3412">CONSIGNEE (SITE DESTINATION)</text>
  <text x="660" y="430" font-size="16" font-weight="700" fill="#0f172a">Acme Solar Infrastructure Corp</text>
  <text x="660" y="458" font-size="13" fill="#475569">Solar Farm Hub B, Kurnool Industrial Corridor</text>
  <text x="660" y="480" font-size="13" fill="#475569">Andhra Pradesh 518002</text>
  <text x="660" y="505" font-size="13" font-weight="600" fill="#334155">Attn: K. V. Rao (Chief Site Electrical Engineer)</text>

  <!-- Items -->
  <rect x="80" y="600" width="1080" height="42" fill="#9a3412" rx="4"/>
  <text x="105" y="626" font-size="12" font-weight="700" fill="#ffffff">#</text>
  <text x="150" y="626" font-size="12" font-weight="700" fill="#ffffff">RENEWABLE EQUIPMENT DESCRIPTION</text>
  <text x="650" y="626" font-size="12" font-weight="700" fill="#ffffff">HSN CODE</text>
  <text x="780" y="626" font-size="12" font-weight="700" fill="#ffffff">ORDERED</text>
  <text x="920" y="626" font-size="12" font-weight="700" fill="#ffffff">DELIVERED</text>
  <text x="1050" y="626" font-size="12" font-weight="700" fill="#ffffff">STATUS</text>

  <rect x="80" y="642" width="1080" height="90" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <text x="105" y="685" font-size="14" font-weight="600" fill="#334155">1</text>
  <text x="150" y="675" font-size="15" font-weight="700" fill="#0f172a">Monocrystalline Solar Photovoltaic Cells (450W)</text>
  <text x="150" y="700" font-size="12" fill="#64748b">High-Efficiency Bifacial Half-Cut Cells. PO Match: PO-2026-BANK-770</text>
  <text x="650" y="688" font-size="13" fill="#334155">8541.40.11</text>
  <text x="780" y="688" font-size="15" font-weight="700" fill="#334155">3,000 units</text>
  <text x="920" y="688" font-size="18" font-weight="800" fill="#059669">3,000 units</text>
  <text x="1050" y="688" font-size="14" font-weight="800" fill="#059669">VERIFIED</text>

  <!-- Receiver Stamp & Signature -->
  <rect x="640" y="780" width="520" height="280" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <text x="665" y="815" font-size="13" font-weight="700" fill="#475569">SITE VERIFICATION &amp; CLEARANCE (BUYER)</text>

  <g transform="translate(670, 850) rotate(2)">
    <rect x="0" y="0" width="280" height="120" rx="10" fill="#ecfdf5" stroke="#059669" stroke-width="3.5"/>
    <text x="140" y="32" text-anchor="middle" font-size="13" font-weight="900" fill="#065f46">ACME SOLAR INFRASTRUCTURE</text>
    <text x="140" y="58" text-anchor="middle" font-size="12" font-weight="800" fill="#047857">SOLAR FARM HUB B - KURNOOL</text>
    <text x="140" y="82" text-anchor="middle" font-size="14" font-weight="900" fill="#059669">★ 3,000 UNITS VERIFIED ★</text>
    <text x="140" y="106" text-anchor="middle" font-size="12" font-weight="700" fill="#065f46">DATE: 04-SEP-2026</text>
  </g>

  <g transform="translate(960, 880)">
    <path d="M 10 50 Q 40 10 80 40 T 140 25" stroke="#ea580c" stroke-width="3" fill="none"/>
    <text x="25" y="80" font-size="18" font-family="'Brush Script MT', cursive" fill="#ea580c">K. V. Rao</text>
    <text x="25" y="105" font-size="13" font-weight="700" fill="#0f172a">K. V. Rao</text>
    <text x="25" y="125" font-size="11" fill="#64748b">Chief Site Electrical Engineer</text>
  </g>
</svg>
`;
}

// --------------------------------------------------------------------------
// 10. Address Mismatch (Delivered to Mumbai instead of Bengaluru)
// --------------------------------------------------------------------------
function generateAddressMismatchChallan() {
  return `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg" style="background:#fcfdfd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <rect x="30" y="30" width="1180" height="1694" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" rx="4"/>
  <rect x="50" y="50" width="1140" height="140" fill="#0f172a"/>

  <text x="90" y="105" font-size="30" font-weight="800" fill="#ffffff">APEX PRECISION ENGINEERING LTD</text>
  <text x="90" y="135" font-size="15" fill="#94a3b8">Industrial Area Phase 2, Peenya, Bengaluru, Karnataka 560058</text>
  <text x="90" y="160" font-size="13" fill="#ef4444">⚠ MISROUTED DELIVERY CONSIGNMENT TEST FIXTURE</text>

  <rect x="910" y="80" width="240" height="75" rx="8" fill="#7f1d1d"/>
  <text x="930" y="110" font-size="13" font-weight="600" fill="#fca5a5">SECURITY TEST</text>
  <text x="930" y="138" font-size="18" font-weight="800" fill="#ffffff">DELIVERY CHALLAN</text>

  <!-- Meta Info -->
  <rect x="80" y="220" width="1080" height="130" fill="#fef2f2" stroke="#fecaca" stroke-width="1" rx="6"/>
  <text x="110" y="255" font-size="14" font-weight="700" fill="#475569">CHALLAN NUMBER</text>
  <text x="110" y="285" font-size="20" font-weight="800" fill="#0f172a">DC-2026-1045-MISROUTE</text>
  <text x="110" y="325" font-size="13" fill="#64748b">Dispatch: 2026-09-04</text>

  <text x="390" y="255" font-size="14" font-weight="700" fill="#475569">REFERENCE PO</text>
  <text x="390" y="285" font-size="20" font-weight="800" fill="#2563eb">PO-2026-1045</text>
  <text x="390" y="325" font-size="13" fill="#64748b">Contract Date: 2026-09-01</text>

  <text x="670" y="255" font-size="14" font-weight="700" fill="#475569">DELIVERY DATE</text>
  <text x="670" y="285" font-size="20" font-weight="800" fill="#0f172a">2026-09-05</text>
  <text x="670" y="325" font-size="13" fill="#64748b">Timestamp Valid</text>

  <!-- Parties -->
  <rect x="80" y="380" width="520" height="210" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <rect x="80" y="380" width="520" height="38" fill="#f1f5f9" rx="6"/>
  <text x="100" y="405" font-size="14" font-weight="700" fill="#334155">CONSIGNOR (SUPPLIER)</text>
  <text x="100" y="445" font-size="17" font-weight="700" fill="#0f172a">Apex Precision Engineering Ltd</text>
  <text x="100" y="475" font-size="14" fill="#475569">Plot 18, Phase 2, Peenya, Bengaluru 560058</text>

  <!-- WRONG CONSIGNEE DESTINATION -->
  <rect x="640" y="380" width="520" height="210" fill="#fff1f2" stroke="#f43f5e" stroke-width="2" rx="6"/>
  <rect x="640" y="380" width="520" height="38" fill="#ffe4e6" rx="6"/>
  <text x="660" y="405" font-size="14" font-weight="700" fill="#be123c">CONSIGNEE (WRONG DESTINATION)</text>
  <text x="660" y="445" font-size="17" font-weight="800" fill="#9f1239">Acme Logistics Hub - West Zone</text>
  <text x="660" y="475" font-size="15" font-weight="700" fill="#e11d48">Plot 88, Sector 4, Bhiwandi Logistics Corridor</text>
  <text x="660" y="500" font-size="15" font-weight="700" fill="#e11d48">Mumbai, Maharashtra 421302</text>
  <text x="660" y="530" font-size="13" fill="#881337">⚠ MISMATCH: Contract requires Bengaluru Plant 4</text>

  <!-- Items -->
  <rect x="80" y="620" width="1080" height="46" fill="#1e293b" rx="4"/>
  <text x="105" y="650" font-size="13" font-weight="700" fill="#ffffff">#</text>
  <text x="145" y="650" font-size="13" font-weight="700" fill="#ffffff">ITEM DESCRIPTION</text>
  <text x="760" y="650" font-size="13" font-weight="700" fill="#ffffff">ORDERED</text>
  <text x="890" y="650" font-size="13" font-weight="700" fill="#ffffff">DELIVERED</text>

  <rect x="80" y="666" width="1080" height="90" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <text x="105" y="705" font-size="15" font-weight="600" fill="#334155">1</text>
  <text x="145" y="700" font-size="16" font-weight="700" fill="#0f172a">Industrial Ball Bearings (6205-2RS Deep Groove)</text>
  <text x="760" y="715" font-size="16" font-weight="700" fill="#334155">500 units</text>
  <text x="890" y="715" font-size="18" font-weight="800" fill="#0f172a">500 units</text>

  <!-- Stamps -->
  <g transform="translate(670, 820) rotate(1)">
    <rect x="0" y="0" width="300" height="120" rx="8" fill="#fff1f2" stroke="#e11d48" stroke-width="3"/>
    <text x="150" y="35" text-anchor="middle" font-size="13" font-weight="900" fill="#be123c">ACME WEST ZONE LOGISTICS</text>
    <text x="150" y="65" text-anchor="middle" font-size="13" font-weight="800" fill="#9f1239">RECEIVED AT BHIWANDI HUB</text>
    <text x="150" y="95" text-anchor="middle" font-size="12" font-weight="700" fill="#e11d48">DATE: 05-SEP-2026 | MUMBAI</text>
  </g>
</svg>
`;
}

// --------------------------------------------------------------------------
// 11. Short Shipment (420 Delivered vs 500 Ordered)
// --------------------------------------------------------------------------
function generateShortShipmentChallan() {
  return `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg" style="background:#fcfdfd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <rect x="30" y="30" width="1180" height="1694" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" rx="4"/>
  <rect x="50" y="50" width="1140" height="140" fill="#0f172a"/>

  <text x="90" y="105" font-size="30" font-weight="800" fill="#ffffff">APEX PRECISION ENGINEERING LTD</text>
  <text x="90" y="135" font-size="15" fill="#94a3b8">Industrial Area Phase 2, Peenya, Bengaluru, Karnataka 560058</text>
  <text x="90" y="160" font-size="13" fill="#f59e0b">⚠ PARTIAL DELIVERY &amp; SHORTAGE EXCEPTION REPORT</text>

  <rect x="910" y="80" width="240" height="75" rx="8" fill="#78350f"/>
  <text x="930" y="110" font-size="12" font-weight="600" fill="#fde68a">SHORT SHIPMENT</text>
  <text x="930" y="138" font-size="18" font-weight="800" fill="#ffffff">DELIVERY CHALLAN</text>

  <!-- Meta Info -->
  <rect x="80" y="220" width="1080" height="130" fill="#fffbeb" stroke="#fde68a" stroke-width="1" rx="6"/>
  <text x="110" y="255" font-size="14" font-weight="700" fill="#475569">CHALLAN NUMBER</text>
  <text x="110" y="285" font-size="20" font-weight="800" fill="#0f172a">DC-2026-1045-SHORT</text>

  <text x="390" y="255" font-size="14" font-weight="700" fill="#475569">REFERENCE PO</text>
  <text x="390" y="285" font-size="20" font-weight="800" fill="#2563eb">PO-2026-1045</text>

  <text x="670" y="255" font-size="14" font-weight="700" fill="#475569">DELIVERY DATE</text>
  <text x="670" y="285" font-size="20" font-weight="800" fill="#0f172a">2026-09-05</text>

  <!-- Consignee -->
  <rect x="80" y="380" width="1080" height="140" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <text x="100" y="415" font-size="14" font-weight="700" fill="#334155">CONSIGNEE (DELIVER TO)</text>
  <text x="100" y="445" font-size="17" font-weight="700" fill="#0f172a">Acme Manufacturing Corp - Plant 4</text>
  <text x="100" y="475" font-size="14" fill="#475569">Warehouse Gate 3, Electronic City Phase 2, Bengaluru 560100</text>

  <!-- Items Table with Shortage -->
  <rect x="80" y="550" width="1080" height="46" fill="#1e293b" rx="4"/>
  <text x="105" y="580" font-size="13" font-weight="700" fill="#ffffff">#</text>
  <text x="145" y="580" font-size="13" font-weight="700" fill="#ffffff">ITEM DESCRIPTION</text>
  <text x="620" y="580" font-size="13" font-weight="700" fill="#ffffff">ORDERED</text>
  <text x="760" y="580" font-size="13" font-weight="700" fill="#ffffff">DELIVERED</text>
  <text x="910" y="580" font-size="13" font-weight="700" fill="#ffffff">SHORTAGE</text>
  <text x="1030" y="580" font-size="13" font-weight="700" fill="#ffffff">STATUS</text>

  <rect x="80" y="596" width="1080" height="90" fill="#fffbeb" stroke="#fcd34d" stroke-width="1.5"/>
  <text x="105" y="640" font-size="15" font-weight="600" fill="#334155">1</text>
  <text x="145" y="635" font-size="16" font-weight="700" fill="#0f172a">Industrial Ball Bearings (6205-2RS Deep Groove)</text>
  <text x="145" y="660" font-size="13" fill="#b45309">Short shipment: 80 units damaged during transit / rejected at inward</text>
  <text x="620" y="645" font-size="16" font-weight="700" fill="#334155">500 units</text>
  <text x="760" y="645" font-size="20" font-weight="900" fill="#d97706">420 units</text>
  <text x="910" y="645" font-size="18" font-weight="800" fill="#dc2626">-80 units</text>
  <text x="1030" y="645" font-size="14" font-weight="800" fill="#d97706">PARTIAL</text>

  <!-- Shortage Stamp -->
  <g transform="translate(670, 740) rotate(-2)">
    <rect x="0" y="0" width="340" height="130" rx="10" fill="#fffbeb" stroke="#d97706" stroke-width="3.5"/>
    <text x="170" y="32" text-anchor="middle" font-size="14" font-weight="900" fill="#92400e">ACME MANUFACTURING CORP</text>
    <text x="170" y="60" text-anchor="middle" font-size="13" font-weight="800" fill="#b45309">PARTIAL DELIVERY ACCEPTED</text>
    <text x="170" y="88" text-anchor="middle" font-size="16" font-weight="900" fill="#d97706">★ 420 UNITS VERIFIED (SHORT: 80) ★</text>
    <text x="170" y="112" text-anchor="middle" font-size="12" font-weight="700" fill="#78350f">DATE: 05-SEP-2026 | DEBIT NOTE REQUIRED</text>
  </g>
</svg>
`;
}

// --------------------------------------------------------------------------
// 12. Delayed Delivery (2026-09-30 vs 2026-09-05 SLA Breach)
// --------------------------------------------------------------------------
function generateDelayedDeliveryChallan() {
  return `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg" style="background:#fcfdfd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <rect x="30" y="30" width="1180" height="1694" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" rx="4"/>
  <rect x="50" y="50" width="1140" height="140" fill="#0f172a"/>

  <text x="90" y="105" font-size="30" font-weight="800" fill="#ffffff">APEX PRECISION ENGINEERING LTD</text>
  <text x="90" y="135" font-size="15" fill="#94a3b8">Industrial Area Phase 2, Peenya, Bengaluru, Karnataka 560058</text>
  <text x="90" y="160" font-size="13" fill="#ef4444">⚠ LATE DELIVERY / SLA BREACH TEST FIXTURE</text>

  <!-- Meta Info -->
  <rect x="80" y="220" width="1080" height="130" fill="#fef2f2" stroke="#fecaca" stroke-width="1" rx="6"/>
  <text x="110" y="255" font-size="14" font-weight="700" fill="#475569">CHALLAN NUMBER</text>
  <text x="110" y="285" font-size="20" font-weight="800" fill="#0f172a">DC-2026-1045-LATE</text>

  <text x="390" y="255" font-size="14" font-weight="700" fill="#475569">REFERENCE PO</text>
  <text x="390" y="285" font-size="20" font-weight="800" fill="#2563eb">PO-2026-1045</text>

  <!-- LATE DELIVERY DATE -->
  <text x="670" y="255" font-size="14" font-weight="700" fill="#dc2626">ACTUAL DELIVERY DATE</text>
  <text x="670" y="285" font-size="24" font-weight="900" fill="#dc2626">2026-09-30</text>
  <text x="670" y="325" font-size="13" font-weight="700" fill="#b91c1c">⚠ 25 DAYS PAST CONTRACT SLA (2026-09-05)</text>

  <!-- Consignee -->
  <rect x="80" y="380" width="1080" height="140" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <text x="100" y="415" font-size="14" font-weight="700" fill="#334155">CONSIGNEE (DELIVER TO)</text>
  <text x="100" y="445" font-size="17" font-weight="700" fill="#0f172a">Acme Manufacturing Corp - Plant 4</text>
  <text x="100" y="475" font-size="14" fill="#475569">Warehouse Gate 3, Electronic City Phase 2, Bengaluru 560100</text>

  <!-- Items -->
  <rect x="80" y="550" width="1080" height="46" fill="#1e293b" rx="4"/>
  <text x="105" y="580" font-size="13" font-weight="700" fill="#ffffff">#</text>
  <text x="145" y="580" font-size="13" font-weight="700" fill="#ffffff">ITEM DESCRIPTION</text>
  <text x="760" y="580" font-size="13" font-weight="700" fill="#ffffff">ORDERED</text>
  <text x="890" y="580" font-size="13" font-weight="700" fill="#ffffff">DELIVERED</text>

  <rect x="80" y="596" width="1080" height="90" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <text x="105" y="635" font-size="15" font-weight="600" fill="#334155">1</text>
  <text x="145" y="630" font-size="16" font-weight="700" fill="#0f172a">Industrial Ball Bearings (6205-2RS Deep Groove)</text>
  <text x="760" y="645" font-size="16" font-weight="700" fill="#334155">500 units</text>
  <text x="890" y="645" font-size="18" font-weight="800" fill="#0f172a">500 units</text>

  <!-- Late Stamp -->
  <g transform="translate(670, 730) rotate(3)">
    <rect x="0" y="0" width="340" height="120" rx="10" fill="#fef2f2" stroke="#dc2626" stroke-width="3.5"/>
    <text x="170" y="32" text-anchor="middle" font-size="13" font-weight="900" fill="#991b1b">ACME MANUFACTURING CORP</text>
    <text x="170" y="60" text-anchor="middle" font-size="15" font-weight="900" fill="#dc2626">★ RECEIVED LATE (30-SEP-2026) ★</text>
    <text x="170" y="85" text-anchor="middle" font-size="12" font-weight="800" fill="#b91c1c">SLA PENALTY APPLIES (25 DAYS OVERDUE)</text>
    <text x="170" y="105" text-anchor="middle" font-size="11" fill="#7f1d1d">RECEIVED SUBJECT TO COMMERCIAL ADJUSTMENT</text>
  </g>
</svg>
`;
}

// --------------------------------------------------------------------------
// 13. Transporter Lorry Receipt (LR) - V-Trans Logistics
// --------------------------------------------------------------------------
function generateTransporterLorryReceipt() {
  return `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg" style="background:#fcfdfd; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <rect x="30" y="30" width="1180" height="1694" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" rx="4"/>
  <rect x="50" y="50" width="1140" height="130" fill="#1e3a8a"/>

  <text x="90" y="100" font-size="28" font-weight="800" fill="#ffffff">V-TRANS LOGISTICS INDIA LTD</text>
  <text x="90" y="125" font-size="14" fill="#93c5fd">National Surface Transport &amp; Express Cargo Network | Indian Motor Tariff Compliant</text>
  <text x="90" y="150" font-size="12" fill="#bfdbfe">Regd Office: V-Trans House, Mumbai | Bengaluru Regional Hub: Peenya Outer Ring Road</text>

  <rect x="860" y="75" width="290" height="75" rx="8" fill="#172554"/>
  <text x="880" y="105" font-size="12" font-weight="600" fill="#93c5fd">CONSIGNMENT NOTE</text>
  <text x="880" y="132" font-size="18" font-weight="800" fill="#60a5fa">LORRY RECEIPT (LR)</text>

  <!-- Meta Info -->
  <rect x="80" y="210" width="1080" height="120" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" rx="6"/>
  <text x="110" y="245" font-size="13" font-weight="700" fill="#64748b">CONSIGNMENT LR NO.</text>
  <text x="110" y="275" font-size="20" font-weight="800" fill="#0f172a">LR-BLR-2026-9811</text>
  <text x="110" y="305" font-size="12" fill="#64748b">Date: 2026-09-04</text>

  <text x="390" y="245" font-size="13" font-weight="700" fill="#64748b">PURCHASE ORDER REF</text>
  <text x="390" y="275" font-size="20" font-weight="800" fill="#2563eb">PO-2026-1045</text>
  <text x="390" y="305" font-size="12" fill="#64748b">Challan: DC-2026-1045-A</text>

  <text x="670" y="245" font-size="13" font-weight="700" fill="#64748b">DELIVERY / POD DATE</text>
  <text x="670" y="275" font-size="20" font-weight="800" fill="#059669">2026-09-05</text>
  <text x="670" y="305" font-size="12" fill="#059669">Delivered in Full</text>

  <text x="920" y="245" font-size="13" font-weight="700" fill="#64748b">VEHICLE &amp; DRIVER</text>
  <text x="920" y="275" font-size="17" font-weight="800" fill="#0f172a">KA-04-MB-4819</text>
  <text x="920" y="305" font-size="12" fill="#64748b">Driver: Sunil Gowda</text>

  <!-- Consignor & Consignee -->
  <rect x="80" y="355" width="520" height="190" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <rect x="80" y="355" width="520" height="34" fill="#f1f5f9" rx="6"/>
  <text x="100" y="378" font-size="13" font-weight="700" fill="#334155">CONSIGNOR (SUPPLIER)</text>
  <text x="100" y="415" font-size="16" font-weight="700" fill="#0f172a">Apex Precision Engineering Ltd</text>
  <text x="100" y="440" font-size="13" fill="#475569">Plot 18, Phase 2, Peenya Industrial Area</text>
  <text x="100" y="462" font-size="13" fill="#475569">Bengaluru, Karnataka 560058</text>
  <text x="100" y="490" font-size="13" font-weight="600" fill="#64748b">GSTIN: 29AAACA1234Z1ZA</text>

  <rect x="640" y="355" width="520" height="190" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <rect x="640" y="355" width="520" height="34" fill="#f1f5f9" rx="6"/>
  <text x="660" y="378" font-size="13" font-weight="700" fill="#334155">CONSIGNEE (DESTINATION)</text>
  <text x="660" y="415" font-size="16" font-weight="700" fill="#0f172a">Acme Manufacturing Corp</text>
  <text x="660" y="440" font-size="13" fill="#475569">Manufacturing Plant 4, Warehouse Gate 3</text>
  <text x="660" y="462" font-size="13" fill="#475569">Electronic City Phase 2, Bengaluru 560100</text>
  <text x="660" y="490" font-size="13" font-weight="600" fill="#334155">Receiver: Rajesh Kumar (General Warehouse Mgr)</text>

  <!-- Cargo Table -->
  <rect x="80" y="570" width="1080" height="42" fill="#0f172a" rx="4"/>
  <text x="105" y="596" font-size="12" font-weight="700" fill="#ffffff">PACKAGES</text>
  <text x="250" y="596" font-size="12" font-weight="700" fill="#ffffff">DESCRIPTION OF GOODS SAID TO CONTAIN</text>
  <text x="750" y="596" font-size="12" font-weight="700" fill="#ffffff">WEIGHT (KG)</text>
  <text x="910" y="596" font-size="12" font-weight="700" fill="#ffffff">QUANTITY</text>
  <text x="1040" y="596" font-size="12" font-weight="700" fill="#ffffff">FREIGHT</text>

  <rect x="80" y="612" width="1080" height="85" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <text x="105" y="655" font-size="15" font-weight="700" fill="#0f172a">10 Crates</text>
  <text x="250" y="648" font-size="15" font-weight="700" fill="#0f172a">Industrial Ball Bearings (6205-2RS)</text>
  <text x="250" y="670" font-size="12" fill="#64748b">Factory packed wooden pallets. Contract Ref: PO-2026-1045</text>
  <text x="750" y="655" font-size="15" font-weight="600" fill="#334155">450.00 Kgs</text>
  <text x="910" y="655" font-size="17" font-weight="800" fill="#059669">500 units</text>
  <text x="1040" y="655" font-size="14" font-weight="700" fill="#334155">PAID</text>

  <!-- Consignee Proof of Delivery (POD) Signature -->
  <rect x="640" y="725" width="520" height="280" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" rx="6"/>
  <text x="665" y="760" font-size="13" font-weight="700" fill="#475569">CONSIGNEE ACKNOWLEDGMENT (PROOF OF DELIVERY)</text>

  <g transform="translate(660, 800)">
    <rect x="0" y="0" width="270" height="110" rx="8" fill="#ecfdf5" stroke="#059669" stroke-width="3"/>
    <text x="135" y="30" text-anchor="middle" font-size="13" font-weight="900" fill="#065f46">ACME MANUFACTURING CORP</text>
    <text x="135" y="54" text-anchor="middle" font-size="12" font-weight="800" fill="#047857">GATE 3 - GOODS RECEIVED</text>
    <text x="135" y="78" text-anchor="middle" font-size="13" font-weight="900" fill="#059669">★ 500 UNITS RECEIVED INTACT ★</text>
    <text x="135" y="98" text-anchor="middle" font-size="11" fill="#065f46">DATE: 05-SEP-2026 | 14:15 IST</text>
  </g>

  <g transform="translate(950, 820)">
    <path d="M 10 50 Q 40 10 80 40 T 140 25" stroke="#1d4ed8" stroke-width="3" fill="none"/>
    <text x="25" y="80" font-size="18" font-family="'Brush Script MT', cursive" fill="#1d4ed8">Rajesh Kumar</text>
    <text x="25" y="105" font-size="13" font-weight="700" fill="#0f172a">Rajesh Kumar</text>
    <text x="25" y="125" font-size="11" fill="#64748b">General Warehouse Manager</text>
  </g>
</svg>
`;
}

async function main() {
  console.log('Generating Set 2 live demonstration .jpg documents...');
  await exportJpeg(generateGoodsReceiptNote(), '6_goods_receipt_note_grn.jpg');
  await exportJpeg(generateMedicalStentsDeliveryChallan(), '7_medical_stents_delivery_challan.jpg');
  await exportJpeg(generateMedicalStentsTaxInvoice(), '8_medical_stents_tax_invoice.jpg');
  await exportJpeg(generateSolarPvCellsDeliveryChallan(), '9_solar_pv_cells_delivery_challan.jpg');
  await exportJpeg(generateAddressMismatchChallan(), '10_address_mismatch_wrong_warehouse.jpg');
  await exportJpeg(generateShortShipmentChallan(), '11_short_shipment_partial_delivery.jpg');
  await exportJpeg(generateDelayedDeliveryChallan(), '12_expired_sla_delayed_delivery.jpg');
  await exportJpeg(generateTransporterLorryReceipt(), '13_transporter_lorry_receipt_lr.jpg');
  console.log('All 8 Set-2 demonstration .jpg files generated successfully!');
}

main().catch((err) => {
  console.error('Error generating demo set 2 jpgs:', err);
  process.exit(1);
});
