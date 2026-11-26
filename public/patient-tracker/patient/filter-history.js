/**
 * patient/filter-history.js (Roll No. 39 - stu-39-history-filter)
 * Search bar helper to filter patient's consultation history by Doctor or Date.
 */

function filterPatientConsultations(consults, doctors, query) {
  var q = String(query || "").trim().toLowerCase();
  if (!q) return consults;

  return consults.filter(function (c) {
    var doc = doctors.find(function (d) { return d.doctorId === c.doctorId; });
    var docName = doc ? doc.doctorName.toLowerCase() : "";
    return (
      c.date.toLowerCase().indexOf(q) !== -1 ||
      c.doctorId.toLowerCase().indexOf(q) !== -1 ||
      docName.indexOf(q) !== -1 ||
      c.problem.toLowerCase().indexOf(q) !== -1
    );
  });
}
