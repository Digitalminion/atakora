# backend

Infrastructure package for backend.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Define your infrastructure in `src/index.ts`

3. Synthesize ARM templates:
   ```bash
   npm run synth
   ```

## Project Structure

- `src/` - Source code and application definition
- `dist/` - Compiled TypeScript output

## Available Scripts

- `npm run build` - Compile TypeScript
- `npm run synth` - Synthesize ARM templates
- `npm run clean` - Remove build artifacts
