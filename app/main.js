import { loadMovementTargets, loadExerciseMapping, loadProgram } from "./data.js";
import { renderProgram } from "./program.js";
import { renderIndex } from "./index.js";

async function main() {
  try {
    const params = new URLSearchParams(window.location.search);
    const programName = params.get("program");

    const [movementTargets, exerciseMapping] = await Promise.all([
      loadMovementTargets(),
      loadExerciseMapping(),
    ]);

    if (!programName) {
      await renderIndex(movementTargets, exerciseMapping);
      return;
    }

    const program = await loadProgram(programName);
    renderProgram(program);
  } catch (err) {
    console.error(err);
    document.getElementById("app").innerHTML = `<pre style="color:red;">${err.stack}</pre>`;
  }
}

main();
