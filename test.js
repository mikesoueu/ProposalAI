const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('dashboard.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });
dom.window.document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded");
});
dom.window.addEventListener("error", (e) => {
  console.log("Error:", e.message);
});
