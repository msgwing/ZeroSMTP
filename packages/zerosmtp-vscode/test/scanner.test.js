'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { scanText } = require('../scanner');

test('flags appsettings.json-style Basic Auth config as warning', () => {
  const text = [
    '{',
    '  "Smtp": {',
    '    "Host": "smtp.office365.com",',
    '    "Port": 587,',
    '    "Username": "printer@contoso.com",',
    '    "Password": "hunter2"',
    '  }',
    '}',
  ].join('\n');

  const findings = scanText(text);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'warning');
  assert.match(findings[0].message, /December 2026/);
  assert.equal(findings[0].line, 2); // the line with "Host"
});

test('flags a web.config-style single-line network element', () => {
  const text =
    '<network host="smtp.office365.com" port="587" userName="user@contoso.com" password="hunter2" />';

  const findings = scanText(text);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'warning');
  assert.equal(findings[0].line, 0);
});

test('flags a .env-style pair of lines', () => {
  const text = ['SMTP_HOST=smtp.office365.com', 'SMTP_PASS=hunter2'].join('\n');

  const findings = scanText(text);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'warning');
});

test('does not warn when only OAuth2 settings are nearby, no password field', () => {
  const text = [
    'SMTP_HOST=smtp.office365.com',
    'TENANT_ID=11111111-1111-1111-1111-111111111111',
    'CLIENT_SECRET=abc123',
  ].join('\n');

  const findings = scanText(text);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'information');
  assert.doesNotMatch(findings[0].message, /Looks like Basic Auth/);
});

test('downgrades to information when both a password and OAuth hints are present', () => {
  const text = [
    'host: smtp.office365.com',
    'password: hunter2',
    'clientSecret: abc123',
  ].join('\n');

  const findings = scanText(text);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'information');
  assert.match(findings[0].message, /Confirm which one is actually used/);
});

test('ignores a credential hint far outside the context window', () => {
  const lines = ['smtp.office365.com'];
  for (let i = 0; i < 30; i++) lines.push(`line ${i}`);
  lines.push('password: hunter2');

  const findings = scanText(lines.join('\n'));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'information');
});

test('ignores hosts that are not Microsoft 365', () => {
  const text = 'SMTP_HOST=smtp.gmail.com\nSMTP_PASS=hunter2';
  assert.equal(scanText(text).length, 0);
});

test('matches the Microsoft 365 host case-insensitively', () => {
  const text = 'Host=SMTP.Office365.Com\nPassword=hunter2';
  const findings = scanText(text);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'warning');
});

test('reports a finding per occurrence, with correct line and column', () => {
  const text = [
    'first: smtp.office365.com',
    'password: hunter2',
    '',
    'second: outlook.office365.com',
  ].join('\n');

  const findings = scanText(text);
  assert.equal(findings.length, 2);
  assert.equal(findings[0].line, 0);
  assert.equal(findings[0].column, text.split('\n')[0].indexOf('smtp.office365.com'));
  assert.equal(findings[1].line, 3);
});
