import {defineConfig, devices} from '@playwright/test';

const configuredBaseUrl = process.env.E2E_BASE_URL;
const baseURL = configuredBaseUrl ?? 'http://localhost:3000';
const localFrontendCommand = process.platform === 'darwin' ? 'npm run start-dev-macos' : 'npm run start-dev';

export default defineConfig({
    testDir: './e2e',
    outputDir: 'test-results/e2e',
    fullyParallel: false,
    workers: 1,
    retries: 0,
    timeout: 90_000,
    expect: {
        timeout: 15_000,
    },
    reporter: [['list'], ['html', {open: 'never', outputFolder: 'playwright-report'}]],
    webServer: configuredBaseUrl
        ? undefined
        : {
              command: localFrontendCommand,
              url: baseURL,
              reuseExistingServer: true,
              timeout: 120_000,
          },
    use: {
        baseURL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'Google Chrome',
            use: {
                ...devices['Desktop Chrome'],
                channel: 'chrome',
            },
        },
    ],
});
