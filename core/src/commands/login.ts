import { exec } from 'child_process';
import { createAuthSession, pollAuthSession } from '../lib/api-client';
import { saveConfig, loadConfig } from '../lib/config';
import { printError, printSuccess, printInfo } from '../lib/display';
import { POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from '../lib/constants';
import { printBanner, Spinner, AUTH_MESSAGES } from '../lib/ui';

function openUrl(url: string): Promise<void> {
  return new Promise((resolve) => {
    const cmd =
      process.platform === 'darwin' ? `open "${url}"` :
      process.platform === 'win32' ? `start "" "${url}"` :
      `xdg-open "${url}"`;
    exec(cmd, () => resolve());
  });
}

export async function loginCommand(): Promise<void> {
  printBanner();

  const spinner = new Spinner(AUTH_MESSAGES[0]);
  let session;
  try {
    spinner.start();
    session = await createAuthSession();
    spinner.stop('Session created');
  } catch (err) {
    spinner.stop();
    printError(`Failed to connect to API: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  if (session.error) {
    printError(session.error);
    process.exit(1);
  }

  console.log(`\nOpen this URL in your browser to authenticate:\n`);
  console.log(`  ${session.verification_url}\n`);

  try {
    await openUrl(session.verification_url);
    printInfo('Browser opened automatically.');
  } catch {
    printInfo('Could not open browser automatically. Please open the URL above manually.');
  }

  const pollSpinner = new Spinner(AUTH_MESSAGES[1]);
  pollSpinner.start();

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let msgIndex = 0;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    msgIndex = (msgIndex + 1) % AUTH_MESSAGES.length;
    pollSpinner.update(AUTH_MESSAGES[msgIndex]);

    try {
      const poll = await pollAuthSession(session.session_id, session.device_code);

      if (poll.status === 'complete' && poll.api_key) {
        const config = loadConfig();
        config.api_key = poll.api_key;
        saveConfig(config);

        pollSpinner.stop('Authenticated successfully!');
        console.log();
        printSuccess('Authenticated successfully!');
        if (poll.user) {
          printInfo(`  Email: ${poll.user.email}`);
          printInfo(`  Plan:  ${poll.user.plan}`);
        }
        printInfo('\nAPI key saved to ~/.caterpillar/config');
        printInfo('You can now run: caterpillar scan <path>');
        return;
      }

      if (poll.status === 'expired') {
        pollSpinner.stop();
        printError('Session expired. Run "caterpillar login" again.');
        process.exit(1);
      }

      if (poll.status === 'consumed') {
        pollSpinner.stop();
        printError('API key was already retrieved. Run "caterpillar login" again.');
        process.exit(1);
      }

      if (poll.status === 'error') {
        pollSpinner.stop();
        printError(poll.error || 'Authentication failed.');
        process.exit(1);
      }

      // status === 'pending', keep polling
    } catch {
      // Network error, keep retrying until deadline
    }
  }

  pollSpinner.stop();
  printError('Authentication timed out. Run "caterpillar login" again.');
  process.exit(1);
}
