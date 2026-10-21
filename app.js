document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav-links");
  if (toggle && nav) toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("mobile-open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  document.querySelectorAll(".alert-close").forEach(btn => btn.addEventListener("click", () => {
    const alert = btn.closest(".alert");
    if (alert) alert.remove();
  }));

  document.querySelectorAll("form[data-confirm]").forEach(form => form.addEventListener("submit", event => {
    const message = form.getAttribute("data-confirm") || "Are you sure?";
    if (!window.confirm(message)) event.preventDefault();
  }));

  document.querySelectorAll(".nav-dropdown").forEach(btn => btn.addEventListener("click", () => {
    const panel = btn.nextElementSibling;
    const open = panel.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", String(open));
  }));
});
