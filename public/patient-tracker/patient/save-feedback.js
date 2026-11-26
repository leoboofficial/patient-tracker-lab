/**
 * patient/save-feedback.js (Roll No. 44 - stu-44-feedback-save)
 * Save patient feedback/side effects to localStorage prescriptions store.
 */

function savePatientFeedback(rxNumber, feedbackText, tags) {
  var prescriptions = getData("prescriptions");
  var idx = prescriptions.findIndex(function (r) { return r.prescriptionNumber === rxNumber; });
  if (idx === -1) return false;

  prescriptions[idx].feedback = feedbackText;
  prescriptions[idx].symptomTags = Array.isArray(tags) ? tags.slice() : [];
  prescriptions[idx].feedbackUpdatedAt = getTodayDateString();
  saveData("prescriptions", prescriptions);
  return true;
}
