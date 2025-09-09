// Emergency fallback script to fix white page issues
console.log("🚨 Emergency fallback script loading...");

// Immediate actions on script load
(function () {
  // Force show body
  document.body.style.visibility = "visible";
  document.body.style.opacity = "1";
  document.body.style.display = "block";

  // Hide loading overlay immediately
  setTimeout(function () {
    const loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) {
      loadingOverlay.style.display = "none";
      loadingOverlay.classList.add("hidden");
      console.log("🔧 Emergency: Hidden loading overlay");
    }

    // Show home page
    const homePage = document.getElementById("home-page");
    if (homePage) {
      homePage.classList.remove("hidden");
      homePage.style.display = "block";
      console.log("🔧 Emergency: Showed home page");
    }

    // If still having issues, show a basic page
    if (!homePage || homePage.classList.contains("hidden")) {
      document.body.innerHTML = `
                <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
                    <h1>SeekoBharat - E-Learning Platform</h1>
                    <p>Loading issue detected. <a href="/debug-login.html">Try Debug Login</a> or <a href="/minimal-login.html">Minimal Login</a></p>
                    <div style="margin-top: 20px;">
                        <a href="#" onclick="location.reload()" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Reload Page</a>
                    </div>
                </div>
            `;
    }
  }, 100);
})();

console.log("✅ Emergency fallback script loaded");
