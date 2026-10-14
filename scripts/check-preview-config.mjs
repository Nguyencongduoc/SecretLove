import { previewProblem } from './preview-settings.mjs';
const problem = previewProblem(process.env);
if (problem) {
  console.error(`Preview preparation check: ${problem}. Values withheld; see docs/DEPLOYMENT.md.`);
  process.exitCode = 1;
} else
  console.log(
    'Preview environment format check passed. Protection, isolated-project choice, SMTP and remote acceptance still require operator verification.',
  );
