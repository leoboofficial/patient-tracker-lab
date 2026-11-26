/**
 * doctor/rx-link.js (Roll No. 24 - stu-24-rx-link-gen)
 * Generate a unique Prescription Number link after saving a consultation.
 */

function generatePrescriptionLink(consultationId, patientNumber, doctorId) {
  var rxNumber = getNextId("prescriptions", "RX");
  var container = document.getElementById("rxLinkContainer");
  if (!container) return rxNumber;

  var url = "prescription.html?rx=" + encodeURIComponent(rxNumber) +
    "&con=" + encodeURIComponent(consultationId) +
    "&pat=" + encodeURIComponent(patientNumber) +
    "&doc=" + encodeURIComponent(doctorId);

  container.innerHTML =
    '<div class="doc-rx-link-card">' +
      '<div>' +
        '<div style="font-weight:600; color:#15803d;">Consultation Saved (' + escapeHtml(consultationId) + ')</div>' +
        '<div style="font-size:13px; color:#166534;">Generated Prescription Reference: <strong class="mono">' + escapeHtml(rxNumber) + '</strong></div>' +
      '</div>' +
      '<a href="' + url + '" class="pt-btn pt-btn-primary">Write E-Prescription (' + escapeHtml(rxNumber) + ')</a>' +
    '</div>';

  return rxNumber;
}
