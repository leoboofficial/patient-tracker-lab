export interface FormFieldSpec {
  fieldLabel: string;
  jsonKeyOrId: string;
  htmlElement: string;
  validationRule: string;
}

export interface ExerciseFormGuide {
  id: string;
  sectionTitle: string;
  screenFiles: string;
  jsonStore: string;
  fields: FormFieldSpec[];
}

export const FORM_GUIDE_SECTIONS: Record<string, ExerciseFormGuide> = {
  form1A: {
    id: 'form1A',
    sectionTitle: 'Form 1A: User Login Screen',
    screenFiles: 'login/index.html, login/auth.js',
    jsonStore: 'users',
    fields: [
      {
        fieldLabel: 'User Login ID',
        jsonKeyOrId: 'loginName',
        htmlElement: '<input type="text">',
        validationRule: 'Required; matches existing login ID (e.g., admin01, doc01, clerk01, pat01).',
      },
      {
        fieldLabel: 'Password',
        jsonKeyOrId: 'password',
        htmlElement: '<input type="password">',
        validationRule: 'Required; masks typed characters; exact match required.',
      },
      {
        fieldLabel: 'Submit Action',
        jsonKeyOrId: 'btnLogin',
        htmlElement: '<button type="submit">',
        validationRule: 'Redirects to role dashboard or displays red error banner on invalid credentials.',
      },
    ],
  },
  form1B: {
    id: 'form1B',
    sectionTitle: 'Form 1B: Session, Navbar & Password Controls',
    screenFiles: 'login/alert.js, login/session.js, login/navbar.js, login/password.html',
    jsonStore: 'users / sessionStorage',
    fields: [
      {
        fieldLabel: 'Alert Banner',
        jsonKeyOrId: 'alertBox',
        htmlElement: '<div id="alertBox">',
        validationRule: 'Displays red pt-alert-error on failure or green pt-alert-success on save.',
      },
      {
        fieldLabel: 'Session Key',
        jsonKeyOrId: 'pt_logged_in_user',
        htmlElement: 'sessionStorage',
        validationRule: 'Stores { loginName, fullName, role, refId }; cleared on #btnLogout click.',
      },
      {
        fieldLabel: 'Navbar Root & Logout',
        jsonKeyOrId: 'navbarRoot, btnLogout',
        htmlElement: '<div id="navbarRoot">, <button id="btnLogout">',
        validationRule: 'Displays logged-in fullName, role badge, role menu links, and working Logout.',
      },
      {
        fieldLabel: 'Update Password',
        jsonKeyOrId: 'loginName, password',
        htmlElement: '<input type="password">',
        validationRule: 'Verifies current password in users store before saving updated password.',
      },
    ],
  },
  form2A: {
    id: 'form2A',
    sectionTitle: 'Form 2A: Register New Doctor',
    screenFiles: 'login/add-doctor.html, login/doctor-list.html, doctor/profile.html',
    jsonStore: 'doctors',
    fields: [
      {
        fieldLabel: 'Doctor ID',
        jsonKeyOrId: 'doctorId',
        htmlElement: '<input readonly>',
        validationRule: 'Auto-generated running ID (e.g., DOC-101, DOC-102); read-only.',
      },
      {
        fieldLabel: 'Doctor Name',
        jsonKeyOrId: 'doctorName',
        htmlElement: '<input type="text">',
        validationRule: 'Required; maximum 50 characters (e.g., Dr. Arjun Nair).',
      },
      {
        fieldLabel: 'Qualification',
        jsonKeyOrId: 'qualification',
        htmlElement: '<select> or text',
        validationRule: 'Required; options such as MBBS, MBBS, MD, MBBS, MS, MBBS, DCH.',
      },
      {
        fieldLabel: 'Age',
        jsonKeyOrId: 'age',
        htmlElement: '<input type="number">',
        validationRule: 'Required; numeric value between 24 and 75.',
      },
      {
        fieldLabel: 'Experience (Years)',
        jsonKeyOrId: 'experience',
        htmlElement: '<input type="number">',
        validationRule: 'Required; non-negative integer (min="0").',
      },
      {
        fieldLabel: 'Contact Number',
        jsonKeyOrId: 'contact',
        htmlElement: '<input type="tel">',
        validationRule: 'Required; exactly 10 digits (pattern="[0-9]{10}").',
      },
      {
        fieldLabel: 'Clinic Address',
        jsonKeyOrId: 'address',
        htmlElement: '<textarea rows="2">',
        validationRule: 'Required; maximum 50 characters.',
      },
    ],
  },
  form2B: {
    id: 'form2B',
    sectionTitle: 'Form 2B: Register New Clerk',
    screenFiles: 'login/add-clerk.html, login/clerk-list.html',
    jsonStore: 'clerks',
    fields: [
      {
        fieldLabel: 'Clerk ID',
        jsonKeyOrId: 'clerkId',
        htmlElement: '<input readonly>',
        validationRule: 'Auto-generated running ID (e.g., CLK-101); read-only.',
      },
      {
        fieldLabel: 'Clerk Name',
        jsonKeyOrId: 'clerkName',
        htmlElement: '<input type="text">',
        validationRule: 'Required; maximum 50 characters.',
      },
      {
        fieldLabel: 'Age & Phone',
        jsonKeyOrId: 'age, contact',
        htmlElement: '<input type="number">, <input type="tel">',
        validationRule: 'Age between 18 and 65; 10-digit phone number (pattern="[0-9]{10}").',
      },
      {
        fieldLabel: 'Date of Joining',
        jsonKeyOrId: 'clerkDOJ',
        htmlElement: '<input type="date">',
        validationRule: 'Required; valid calendar joining date.',
      },
      {
        fieldLabel: 'Address',
        jsonKeyOrId: 'address',
        htmlElement: '<textarea rows="2">',
        validationRule: 'Required; maximum 50 characters.',
      },
    ],
  },
  form3A: {
    id: 'form3A',
    sectionTitle: 'Form 3A: Register Patient',
    screenFiles: 'login/add-patient.html, login/patient-list.html, doctor/lookup.js, patient/profile-card.js',
    jsonStore: 'patients',
    fields: [
      {
        fieldLabel: 'Patient Number',
        jsonKeyOrId: 'patientNumber',
        htmlElement: '<input readonly>',
        validationRule: 'Auto-generated ID (e.g., PAT-101, PAT-102); read-only.',
      },
      {
        fieldLabel: 'Patient Name',
        jsonKeyOrId: 'name',
        htmlElement: '<input type="text">',
        validationRule: 'Required; maximum 50 characters.',
      },
      {
        fieldLabel: 'Patient Type',
        jsonKeyOrId: 'type',
        htmlElement: '<input type="radio">',
        validationRule: 'Required; two radio options: OUT (Outpatient) or IN (Inpatient).',
      },
      {
        fieldLabel: 'Age & Contact',
        jsonKeyOrId: 'age, contact',
        htmlElement: '<input type="number">, <input type="tel">',
        validationRule: 'Age 0–110; 10-digit mobile number (pattern="[0-9]{10}").',
      },
      {
        fieldLabel: 'Home Address',
        jsonKeyOrId: 'address',
        htmlElement: '<textarea rows="2">',
        validationRule: 'Required; maximum 50 characters.',
      },
    ],
  },
  form3B_medicine: {
    id: 'form3B_medicine',
    sectionTitle: 'Form 3B: Add Medicine Stock',
    screenFiles: 'login/add-medicine.html, login/stock-list.html',
    jsonStore: 'medicines',
    fields: [
      {
        fieldLabel: 'Medicine ID',
        jsonKeyOrId: 'medicineId',
        htmlElement: '<input readonly>',
        validationRule: 'Auto-generated batch ID (e.g., MED-101); read-only.',
      },
      {
        fieldLabel: 'Medicine Name & Company',
        jsonKeyOrId: 'name, company',
        htmlElement: '<input type="text">',
        validationRule: 'Required; medicine name and pharmaceutical manufacturer.',
      },
      {
        fieldLabel: 'Quantity',
        jsonKeyOrId: 'quantity',
        htmlElement: '<input type="number">',
        validationRule: 'Required; quantity > 0. Rows with quantity < 10 highlight red in stock-list.html.',
      },
      {
        fieldLabel: 'Price',
        jsonKeyOrId: 'price',
        htmlElement: '<input type="number">',
        validationRule: 'Required; unit price > 0.',
      },
      {
        fieldLabel: 'Expiry Date',
        jsonKeyOrId: 'expiryDate',
        htmlElement: '<input type="date">',
        validationRule: 'Required; expiryDate must be a future date.',
      },
    ],
  },
  form3B_bills: {
    id: 'form3B_bills',
    sectionTitle: 'Form 3B: Registration & Pharmacy Bills',
    screenFiles: 'login/reg-bill.html, login/med-bill.html, patient/reg-bills.html, patient/med-bills.html, patient/receipt.html',
    jsonStore: 'bills',
    fields: [
      {
        fieldLabel: 'Bill Number',
        jsonKeyOrId: 'billNumber',
        htmlElement: '<input readonly>',
        validationRule: 'Auto-generated running bill number (e.g., BILL-101); read-only.',
      },
      {
        fieldLabel: 'Patient & Prescription IDs',
        jsonKeyOrId: 'patientNumber, prescriptionNumber',
        htmlElement: '<input type="text"> / <select>',
        validationRule: 'patientNumber required for all bills; prescriptionNumber loads medicine items in med-bill.html.',
      },
      {
        fieldLabel: 'Payment Mode',
        jsonKeyOrId: 'paymentMode',
        htmlElement: '<select> (Cash / Card)',
        validationRule: 'Required; toggles Card Number visibility when Card is selected.',
      },
      {
        fieldLabel: 'Card Number',
        jsonKeyOrId: 'cardNumber',
        htmlElement: '<input type="text">',
        validationRule: 'Shown and required when paymentMode is Card; masked in patient views (**** **** **** 4242).',
      },
      {
        fieldLabel: 'Bill Amount & Paid Status',
        jsonKeyOrId: 'billAmount, billPaid',
        htmlElement: '<input type="number">, <input type="checkbox">',
        validationRule: 'billAmount > 0; billPaid checkbox marks settled status.',
      },
    ],
  },
  form4A: {
    id: 'form4A',
    sectionTitle: 'Form 4A: Patient Consultation Entry',
    screenFiles: 'doctor/consultation.html, doctor/timestamp.js, doctor/save-consult.js, doctor/today-list.html',
    jsonStore: 'consultations',
    fields: [
      {
        fieldLabel: 'Consultation ID',
        jsonKeyOrId: 'consultationId',
        htmlElement: '<input readonly>',
        validationRule: 'Auto-generated running ID (e.g., CON-101); read-only.',
      },
      {
        fieldLabel: 'Date & Time of Visit',
        jsonKeyOrId: 'date, timeOfVisit',
        htmlElement: '<input readonly>',
        validationRule: 'Auto-filled from system clock: YYYY-MM-DD and 24-hour format (e.g., 20:15).',
      },
      {
        fieldLabel: 'Doctor ID',
        jsonKeyOrId: 'doctorId',
        htmlElement: '<input readonly>',
        validationRule: 'Auto-filled from logged-in Doctor session (e.g., DOC-101).',
      },
      {
        fieldLabel: 'Patient Number',
        jsonKeyOrId: 'patientNumber',
        htmlElement: '<input type="text">',
        validationRule: 'Required; doctor enters ID (e.g., PAT-101) to load patient name & age.',
      },
      {
        fieldLabel: 'Problem Description',
        jsonKeyOrId: 'problem',
        htmlElement: '<textarea maxlength="100">',
        validationRule: 'Required; describes symptoms/diagnosis (max 100 characters).',
      },
      {
        fieldLabel: 'Additional Notes',
        jsonKeyOrId: 'notes',
        htmlElement: '<textarea maxlength="100">',
        validationRule: 'Optional clinical remarks; generates clickable prescriptionNumber link on save.',
      },
    ],
  },
  form4B: {
    id: 'form4B',
    sectionTitle: 'Form 4B: E-Prescription Builder',
    screenFiles: 'doctor/prescription.html, doctor/med-select.js, doctor/dosage-grid.js, doctor/save-rx.js, patient/rx-details.html',
    jsonStore: 'prescriptions',
    fields: [
      {
        fieldLabel: 'Header Reference IDs',
        jsonKeyOrId: 'prescriptionNumber, consultationId, patientNumber, doctorId',
        htmlElement: '<input readonly>',
        validationRule: 'Passed from Consultation screen; cannot exist without a valid consultation.',
      },
      {
        fieldLabel: 'Select Medicine',
        jsonKeyOrId: 'medicineId',
        htmlElement: '<select>',
        validationRule: 'Required; populated dynamically from non-expired items in medicines store (quantity > 0).',
      },
      {
        fieldLabel: 'Quantity to Consume',
        jsonKeyOrId: 'quantity',
        htmlElement: '<input type="number">',
        validationRule: 'Required; positive integer (min="1") indicating total tablets/units.',
      },
      {
        fieldLabel: 'Dosage Instructions',
        jsonKeyOrId: 'instructions',
        htmlElement: '<input type="text" maxlength="100">',
        validationRule: 'Required; dosage & duration (e.g., 1 tablet after food twice daily for 3 days).',
      },
    ],
  },
  form5: {
    id: 'form5',
    sectionTitle: 'Form 5: Patient Portal Feedback Form',
    screenFiles: 'patient/feedback.html, patient/save-feedback.js, patient/symptom-tags.js, doctor/feedback-view.html',
    jsonStore: 'prescriptions',
    fields: [
      {
        fieldLabel: 'Select Prescription',
        jsonKeyOrId: 'prescriptionNumber',
        htmlElement: '<select>',
        validationRule: 'Required; dropdown listing only prescriptions belonging to the logged-in patient.',
      },
      {
        fieldLabel: 'Quick Symptom Tags',
        jsonKeyOrId: 'symptomChips',
        htmlElement: '<button type="button">',
        validationRule: 'Optional helper buttons (Recovered, Mild Drowsiness, Nausea) that append text.',
      },
      {
        fieldLabel: 'Health / Side-Effect Feedback',
        jsonKeyOrId: 'feedback',
        htmlElement: '<textarea maxlength="100">',
        validationRule: 'Required; records patient recovery or side effects (max 100 chars) visible to Doctor.',
      },
    ],
  },
  cssAndHelpers: {
    id: 'cssAndHelpers',
    sectionTitle: 'Shared UI Classes, Empty States & Demo Seeder',
    screenFiles: 'doctor/doctor.css, patient/patient.css, patient/empty-state.js, patient/seed-data.js',
    jsonStore: 'all',
    fields: [
      {
        fieldLabel: 'Doctor Styles & Print Rules',
        jsonKeyOrId: '.doc-patient-banner, .doc-rx-row, .print-slip',
        htmlElement: 'CSS Classes & @media print',
        validationRule: 'Hide navbar and action buttons in print mode; align multi-row medicine inputs.',
      },
      {
        fieldLabel: 'Patient Card & Feedback Classes',
        jsonKeyOrId: '.pat-profile-card, .pat-empty-card, .symptom-chip-btn, .dosage-slot-card',
        htmlElement: 'CSS Classes',
        validationRule: 'Highlight active symptom chips, style Morning/Afternoon/Night slots, and responsive tables.',
      },
      {
        fieldLabel: 'Demo Data & Empty State',
        jsonKeyOrId: 'seedSampleData, btnLoadSampleData',
        htmlElement: '<button id="btnLoadSampleData">',
        validationRule: 'Call seedSampleData(true) from shared/storage.js and reload to populate demo records.',
      },
    ],
  },
};

const ROLL_TO_SECTION_IDS: Record<number, string[]> = {
  1: ['form1A'],
  2: ['form1A'],
  3: ['form1B', 'form1A'],
  4: ['form1B'],
  5: ['form1B'],
  6: ['form1B'],
  7: ['form2A', 'form2B'],
  8: ['form2A'],
  9: ['form2A'],
  10: ['form2B'],
  11: ['form2B'],
  12: ['form3A', 'form3B_medicine', 'form3B_bills'],
  13: ['form3A'],
  14: ['form3A'],
  15: ['form3B_medicine'],
  16: ['form3B_medicine'],
  17: ['form3B_bills'],
  18: ['form3B_bills'],
  19: ['form4A', 'form4B'],
  20: ['form3A', 'form4A'],
  21: ['form4A'],
  22: ['form4A'],
  23: ['form4A'],
  24: ['form4A', 'form4B'],
  25: ['form4A'],
  26: ['form4A'],
  27: ['form4B'],
  28: ['form4B', 'form3B_medicine'],
  29: ['form4B'],
  30: ['form4B'],
  31: ['form4A'],
  32: ['form4B'],
  33: ['form5'],
  34: ['form4A'],
  35: ['form2A'],
  36: ['cssAndHelpers', 'form4B'],
  37: ['form4A', 'form4B'],
  38: ['form4B'],
  39: ['form4A'],
  40: ['form3A'],
  41: ['cssAndHelpers'],
  42: ['form4B'],
  43: ['form5'],
  44: ['form5'],
  45: ['form5'],
  46: ['form5'],
  47: ['form5'],
  48: ['form5'],
  49: ['form3B_bills'],
  50: ['form3B_bills'],
  51: ['form3B_bills'],
  52: ['cssAndHelpers'],
  53: ['form3B_bills'],
  54: ['cssAndHelpers', 'form5'],
};

export function getFormGuidesForRoll(rollNo: number): ExerciseFormGuide[] {
  const ids = ROLL_TO_SECTION_IDS[rollNo] || ['form1A'];
  return ids.map((id) => FORM_GUIDE_SECTIONS[id]).filter(Boolean);
}
