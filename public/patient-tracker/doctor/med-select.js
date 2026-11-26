/**
 * doctor/med-select.js (Roll No. 28 - stu-28-med-dropdown)
 * Builds <select> options from non-expired medicines with positive stock in localStorage.
 */

function getAvailableMedicines() {
  var today = getTodayDateString();
  return getData("medicines").filter(function (m) {
    return Number(m.quantity) > 0 && (!m.expiryDate || m.expiryDate > today);
  });
}

function buildMedicineOptionsHtml() {
  var available = getAvailableMedicines();
  var html = '<option value="">-- Select Medicine --</option>';
  available.forEach(function (m) {
    html += '<option value="' + escapeHtml(m.medicineId) + '" data-name="' + escapeHtml(m.name) + '">' +
      escapeHtml(m.name + " (Stock: " + m.quantity + " · Exp: " + m.expiryDate + ")") +
    '</option>';
  });
  return html;
}
