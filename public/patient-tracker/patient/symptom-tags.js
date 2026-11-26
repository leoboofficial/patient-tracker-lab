/**
 * patient/symptom-tags.js (Roll No. 46 - stu-46-symptom-chips)
 * Clickable quick symptom buttons (Recovered, Mild Drowsiness, Nausea) that append text.
 */

var selectedSymptomTags = [];

function initSymptomChips() {
  var chips = document.querySelectorAll(".symptom-chip-btn");
  var textarea = document.getElementById("feedback");

  chips.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var tag = btn.getAttribute("data-tag");
      var idx = selectedSymptomTags.indexOf(tag);
      if (idx === -1) {
        selectedSymptomTags.push(tag);
        btn.classList.add("active");
        if (textarea) {
          var current = textarea.value.trim();
          var addition = current ? current + ", " + tag : tag;
          if (addition.length <= 100) {
            textarea.value = addition;
            textarea.dispatchEvent(new Event("input"));
          }
        }
      } else {
        selectedSymptomTags.splice(idx, 1);
        btn.classList.remove("active");
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", initSymptomChips);
