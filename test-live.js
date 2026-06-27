const { JSDOM } = require('jsdom');
JSDOM.fromURL("https://graceful-travesseiro-3545e3.netlify.app/dashboard.html", {
  runScripts: "dangerously",
  resources: "usable"
}).then(dom => {
  dom.window.addEventListener("error", (e) => {
    console.log("Error:", e.error ? e.error.message : e.message);
  });
  dom.window.document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded");
    setTimeout(() => {
       console.log("User name element:", dom.window.document.getElementById('user-name').textContent);
    }, 2000);
  });
});
