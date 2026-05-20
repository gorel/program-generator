const MOVEMENTS_FILE = "data/movements.csv";
const EXERCISES_FILE = "data/exercises.csv";
const PROGRAMS_DIR = "data/programs";

async function fetchText(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }

  return await response.text();
}

async function loadMovementTargets() {
  const csvText = await fetchText(MOVEMENTS_FILE);

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const movements = {};

  for (const row of parsed.data) {
    movements[row.movement] = {
      low: Number(row.low),
      high: Number(row.high),
    };
  }

  return movements;
}

async function loadExerciseMapping() {
  const csvText = await fetchText(EXERCISES_FILE);

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const exercises = {};

  for (const row of parsed.data) {
    exercises[row.exercise] = row.movement;
  }

  return exercises;
}

async function loadProgram(programFilename) {
  let filename = programFilename;

  if (!filename.endsWith(".yaml") && !filename.endsWith(".yml")) {
    filename += ".yaml";
  }

  const path = `${PROGRAMS_DIR}/${filename}`;

  const yamlText = await fetchText(path);

  return jsyaml.load(yamlText);
}

function calculateStats(program, movementTargets, exerciseMapping) {
  const summary = {};
  const missingExercises = [];

  for (const day of program.days) {
    for (const exercise of day.exercises) {
      const exerciseName = exercise.name;
      const sets = Number(exercise.sets);

      if (!(exerciseName in exerciseMapping)) {
        missingExercises.push(exerciseName);
        continue;
      }

      const movement = exerciseMapping[exerciseName];

      summary[movement] = (summary[movement] || 0) + sets;
    }
  }

  return {
    summary,
    missingExercises,
  };
}

function renderProgram(program) {
  const app = document.getElementById("app");

  app.innerHTML = "";

  const title = document.createElement("h1");
  title.textContent = program.program.title;
  app.appendChild(title);

  for (const day of program.days) {
    const section = document.createElement("section");
    section.className = "day";

    const maxSets = Math.max(...day.exercises.map((e) => Number(e.sets)));

    const setHeaders = Array.from(
      { length: maxSets },
      (_, i) => `<th>Set ${i + 1}</th>`,
    ).join("");

    const wrapper = document.createElement("div");
    wrapper.className = "day-wrapper";

    const label = document.createElement("div");
    label.className = "day-label";
    label.textContent = day.name;

    const table = document.createElement("table");

    const setCols = Array.from(
      { length: maxSets },
      () => `<col class="col-set">`,
    ).join("");

    table.innerHTML = `
      <colgroup>
        <col class="col-exercise">
        <col class="col-sets">
        <col class="col-reps">
        <col class="col-weight">
        ${setCols}
        <col class="col-notes">
        <col class="col-increment">
      </colgroup>
    `;

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th>Exercise</th>
        <th>Sets</th>
        <th>Reps</th>
        <th>Weight</th>
        ${setHeaders}
        <th>Notes</th>
        <th>Increment</th>
      </tr>
    `;

    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    for (const exercise of day.exercises) {
      const tr = document.createElement("tr");
      const sets = Number(exercise.sets);

      const setCells = Array.from({ length: maxSets }, (_, i) =>
        i < sets ? `<td></td>` : `<td class="inactive"></td>`,
      ).join("");

      tr.innerHTML = `
        <td>${exercise.name}</td>
        <td class="center">${exercise.sets}</td>
        <td class="center">${exercise.reps ?? ""}</td>
        <td></td>
        ${setCells}
        <td></td>
        <td></td>
      `;

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);

    wrapper.appendChild(label);
    wrapper.appendChild(table);
    section.appendChild(wrapper);

    app.appendChild(section);
  }
}


async function renderProgramList(movementTargets, exerciseMapping) {
  const app = document.getElementById("app");

  const response = await fetch("data/programs.json");

  if (!response.ok) {
    throw new Error("Failed to load programs.json");
  }

  const programs = await response.json();

  app.innerHTML = `<h1>Programs</h1>`;

  for (const entry of programs) {
    const program = await loadProgram(entry.id);
    const stats = calculateStats(program, movementTargets, exerciseMapping);

    const section = document.createElement("section");

    const link = document.createElement("a");
    link.href = `?program=${entry.id}`;
    link.textContent = entry.name;
    link.className = "program-link";

    section.appendChild(link);

    const list = document.createElement("ul");
    list.className = "stats-list";

    for (const [movement, sets] of Object.entries(stats.summary)) {
      const li = document.createElement("li");
      const target = movementTargets[movement];
      let text = `${movement}: ${sets} sets`;

      if (target) {
        const good = sets >= target.low && sets <= target.high;
        text += ` (target: ${target.low}–${target.high}) ${good ? "✅" : "❌"}`;
      }

      li.textContent = text;
      list.appendChild(li);
    }

    section.appendChild(list);

    if (stats.missingExercises.length > 0) {
      const missing = document.createElement("p");
      missing.className = "missing";
      missing.textContent = `Missing mappings: ${stats.missingExercises.join(", ")}`;
      section.appendChild(missing);
    }

    app.appendChild(section);
  }
}

async function main() {
  try {
    const params = new URLSearchParams(window.location.search);

    const programName = params.get("program");

    const [movementTargets, exerciseMapping] = await Promise.all([
      loadMovementTargets(),
      loadExerciseMapping(),
    ]);

    if (!programName) {
      await renderProgramList(movementTargets, exerciseMapping);
      return;
    }

    const program = await loadProgram(programName);

    renderProgram(program);
  } catch (err) {
    console.error(err);

    const app = document.getElementById("app");

    app.innerHTML = `
      <pre style="color:red;">
${err.stack}
      </pre>
    `;
  }
}

main();
