/**
 * doctor/dosage-grid.js (Roll No. 29 - stu-29-dosage-rows)
 * Add/remove multiple medicine rows with Quantity to Consume and Dosage Instructions.
 */

function addDosageRow() {
  var container = document.getElementById("dosageRowsContainer");
  if (!container) return;

  var row = document.createElement("div");
  row.className = "doc-rx-row";
  row.innerHTML =
    '<div class="pt-field">' +
      '<label>Medicine</label>' +
      '<select class="rx-med-select" required>' + buildMedicineOptionsHtml() + '</select>' +
    '</div>' +
    '<div class="pt-field">' +
      '<label>Quantity</label>' +
      '<input type="number" class="rx-qty-input" min="1" value="10" required />' +
    '</div>' +
    '<div class="pt-field">' +
      '<label>Dosage Instructions (max 100 chars)</label>' +
      '<input type="text" class="rx-inst-input" maxlength="100" placeholder="1 tablet after food twice daily for 5 days" required />' +
    '</div>' +
    '<button type="button" class="pt-btn pt-btn-danger pt-btn-sm btn-remove-row">Remove</button>';

  row.querySelector(".btn-remove-row").addEventListener("click", function () {
    if (container.children.length > 1) {
      row.remove();
    } else {
      showError("At least one medicine row is required.");
    }
  });

  container.appendChild(row);
}

document.addEventListener("DOMContentLoaded", function () {
  var btnAdd = document.getElementById("btnAddMedRow");
  if (btnAdd) {
    btnAdd.addEventListener("click", addDosageRow);
    addDosageRow();
  }
});
