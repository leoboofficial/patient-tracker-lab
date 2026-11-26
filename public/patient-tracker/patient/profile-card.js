/**
 * patient/profile-card.js (Roll No. 40 - stu-40-patient-card)
 * Patient header card showing Patient ID, Name, Age, and IN / OUT status.
 */

function renderPatientProfileCard(containerId, patientNumber) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var patients = getData("patients");
  var pat = patients.find(function (p) { return p.patientNumber === patientNumber; });

  if (!pat) {
    container.innerHTML =
      '<div class="pat-profile-card"><div><strong>Patient Record (' + escapeHtml(patientNumber) + ')</strong></div></div>';
    return;
  }

  container.innerHTML =
    '<div class="pat-profile-card">' +
      '<div>' +
        '<h2 style="font-size:20px;">' + escapeHtml(pat.name) + '</h2>' +
        '<div style="font-size:13.5px; color:#475569; margin-top:4px;">' +
          '<span class="mono">' + escapeHtml(pat.patientNumber) + '</span>' +
          ' · Age <span class="tabular">' + escapeHtml(pat.age) + '</span>' +
          ' · Status: <strong>' + escapeHtml(pat.type === "IN" ? "IN (Inpatient)" : "OUT (Outpatient)") + '</strong>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:13px; color:#64748b; text-align:right;">' +
        '<div class="mono">' + escapeHtml(pat.contact) + '</div>' +
        '<div>' + escapeHtml(pat.address) + '</div>' +
      '</div>' +
    '</div>';
}
