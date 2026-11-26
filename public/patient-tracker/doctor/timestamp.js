/**
 * doctor/timestamp.js (Roll No. 22 - stu-22-auto-time)
 * Auto-fill Consultation ID, today's Date (YYYY-MM-DD), and 24-hour Time (e.g., 14:30).
 */

function populateConsultationMeta() {
  var conInput = document.getElementById("consultationId");
  var dateInput = document.getElementById("date");
  var timeInput = document.getElementById("timeOfVisit");
  var docInput = document.getElementById("doctorId");

  if (conInput) conInput.value = getNextId("consultations", "CON");
  if (dateInput) dateInput.value = getTodayDateString();
  if (timeInput) timeInput.value = getCurrentTime24();

  var user = typeof getSessionUser === "function" ? getSessionUser() : null;
  if (docInput && user) {
    docInput.value = user.refId || "DOC-101";
  }
}

document.addEventListener("DOMContentLoaded", populateConsultationMeta);
