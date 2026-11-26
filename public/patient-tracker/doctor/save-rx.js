/**
 * doctor/save-rx.js (Roll No. 30 - stu-30-rx-save)
 * Save prescription items to localStorage and show "Prescriptions stored successfully" confirmation.
 */

document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("prescriptionForm");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearAlert();

    var prescriptionNumber = document.getElementById("prescriptionNumber").value.trim();
    var consultationId = document.getElementById("consultationId").value.trim();
    var patientNumber = document.getElementById("patientNumber").value.trim();
    var doctorId = document.getElementById("doctorId").value.trim();
    var rxNotes = document.getElementById("rxNotes") ? document.getElementById("rxNotes").value.trim() : "";

    if (!consultationId || !patientNumber) {
      showError("A valid Consultation ID and Patient Number are required.");
      return;
    }

    var rows = document.querySelectorAll("#dosageRowsContainer .doc-rx-row");
    var items = [];
    for (var i = 0; i < rows.length; i++) {
      var sel = rows[i].querySelector(".rx-med-select");
      var qtyEl = rows[i].querySelector(".rx-qty-input");
      var instEl = rows[i].querySelector(".rx-inst-input");

      var medId = sel ? sel.value : "";
      var medName = sel && sel.selectedIndex > 0 ? sel.options[sel.selectedIndex].getAttribute("data-name") : "";
      var qty = parseInt(qtyEl ? qtyEl.value : "0", 10);
      var inst = instEl ? instEl.value.trim() : "";

      if (!medId || isNaN(qty) || qty < 1 || !inst) {
        showError("Complete Medicine, positive Quantity, and Dosage Instructions for every row.");
        return;
      }

      items.push({
        medicineId: medId,
        medicineName: medName,
        quantity: qty,
        instructions: inst
      });
    }

    var prescriptions = getData("prescriptions");
    var existingIdx = prescriptions.findIndex(function (r) { return r.prescriptionNumber === prescriptionNumber; });
    var record = {
      prescriptionNumber: prescriptionNumber,
      consultationId: consultationId,
      patientNumber: patientNumber,
      doctorId: doctorId,
      date: getTodayDateString(),
      notes: rxNotes,
      items: items,
      feedback: existingIdx !== -1 ? prescriptions[existingIdx].feedback : "",
      symptomTags: existingIdx !== -1 ? prescriptions[existingIdx].symptomTags : [],
      feedbackUpdatedAt: existingIdx !== -1 ? prescriptions[existingIdx].feedbackUpdatedAt : ""
    };

    if (existingIdx !== -1) {
      prescriptions[existingIdx] = record;
    } else {
      prescriptions.push(record);
    }
    saveData("prescriptions", prescriptions);

    showSuccess("Prescriptions stored successfully");
    var printBtn = document.getElementById("btnPrintRxLink");
    if (printBtn) {
      printBtn.href = "print-rx.html?rx=" + encodeURIComponent(prescriptionNumber);
      printBtn.style.display = "inline-flex";
    }
  });
});
