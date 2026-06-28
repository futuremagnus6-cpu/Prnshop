// Mock uuid module to avoid ESM/CJS compatibility issues with Jest
jest.mock('uuid', () => {
  let counter = 0;
  return {
    v4: () => {
      counter++;
      // Ensure each call generates a different first 8 chars by using the counter
      // as the first characters, then padding with zeros
      const hex = counter.toString(16);
      const padded = hex.padEnd(12, '0');
      const part1 = padded.slice(0, 8);
      const part2 = padded.slice(8, 12);
      return `${part1}-${part2}-4000-8000-${String(counter).padStart(12, '0')}`;
    },
  };
});
