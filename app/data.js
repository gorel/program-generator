const MOVEMENTS_FILE = "data/movements.csv";
const EXERCISES_FILE = "data/exercises.csv";
const PROGRAMS_DIR = "data/programs";
const PROGRAMS_INDEX = "data/programs.json";

export async function fetchText(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to fetch ${path}`);
  return response.text();
}

export async function loadMovementTargets() {
  const csvText = await fetchText(MOVEMENTS_FILE);
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const movements = {};
  for (const row of parsed.data) {
    movements[row.movement] = { low: Number(row.low), high: Number(row.high) };
  }
  return movements;
}

export async function loadExerciseMapping() {
  const csvText = await fetchText(EXERCISES_FILE);
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const exercises = {};
  for (const row of parsed.data) {
    exercises[row.exercise] = row.movement;
  }
  return exercises;
}

export async function loadProgram(id) {
  const filename = id.endsWith(".yaml") || id.endsWith(".yml") ? id : `${id}.yaml`;
  const yamlText = await fetchText(`${PROGRAMS_DIR}/${filename}`);
  return jsyaml.load(yamlText);
}

export async function loadProgramList() {
  const response = await fetch(PROGRAMS_INDEX);
  if (!response.ok) throw new Error("Failed to load programs.json");
  return response.json();
}
