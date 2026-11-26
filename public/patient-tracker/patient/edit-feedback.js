/**
 * patient/edit-feedback.js (Roll No. 47 - stu-47-edit-feedback)
 * Load previously submitted feedback text so the patient can edit and update it.
 */

function loadExistingFeedbackIntoForm(rxNumber) {
  var textarea = document.getElementById("feedback");
  var editBadge = document.getElementById("editModeNotice");
  if (!textarea) return;

  var rx = getData("prescriptions").find(function (r) { return r.prescriptionNumber === rxNumber; });
  if (rx && rx.feedback) {
    textarea.value = rx.feedback;
    selectedSymptomTags = Array.isArray(rx.symptomTags) ? rx.symptomTags.slice() : [];
    document.querySelectorAll(".symptom-chip-btn").forEach(function (btn) {
      var tag = btn.getAttribute("data-tag");
      if (selectedSymptomTags.indexOf(tag) !== -1) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
    if (editBadge) editBadge.style.display = "block";
  } else {
    textarea.value = "";
    selectedSymptomTags = [];
    document.querySelectorAll(".symptom-chip-btn").forEach(function (btn) { btn.classList.remove("active"); });
    if (editBadge) editBadge.style.display = "none";
  }
  textarea.dispatchEvent(new Event("input"));
}
