'use strict';

const vscode = require('vscode');
const { scanText } = require('./scanner');

const DIAGNOSTIC_SOURCE = 'ZeroSMTP';
const CODE_LINK = 'https://docs.msgwing.com/EXCHANGE-ONLINE-SMTP-AUTH.html';

// Kept broad on purpose: this is a grep, not a build system, so it should
// look wherever an SMTP host or a password could plausibly be written down.
const INCLUDE_EXTENSIONS =
  '**/*.{cs,vb,js,mjs,cjs,ts,py,rb,php,go,java,kt,ps1,psm1,psd1,json,xml,yml,yaml,ini,properties,conf,config}';
const INCLUDE_DOTENV = '**/.env*';
const EXCLUDE = '**/{node_modules,.git,dist,build,bin,obj,out,.vs,vendor}/**';

const MAX_FILES = 2000;
const MAX_FILE_BYTES = 1024 * 1024; // skip anything this large - it's a text scan, not a binary one

function severityToVsCode(severity) {
  return severity === 'warning'
    ? vscode.DiagnosticSeverity.Warning
    : vscode.DiagnosticSeverity.Information;
}

async function findCandidateFiles() {
  const [byExtension, dotenv] = await Promise.all([
    vscode.workspace.findFiles(INCLUDE_EXTENSIONS, EXCLUDE, MAX_FILES),
    vscode.workspace.findFiles(INCLUDE_DOTENV, EXCLUDE, MAX_FILES),
  ]);

  const seen = new Set();
  const files = [];
  for (const uri of [...byExtension, ...dotenv]) {
    if (!seen.has(uri.fsPath)) {
      seen.add(uri.fsPath);
      files.push(uri);
    }
  }
  return files;
}

async function scanWorkspace(diagnosticCollection, output) {
  diagnosticCollection.clear();

  const files = await findCandidateFiles();
  let filesWithFindings = 0;
  let totalFindings = 0;

  for (const uri of files) {
    let stat;
    try {
      stat = await vscode.workspace.fs.stat(uri);
    } catch {
      continue; // deleted between the search and the read - skip it
    }
    if (stat.size > MAX_FILE_BYTES) continue;

    let bytes;
    try {
      bytes = await vscode.workspace.fs.readFile(uri);
    } catch {
      continue;
    }

    const text = Buffer.from(bytes).toString('utf8');
    const findings = scanText(text);
    if (findings.length === 0) continue;

    filesWithFindings++;
    totalFindings += findings.length;

    const diagnostics = findings.map((finding) => {
      const range = new vscode.Range(
        finding.line,
        finding.column,
        finding.line,
        finding.column + finding.length
      );
      const diagnostic = new vscode.Diagnostic(range, finding.message, severityToVsCode(finding.severity));
      diagnostic.source = DIAGNOSTIC_SOURCE;
      diagnostic.code = {
        value: 'basic-auth-smtp-office365',
        target: vscode.Uri.parse(CODE_LINK),
      };
      return diagnostic;
    });

    diagnosticCollection.set(uri, diagnostics);
  }

  const message =
    totalFindings === 0
      ? 'ZeroSMTP: no Microsoft 365 SMTP host references found in this workspace.'
      : `ZeroSMTP: ${totalFindings} finding(s) in ${filesWithFindings} file(s). See the Problems panel.`;
  output.appendLine(message);
  vscode.window.setStatusBarMessage(message, 6000);
}

// `zerosmtp-check` is an ESM-only package (no `exports` map, so its
// `errors.js`/`index.js` are importable as subpaths). Dynamic `import()`
// from this CommonJS extension is what lets a CJS extension host load it -
// this is the "reuse the package instead of rewriting the logic" requirement.
async function explainSelection(output) {
  const editor = vscode.window.activeTextEditor;
  let text =
    editor && !editor.selection.isEmpty ? editor.document.getText(editor.selection) : undefined;

  if (!text) {
    text = await vscode.window.showInputBox({
      prompt: 'Paste the SMTP error text (from a log, a terminal, or a printer panel)',
      placeHolder: '535 5.7.139 Authentication unsuccessful, basic authentication is disabled',
    });
  }

  if (!text || !text.trim()) return;

  const { explain } = await import('zerosmtp-check/index.js');
  const answer = explain(text);

  output.clear();
  output.appendLine(answer);
  output.show(true);
}

function activate(context) {
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('zerosmtp');
  const output = vscode.window.createOutputChannel('ZeroSMTP');
  context.subscriptions.push(diagnosticCollection, output);

  context.subscriptions.push(
    vscode.commands.registerCommand('zerosmtp.scanWorkspace', () =>
      scanWorkspace(diagnosticCollection, output).catch((err) =>
        vscode.window.showErrorMessage(`ZeroSMTP scan failed: ${err.message}`)
      )
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('zerosmtp.explainError', () =>
      explainSelection(output).catch((err) =>
        vscode.window.showErrorMessage(`ZeroSMTP explain failed: ${err.message}`)
      )
    )
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
