import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db";
import User from "../models/User";
import Company from "../models/Company";
import Branch from "../models/Branch";
import Equipment from "../models/Equipment";
import Load from "../models/Load";
import Invoice from "../models/Invoice";
import Notification from "../models/Notification";
import Review from "../models/Review";

dotenv.config();

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "demo1234";
const now = () => new Date().toISOString();

// Helper to generate IDs
const uid = (prefix: string) => `${prefix}-${Math.floor(Math.random() * 100000)}`;

async function seed() {
  await connectDB();

  console.log("Starting comprehensive demo data seeding...");

  // Clean existing data
  console.log("Cleaning existing data...");
  await User.deleteMany({});
  await Company.deleteMany({});
  await Branch.deleteMany({});
  await Equipment.deleteMany({});
  await Load.deleteMany({});
  await Invoice.deleteMany({});
  await Notification.deleteMany({});
  await Review.deleteMany({});

  // Create Super Admin
  console.log("Creating platform super admin...");
  const superAdmin = await User.create({
    _id: "usr-super-admin",
    name: "Platform Super Admin",
    email: "superadmin@docks2doc.com",
    password: DEMO_PASSWORD,
    role: "SUPER_ADMIN",
    companyId: "PLATFORM",
    branchIds: ["ALL"],
    permissions: [],
    lastActive: now(),
  });

  // Create Carrier Company
  console.log("Creating carrier company...");
  const carrierCompanyId = uid("co");
  const carrierBranchId = uid("br");
  const carrierAdminId = uid("usr");

  const carrierBranch = await Branch.create({
    _id: carrierBranchId,
    companyId: carrierCompanyId,
    name: "Swift Logistics — Corporate",
    address: "1234 Logistics Way",
    city: "Dallas",
    state: "TX",
    level: "CORPORATE",
    managerId: carrierAdminId,
  });

  const carrierCompany = await Company.create({
    _id: carrierCompanyId,
    name: "Swift Logistics",
    type: "CARRIER",
    dotNumber: "1234567",
    mcNumbers: ["MC-123456"],
    branches: [carrierBranchId],
    userIds: [carrierAdminId],
    plan: "GROWTH",
    rating: 4.5,
    mrrUsd: 3500,
    status: "ACTIVE",
  });

  const carrierAdmin = await User.create({
    _id: carrierAdminId,
    name: "Jordan Lee",
    email: "carrier@docks2doc.demo",
    password: DEMO_PASSWORD,
    role: "CARRIER_CORP",
    companyId: carrierCompanyId,
    branchIds: ["ALL"],
    permissions: [],
    lastActive: now(),
  });

  // Create Carrier Drivers
  console.log("Creating carrier drivers...");
  const driver1Id = uid("drv");
  const driver2Id = uid("drv");
  const driver3Id = uid("drv");

  const driver1 = await User.create({
    _id: driver1Id,
    name: "Mike Johnson",
    email: "mike.driver@docks2doc.demo",
    password: DEMO_PASSWORD,
    role: "DRIVER",
    companyId: carrierCompanyId,
    branchIds: [carrierBranchId],
    lastActive: now(),
    driver: {
      phone: "555-0101",
      carrierId: carrierCompanyId,
      status: "AVAILABLE",
      licenses: [{ state: "TX", number: "CDL-123456", class: "A", expiry: "2025-12-31" }],
      medicalCertExpiry: "2025-06-30",
      emergencyContacts: [{ name: "Jane Johnson", phone: "555-0102" }],
      rating: 4.8,
      loadsCompleted: 127,
    },
  });

  const driver2 = await User.create({
    _id: driver2Id,
    name: "Sarah Williams",
    email: "sarah.driver@docks2doc.demo",
    password: DEMO_PASSWORD,
    role: "DRIVER",
    companyId: carrierCompanyId,
    branchIds: [carrierBranchId],
    lastActive: now(),
    driver: {
      phone: "555-0103",
      carrierId: carrierCompanyId,
      status: "ON_LOAD",
      licenses: [{ state: "TX", number: "CDL-234567", class: "A", expiry: "2025-11-30" }],
      medicalCertExpiry: "2025-05-15",
      emergencyContacts: [{ name: "Tom Williams", phone: "555-0104" }],
      rating: 4.9,
      loadsCompleted: 203,
    },
  });

  const driver3 = await User.create({
    _id: driver3Id,
    name: "Carlos Rodriguez",
    email: "carlos.driver@docks2doc.demo",
    password: DEMO_PASSWORD,
    role: "DRIVER",
    companyId: carrierCompanyId,
    branchIds: [carrierBranchId],
    lastActive: now(),
    driver: {
      phone: "555-0105",
      carrierId: carrierCompanyId,
      status: "AVAILABLE",
      licenses: [{ state: "TX", number: "CDL-345678", class: "A", expiry: "2026-01-15" }],
      medicalCertExpiry: "2025-08-20",
      emergencyContacts: [{ name: "Maria Rodriguez", phone: "555-0106" }],
      rating: 4.7,
      loadsCompleted: 89,
    },
  });

  // Update company with driver IDs
  await Company.findByIdAndUpdate(carrierCompanyId, {
    $push: { userIds: { $each: [driver1Id, driver2Id, driver3Id] } }
  });

  // Create Equipment
  console.log("Creating equipment...");
  const tractor1Id = uid("eq");
  const tractor2Id = uid("eq");
  const tractor3Id = uid("eq");
  const trailer1Id = uid("eq");
  const trailer2Id = uid("eq");
  const trailer3Id = uid("eq");

  await Equipment.create([
    {
      _id: tractor1Id,
      type: "TRACTOR",
      unitNumber: "TRK-001",
      companyId: carrierCompanyId,
      make: "Freightliner",
      model: "Cascadia",
      year: 2022,
      vin: "1FUJGBDR2MLSA1234",
      plates: [{ state: "TX", number: "ABC-1234", expiry: "2025-12-31" }],
      dotNumber: "1234567",
      ifta: "TX-IFTA-001",
      insurance: { carrier: "Progressive", policy: "POL-123456", expiry: "2025-06-30" },
      inspections: [{ date: "2024-01-15", result: "PASS", notes: "Annual inspection" }],
      branchId: carrierBranchId,
    },
    {
      _id: tractor2Id,
      type: "TRACTOR",
      unitNumber: "TRK-002",
      companyId: carrierCompanyId,
      make: "Peterbilt",
      model: "579",
      year: 2023,
      vin: "1FUJGBDR3MLSA5678",
      plates: [{ state: "TX", number: "DEF-5678", expiry: "2025-12-31" }],
      dotNumber: "1234567",
      ifta: "TX-IFTA-002",
      insurance: { carrier: "Progressive", policy: "POL-123456", expiry: "2025-06-30" },
      inspections: [{ date: "2024-02-20", result: "PASS", notes: "Annual inspection" }],
      branchId: carrierBranchId,
    },
    {
      _id: tractor3Id,
      type: "TRACTOR",
      unitNumber: "TRK-003",
      companyId: carrierCompanyId,
      make: "Volvo",
      model: "VNL",
      year: 2021,
      vin: "1FUJGBDR4MLSA9012",
      plates: [{ state: "TX", number: "GHI-9012", expiry: "2025-12-31" }],
      dotNumber: "1234567",
      ifta: "TX-IFTA-003",
      insurance: { carrier: "Progressive", policy: "POL-123456", expiry: "2025-06-30" },
      inspections: [{ date: "2024-03-10", result: "PASS", notes: "Annual inspection" }],
      branchId: carrierBranchId,
    },
    {
      _id: trailer1Id,
      type: "TRAILER",
      unitNumber: "TRL-001",
      companyId: carrierCompanyId,
      make: "Great Dane",
      model: "Dry Van",
      year: 2022,
      vin: "1GTDR1234567890123",
      plates: [{ state: "TX", number: "TRL-1234", expiry: "2025-12-31" }],
      insurance: { carrier: "Progressive", policy: "POL-123456", expiry: "2025-06-30" },
      inspections: [{ date: "2024-01-20", result: "PASS", notes: "Annual inspection" }],
      branchId: carrierBranchId,
    },
    {
      _id: trailer2Id,
      type: "TRAILER",
      unitNumber: "TRL-002",
      companyId: carrierCompanyId,
      make: "Wabash",
      model: "Reefer",
      year: 2023,
      vin: "1GTDR2345678901234",
      plates: [{ state: "TX", number: "TRL-5678", expiry: "2025-12-31" }],
      insurance: { carrier: "Progressive", policy: "POL-123456", expiry: "2025-06-30" },
      inspections: [{ date: "2024-02-25", result: "PASS", notes: "Annual inspection" }],
      branchId: carrierBranchId,
    },
    {
      _id: trailer3Id,
      type: "TRAILER",
      unitNumber: "TRL-003",
      companyId: carrierCompanyId,
      make: "Hyundai",
      model: "Dry Van",
      year: 2021,
      vin: "1GTDR3456789012345",
      plates: [{ state: "TX", number: "TRL-9012", expiry: "2025-12-31" }],
      insurance: { carrier: "Progressive", policy: "POL-123456", expiry: "2025-06-30" },
      inspections: [{ date: "2024-03-15", result: "PASS", notes: "Annual inspection" }],
      branchId: carrierBranchId,
    },
  ]);

  // Update drivers with equipment assignments
  await User.findByIdAndUpdate(driver1Id, {
    "driver.currentTractorId": tractor1Id,
    "driver.currentTrailerId": trailer1Id,
  });
  await User.findByIdAndUpdate(driver2Id, {
    "driver.currentTractorId": tractor2Id,
    "driver.currentTrailerId": trailer2Id,
  });
  await User.findByIdAndUpdate(driver3Id, {
    "driver.currentTractorId": tractor3Id,
    "driver.currentTrailerId": trailer3Id,
  });

  // Create Shipper/Receiver Company
  console.log("Creating shipper/receiver company...");
  const shipperCompanyId = uid("co");
  const shipperBranchId = uid("br");
  const shipperAdminId = uid("usr");

  const shipperBranch = await Branch.create({
    _id: shipperBranchId,
    companyId: shipperCompanyId,
    name: "Acme Manufacturing — Corporate",
    address: "5678 Industrial Blvd",
    city: "Chicago",
    state: "IL",
    level: "CORPORATE",
    managerId: shipperAdminId,
  });

  const shipperCompany = await Company.create({
    _id: shipperCompanyId,
    name: "Acme Manufacturing",
    type: "SHIPPER_RECEIVER",
    branches: [shipperBranchId],
    userIds: [shipperAdminId],
    plan: "ENTERPRISE",
    rating: 4.7,
    mrrUsd: 9800,
    status: "ACTIVE",
  });

  const shipperAdmin = await User.create({
    _id: shipperAdminId,
    name: "Emily Chen",
    email: "shipper@docks2doc.demo",
    password: DEMO_PASSWORD,
    role: "SHIPPER_RECEIVER",
    companyId: shipperCompanyId,
    branchIds: ["ALL"],
    permissions: [],
    lastActive: now(),
  });

  // Create Broker Company
  console.log("Creating broker company...");
  const brokerCompanyId = uid("co");
  const brokerBranchId = uid("br");
  const brokerAdminId = uid("usr");

  const brokerBranch = await Branch.create({
    _id: brokerBranchId,
    companyId: brokerCompanyId,
    name: "Global Freight Brokers — Corporate",
    address: "9101 Commerce Ave",
    city: "Atlanta",
    state: "GA",
    level: "CORPORATE",
    managerId: brokerAdminId,
  });

  const brokerCompany = await Company.create({
    _id: brokerCompanyId,
    name: "Global Freight Brokers",
    type: "BROKER",
    mcNumbers: ["MC-789012"],
    branches: [brokerBranchId],
    userIds: [brokerAdminId],
    plan: "GROWTH",
    rating: 4.6,
    mrrUsd: 3500,
    status: "ACTIVE",
  });

  const brokerAdmin = await User.create({
    _id: brokerAdminId,
    name: "David Martinez",
    email: "broker@docks2doc.demo",
    password: DEMO_PASSWORD,
    role: "BROKER_CORP",
    companyId: brokerCompanyId,
    branchIds: ["ALL"],
    permissions: [],
    lastActive: now(),
  });

  // Create Sample Loads
  console.log("Creating sample loads...");
  const load1Id = "D2D-24820";
  const load2Id = "D2D-24821";
  const load3Id = "D2D-24822";

  await Load.create([
    {
      _id: load1Id,
      status: "IN_TRANSIT",
      step: 6,
      branchId: carrierBranchId,
      companyId: carrierCompanyId,
      shipperId: shipperCompanyId,
      carrier: { carrierId: carrierCompanyId, branchId: carrierBranchId, assignedAt: now() },
      driverId: driver2Id,
      tractorId: tractor2Id,
      trailerId: trailer2Id,
      pickup: {
        facilityName: "Acme Manufacturing - Distribution Center",
        address: "5678 Industrial Blvd",
        city: "Chicago",
        state: "IL",
        zip: "60601",
        contactName: "John Smith",
        contactPhone: "555-0201",
        windowStart: "2024-01-15T08:00:00Z",
        windowEnd: "2024-01-15T12:00:00Z",
        actualArrival: "2024-01-15T09:30:00Z",
        actualDeparture: "2024-01-15T11:45:00Z",
        dockDoor: "A-12",
        lat: 41.8781,
        lng: -87.6298,
      },
      delivery: {
        facilityName: "Walmart Distribution Center",
        address: "1234 Retail Way",
        city: "Dallas",
        state: "TX",
        zip: "75201",
        contactName: "Mary Johnson",
        contactPhone: "555-0202",
        windowStart: "2024-01-17T08:00:00Z",
        windowEnd: "2024-01-17T12:00:00Z",
        dockDoor: "B-08",
        lat: 32.7767,
        lng: -96.7970,
      },
      freight: {
        commodity: "Electronics",
        pieces: 500,
        weightLb: 35000,
        palletCount: 20,
        hazmat: false,
        declaredValueUsd: 150000,
      },
      equipmentType: "DRY_VAN_53",
      milesTotal: 920,
      milesRemaining: 180,
      etaDelivery: "2024-01-17T10:00:00Z",
      onTime: true,
      rates: { customerRateUsd: 2800, carrierRateUsd: 2200 },
      references: { po: "PO-2024-001", bol: "BOL-2024-001", customerRef: "REF-001" },
      documents: [],
      events: [
        {
          id: uid("evt"),
          loadId: load1Id,
          at: "2024-01-15T08:00:00Z",
          actor: "Emily Chen",
          actorRole: "SHIPPER_RECEIVER",
          type: "STATUS_CHANGE",
          description: "Order created",
        },
        {
          id: uid("evt"),
          loadId: load1Id,
          at: "2024-01-15T10:00:00Z",
          actor: "Jordan Lee",
          actorRole: "CARRIER_CORP",
          type: "ASSIGNMENT",
          description: "Sarah Williams assigned to load",
        },
        {
          id: uid("evt"),
          loadId: load1Id,
          at: "2024-01-15T11:45:00Z",
          actor: "Sarah Williams",
          actorRole: "DRIVER",
          type: "STATUS_CHANGE",
          description: "Load departed Chicago",
        },
      ],
      exceptions: [],
      currentPosition: {
        lat: 36.0,
        lng: -88.5,
        updatedAt: now(),
        speedMph: 62,
      },
      createdAt: "2024-01-15T08:00:00Z",
    },
    {
      _id: load2Id,
      status: "ASSIGNED",
      step: 3,
      branchId: carrierBranchId,
      companyId: carrierCompanyId,
      shipperId: shipperCompanyId,
      carrier: { carrierId: carrierCompanyId, branchId: carrierBranchId, assignedAt: now() },
      driverId: driver1Id,
      tractorId: tractor1Id,
      trailerId: trailer1Id,
      pickup: {
        facilityName: "Acme Manufacturing - Plant 2",
        address: "9101 Production Rd",
        city: "Houston",
        state: "TX",
        zip: "77001",
        contactName: "Robert Davis",
        contactPhone: "555-0301",
        windowStart: "2024-01-18T06:00:00Z",
        windowEnd: "2024-01-18T10:00:00Z",
        dockDoor: "C-03",
        lat: 29.7604,
        lng: -95.3698,
      },
      delivery: {
        facilityName: "Amazon Fulfillment Center",
        address: "5678 Logistics Park",
        city: "Phoenix",
        state: "AZ",
        zip: "85001",
        contactName: "Lisa White",
        contactPhone: "555-0302",
        windowStart: "2024-01-20T08:00:00Z",
        windowEnd: "2024-01-20T12:00:00Z",
        dockDoor: "D-15",
        lat: 33.4484,
        lng: -112.0740,
      },
      freight: {
        commodity: "Auto Parts",
        pieces: 300,
        weightLb: 42000,
        palletCount: 24,
        hazmat: false,
        declaredValueUsd: 85000,
      },
      equipmentType: "DRY_VAN_53",
      milesTotal: 1170,
      milesRemaining: 1170,
      etaDelivery: "2024-01-20T10:00:00Z",
      onTime: true,
      rates: { customerRateUsd: 3500, carrierRateUsd: 2800 },
      references: { po: "PO-2024-002", bol: "BOL-2024-002", customerRef: "REF-002" },
      documents: [],
      events: [
        {
          id: uid("evt"),
          loadId: load2Id,
          at: now(),
          actor: "Emily Chen",
          actorRole: "SHIPPER_RECEIVER",
          type: "STATUS_CHANGE",
          description: "Order created",
        },
        {
          id: uid("evt"),
          loadId: load2Id,
          at: now(),
          actor: "Jordan Lee",
          actorRole: "CARRIER_CORP",
          type: "ASSIGNMENT",
          description: "Mike Johnson assigned to load",
        },
      ],
      exceptions: [],
      createdAt: now(),
    },
    {
      _id: load3Id,
      status: "DRAFT",
      step: 1,
      branchId: carrierBranchId,
      companyId: carrierCompanyId,
      shipperId: shipperCompanyId,
      pickup: {
        facilityName: "Acme Manufacturing - Main Plant",
        address: "5678 Industrial Blvd",
        city: "Chicago",
        state: "IL",
        zip: "60601",
        contactName: "John Smith",
        contactPhone: "555-0201",
        windowStart: "2024-01-22T08:00:00Z",
        windowEnd: "2024-01-22T12:00:00Z",
        dockDoor: "A-05",
        lat: 41.8781,
        lng: -87.6298,
      },
      delivery: {
        facilityName: "Target Distribution Center",
        address: "7890 Retail Drive",
        city: "Los Angeles",
        state: "CA",
        zip: "90001",
        contactName: "Kevin Brown",
        contactPhone: "555-0401",
        windowStart: "2024-01-25T08:00:00Z",
        windowEnd: "2024-01-25T12:00:00Z",
        dockDoor: "E-22",
        lat: 34.0522,
        lng: -118.2437,
      },
      freight: {
        commodity: "Consumer Goods",
        pieces: 800,
        weightLb: 38000,
        palletCount: 32,
        hazmat: false,
        declaredValueUsd: 120000,
      },
      equipmentType: "DRY_VAN_53",
      milesTotal: 2015,
      milesRemaining: 2015,
      etaDelivery: "2024-01-25T10:00:00Z",
      onTime: true,
      rates: { customerRateUsd: 5500, carrierRateUsd: 4200 },
      references: { po: "PO-2024-003", customerRef: "REF-003" },
      documents: [],
      events: [
        {
          id: uid("evt"),
          loadId: load3Id,
          at: now(),
          actor: "Emily Chen",
          actorRole: "SHIPPER_RECEIVER",
          type: "STATUS_CHANGE",
          description: "Order created",
        },
      ],
      exceptions: [],
      createdAt: now(),
    },
  ]);

  // Create Sample Reviews
  console.log("Creating sample reviews...");
  await Review.create([
    {
      _id: uid("rev"),
      subjectType: "DRIVER",
      subjectId: driver1Id,
      authorCompanyId: shipperCompanyId,
      stars: 5,
      title: "Excellent service",
      comment: "Mike was professional and on time. Great communication throughout the trip.",
      date: "2024-01-10T10:00:00Z",
    },
    {
      _id: uid("rev"),
      subjectType: "DRIVER",
      subjectId: driver2Id,
      authorCompanyId: shipperCompanyId,
      stars: 4,
      title: "Good service",
      comment: "Sarah delivered safely and on time. Minor delay due to weather but kept us informed.",
      date: "2024-01-08T14:30:00Z",
    },
    {
      _id: uid("rev"),
      subjectType: "CARRIER",
      subjectId: carrierCompanyId,
      authorCompanyId: shipperCompanyId,
      stars: 5,
      title: "Reliable carrier",
      comment: "Swift Logistics consistently provides excellent service. Highly recommended.",
      date: "2024-01-05T09:00:00Z",
    },
  ]);

  // Create Sample Notifications
  console.log("Creating sample notifications...");
  await Notification.create([
    {
      _id: uid("ntf"),
      loadId: load1Id,
      companyId: carrierCompanyId,
      kind: "ARRIVAL_5MI",
      title: `${load1Id} — 5 miles from delivery`,
      body: "Walmart Distribution Center, Dallas TX. Prepare dock door.",
      at: now(),
      read: false,
      pinned: true,
    },
    {
      _id: uid("ntf"),
      loadId: load2Id,
      companyId: carrierCompanyId,
      kind: "ASSIGNMENT",
      title: "New load assigned",
      body: `Load ${load2Id} has been assigned to Mike Johnson`,
      at: now(),
      read: false,
      pinned: false,
    },
  ]);

  console.log("\n✅ Demo data seeding completed successfully!");
  console.log("\n📋 Demo Accounts (password: demo1234):");
  console.log("  SUPER_ADMIN        superadmin@docks2doc.com");
  console.log("  CARRIER_CORP       carrier@docks2doc.demo");
  console.log("  SHIPPER_RECEIVER   shipper@docks2doc.demo");
  console.log("  BROKER_CORP        broker@docks2doc.demo");
  console.log("\n🚚 Demo Drivers (password: demo1234):");
  console.log("  DRIVER             mike.driver@docks2doc.demo");
  console.log("  DRIVER             sarah.driver@docks2doc.demo");
  console.log("  DRIVER             carlos.driver@docks2doc.demo");
  console.log("\n📊 Created entities:");
  console.log("  - 1 Super Admin");
  console.log("  - 3 Companies (Carrier, Shipper, Broker)");
  console.log("  - 3 Branches");
  console.log("  - 7 Users (3 admins + 3 drivers + 1 super admin)");
  console.log("  - 6 Equipment items (3 tractors + 3 trailers)");
  console.log("  - 3 Loads (various statuses)");
  console.log("  - 3 Reviews");
  console.log("  - 2 Notifications");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
