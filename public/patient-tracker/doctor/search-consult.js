/**
 * doctor/search-consult.js (Roll No. 34 - stu-34-consult-search)
 * Filter doctor's consultations by Date or Patient ID.
 */

function filterConsultations(list, dateFilter, patientFilter) {
  var d = String(dateFilter || "").trim();
  var p = String(patientFilter || "").trim().toLowerCase();

  return list.filter(function (c) {
    var matchDate = !d || c.date === d;
    var matchPat = !p || c.patientNumber.toLowerCase().indexOf(p) !== -1;
    return matchDate && matchPat;
  });
}
