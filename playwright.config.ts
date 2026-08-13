import {defineConfig, devices} from '@playwright/test';
import path from 'node:path';

const configuredBaseUrl = process.env.E2E_BASE_URL;
const baseURL = configuredBaseUrl ?? 'http://localhost:3000';
const localFrontendCommand = process.platform === 'darwin' ? 'npm run start-dev-macos' : 'npm run start-dev';
const authStatePath = path.resolve('test-results/e2e/.auth/user.json');

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
            name: 'przygotowanie danych',
            testMatch: /bootstrap\.setup\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                channel: 'chrome',
            },
        },
        {
            name: 'Google Chrome',
            testIgnore: [/bootstrap\.setup\.ts/, /billing-periods\.spec\.ts/, /cubes\.spec\.ts/],
            dependencies: ['przygotowanie danych'],
            use: {
                ...devices['Desktop Chrome'],
                channel: 'chrome',
                storageState: authStatePath,
            },
        },
        {
            name: 'Google Chrome kostki',
            testMatch: /cubes\.spec\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                channel: 'chrome',
            },
        },
        {
            name: 'okresy rozliczeniowe na końcu',
            testMatch: /billing-periods\.spec\.ts/,
            dependencies: ['Google Chrome'],
            use: {
                ...devices['Desktop Chrome'],
                channel: 'chrome',
                storageState: authStatePath,
            },
        },
    ],
});
