import { renderProgram } from "./program.js";

const renderBtn = document.getElementById("render-btn");
const printBtn = document.getElementById("print-btn");
const errorEl = document.getElementById("parse-error");

renderBtn.addEventListener("click", () => {
  const yaml = document.getElementById("yaml-input").value.trim();
  errorEl.textContent = "";

  if (!yaml) {
    errorEl.textContent = "Paste some YAML first.";
    return;
  }

  let program;
  try {
    program = jsyaml.load(yaml);
  } catch (err) {
    errorEl.textContent = `Parse error: ${err.message}`;
    return;
  }

  if (!program?.days || !Array.isArray(program.days)) {
    errorEl.textContent = "Invalid program: missing top-level 'days' array.";
    return;
  }

  renderProgram(program);

  document.getElementById("paste-ui").style.display = "none";
  printBtn.style.display = "";
  // Move print button into the rendered output area so it's accessible
  document.getElementById("app").prepend(printBtn);
});

printBtn.addEventListener("click", () => window.print());
