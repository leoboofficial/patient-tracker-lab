/**
 * login/auth.js (Roll No. 02 - stu-02-login-auth)
 * Checks credentials in localStorage 'users' store and redirects by role.
 */

function handleLoginSubmit(event) {
  event.preventDefault();
  clearAlert("alertBox");

  var loginInput = document.getElementById("loginName");
  var passInput = document.getElementById("password");
  var loginName = loginInput ? loginInput.value.trim() : "";
  var password = passInput ? passInput.value : "";

  if (!loginName || !password) {
    showError("Please enter both User Login ID and Password.");
    return;
  }

  var users = getData("users");
  var matched = null;
  for (var i = 0; i < users.length; i++) {
    if (users[i].loginName === loginName && users[i].password === password) {
      matched = users[i];
      break;
    }
  }

  if (!matched) {
    showError("Invalid User ID or Password. Check credentials and try again.");
    return;
  }

  setSessionUser(matched);

  if (matched.role === "Admin") {
    window.location.href = "admin-home.html";
  } else if (matched.role === "Clerk") {
    window.location.href = "clerk-home.html";
  } else if (matched.role === "Doctor") {
    window.location.href = "../doctor/dashboard.html";
  } else if (matched.role === "Patient") {
    window.location.href = "../patient/history.html";
  } else {
    showError("Unknown user role configured for this account.");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  var form = document.getElementById("loginForm");
  if (form) {
    form.addEventListener("submit", handleLoginSubmit);
  }
});
