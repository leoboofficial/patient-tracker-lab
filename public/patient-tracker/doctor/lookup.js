/**
 * doctor/lookup.js (Roll No. 20 - stu-20-patient-lookup)
 * Search/lookup on Consultation page to fetch Patient Name & Age by Patient ID.
 */

function lookupPatientById(patientId) {
  var id = String(patientId || "").trim().toUpperCase();
  var infoEl = document.getElementById("patientLookupResult");
  if (!id) {
    if (infoEl) infoEl.style.display = "none";
    return null;
  }

  var patients = getData("patients");
  var match = patients.find(function (p) {
    return p.patientNumber.toUpperCase() === id;
  });

  if (infoEl) {
    if (match) {
      infoEl.style.display = "flex";
      infoEl.style.background = "#f0fdfa";
      infoEl.style.borderColor = "#99f6e4";
      infoEl.style.color = "#115e59";
      infoEl.innerHTML =
        '<span><strong>' + escapeHtml(match.name) + '</strong> · Age ' + escapeHtml(match.age) + ' · Type: ' + escapeHtml(match.type) + '</span>' +
        '<span class="mono">' + escapeHtml(match.contact) + '</span>';
    } else {
      infoEl.style.display = "flex";
      infoEl.style.background = "#fef2f2";
      infoEl.style.borderColor = "#fecaca";
      infoEl.style.color = "#991b1b";
      infoEl.innerHTML = '<span>No patient found with ID <strong>' + escapeHtml(id) + '</strong>. Verify registration with Clerk.</span>';
    }
  }
  return match || null;
}

document.addEventListener("DOMContentLoaded", function () {
  var btnLookup = document.getElementById("btnLookupPatient");
  var patInput = document.getElementById("patientNumber");
  if (btnLookup && patInput) {
    btnLookup.addEventListener("click", function () {
      lookupPatientById(patInput.value);
    });
    patInput.addEventListener("blur", function () {
      if (patInput.value.trim()) lookupPatientById(patInput.value);
    });
  }
});
