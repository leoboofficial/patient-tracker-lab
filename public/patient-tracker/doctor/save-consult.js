/**
 * doctor/save-consult.js (Roll No. 23 - stu-23-consult-save)
 * Validate non-empty Problem Description and save consultation to localStorage.
 */

document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("consultationForm");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearAlert();

    var consultationId = document.getElementById("consultationId").value.trim();
    var date = document.getElementById("date").value.trim();
    var timeOfVisit = document.getElementById("timeOfVisit").value.trim();
    var doctorId = document.getElementById("doctorId").value.trim();
    var patientNumber = document.getElementById("patientNumber").value.trim().toUpperCase();
    var problem = document.getElementById("problem").value.trim();
    var notes = document.getElementById("notes").value.trim();

    var patient = lookupPatientById(patientNumber);
    if (!patient) {
      showError("Valid Patient Number is required. Please check the Patient ID.");
      return;
    }
    if (!problem) {
      showError("Problem Description cannot be empty.");
      return;
    }
    if (problem.length > 100) {
      showError("Problem Description must be 100 characters or fewer.");
      return;
    }

    var rxNumber = generatePrescriptionLink(consultationId, patientNumber, doctorId);

    var consultations = getData("consultations");
    consultations.push({
      consultationId: consultationId,
      date: date,
      timeOfVisit: timeOfVisit,
      doctorId: doctorId,
      patientNumber: patientNumber,
      problem: problem,
      notes: notes,
      prescriptionNumber: rxNumber
    });
    saveData("consultations", consultations);

    showSuccess("Consultation " + consultationId + " saved for " + patient.name + ".");
    document.getElementById("problem").value = "";
    document.getElementById("notes").value = "";
    populateConsultationMeta();
  });
});
