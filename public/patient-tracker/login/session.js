/**
 * login/session.js (Roll No. 04 - stu-04-logout)
 * Saves logged-in user in sessionStorage and manages auth guard + Logout.
 */

var SESSION_KEY = "pt_logged_in_user";

function setSessionUser(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    loginName: user.loginName,
    role: user.role,
    refId: user.refId || "",
    fullName: user.fullName || user.loginName
  }));
}

function getSessionUser() {
  try {
    var raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "../login/index.html";
}

function requireAuth(allowedRoles) {
  var user = getSessionUser();
  if (!user) {
    window.location.href = "../login/index.html";
    return null;
  }
  if (allowedRoles && allowedRoles.length > 0 && allowedRoles.indexOf(user.role) === -1) {
    window.location.href = "../login/index.html";
    return null;
  }
  return user;
}
