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

    const heading = document.createElement("h2");
    heading.textContent = day.name;

    section.appendChild(heading);

    const table = document.createElement("table");

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th>Exercise</th>
        <th>Sets</th>
        <th>Reps</th>
      </tr>
    `;

    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    for (const exercise of day.exercises) {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${exercise.name}</td>
        <td>${exercise.sets}</td>
        <td>${exercise.reps ?? ""}</td>
      `;

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);

    section.appendChild(table);

    app.appendChild(section);
  }
}

function renderStats(program, stats, movementTargets) {
  const app = document.getElementById("app");

  const statsSection = document.createElement("section");
  statsSection.className = "stats";

  const heading = document.createElement("h2");
  heading.textContent = "Movement Summary";

  statsSection.appendChild(heading);

  const list = document.createElement("ul");

  for (const [movement, sets] of Object.entries(stats.summary)) {
    const li = document.createElement("li");

    const target = movementTargets[movement];

    let text = `${movement}: ${sets} sets`;

    if (target) {
      const good = sets >= target.low && sets <= target.high;

      text += ` (target: ${target.low}-${target.high})`;

      text += good ? " ✅" : " ❌";
    }

    li.textContent = text;

    list.appendChild(li);
  }

  statsSection.appendChild(list);

  if (stats.missingExercises.length > 0) {
    const missingHeading = document.createElement("h3");
    missingHeading.textContent = "Missing Exercises";

    statsSection.appendChild(missingHeading);

    const missingList = document.createElement("ul");

    for (const exercise of stats.missingExercises) {
      const li = document.createElement("li");
      li.textContent = exercise;

      missingList.appendChild(li);
    }

    statsSection.appendChild(missingList);
  }

  app.appendChild(statsSection);
}

async function renderProgramList() {
  const app = document.getElementById("app");

  const response = await fetch("data/programs.json");

  if (!response.ok) {
    throw new Error("Failed to load programs.json");
  }

  const programs = await response.json();

  app.innerHTML = `
    <h1>Programs</h1>

    <ul class="program-list">
      ${programs
        .map(
          (program) => `
            <li>
              <a href="?program=${program.id}">
                ${program.name}
              </a>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;
}

async function main() {
  try {
    const params = new URLSearchParams(window.location.search);

    // Example:
    // index.html?program=hypertrophy
    const programName = params.get("program");

    if (!programName) {
      await renderProgramList();
      return;
    }

    const [movementTargets, exerciseMapping, program] = await Promise.all([
      loadMovementTargets(),
      loadExerciseMapping(),
      loadProgram(programName),
    ]);

    renderProgram(program);

    const stats = calculateStats(program, movementTargets, exerciseMapping);

    renderStats(program, stats, movementTargets);
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
