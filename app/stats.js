export function calculateStats(program, movementTargets, exerciseMapping) {
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

  return { summary, missingExercises };
}
