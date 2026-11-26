/**
 * patient/seed-data.js (Roll No. 52 - stu-52-demo-data)
 * Sample JSON data loader + "Load Sample Data" button helper for easy testing.
 */

function loadDemoAndReload() {
  seedSampleData(true);
  window.location.reload();
}

document.addEventListener("DOMContentLoaded", function () {
  var btn = document.getElementById("btnLoadSampleData");
  if (btn) {
    btn.addEventListener("click", loadDemoAndReload);
  }
});
