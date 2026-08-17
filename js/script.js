const menu = document.getElementById("mobile-menu");
const navLinks = document.querySelector(".nav-links");

if (menu && navLinks) {
  menu.addEventListener("click", () => {
    navLinks.classList.toggle("active");

    if (navLinks.classList.contains("active")) {
      menu.innerHTML = "✕";
    } else {
      menu.innerHTML = "☰";
    }
  });
}

// Google Analytics 4 — KW Controls Website
window.dataLayer = window.dataLayer || [];
function gtag() {
  dataLayer.push(arguments);
}

gtag("js", new Date());
gtag("config", "G-BH5VWGY72M");

const gaScript = document.createElement("script");
gaScript.async = true;
gaScript.src = "https://www.googletagmanager.com/gtag/js?id=G-BH5VWGY72M";
document.head.appendChild(gaScript);
