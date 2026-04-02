// OUI Lookup Tool for Flipper Zero - Momentum Firmware
// Place this file at: SD/apps/Scripts/oui_lookup.js
// Place oui_db.txt at: SD/apps_data/oui_lookup/oui_db.txt
// Run from: Apps > Scripts > oui_lookup.js

let storage = require("storage");
let submenu = require("submenu");
let textbox = require("textbox");
let notify = require("notification");

let DB_PATH = "/ext/apps_data/oui_lookup/oui_db.txt";

// ─── Embedded threat-critical OUIs ────────────────────────────────────────
// Format: "AABBCC|Manufacturer|Category|ThreatLevel"
// ThreatLevel: HIGH / MED / LOW
let EMBEDDED_DB = [
  // ── ESP / IoT Camera Chips ─────────────────────────────────────────────
  "240AC4|Espressif Systems|Spy Cam Chip|HIGH",
  "30AEA4|Espressif Systems|Spy Cam Chip|HIGH",
  "A4CF12|Espressif Systems|Spy Cam Chip|HIGH",
  "84F3EB|Espressif Systems|Spy Cam Chip|HIGH",
  "8CAAB5|Espressif Systems|Spy Cam Chip|HIGH",
  "ECFABC|Espressif Systems|Spy Cam Chip|HIGH",
  "E8DB84|Espressif Systems|Spy Cam Chip|HIGH",
  "CC50E3|Espressif Systems|Spy Cam Chip|HIGH",
  "B4E62D|Espressif Systems|Spy Cam Chip|HIGH",
  "DC4F22|Espressif Systems|Spy Cam Chip|HIGH",
  "A8032A|Espressif Systems|Spy Cam Chip|HIGH",
  "BCDDC2|Espressif Systems|Spy Cam Chip|HIGH",
  "2C3AE8|Espressif Systems|Spy Cam Chip|HIGH",
  "943CC6|Espressif Systems|Spy Cam Chip|HIGH",
  "AC67B2|Espressif Systems|Spy Cam Chip|HIGH",
  "4C11AE|Espressif Systems|Spy Cam Chip|HIGH",
  "083AF2|Espressif Systems|Spy Cam Chip|HIGH",
  "FCF5C4|Espressif Systems|Spy Cam Chip|HIGH",
  "1866DA|Espressif Systems|Spy Cam Chip|HIGH",
  // ── IP Camera SoC Makers ───────────────────────────────────────────────
  "001AEF|Hisilicon|Surveillance SoC|HIGH",
  "0080AC|Ingenic Semi|Camera SoC|HIGH",
  "001C7B|Ambarella|IP Camera SoC|HIGH",
  "000CE7|MediaTek|IoT/Camera Chip|MED",
  "0090CC|Ralink/MediaTek|WiFi Camera|MED",
  "00E04C|Realtek|WiFi Cam Chip|MED",
  "0050FC|Realtek|WiFi Cam Chip|MED",
  // ── Known Surveillance Brands ──────────────────────────────────────────
  "3CEF8C|Dahua Technology|CCTV Brand|HIGH",
  "A41437|Dahua Technology|CCTV Brand|HIGH",
  "C056E3|Hikvision|CCTV Brand|HIGH",
  "BCAD28|Hikvision|CCTV Brand|HIGH",
  "4419B6|Hikvision|CCTV Brand|HIGH",
  "306266|Hikvision|CCTV Brand|HIGH",
  "EC71DB|Reolink|IP Camera|MED",
  "8CF6B1|Reolink|IP Camera|MED",
  "001DB5|Axis Comm|IP Camera|MED",
  "ACCC8E|Axis Comm|IP Camera|MED",
  // ── BLE Trackers ──────────────────────────────────────────────────────
  "40CBC0|Apple AirTag|BLE Tracker|HIGH",
  "3CCD57|Apple AirTag|BLE Tracker|HIGH",
  "7CF05F|Apple|BLE Tracker|HIGH",
  "087CBE|Tile Inc|BLE Tracker|HIGH",
  "AC3743|Tile Inc|BLE Tracker|HIGH",
  "94A3DA|Samsung SmartTag|BLE Tracker|HIGH",
  "40D3AE|Samsung SmartTag|BLE Tracker|HIGH",
  "7C7A91|Samsung|BLE Tracker|HIGH",
  // ── Generic IoT / Shenzhen OUIs ───────────────────────────────────────
  "2CF0A2|Shenzhen Bilian|Generic IoT|MED",
  "DCA632|Raspberry Pi|Dev Board|LOW",
  "B827EB|Raspberry Pi|Dev Board|LOW",
  "E45F01|Raspberry Pi|Dev Board|LOW",
  "1802F3|Tuya Smart|IoT Device|MED",
  "A4C138|Tuya Smart|IoT Device|MED",
  // ── Common Routers ────────────────────────────────────────────────────
  "50C7BF|TP-Link|Router|LOW",
  "A42BB0|TP-Link|Router|LOW",
  "54AF97|TP-Link|Router|LOW",
  "C46E1F|TP-Link|Router|LOW",
  "18D6C7|Apple|Router/AP|LOW",
  "28CFDA|Apple|Device|LOW",
  "001A2F|Cisco|Router|LOW",
  "E8BAE3|Netgear|Router|LOW",
  "A021B7|Netgear|Router|LOW",
  "202BC1|Ubiquiti|AP/Router|LOW",
  // ── Mobile Device Makers ──────────────────────────────────────────────
  "40B4CD|Google Pixel|Mobile|LOW",
  "54EE75|Google Pixel|Mobile|LOW",
  "F8A9D0|Samsung|Mobile|LOW",
  "9C5C8E|Apple|Mobile|LOW",
];

// ─── Normalize MAC: strip separators, uppercase, take first 6 chars ─────
function normalizeMac(input) {
  let s = "";
  let i = 0;
  while (i < input.length) {
    let c = input[i];
    if (c !== ":" && c !== "-" && c !== ".") {
      s = s + c;
    }
    i = i + 1;
  }
  s = s.toUpperCase();
  if (s.length >= 6) {
    return s.slice(0, 6);
  }
  return s;
}

// ─── Search embedded DB ─────────────────────────────────────────────────
function searchEmbedded(prefix) {
  let results = [];
  let i = 0;
  while (i < EMBEDDED_DB.length) {
    let entry = EMBEDDED_DB[i];
    let parts = entry.split("|");
    if (parts.length >= 4) {
      let oui = parts[0].toUpperCase();
      if (oui === prefix) {
        results.push(parts);
      }
    }
    i = i + 1;
  }
  return results;
}

// ─── Search file-based DB ────────────────────────────────────────────────
function searchFile(prefix) {
  let results = [];
  if (!storage.exists(DB_PATH)) {
    return results;
  }
  let content = storage.read(DB_PATH);
  if (content === undefined) {
    return results;
  }
  let lines = content.split("\n");
  let i = 0;
  while (i < lines.length) {
    let line = lines[i];
    if (line.length > 0 && line[0] !== "#") {
      let parts = line.split("|");
      if (parts.length >= 4) {
        let oui = parts[0].toUpperCase().trim();
        if (oui === prefix) {
          results.push(parts);
        }
      }
    }
    i = i + 1;
  }
  return results;
}

// ─── Build result display string ─────────────────────────────────────────
function buildResultText(prefix, results) {
  let text = "OUI: " + prefix + "\n";
  text = text + "────────────────\n";
  if (results.length === 0) {
    text = text + "NOT FOUND\n\n";
    text = text + "Unknown manufacturer.\n";
    text = text + "Could be spoofed,\n";
    text = text + "very new, or rare.\n\n";
    text = text + "Check maclookup.app\n";
    text = text + "for full database.";
  } else {
    let i = 0;
    while (i < results.length) {
      let r = results[i];
      text = text + "Vendor: " + r[1] + "\n";
      text = text + "Type: " + r[2] + "\n";
      text = text + "Threat: " + r[3] + "\n";
      if (r[3] === "HIGH") {
        text = text + ">>> FLAG THIS DEVICE\n";
      }
      i = i + 1;
    }
  }
  return text;
}

// ─── Threat category browser ─────────────────────────────────────────────
function browseThreatCategory(categoryFilter) {
  let text = "Category: " + categoryFilter + "\n";
  text = text + "────────────────\n";
  let i = 0;
  while (i < EMBEDDED_DB.length) {
    let entry = EMBEDDED_DB[i];
    let parts = entry.split("|");
    if (parts.length >= 4 && parts[2] === categoryFilter) {
      text = text + parts[0] + " " + parts[1] + "\n";
    }
    i = i + 1;
  }
  textbox.setConfig("start", "text");
  textbox.clearText();
  textbox.addText(text);
  textbox.show();
  while (textbox.isOpen()) {
    delay(100);
  }
}

// ─── Manual MAC entry via built-in keyboard ──────────────────────────────
function doManualLookup() {
  textbox.setConfig("start", "text");
  textbox.clearText();
  textbox.addText(
    "MANUAL LOOKUP\n" +
    "────────────────\n" +
    "Enter the first 6\n" +
    "hex chars of your\n" +
    "MAC address.\n\n" +
    "Examples:\n" +
    "  240AC4\n" +
    "  AA:BB:CC\n" +
    "  AA-BB-CC\n\n" +
    "Press BACK then\n" +
    "use Marauder\n" +
    "listap -a to get\n" +
    "BSSID values,\n" +
    "then return and\n" +
    "use Browse OUIs\n" +
    "to cross-check."
  );
  textbox.show();
  while (textbox.isOpen()) {
    delay(100);
  }
}

// ─── Quick reference for Espressif (most common spy cam chip) ────────────
function showEspressifRef() {
  let text = "ESPRESSIF OUIs\n";
  text = text + "(ESP8266/ESP32)\n";
  text = text + "Common in cheap\n";
  text = text + "spy cameras:\n";
  text = text + "────────────────\n";
  text = text + "24:0A:C4\n";
  text = text + "30:AE:A4\n";
  text = text + "A4:CF:12\n";
  text = text + "84:F3:EB\n";
  text = text + "8C:AA:B5\n";
  text = text + "EC:FA:BC\n";
  text = text + "E8:DB:84\n";
  text = text + "CC:50:E3\n";
  text = text + "B4:E6:2D\n";
  text = text + "DC:4F:22\n";
  text = text + "A8:03:2A\n";
  text = text + "BC:DD:C2\n";
  text = text + "2C:3A:E8\n";
  text = text + "94:3C:C6\n";
  text = text + "AC:67:B2\n";
  text = text + "4C:11:AE\n";
  text = text + "08:3A:F2\n";
  text = text + "FC:F5:C4\n";
  text = text + "18:66:DA\n";
  text = text + "────────────────\n";
  text = text + "If you see ANY\n";
  text = text + "of these in your\n";
  text = text + "Marauder scan -\n";
  text = text + "investigate.\n";
  textbox.setConfig("start", "text");
  textbox.clearText();
  textbox.addText(text);
  textbox.show();
  while (textbox.isOpen()) {
    delay(100);
  }
}

// ─── How to use guide ────────────────────────────────────────────────────
function showHowToUse() {
  let text =
    "HOW TO USE\n" +
    "────────────────\n" +
    "1. Run Marauder\n" +
    "2. Scan APs\n" +
    "3. Run: listap -a\n" +
    "4. Note any BSSID\n" +
    "   you don't know\n" +
    "5. Return here\n" +
    "6. Go to Browse\n" +
    "   OUIs by type\n" +
    "7. Match first 6\n" +
    "   chars of BSSID\n" +
    "   e.g. 24:0A:C4\n" +
    "   = Espressif\n" +
    "   = SPY CAM CHIP\n\n" +
    "HIGH threat = \n" +
    "investigate now\n\n" +
    "maclookup.app\n" +
    "for full DB on\n" +
    "your Pixel.";
  textbox.setConfig("start", "text");
  textbox.clearText();
  textbox.addText(text);
  textbox.show();
  while (textbox.isOpen()) {
    delay(100);
  }
}

// ─── Inline prefix lookup from submenu ──────────────────────────────────
function inlineLookup() {
  // Show list of all HIGH threat OUIs for quick visual matching
  let text = "HIGH THREAT OUIs\n";
  text = text + "Match vs Marauder\n";
  text = text + "listap output:\n";
  text = text + "────────────────\n";
  let i = 0;
  while (i < EMBEDDED_DB.length) {
    let entry = EMBEDDED_DB[i];
    let parts = entry.split("|");
    if (parts.length >= 4 && parts[3] === "HIGH") {
      let oui = parts[0];
      let name = parts[1];
      // Format as XX:XX:XX for readability
      let fmt = oui.slice(0,2)+":"+oui.slice(2,4)+":"+oui.slice(4,6);
      text = text + fmt + " " + name + "\n";
    }
    i = i + 1;
  }
  textbox.setConfig("start", "text");
  textbox.clearText();
  textbox.addText(text);
  textbox.show();
  while (textbox.isOpen()) {
    delay(100);
  }
}

// ─── Main loop ────────────────────────────────────────────────────────────
let running = true;
while (running) {
  submenu.setHeader("OUI MAC Lookup");
  submenu.addItem("All HIGH Threat OUIs", 0);
  submenu.addItem("Espressif Quick Ref", 1);
  submenu.addItem("Browse Spy Cam Chips", 2);
  submenu.addItem("Browse BLE Trackers", 3);
  submenu.addItem("Browse Surveil Brands", 4);
  submenu.addItem("Browse Common IoT", 5);
  submenu.addItem("How to Use", 6);
  submenu.addItem("Exit", 7);

  let choice = submenu.show();

  if (choice === 0) {
    inlineLookup();
  } else if (choice === 1) {
    showEspressifRef();
  } else if (choice === 2) {
    browseThreatCategory("Spy Cam Chip");
  } else if (choice === 3) {
    browseThreatCategory("BLE Tracker");
  } else if (choice === 4) {
    browseThreatCategory("CCTV Brand");
  } else if (choice === 5) {
    browseThreatCategory("IoT Device");
    browseThreatCategory("Generic IoT");
  } else if (choice === 6) {
    showHowToUse();
  } else {
    running = false;
  }
}

notify.success();
