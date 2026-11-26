/**
 * patient/empty-state.js (Roll No. 41 - stu-41-empty-state)
 * Friendly message card when a newly registered patient has zero visits yet.
 */

function renderPatientEmptyState(containerId, message) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML =
    '<div class="pat-empty-card">' +
      '<h3>No Consultations Recorded Yet</h3>' +
      '<p style="margin:0 0 16px; font-size:14px;">' +
        escapeHtml(message || "Once your consulting doctor logs a visit and e-prescription, your medical history will appear here.") +
      '</p>' +
      '<button type="button" class="pt-btn pt-btn-secondary pt-btn-sm" onclick="loadDemoAndReload()">Load Sample Data</button>' +
    '</div>';
}
