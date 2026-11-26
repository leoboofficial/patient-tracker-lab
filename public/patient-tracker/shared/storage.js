/**
 * shared/storage.js
 * Central JSON LocalStorage Helper for Patient Tracker (HTML5 / CSS3 / JS)
 * Stores: users, doctors, clerks, patients, medicines, consultations, prescriptions, bills
 */

function getData(key) {
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to parse localStorage key:", key, e);
    return [];
  }
}

function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getNextId(key, prefix) {
  var list = getData(key);
  var maxNum = 100;
  var idFieldMap = {
    doctors: "doctorId",
    clerks: "clerkId",
    patients: "patientNumber",
    medicines: "medicineId",
    consultations: "consultationId",
    prescriptions: "prescriptionNumber",
    bills: "billNumber"
  };
  var field = idFieldMap[key] || "id";

  for (var i = 0; i < list.length; i++) {
    var val = String(list[i][field] || "");
    var match = val.match(/(\d+)$/);
    if (match) {
      var num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return prefix + "-" + (maxNum + 1);
}

function getTodayDateString() {
  var d = new Date();
  var yyyy = d.getFullYear();
  var mm = String(d.getMonth() + 1).padStart(2, "0");
  var dd = String(d.getDate()).padStart(2, "0");
  return yyyy + "-" + mm + "-" + dd;
}

function getCurrentTime24() {
  var d = new Date();
  var hh = String(d.getHours()).padStart(2, "0");
  var min = String(d.getMinutes()).padStart(2, "0");
  return hh + ":" + min;
}

function maskCardNumber(cardNumber) {
  var clean = String(cardNumber || "").replace(/\s+/g, "");
  if (!clean) return "—";
  if (clean.length <= 4) return clean;
  return "**** **** **** " + clean.slice(-4);
}

function escapeHtml(text) {
  return String(text == null ? "" : text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function seedSampleData(force) {
  if (!force && localStorage.getItem("pt_initialized") === "true") {
    return false;
  }

  var today = getTodayDateString();

  var users = [
    { loginName: "admin01", password: "password", role: "Admin", refId: "ADM-101", fullName: "System Administrator" },
    { loginName: "doc01", password: "password", role: "Doctor", refId: "DOC-101", fullName: "Dr. Arjun Nair" },
    { loginName: "doc02", password: "password", role: "Doctor", refId: "DOC-102", fullName: "Dr. Meera Krishnan" },
    { loginName: "clerk01", password: "password", role: "Clerk", refId: "CLK-101", fullName: "Ramesh Iyer" },
    { loginName: "pat01", password: "password", role: "Patient", refId: "PAT-101", fullName: "Ananya Sharma" },
    { loginName: "pat02", password: "password", role: "Patient", refId: "PAT-102", fullName: "Karthik Verma" }
  ];

  var doctors = [
    {
      doctorId: "DOC-101",
      doctorName: "Dr. Arjun Nair",
      qualification: "MBBS, MD",
      age: 42,
      experience: 14,
      contact: "9876543210",
      address: "Block A, City General Clinic"
    },
    {
      doctorId: "DOC-102",
      doctorName: "Dr. Meera Krishnan",
      qualification: "MBBS, DCH",
      age: 36,
      experience: 9,
      contact: "9845012345",
      address: "Pediatric Wing, City General Clinic"
    }
  ];

  var clerks = [
    {
      clerkId: "CLK-101",
      clerkName: "Ramesh Iyer",
      age: 31,
      contact: "9811223344",
      clerkDOJ: "2023-06-15",
      address: "Front Desk Counter 1, Main Lobby"
    },
    {
      clerkId: "CLK-102",
      clerkName: "Divya Menon",
      age: 27,
      contact: "9822334455",
      clerkDOJ: "2024-01-10",
      address: "Pharmacy Counter 2, Ground Floor"
    }
  ];

  var patients = [
    {
      patientNumber: "PAT-101",
      name: "Ananya Sharma",
      type: "OUT",
      age: 29,
      contact: "9900112233",
      address: "14 MG Road, Indiranagar"
    },
    {
      patientNumber: "PAT-102",
      name: "Karthik Verma",
      type: "IN",
      age: 54,
      contact: "9911223344",
      address: "Ward 3B, Lakeview Colony"
    }
  ];

  var medicines = [
    {
      medicineId: "MED-101",
      name: "Paracetamol 500mg",
      company: "Cipla Ltd",
      quantity: 120,
      price: 15,
      expiryDate: "2028-05-30"
    },
    {
      medicineId: "MED-102",
      name: "Amoxicillin 250mg",
      company: "Sun Pharma",
      quantity: 8,
      price: 45,
      expiryDate: "2027-11-15"
    },
    {
      medicineId: "MED-103",
      name: "Cetirizine 10mg",
      company: "Dr. Reddy's",
      quantity: 65,
      price: 20,
      expiryDate: "2028-02-20"
    },
    {
      medicineId: "MED-104",
      name: "Azithromycin 500mg",
      company: "Lupin Ltd",
      quantity: 6,
      price: 85,
      expiryDate: "2027-09-10"
    },
    {
      medicineId: "MED-105",
      name: "Pantoprazole 40mg",
      company: "Alkem Labs",
      quantity: 90,
      price: 35,
      expiryDate: "2028-08-01"
    }
  ];

  var consultations = [
    {
      consultationId: "CON-101",
      date: today,
      timeOfVisit: "10:15",
      doctorId: "DOC-101",
      patientNumber: "PAT-101",
      problem: "Seasonal viral fever with mild sore throat",
      notes: "Stay hydrated and take complete rest for 2 days",
      prescriptionNumber: "RX-101"
    },
    {
      consultationId: "CON-102",
      date: today,
      timeOfVisit: "11:40",
      doctorId: "DOC-101",
      patientNumber: "PAT-102",
      problem: "Post-operative gastric acidity and mild fatigue",
      notes: "Monitor blood pressure morning and night",
      prescriptionNumber: "RX-102"
    }
  ];

  var prescriptions = [
    {
      prescriptionNumber: "RX-101",
      consultationId: "CON-101",
      patientNumber: "PAT-101",
      doctorId: "DOC-101",
      date: today,
      notes: "Warm saline gargle before sleep",
      items: [
        {
          medicineId: "MED-101",
          medicineName: "Paracetamol 500mg",
          quantity: 10,
          instructions: "1 tablet after food twice daily for 5 days"
        },
        {
          medicineId: "MED-103",
          medicineName: "Cetirizine 10mg",
          quantity: 5,
          instructions: "1 tablet at night for 5 days"
        }
      ],
      feedback: "Fever subsided after 48 hours. Recovered well.",
      symptomTags: ["Recovered"],
      feedbackUpdatedAt: today
    },
    {
      prescriptionNumber: "RX-102",
      consultationId: "CON-102",
      patientNumber: "PAT-102",
      doctorId: "DOC-101",
      date: today,
      notes: "Avoid spicy food for 1 week",
      items: [
        {
          medicineId: "MED-105",
          medicineName: "Pantoprazole 40mg",
          quantity: 14,
          instructions: "1 tablet before breakfast daily for 14 days"
        }
      ],
      feedback: "",
      symptomTags: [],
      feedbackUpdatedAt: ""
    }
  ];

  var bills = [
    {
      billNumber: "BILL-101",
      billType: "REG",
      patientNumber: "PAT-101",
      prescriptionNumber: "",
      paymentMode: "Cash",
      cardNumber: "",
      billAmount: 300,
      billPaid: true,
      date: today
    },
    {
      billNumber: "BILL-102",
      billType: "MED",
      patientNumber: "PAT-101",
      prescriptionNumber: "RX-101",
      paymentMode: "Card",
      cardNumber: "4532891023414242",
      billAmount: 250,
      billPaid: true,
      date: today
    },
    {
      billNumber: "BILL-103",
      billType: "REG",
      patientNumber: "PAT-102",
      prescriptionNumber: "",
      paymentMode: "Cash",
      cardNumber: "",
      billAmount: 1500,
      billPaid: false,
      date: today
    }
  ];

  saveData("users", users);
  saveData("doctors", doctors);
  saveData("clerks", clerks);
  saveData("patients", patients);
  saveData("medicines", medicines);
  saveData("consultations", consultations);
  saveData("prescriptions", prescriptions);
  saveData("bills", bills);
  localStorage.setItem("pt_initialized", "true");
  return true;
}

// Auto-initialize sample dataset on first launch
seedSampleData(false);
