/**
 * patient/validate-fb.js (Roll No. 48 - stu-48-feedback-check)
 * Block empty feedback and enforce 100-character limit with live counter.
 */

function validateFeedbackText(text) {
  var clean = String(text || "").trim();
  if (!clean) {
    return { valid: false, message: "Feedback message cannot be empty." };
  }
  if (clean.length > 100) {
    return { valid: false, message: "Feedback must be 100 characters or fewer." };
  }
  return { valid: true, value: clean };
}

document.addEventListener("DOMContentLoaded", function () {
  var textarea = document.getElementById("feedback");
  var counter = document.getElementById("fbCounter");
  if (!textarea || !counter) return;

  function updateCounter() {
    var left = 100 - textarea.value.length;
    counter.textContent = left + " / 100 characters remaining";
    counter.style.color = left <= 15 ? "#b45309" : "#64748b";
  }

  textarea.addEventListener("input", updateCounter);
  updateCounter();
});
