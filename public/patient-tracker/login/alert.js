/**
 * login/alert.js (Roll No. 03 - stu-03-login-error)
 * Shows red error banner or green confirmation banner inside #alertBox.
 */

function showError(message, containerId) {
  var id = containerId || "alertBox";
  var box = document.getElementById(id);
  if (!box) return;
  box.className = "pt-alert pt-alert-error";
  box.setAttribute("role", "alert");
  box.textContent = message;
  box.style.display = "block";
}

function showSuccess(message, containerId) {
  var id = containerId || "alertBox";
  var box = document.getElementById(id);
  if (!box) return;
  box.className = "pt-alert pt-alert-success";
  box.setAttribute("role", "status");
  box.textContent = message;
  box.style.display = "block";
}

function clearAlert(containerId) {
  var id = containerId || "alertBox";
  var box = document.getElementById(id);
  if (!box) return;
  box.textContent = "";
  box.style.display = "none";
}
