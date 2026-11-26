/**
 * doctor/char-count.js (Roll No. 31 - stu-31-notes-counter)
 * Live 100-character countdown indicator for Doctor's Problem & Additional Notes.
 */

function bindCharCounter(textareaId, counterId, maxLen) {
  var el = document.getElementById(textareaId);
  var counter = document.getElementById(counterId);
  if (!el || !counter) return;

  var limit = maxLen || 100;
  function update() {
    var remaining = limit - el.value.length;
    counter.textContent = remaining + " / " + limit + " characters remaining";
    if (remaining <= 15) {
      counter.classList.add("limit-near");
    } else {
      counter.classList.remove("limit-near");
    }
  }

  el.addEventListener("input", update);
  update();
}

document.addEventListener("DOMContentLoaded", function () {
  bindCharCounter("problem", "problemCounter", 100);
  bindCharCounter("notes", "notesCounter", 100);
  bindCharCounter("rxNotes", "rxNotesCounter", 100);
});
