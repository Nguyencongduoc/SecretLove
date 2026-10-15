import { previewProblem } from './preview-settings.mjs';
const problem = previewProblem(process.env);
if (problem) {
  console.error(
    `Deployment preparation check: ${problem}. Values withheld; see docs/DEPLOYMENT.md.`,
  );
  process.exitCode = 1;
} else
  console.log(
    'Deployment environment format check passed. Owner-only platform protection, SMTP and HTTPS acceptance still require operator verification.',
  );
