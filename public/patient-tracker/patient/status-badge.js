/**
 * patient/status-badge.js (Roll No. 45 - stu-45-feedback-badge)
 * Returns "Feedback Submitted" or "Pending" status label for each consultation row.
 */

function getFeedbackStatusHtml(prescriptionNumber, prescriptions) {
  if (!prescriptionNumber) return '<span style="color:#64748b;">No Rx</span>';
  var rx = prescriptions.find(function (r) { return r.prescriptionNumber === prescriptionNumber; });
  if (rx && rx.feedback && rx.feedback.trim().length > 0) {
    return '<span class="status-text-success">Feedback Submitted</span>';
  }
  return '<span class="status-text-warning">Pending</span>';
}
