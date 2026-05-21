import { loadMovementTargets, loadExerciseMapping } from "./data.js";

let exerciseMapping = {};
let knownExercises = [];
let movementTargets = {};

async function main() {
  const app = document.getElementById("app");
  [movementTargets, exerciseMapping] = await Promise.all([
    loadMovementTargets(),
    loadExerciseMapping(),
  ]);
  knownExercises = Object.keys(exerciseMapping).sort();

  app.innerHTML = `
    <h1>New Program <a href="/" class="nav-link">← Index</a> <a href="preview.html" class="nav-link">Preview YAML</a></h1>

    <section class="builder-section">
      <h2>Program Details</h2>
      <div class="field-row">
        <label>Title <input id="prog-title" type="text" placeholder="e.g. June 2026"></label>
        <label>ID (slug) <input id="prog-id" type="text" placeholder="e.g. june2026"></label>
      </div>
    </section>

    <section class="builder-section">
      <h2>Days</h2>
      <div id="days-container"></div>
      <button id="add-day" class="btn-add">+ Add Day</button>
    </section>

    <section class="builder-section">
      <h2>Movement Targets</h2>
      <p class="hint">Override defaults for this program. Unchecked rows use the global defaults.</p>
      <table class="targets-table">
        <thead>
          <tr><th>Movement</th><th>Default</th><th>Current</th><th>Override</th><th>Min</th><th>Max</th></tr>
        </thead>
        <tbody id="targets-body"></tbody>
      </table>
    </section>

    <section class="builder-section">
      <div class="preview-actions">
        <button id="download-btn" class="btn-download">Download YAML</button>
        <button id="copy-btn" class="btn-add">Copy YAML</button>
      </div>
    </section>
  `;

  const titleInput = document.getElementById("prog-title");
  const idInput = document.getElementById("prog-id");
  titleInput.addEventListener("input", () => {
    idInput.value = titleInput.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .trim();
  });

  document.getElementById("add-day").addEventListener("click", addDay);
  addDay();

  const targetsBody = document.getElementById("targets-body");
  for (const [movement, { low, high }] of Object.entries(movementTargets)) {
    const tr = document.createElement("tr");
    tr.dataset.movement = movement;
    tr.innerHTML = `
      <td>${movement}</td>
      <td class="center">${low}–${high}</td>
      <td class="center current-sets">—</td>
      <td class="center"><input type="checkbox" class="override-check"></td>
      <td><input type="number" class="override-low" value="${low}" min="0" disabled></td>
      <td><input type="number" class="override-high" value="${high}" min="0" disabled></td>
    `;
    tr.querySelector(".override-check").addEventListener("change", (e) => {
      tr.querySelector(".override-low").disabled = !e.target.checked;
      tr.querySelector(".override-high").disabled = !e.target.checked;
    });
    targetsBody.appendChild(tr);
  }

  recalcTargets();

  document.getElementById("download-btn").addEventListener("click", download);

  const copyBtn = document.getElementById("copy-btn");
  copyBtn.addEventListener("click", async () => {
    const yaml = buildYaml();
    if (!yaml) return;
    await navigator.clipboard.writeText(yaml);
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy YAML"), 1500);
  });
}

let dayCount = 0;

function addDay() {
  dayCount++;
  const container = document.getElementById("days-container");
  const div = document.createElement("div");
  div.className = "day-block";
  div.innerHTML = `
    <div class="day-block-header">
      <input type="text" class="day-name" placeholder="Day name (e.g. UPPER)">
      <button class="btn-remove" title="Remove day">×</button>
    </div>
    <div class="exercises-container"></div>
    <button class="btn-add-exercise">+ Add Exercise</button>
  `;
  div.querySelector(".btn-remove").addEventListener("click", () => {
    div.remove();
    recalcTargets();
  });
  div.querySelector(".btn-add-exercise").addEventListener("click", () => addExercise(div));
  addExercise(div);
  container.appendChild(div);
}

function buildSelectOptions() {
  return (
    knownExercises
      .map((e) => `<option value="${e}">${e} (${exerciseMapping[e]})</option>`)
      .join("") + `<option value="__custom__">Custom…</option>`
  );
}

function addExercise(dayDiv) {
  const container = dayDiv.querySelector(".exercises-container");
  const row = document.createElement("div");
  row.className = "exercise-row";
  row.innerHTML = `
    <select class="ex-select">
      <option value="">— select —</option>
      ${buildSelectOptions()}
    </select>
    <input type="text" class="ex-custom-name" placeholder="Custom name" style="display:none">
    <input type="number" class="ex-sets" placeholder="Sets" min="1" value="3">
    <input type="text" class="ex-reps" placeholder="Reps (e.g. 8-10)">
    <button class="btn-remove" title="Remove exercise">×</button>
  `;

  const select = row.querySelector(".ex-select");
  const customInput = row.querySelector(".ex-custom-name");

  select.addEventListener("change", () => {
    const isCustom = select.value === "__custom__";
    customInput.style.display = isCustom ? "" : "none";
    if (!isCustom) customInput.value = "";
    updateRowUnknown(row);
    recalcTargets();
  });

  customInput.addEventListener("input", () => {
    updateRowUnknown(row);
    recalcTargets();
  });

  row.querySelector(".ex-sets").addEventListener("input", recalcTargets);

  row.querySelector(".btn-remove").addEventListener("click", () => {
    row.remove();
    recalcTargets();
  });

  container.appendChild(row);
}

function getExerciseName(row) {
  const select = row.querySelector(".ex-select");
  if (select.value === "__custom__") {
    return row.querySelector(".ex-custom-name").value.trim();
  }
  return select.value;
}

function updateRowUnknown(row) {
  const name = getExerciseName(row);
  const isCustom = row.querySelector(".ex-select").value === "__custom__";
  row.classList.toggle("unknown-exercise", isCustom && !!name && !(name in exerciseMapping));
}

function recalcTargets() {
  const summary = {};
  for (const row of document.querySelectorAll(".exercise-row")) {
    const name = getExerciseName(row);
    if (!name || !(name in exerciseMapping)) continue;
    const movement = exerciseMapping[name];
    const sets = Number(row.querySelector(".ex-sets").value) || 0;
    summary[movement] = (summary[movement] || 0) + sets;
  }

  for (const tr of document.querySelectorAll("#targets-body tr")) {
    const movement = tr.dataset.movement;
    const sets = summary[movement] ?? null;
    const cell = tr.querySelector(".current-sets");
    const target = movementTargets[movement];

    if (sets === null) {
      cell.textContent = "—";
      cell.className = "center current-sets";
    } else {
      cell.textContent = sets;
      cell.className =
        "center current-sets " +
        (target
          ? sets >= target.low && sets <= target.high
            ? "cell-good"
            : "cell-bad"
          : "");
    }
  }
}

function buildYaml() {
  const title = document.getElementById("prog-title").value.trim();
  const id = document.getElementById("prog-id").value.trim();

  if (!title || !id) {
    alert("Please enter a program title and ID.");
    return null;
  }

  const days = [];
  for (const dayDiv of document.querySelectorAll(".day-block")) {
    const name = dayDiv.querySelector(".day-name").value.trim() || "Day";
    const exercises = [];
    for (const row of dayDiv.querySelectorAll(".exercise-row")) {
      const name = getExerciseName(row);
      const sets = Number(row.querySelector(".ex-sets").value);
      const reps = row.querySelector(".ex-reps").value.trim();
      if (!name) continue;
      exercises.push({ name, sets, ...(reps ? { reps } : {}) });
    }
    days.push({ name, exercises });
  }

  if (days.length === 0) {
    alert("Please add at least one day.");
    return null;
  }

  const overrides = {};
  for (const tr of document.querySelectorAll("#targets-body tr")) {
    if (!tr.querySelector(".override-check").checked) continue;
    const movement = tr.dataset.movement;
    overrides[movement] = {
      low: Number(tr.querySelector(".override-low").value),
      high: Number(tr.querySelector(".override-high").value),
    };
  }

  const program = { program: { title }, days };
  if (Object.keys(overrides).length > 0) program.movement_targets = overrides;

  return jsyaml.dump(program, { lineWidth: -1, quotingType: '"' });
}

function download() {
  const yaml = buildYaml();
  if (!yaml) return;

  const id = document.getElementById("prog-id").value.trim();
  const blob = new Blob([yaml], { type: "text/yaml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${id}.yaml`;
  a.click();
  URL.revokeObjectURL(url);
}

main();
