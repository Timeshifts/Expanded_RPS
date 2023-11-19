function register() {
    let login_form = document.getElementById("login-form")
    login_form.action = "/register"
    login_form.submit();
}
function login() {
    let login_form = document.getElementById("login-form")
    login_form.action = "/login"
    login_form.submit();
}
function logout() {
    document.location = "/logout";
}