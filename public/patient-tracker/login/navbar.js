/**
 * login/navbar.js (Roll No. 05 - stu-05-navbar)
 * Renders top navigation bar showing logged-in username, role, and menu links.
 */

function renderNavbar(activePath) {
  var navRoot = document.getElementById("navbarRoot");
  if (!navRoot) return;

  var user = getSessionUser();
  if (!user) return;

  var linksByRole = {
    Admin: [
      { label: "Dashboard", href: "../login/admin-home.html" },
      { label: "Add Doctor", href: "../login/add-doctor.html" },
      { label: "Doctors", href: "../login/doctor-list.html" },
      { label: "Add Clerk", href: "../login/add-clerk.html" },
      { label: "Clerks", href: "../login/clerk-list.html" },
      { label: "Password", href: "../login/password.html" }
    ],
    Clerk: [
      { label: "Dashboard", href: "../login/clerk-home.html" },
      { label: "Register Patient", href: "../login/add-patient.html" },
      { label: "Patients", href: "../login/patient-list.html" },
      { label: "Add Medicine", href: "../login/add-medicine.html" },
      { label: "Stock", href: "../login/stock-list.html" },
      { label: "OPD Bill", href: "../login/reg-bill.html" },
      { label: "Med Bill", href: "../login/med-bill.html" }
    ],
    Doctor: [
      { label: "Dashboard", href: "../doctor/dashboard.html" },
      { label: "Consultation", href: "../doctor/consultation.html" },
      { label: "Today Visits", href: "../doctor/today-list.html" },
      { label: "Patient History", href: "../doctor/patient-history.html" },
      { label: "Feedback", href: "../doctor/feedback-view.html" },
      { label: "Profile", href: "../doctor/profile.html" }
    ],
    Patient: [
      { label: "Consultations", href: "../patient/history.html" },
      { label: "Dosage Schedule", href: "../patient/dosage-list.html" },
      { label: "Feedback", href: "../patient/feedback.html" },
      { label: "OPD Bills", href: "../patient/reg-bills.html" },
      { label: "Pharmacy Bills", href: "../patient/med-bills.html" },
      { label: "Password", href: "../login/password.html" }
    ]
  };

  var items = linksByRole[user.role] || [];
  var linksHtml = items.map(function (item) {
    var isActive = activePath && item.href.indexOf(activePath) !== -1;
    return '<a href="' + item.href + '" class="' + (isActive ? 'active' : '') + '">' + escapeHtml(item.label) + '</a>';
  }).join("");

  navRoot.innerHTML =
    '<header class="pt-navbar">' +
      '<div class="pt-nav-left">' +
        '<a href="' + (items[0] ? items[0].href : '../login/index.html') + '" class="pt-brand">PatientTracker</a>' +
        '<nav class="pt-nav-links" aria-label="Module Navigation">' + linksHtml + '</nav>' +
      '</div>' +
      '<div class="pt-nav-right">' +
        '<span class="pt-user-meta"><strong>' + escapeHtml(user.fullName) + '</strong> · ' + escapeHtml(user.role) + '</span>' +
        '<button type="button" id="btnLogout" class="pt-btn pt-btn-secondary pt-btn-sm">Logout</button>' +
      '</div>' +
    '</header>';

  var btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", logout);
  }
}
