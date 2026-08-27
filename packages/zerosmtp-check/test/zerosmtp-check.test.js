import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { explain, explainJson } from '../index.js';
import { ERRORS, DEVICE_CODES } from '../errors.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLI_PATH = join(__dirname, '..', 'index.js');

describe('zerosmtp-check', () => {
  describe('ERROR pattern matching', () => {
    for (const error of ERRORS) {
      test(`matches ${error.code} - ${error.slug}`, () => {
        // Construct contextual input:
        // When multiple errors share the same enhanced code (e.g. 535 5.7.139),
        // narrowByScope uses 'tenant' or 'mailbox' keywords in lowercased text.
        let input = `${error.code} ${error.message}`;
        if (error.scope.toLowerCase() === 'tenant') {
          input += ' for the tenant';
        } else if (error.scope.toLowerCase() === 'mailbox') {
          input += ' for the mailbox';
        }

        const result = explain(input);

        // Verify the explanation matched this specific error
        assert.ok(
          !result.startsWith('No match for that one.'),
          `Expected match for ${error.code} (${error.slug}), got "No match"`
        );
        assert.ok(
          result.includes(error.slug),
          `Expected explanation for ${error.code} to include slug "${error.slug}"`
        );
        assert.ok(
          result.includes(error.code),
          `Expected explanation for ${error.code} to include code "${error.code}"`
        );
      });
    }
  });

  describe('Device panel code matching', () => {
    for (const [code, info] of Object.entries(DEVICE_CODES)) {
      test(`matches exact panel code ${code}`, () => {
        const text = `Printer error ${code} occurred`;
        const result = explain(text);
        assert.ok(!result.startsWith('No match for that one.'));
        assert.ok(result.includes(`${code} - ${info.vendor} device code`));
        assert.ok(result.includes(info.note));
      });

      test(`matches 0x-prefixed panel code 0x${code}`, () => {
        const text = `Device reported error 0x${code} on panel`;
        const result = explain(text);
        assert.ok(!result.startsWith('No match for that one.'));
        assert.ok(result.includes(`${code} - ${info.vendor} device code`));
      });

      test(`rejects numbers with similar digits (boundary test for ${code})`, () => {
        // Test word boundary rejection to protect against regex regressions (like \b as backspace)
        const nonMatching = [
          `Error ${code}0 on panel`,
          `Error 0${code} on panel`,
          `Error 9${code} on panel`,
          `Error ${code}9 on panel`,
          `Error ${code}a on panel`,
        ];

        for (const input of nonMatching) {
          const result = explain(input);
          assert.ok(
            result.startsWith('No match for that one.'),
            `Expected "${input}" to not match panel code ${code}`
          );
        }
      });
    }
  });

  describe('Unknown / edge cases', () => {
    test('handles completely unknown error text without throwing', () => {
      const result = explain('some completely unknown error text not in corpus 12345');
      assert.ok(result.startsWith('No match for that one.'));
      // Porownanie CALEJ linii, nie fragmentu. Poprzednia wersja sprawdzala
      // adres bez `?template=error-string.yml`, wiec przeszlaby, gdyby ten
      // parametr zniknal - a on kieruje zglaszajacego do wlasciwego
      // formularza. Przy okazji znika ksztalt `X.includes('https://...')`,
      // ktory CodeQL czyta jako niepelna sanityzacje adresu.
      const linie = result.split('\n').map((l) => l.trim());
      assert.ok(linie.includes(
        'https://github.com/msgwing/ZeroSMTP/issues/new?template=error-string.yml',
      ));
    });

    test('handles empty input without throwing', () => {
      const result = explain('');
      assert.ok(result.startsWith('Nothing to explain.'));
    });

    test('explainJson structured return for unknown text', () => {
      const result = explainJson('some unknown error string');
      assert.equal(result.matched, false);
      assert.equal(result.matches.length, 0);
    });
  });

  describe('CLI integration', () => {
    test('--explain on known error exits with code 0', async () => {
      const { stdout } = await execFileAsync(
        process.execPath,
        [CLI_PATH, '--explain', '535 5.7.139 Authentication unsuccessful, SmtpClientAuthentication is disabled for the Tenant']
      );
      assert.ok(stdout.includes('5.7.139'));
      assert.ok(stdout.includes('tenant'));
    });

    test('--explain on unknown error exits with code 1', async () => {
      await assert.rejects(
        execFileAsync(process.execPath, [CLI_PATH, '--explain', 'completely unknown error not in database']),
        (err) => {
          assert.equal(err.code, 1);
          assert.ok(err.stdout.includes('No match for that one.'));
          return true;
        }
      );
    });
  });
});
