/**
 * patient/bill-totals.js (Roll No. 51 - stu-51-bill-summary)
 * Summary boxes showing Total Paid vs. Total Pending amount for the patient.
 */

function renderPatientBillTotals(containerId, patientNumber, billTypeFilter) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var bills = getData("bills").filter(function (b) {
    var matchPat = b.patientNumber === patientNumber;
    var matchType = !billTypeFilter || b.billType === billTypeFilter;
    return matchPat && matchType;
  });

  var paid = 0;
  var pending = 0;
  bills.forEach(function (b) {
    if (b.billPaid) {
      paid += Number(b.billAmount || 0);
    } else {
      pending += Number(b.billAmount || 0);
    }
  });

  container.innerHTML =
    '<div class="pt-stats-grid">' +
      '<div class="pt-stat-card">' +
        '<div class="pt-stat-label">Total Bills</div>' +
        '<div class="pt-stat-value">' + bills.length + '</div>' +
      '</div>' +
      '<div class="pt-stat-card">' +
        '<div class="pt-stat-label">Total Paid Amount</div>' +
        '<div class="pt-stat-value" style="color:#15803d;">₹' + paid.toFixed(2) + '</div>' +
      '</div>' +
      '<div class="pt-stat-card">' +
        '<div class="pt-stat-label">Total Pending Amount</div>' +
        '<div class="pt-stat-value" style="color:#b45309;">₹' + pending.toFixed(2) + '</div>' +
      '</div>' +
    '</div>';
}
