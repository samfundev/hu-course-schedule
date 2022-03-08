// https://stackoverflow.com/a/5650012
export function remap(value, low1, high1, low2, high2) {
  return low2 + ((high2 - low2) * (value - low1)) / (high1 - low1);
}

// Given some numbers, this generator will give every permutation of those numbers.
// Where each number supplied can be between 0 and one less than itself.
export function* permutations(...totals: number[]) {
  const max = totals.reduce((a, b) => a * b, 1);
  for (let i = 0; i < max; i++) {
    let divider = 1;
    yield totals.map((total) => {
      const result = Math.floor(i / divider) % total;
      divider *= total;
      return result;
    });
  }
}
