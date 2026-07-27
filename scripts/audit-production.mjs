import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const severityOrder = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

const acceptedClientAdvisories = new Set([
  'GHSA-qwww-vcr4-c8h2',
]);

const acceptedReactRouterVersion = '7.18.1';
const exceptionReviewBy = new Date('2026-08-31T23:59:59Z');

function resolveNpmInvocation() {
  const npmExecPath = process.env.npm_execpath;

  if (npmExecPath && existsSync(npmExecPath)) {
    return {
      command: process.execPath,
      prefixArguments: [npmExecPath],
      description: `${process.execPath} ${npmExecPath}`,
    };
  }

  const bundledNpmCli = join(
    dirname(process.execPath),
    'node_modules',
    'npm',
    'bin',
    'npm-cli.js',
  );

  if (existsSync(bundledNpmCli)) {
    return {
      command: process.execPath,
      prefixArguments: [bundledNpmCli],
      description: `${process.execPath} ${bundledNpmCli}`,
    };
  }

  return {
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    prefixArguments: [],
    description: process.platform === 'win32' ? 'npm.cmd' : 'npm',
  };
}

function parseAuditJson(output, directory, channel) {
  const trimmed = output.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const jsonCandidate = trimmed.slice(firstBrace, lastBrace + 1);

      try {
        return JSON.parse(jsonCandidate);
      } catch {
        // The detailed error below includes the original output.
      }
    }

    throw new Error(
      `Unable to parse npm audit JSON from ${channel} for ${directory}.\n${trimmed}`,
    );
  }
}

function runAudit(directory) {
  const invocation = resolveNpmInvocation();
  const result = spawnSync(
    invocation.command,
    [...invocation.prefixArguments, 'audit', '--omit=dev', '--json'],
    {
      cwd: directory,
      encoding: 'utf8',
      shell: false,
      windowsHide: true,
      env: {
        ...process.env,
        NO_COLOR: '1',
        npm_config_color: 'false',
      },
    },
  );

  if (result.error) {
    throw new Error(
      [
        `Unable to start npm audit for ${directory}.`,
        `Invocation: ${invocation.description}`,
        `Reason: ${result.error.message}`,
      ].join('\n'),
    );
  }

  const stdout = String(result.stdout || '');
  const stderr = String(result.stderr || '');

  const stdoutReport = parseAuditJson(stdout, directory, 'stdout');

  if (stdoutReport) {
    return stdoutReport;
  }

  const stderrReport = parseAuditJson(stderr, directory, 'stderr');

  if (stderrReport) {
    return stderrReport;
  }

  throw new Error(
    [
      `npm audit returned no JSON output for ${directory}.`,
      `Invocation: ${invocation.description}`,
      `Exit status: ${result.status ?? 'unknown'}`,
      stderr ? `stderr: ${stderr.trim()}` : '',
    ].filter(Boolean).join('\n'),
  );
}

function walkFiles(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  const files = [];

  for (const entry of readdirSync(directory)) {
    const absolutePath = join(directory, entry);
    const stat = statSync(absolutePath);

    if (stat.isDirectory()) {
      files.push(...walkFiles(absolutePath));
      continue;
    }

    if (/\.(?:js|jsx|mjs|cjs|ts|tsx)$/i.test(entry)) {
      files.push(absolutePath);
    }
  }

  return files;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function extractAdvisoryIds(vulnerability) {
  const ids = new Set();

  for (const via of vulnerability?.via || []) {
    if (typeof via !== 'object' || via === null) {
      continue;
    }

    const haystack = `${via.url || ''} ${via.title || ''}`;
    const matches = haystack.match(/GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}/gi) || [];

    for (const match of matches) {
      ids.add(match.toUpperCase());
    }
  }

  return [...ids];
}

function verifyDeclarativeBrowserRouterMode() {
  const clientDirectory = join(root, 'client');
  const sourceDirectory = join(clientDirectory, 'src');
  const mainPath = join(sourceDirectory, 'main.jsx');

  if (!existsSync(mainPath)) {
    return {
      valid: false,
      reason: 'client/src/main.jsx was not found.',
    };
  }

  const mainSource = readFileSync(mainPath, 'utf8');

  if (!/\bBrowserRouter\b/.test(mainSource)) {
    return {
      valid: false,
      reason: 'BrowserRouter is not configured in client/src/main.jsx.',
    };
  }

  const forbiddenPatterns = [
    { pattern: /react-router\/rsc/i, label: 'react-router/rsc' },
    { pattern: /\bRSCRouter\b/i, label: 'RSCRouter' },
    { pattern: /\bRSCStaticRouter\b/i, label: 'RSCStaticRouter' },
    { pattern: /\bServerRouter\b/i, label: 'ServerRouter' },
    { pattern: /\bHydratedRouter\b/i, label: 'HydratedRouter' },
    { pattern: /\bunstable_[A-Za-z0-9_]*RSC[A-Za-z0-9_]*\b/i, label: 'unstable RSC API' },
  ];

  for (const file of walkFiles(sourceDirectory)) {
    const content = readFileSync(file, 'utf8');

    for (const item of forbiddenPatterns) {
      if (item.pattern.test(content)) {
        return {
          valid: false,
          reason: `${item.label} was detected in ${relative(root, file)}.`,
        };
      }
    }
  }

  return {
    valid: true,
    reason: 'The client uses BrowserRouter and no unstable RSC API was detected.',
  };
}

function resolveInstalledReactRouterVersions() {
  const packagePath = join(root, 'client', 'package.json');
  const lockPath = join(root, 'client', 'package-lock.json');

  const packageJson = readJson(packagePath);
  const declared = packageJson.dependencies?.['react-router-dom'] || '';

  let installedDom = '';
  let installedCore = '';

  if (existsSync(lockPath)) {
    const lock = readJson(lockPath);
    installedDom = lock.packages?.['node_modules/react-router-dom']?.version || '';
    installedCore = lock.packages?.['node_modules/react-router']?.version || '';
  }

  return {
    declared,
    installedDom,
    installedCore,
  };
}

function isOnlyAcceptedReactRouterAdvisory(vulnerability) {
  const ids = extractAdvisoryIds(vulnerability);

  return (
    ids.length > 0
    && ids.every((id) => acceptedClientAdvisories.has(id))
  );
}

function isAllowedClientVulnerability(name, vulnerability, context) {
  if (!context.mode.valid || !context.versionValid || new Date() > exceptionReviewBy) {
    return false;
  }

  if (name === 'react-router') {
    return isOnlyAcceptedReactRouterAdvisory(vulnerability);
  }

  if (name === 'react-router-dom') {
    const objectVia = (vulnerability.via || []).filter(
      (via) => typeof via === 'object' && via !== null,
    );
    const stringVia = (vulnerability.via || []).filter(
      (via) => typeof via === 'string',
    );

    const directIdsAccepted = (
      objectVia.length === 0
      || isOnlyAcceptedReactRouterAdvisory({ via: objectVia })
    );

    const dependencyChainAccepted = (
      stringVia.length === 0
      || stringVia.every((dependency) => dependency === 'react-router')
    );

    return directIdsAccepted && dependencyChainAccepted;
  }

  return false;
}

function evaluateAudit(label, directory, report, clientContext) {
  if (report.error) {
    return {
      label,
      failures: [
        `${report.error.code || 'AUDIT_ERROR'}: ${report.error.summary || report.error.message || 'npm audit failed.'}`,
      ],
      accepted: [],
      notices: [],
    };
  }

  const vulnerabilities = report.vulnerabilities || {};
  const failures = [];
  const accepted = [];
  const notices = [];

  for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
    const severity = vulnerability.severity || 'unknown';
    const rank = severityOrder[severity] ?? 99;
    const advisoryIds = extractAdvisoryIds(vulnerability);
    const advisoryText = advisoryIds.length ? ` (${advisoryIds.join(', ')})` : '';

    if (
      label === 'client'
      && rank >= severityOrder.high
      && isAllowedClientVulnerability(name, vulnerability, clientContext)
    ) {
      accepted.push(
        `${name}: ${severity}${advisoryText} — accepted only because iRAP uses BrowserRouter Declarative Mode and no unstable RSC API is present.`,
      );
      continue;
    }

    if (rank >= severityOrder.high) {
      failures.push(`${name}: ${severity}${advisoryText}`);
    } else {
      notices.push(`${name}: ${severity}${advisoryText}`);
    }
  }

  return {
    label,
    failures,
    accepted,
    notices,
  };
}

const mode = verifyDeclarativeBrowserRouterMode();
const versions = resolveInstalledReactRouterVersions();
const versionValid = (
  versions.declared === acceptedReactRouterVersion
  && versions.installedDom === acceptedReactRouterVersion
  && versions.installedCore === acceptedReactRouterVersion
);

const clientContext = {
  mode,
  versionValid,
};

console.log('iRAP production dependency audit');
console.log(`- React Router mode: ${mode.reason}`);
console.log(
  `- React Router versions: declared=${versions.declared || 'missing'}, react-router-dom=${versions.installedDom || 'missing'}, react-router=${versions.installedCore || 'missing'}`,
);
console.log(`- Temporary advisory exception review date: ${exceptionReviewBy.toISOString().slice(0, 10)}`);

const targets = [
  { label: 'root', directory: root },
  { label: 'client', directory: join(root, 'client') },
  { label: 'server', directory: join(root, 'server') },
];

const results = [];

for (const target of targets) {
  const report = runAudit(target.directory);
  results.push(
    evaluateAudit(
      target.label,
      target.directory,
      report,
      clientContext,
    ),
  );
}

let failed = false;

for (const result of results) {
  console.log(`\n[${result.label}]`);

  if (
    result.failures.length === 0
    && result.accepted.length === 0
    && result.notices.length === 0
  ) {
    console.log('No production vulnerabilities reported.');
  }

  for (const notice of result.notices) {
    console.warn(`NOTICE: ${notice}`);
  }

  for (const accepted of result.accepted) {
    console.warn(`ACCEPTED TEMPORARILY: ${accepted}`);
  }

  for (const failure of result.failures) {
    console.error(`BLOCKING: ${failure}`);
    failed = true;
  }
}

if (!mode.valid) {
  console.error(`\nBLOCKING: The React Router advisory exception is invalid: ${mode.reason}`);
  failed = true;
}

if (!versionValid) {
  console.error(
    `\nBLOCKING: The advisory exception requires react-router-dom and react-router ${acceptedReactRouterVersion} exactly.`,
  );
  failed = true;
}

if (new Date() > exceptionReviewBy) {
  console.error(
    `\nBLOCKING: The temporary React Router advisory exception expired on ${exceptionReviewBy.toISOString().slice(0, 10)}.`,
  );
  failed = true;
}

if (failed) {
  console.error('\nProduction dependency audit failed.');
  process.exit(1);
}

console.log('\nProduction dependency audit passed with the documented, mode-specific React Router exception.');
