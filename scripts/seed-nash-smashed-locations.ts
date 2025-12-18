/**
 * Seed script for Nash & Smashed locations
 *
 * Based on client's locations.ts file with simplified status model:
 * - active: Location is open and operational
 * - upcoming: Location is planned/coming soon (was "coming-soon")
 *
 * Usage: npx ts-node scripts/seed-nash-smashed-locations.ts
 */

import Database from "better-sqlite3";
import { generateId } from "../packages/shared/src/utils";
import path from "path";
import fs from "fs";

const dbPath = path.join(__dirname, "../data/seo-platform.db");

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys and WAL mode
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

console.log("🌱 Seeding Nash & Smashed locations...\n");

const businessId = "nash-and-smashed";
const now = new Date().toISOString();

// Location type matching the new schema
interface LocationData {
  name: string;
  display_name: string;
  address?: string;
  city: string;
  state: string;
  zip_code?: string;
  country: string;
  status: "active" | "upcoming";
  full_address?: string;
  google_maps_url?: string;
  phone?: string;
  email?: string;
  is_headquarters?: boolean;
  store_id?: string;
  order_link?: string;
  note?: string;
}

// Headquarters
const headquarters: LocationData = {
  name: "Headquarters",
  display_name: "Nash and Smashed Headquarters",
  address: "5609 Sandy Lewis Drive, Unit G & H",
  city: "Fairfax",
  state: "VA",
  zip_code: "22032",
  country: "USA",
  status: "active",
  full_address: "5609 Sandy Lewis Drive, Unit G & H, Fairfax, VA 22032",
  is_headquarters: true,
};

// All locations from client's locations.ts
const locations: LocationData[] = [
  // Virginia - Active Locations
  {
    name: "Manassas",
    display_name: "Nash and Smashed (Manassas)",
    address: "12853 Galveston Ct",
    city: "Manassas",
    state: "VA",
    zip_code: "20112",
    country: "USA",
    status: "active",
    full_address: "12853 Galveston Ct, Manassas, VA 20112, USA",
    google_maps_url: "https://maps.app.goo.gl/rKVJHdrT8f1LUsSM9",
    phone: "571-762-2677",
    email: "kaziarif393@gmail.com",
    store_id: "3045437",
    order_link: "https://order.online/store/~30454377/?hideModal=true",
  },
  {
    name: "Dumfries",
    display_name: "Nash and Smashed (Dumfries)",
    address: "3934 Fettler Park Dr",
    city: "Dumfries",
    state: "VA",
    zip_code: "22025",
    country: "USA",
    status: "active",
    full_address: "3934 Fettler Park Dr, Dumfries, VA 22025",
    google_maps_url: "https://maps.app.goo.gl/A7P3FFjrgskU5Ap97",
    phone: "571-370-5177",
    email: "Shohrab61@yahoo.com",
    store_id: "33549017",
    order_link: "https://order.online/store/~33549017/?hideModal=true",
  },
  {
    name: "Hampton",
    display_name: "Nash and Smashed (Hampton)",
    address: "36 Coliseum Xing",
    city: "Hampton",
    state: "VA",
    zip_code: "23666",
    country: "USA",
    status: "active",
    full_address: "36 Coliseum Xing, Hampton, VA 23666",
    google_maps_url: "https://maps.app.goo.gl/AoCwAfsdgwk2BDkk9",
    phone: "757-347-0717",
    email: "talhamughal553@gmail.com",
    store_id: "33829235",
    order_link: "https://order.online/store/~33829235/?hideModal=true",
  },
  {
    name: "Manassas Park",
    display_name: "Nash and Smashed (Manassas Park)",
    address: "9153 Manassas Dr",
    city: "Manassas Park",
    state: "VA",
    zip_code: "20111",
    country: "USA",
    status: "active",
    full_address: "9153 Manassas Dr, Manassas Park, VA 20111",
    google_maps_url:
      "https://www.google.com/maps/place/Nash+%26+Smashed+Manassas+Park/@38.7664472,-77.442609,781m",
    phone: "703-552-4776",
    email: "Mailtouddin@gmail.com",
    store_id: "35744677",
    order_link: "https://order.online/store/~35744677/?hideModal=true",
  },
  {
    name: "Glen Allen",
    display_name: "Nash and Smashed (Glen Allen)",
    address: "10174 W Broad St",
    city: "Glen Allen",
    state: "VA",
    zip_code: "23060",
    country: "USA",
    status: "active",
    full_address: "10174 W Broad St, Glen Allen, VA 23060",
    phone: "804-210-7440",
    email: "apanwer@hotmail.com",
    google_maps_url:
      "https://www.google.com/maps/place/Nash+%26+Smashed+Glen+allen+VA/@37.6462356,-77.5747256,678m",
    store_id: "35269623",
    order_link:
      "https://order.online/store/35269623?pickup=true&hideModal=true&redirected=true",
  },
  {
    name: "Norfolk",
    display_name: "Nash and Smashed (Norfolk)",
    address: "4820 Hampton Blvd",
    city: "Norfolk",
    state: "VA",
    zip_code: "23508",
    country: "USA",
    status: "active",
    full_address: "4820 Hampton Blvd, Norfolk, VA 23508",
    phone: "757-568-0830",
    google_maps_url: "https://maps.app.goo.gl/b8bivDNQorJeyxYC6",
    email: "talhamughal553@gmail.com",
    store_id: "34519491",
    order_link: "https://order.online/store/~34519491/?hideModal=true",
  },
  {
    name: "Woodbridge",
    display_name: "Nash and Smashed (Woodbridge)",
    address: "14572 Potomac Mills Rd",
    city: "Woodbridge",
    state: "VA",
    zip_code: "22192",
    country: "USA",
    status: "active",
    full_address: "14572 Potomac Mills Rd, Woodbridge, VA 22192",
    phone: "571-543-0403",
    google_maps_url:
      "https://www.google.com/maps/place/14572+Potomac+Mills+Rd,+Woodbridge,+VA+22192",
    email: "ahmedrajumd34@gmail.com",
    store_id: "36476777",
    order_link: "https://order.online/store/~36476777/?hideModal=true",
  },
  // Virginia - Upcoming Locations
  {
    name: "Alexandria",
    display_name: "Nash and Smashed (Alexandria)",
    address: "7609 Richmond Hwy",
    city: "Alexandria",
    state: "VA",
    zip_code: "22306",
    country: "USA",
    status: "upcoming",
    email: "Farhan-mushtaq@hotmail.com",
  },
  {
    name: "Arlington",
    display_name: "Nash and Smashed (Arlington N Glebe Rd)",
    address: "301 N Glebe Rd",
    city: "Arlington",
    state: "VA",
    zip_code: "22203",
    country: "USA",
    status: "upcoming",
    email: "ahmedrajumd34@gmail.com",
  },
  {
    name: "Arlington Crystal City",
    display_name: "Nash and Smashed (Arlington Crystal City)",
    address: "2333 S Eads St",
    city: "Arlington",
    state: "VA",
    zip_code: "22202",
    country: "USA",
    status: "upcoming",
  },
  {
    name: "Lorton",
    display_name: "Nash and Smashed (Lorton)",
    address: "7722 Gunston Plaza",
    city: "Lorton",
    state: "VA",
    zip_code: "22079",
    country: "USA",
    status: "upcoming",
    email: "Akramkhan1991@gmail.com",
  },
  {
    name: "Reston",
    display_name: "Nash and Smashed (Reston)",
    address: "1675 Reston Pkwy",
    city: "Reston",
    state: "VA",
    zip_code: "20170",
    country: "USA",
    status: "upcoming",
    email: "nhassan@columbiataxservice.com",
  },
  {
    name: "Warrenton",
    display_name: "Nash and Smashed (Warrenton)",
    address: "131-133 W Lee Hwy",
    city: "Warrenton",
    state: "VA",
    zip_code: "20186",
    country: "USA",
    status: "upcoming",
    email: "Mailtouddin@gmail.com",
  },
  {
    name: "Bristow",
    display_name: "Nash and Smashed (Bristow)",
    address: "12757 Braemar Village Plaza",
    city: "Bristow",
    state: "VA",
    zip_code: "20136",
    country: "USA",
    status: "upcoming",
  },
  // Maryland - Active Locations
  {
    name: "Silver Spring",
    display_name: "Nash and Smashed (Silver Spring)",
    address: "10121 Colesville Rd Unit #10",
    city: "Silver Spring",
    state: "MD",
    zip_code: "20901",
    country: "USA",
    status: "active",
    full_address: "10121 Colesville Rd, Unit #10, Silver Spring, MD 20901",
    google_maps_url: "https://maps.app.goo.gl/zQE3wEQaDT367m6D7",
    phone: "301-783-3907",
    email: "1833sa@gmail.com",
    store_id: "31990167",
    order_link: "https://order.online/store/~31990167/?hideModal=true",
  },
  {
    name: "New Hampshire Avenue",
    display_name: "Nash and Smashed (New Hampshire Avenue)",
    address: "13436 New Hampshire Ave",
    city: "Silver Spring",
    state: "MD",
    zip_code: "20904",
    country: "USA",
    status: "active",
    full_address: "13436 New Hampshire Ave, Silver Spring, MD 20904",
    phone: "443-227-4698",
    google_maps_url: "https://maps.app.goo.gl/GnNEdYN3YYPmyJdb9",
    order_link: "https://order.online/store/NashSmashed-38249489?pickup=true",
  },
  {
    name: "Baltimore",
    display_name: "Nash and Smashed (Baltimore)",
    address: "1118 S Charles St",
    city: "Baltimore",
    state: "MD",
    zip_code: "21230",
    country: "USA",
    status: "active",
    full_address: "1118 S Charles St, Baltimore, MD 21230",
    google_maps_url: "https://maps.app.goo.gl/bN1Uq6yY6wxwf9SS7",
    phone: "410-774-6606",
    email: "farhanalina55@gmail.com",
    store_id: "34266865",
    order_link: "https://order.online/store/~34266865/?hideModal=true",
  },
  {
    name: "Ellicott City",
    display_name: "Nash and Smashed (Ellicott City)",
    address: "8450 Baltimore National Pike Ste 140",
    city: "Ellicott City",
    state: "MD",
    zip_code: "21043",
    country: "USA",
    status: "active",
    phone: "410-988-5572",
    full_address:
      "8450 Baltimore National Pike Ste 140, Ellicott City, MD 21043",
    google_maps_url: "https://share.google/8NkTYUhWksWgLzc62",
    order_link: "https://order.online/store/NashSmashed-36476779?pickup=true",
  },
  // Maryland - Upcoming Locations
  {
    name: "Abingdon",
    display_name: "Nash and Smashed (Abingdon)",
    address: "3446 Emmorton Rd",
    city: "Abingdon",
    state: "MD",
    zip_code: "21009",
    country: "USA",
    status: "upcoming",
    email: "Emtiagrafi@gmail.com",
  },
  {
    name: "District Heights",
    display_name: "Nash and Smashed (District Heights)",
    address: "7704 Marlboro Pike",
    city: "District Heights",
    state: "MD",
    zip_code: "20747",
    country: "USA",
    status: "upcoming",
    email: "Eshaan.murad@gmail.com",
  },
  {
    name: "Temple Hills",
    display_name: "Nash and Smashed (Temple Hills)",
    address: "4265 Branch Ave",
    city: "Temple Hills",
    state: "MD",
    zip_code: "20748",
    country: "USA",
    status: "upcoming",
    email: "kaziarif393@gmail.com",
  },
  {
    name: "Lanham",
    display_name: "Nash and Smashed (Lanham)",
    address: "9329 Annapolis Rd #3120",
    city: "Lanham",
    state: "MD",
    zip_code: "20706",
    country: "USA",
    status: "upcoming",
    email: "Alpinaali@gmail.com",
  },
  {
    name: "Columbia",
    display_name: "Nash and Smashed (Columbia)",
    address: "6200 Valencia Lane",
    city: "Columbia",
    state: "MD",
    zip_code: "21044",
    country: "USA",
    status: "upcoming",
  },
  // Washington D.C. - Active Locations
  {
    name: "Connecticut Ave NW",
    display_name: "Nash and Smashed (Connecticut Ave NW DC)",
    address: "5030 Connecticut Ave NW",
    city: "Washington",
    state: "DC",
    zip_code: "20008",
    country: "USA",
    status: "active",
    full_address: "5030 Connecticut Ave NW, Washington, DC 20008",
    phone: "202-505-8405",
    google_maps_url: "https://maps.app.goo.gl/Jhstwh4Tt91EbtHi6",
    email: "Ahsanmughal0409@gmail.com",
    store_id: "31790607",
    order_link: "https://order.online/store/~31790607/?hideModal=true",
  },
  // Washington D.C. - Upcoming Locations
  {
    name: "H St NE",
    display_name: "Nash and Smashed (H St NE DC)",
    address: "901 H St NE",
    city: "Washington",
    state: "DC",
    zip_code: "20002",
    country: "USA",
    status: "upcoming",
    email: "Islam100p@gmail.com",
  },
  {
    name: "Michigan Ave NE",
    display_name: "Nash and Smashed (Michigan Ave NE)",
    address: "655 Michigan Ave NE",
    city: "Washington",
    state: "DC",
    zip_code: "20017",
    country: "USA",
    status: "upcoming",
    email: "basitraj77@gmail.com",
  },
  {
    name: "8th St SE",
    display_name: "Nash and Smashed (8th St SE DC)",
    address: "531 8th St SE",
    city: "Washington",
    state: "DC",
    zip_code: "20003",
    country: "USA",
    status: "upcoming",
  },
  {
    name: "Maple View SE",
    display_name: "Nash and Smashed (Maple View SE)",
    address: "1208 Maple View Pl SE",
    city: "Washington",
    state: "DC",
    zip_code: "20020",
    country: "USA",
    status: "upcoming",
    email: "Patwary4975@icloud.com",
  },
  // New York - Upcoming
  {
    name: "Albany",
    display_name: "Nash and Smashed (Albany)",
    address: "234 Central Ave",
    city: "Albany",
    state: "NY",
    zip_code: "12206",
    country: "USA",
    status: "upcoming",
  },
  {
    name: "Ronkonkoma",
    display_name: "Nash and Smashed (Ronkonkoma)",
    address: "550 Portion Rd",
    city: "Ronkonkoma",
    state: "NY",
    zip_code: "11779",
    country: "USA",
    status: "upcoming",
  },
  // South Carolina - Active
  {
    name: "Rock Hill",
    display_name: "Nash and Smashed (Rock Hill)",
    address: "4875 Old York Rd",
    city: "Rock Hill",
    state: "SC",
    zip_code: "29732",
    country: "USA",
    status: "active",
    note: "Inside Walmart Super-center",
  },
];

// Clear existing locations for this business
db.prepare("DELETE FROM locations WHERE business_id = ?").run(businessId);
console.log("✓ Cleared existing locations");

// Insert statement
const insertStmt = db.prepare(`
  INSERT INTO locations (
    id, business_id, name, display_name, address, city, state, zip_code, country,
    status, full_address, google_maps_url, phone, email, is_headquarters,
    store_id, order_link, note, priority, created_at, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?
  )
`);

// Insert headquarters first
const hqId = generateId();
insertStmt.run(
  hqId,
  businessId,
  headquarters.name,
  headquarters.display_name,
  headquarters.address || null,
  headquarters.city,
  headquarters.state,
  headquarters.zip_code || null,
  headquarters.country,
  headquarters.status,
  headquarters.full_address || null,
  headquarters.google_maps_url || null,
  headquarters.phone || null,
  headquarters.email || null,
  headquarters.is_headquarters ? 1 : 0,
  headquarters.store_id || null,
  headquarters.order_link || null,
  headquarters.note || null,
  0, // priority
  now,
  now
);
console.log("✓ Inserted headquarters");

// Insert all locations
let activeCount = 0;
let upcomingCount = 0;

locations.forEach((loc, index) => {
  const id = generateId();
  insertStmt.run(
    id,
    businessId,
    loc.name,
    loc.display_name,
    loc.address || null,
    loc.city,
    loc.state,
    loc.zip_code || null,
    loc.country,
    loc.status,
    loc.full_address || null,
    loc.google_maps_url || null,
    loc.phone || null,
    loc.email || null,
    loc.is_headquarters ? 1 : 0,
    loc.store_id || null,
    loc.order_link || null,
    loc.note || null,
    index + 1, // priority based on order
    now,
    now
  );

  if (loc.status === "active") {
    activeCount++;
  } else {
    upcomingCount++;
  }
});

console.log(`\n✅ Seeding complete!`);
console.log(`   Total locations: ${locations.length + 1} (including HQ)`);
console.log(`   Active: ${activeCount + 1}`);
console.log(`   Upcoming: ${upcomingCount}`);

// Show summary by state
const stateSummary = db
  .prepare(
    `
  SELECT state, status, COUNT(*) as count 
  FROM locations 
  WHERE business_id = ? 
  GROUP BY state, status 
  ORDER BY state, status
`
  )
  .all(businessId);

console.log("\n📍 Locations by state:");
const stateGroups: Record<string, { active: number; upcoming: number }> = {};
(
  stateSummary as Array<{ state: string; status: string; count: number }>
).forEach((row) => {
  if (!stateGroups[row.state]) {
    stateGroups[row.state] = { active: 0, upcoming: 0 };
  }
  if (row.status === "active") {
    stateGroups[row.state].active = row.count;
  } else {
    stateGroups[row.state].upcoming = row.count;
  }
});

Object.entries(stateGroups).forEach(([state, counts]) => {
  console.log(
    `   ${state}: ${counts.active} active, ${counts.upcoming} upcoming`
  );
});

db.close();
