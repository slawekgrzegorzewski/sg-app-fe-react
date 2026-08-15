/* eslint-disable testing-library/prefer-screen-queries, jest/valid-expect, jest/no-conditional-expect -- Playwright assertions inside controlled E2E branches are intentional. */
import {expect, type Page, test} from '@playwright/test';
import {login, performGraphQlOperation, waitForGraphQlData} from './support/data-interactions';

type CubeResultsData = {
    cubeResults: {
        todayStats: {min?: number | null; numberOfTries: number};
        todayResults: Array<{timeInMillis: number; date: string}>;
    };
};

type CubeDayStats = {
    day: string;
    min?: number | null;
    max?: number | null;
    minAo5?: number | null;
    minAo30?: number | null;
    numberOfTries: number;
};

type CubeStatsData = {
    cubeResults: {
        topTenAllTime: Array<{timeInMillis: number; date: string}>;
        stats: CubeDayStats[];
    };
};

function formatCubeTime(timeInMillis?: number | null): string {
    if (timeInMillis === null || timeInMillis === undefined) {
        return '—';
    }

    const minutes = Math.floor(timeInMillis / 60_000);
    const seconds = Math.floor(timeInMillis / 1_000) % 60;
    const milliseconds = timeInMillis % 1_000;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds
        .toString()
        .padStart(3, '0')}`;
}

function summarizeCubeStats(stats: CubeDayStats[]) {
    const availableMinimum = (values: Array<number | null | undefined>): number | null => {
        const availableValues = values.filter((value): value is number => value !== null && value !== undefined);
        return availableValues.length > 0 ? Math.min(...availableValues) : null;
    };

    return {
        numberOfTries: stats.reduce((total, day) => total + day.numberOfTries, 0),
        activeDays: stats.filter(day => day.numberOfTries > 0).length,
        bestTime: availableMinimum(stats.map(day => day.min)),
        bestAo5: availableMinimum(stats.map(day => day.minAo5)),
    };
}

function averageCubeTime(results: Array<{timeInMillis: number}>): number | null {
    return results.length === 0
        ? null
        : Math.round(results.reduce((total, result) => total + result.timeInMillis, 0) / results.length);
}

async function recordCubeSolve(
    page: Page,
    timeInMillis: number,
    expectedNumberOfSolves: number
): Promise<CubeResultsData> {
    await page.keyboard.down('Space');
    await expect(page.getByText('INSPECTION_EARLY', {exact: true})).toBeVisible();
    await page.keyboard.up('Space');
    await expect(page.getByText('SOLVING', {exact: true})).toBeVisible();
    await page.clock.fastForward(timeInMillis);
    await page.keyboard.down('Space');
    await expect(page.getByText('IDLE', {exact: true})).toBeVisible();
    await page.keyboard.up('Space');
    await expect(page.getByRole('timer', {name: formatCubeTime(timeInMillis)})).toBeVisible();

    const updatedResultsPromise = waitForGraphQlData<CubeResultsData>(page, 'GetCubeResults');
    await performGraphQlOperation(page, 'StoreCubeResult', () => page.keyboard.press('Enter'));
    const updatedResults = await updatedResultsPromise;
    await expect(page.getByRole('group', {name: 'Średnia'}).getByRole('heading')).toHaveText(
        `${formatCubeTime(averageCubeTime(updatedResults.cubeResults.todayResults))} z ${expectedNumberOfSolves} ułożeń`
    );
    return updatedResults;
}

test.describe('kostki i statystyki kostek', () => {
    test('uruchamia i zatrzymuje stoper kostki oraz zapisuje wynik', async ({page}) => {
        const domainPublicId = await login(page);
        await page.clock.install({time: new Date()});

        const initialResultsPromise = waitForGraphQlData<CubeResultsData>(page, 'GetCubeResults');
        await page.goto(`/CUBES/${domainPublicId}`);
        await expect(page.getByRole('heading', {name: 'Układanie kostek'})).toBeVisible();
        const initialResults = await initialResultsPromise;
        const averageGroup = page.getByRole('group', {name: 'Średnia'});
        const averageHeading = averageGroup.getByRole('heading');
        const statsLayout = averageGroup.locator('xpath=../../..');
        await expect(statsLayout).toHaveCSS('grid-template-columns', /\S+\s+\S+/);
        await expect(averageGroup.locator('xpath=..').getByRole('group')).toHaveCount(2);
        await expect(averageGroup.locator('xpath=..').getByRole('group').nth(0)).toHaveAttribute(
            'aria-label',
            'Średnia'
        );
        await expect(averageGroup.locator('xpath=..').getByRole('group').nth(1)).toHaveAttribute(
            'aria-label',
            'Najlepszy wynik'
        );
        const initialNumberOfSolves = initialResults.cubeResults.todayStats.numberOfTries;
        const initialTodayAverageInMillis = averageCubeTime(initialResults.cubeResults.todayResults);
        const expectedInitialAverage = `${formatCubeTime(initialTodayAverageInMillis)} z ${initialNumberOfSolves} ułożeń`;
        await expect(page.getByRole('group', {name: 'Najlepszy wynik'}).getByRole('heading')).toHaveText(
            formatCubeTime(initialResults.cubeResults.todayStats.min)
        );
        await expect(averageHeading).toHaveText(expectedInitialAverage);

        const initialStatsPromise = waitForGraphQlData<CubeStatsData>(page, 'GetCubeStats');
        await page.goto(`/CUBES/${domainPublicId}/stats`);
        await expect(page.getByRole('heading', {name: 'Statystyki kostek'})).toBeVisible();
        const initialStats = await initialStatsPromise;
        const solveDay = await page.evaluate(() => {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        });
        const initialTodayStats = initialStats.cubeResults.stats.find(day => day.day === solveDay);
        const initialMonthlySummary = summarizeCubeStats(initialStats.cubeResults.stats);
        const initialBestTime =
            initialStats.cubeResults.topTenAllTime.length > 0
                ? Math.min(...initialStats.cubeResults.topTenAllTime.map(result => result.timeInMillis))
                : null;
        expect(initialBestTime, 'Nie można pobić rekordu równego 1 ms').not.toBe(1);

        const recordTime = initialBestTime === null ? 100 : initialBestTime - 1;
        const slowerTimeBase = Math.max(initialBestTime ?? 1_000, 1_000);
        const solveTimes = [...Array.from({length: 24}, (_, index) => slowerTimeBase + 400 + index * 10), recordTime];

        const resultsBeforeSolvesPromise = waitForGraphQlData<CubeResultsData>(page, 'GetCubeResults');
        await page.goto(`/CUBES/${domainPublicId}`);
        await expect(page.getByRole('heading', {name: 'Układanie kostek'})).toBeVisible();
        await resultsBeforeSolvesPromise;
        await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1_000);

        let finalResults = initialResults;
        for (const [index, solveTime] of solveTimes.entries()) {
            finalResults = await recordCubeSolve(page, solveTime, initialNumberOfSolves + index + 1);
            expect(finalResults.cubeResults.todayStats.numberOfTries).toBe(initialNumberOfSolves + index + 1);
        }

        const initialTodayNumberOfSolves = initialTodayStats?.numberOfTries ?? 0;
        const expectedTodayAverage =
            ((initialTodayAverageInMillis ?? 0) * initialTodayNumberOfSolves +
                solveTimes.reduce((sum, time) => sum + time, 0)) /
            (initialTodayNumberOfSolves + solveTimes.length);
        const finalTodayAverageInMillis = averageCubeTime(finalResults.cubeResults.todayResults);
        expect(
            Math.abs((finalTodayAverageInMillis ?? 0) - expectedTodayAverage),
            'Dzisiejsza średnia powinna uwzględniać 25 nowych wyników'
        ).toBeLessThanOrEqual(1);
        await expect(averageGroup.getByRole('heading')).toHaveText(
            `${formatCubeTime(finalTodayAverageInMillis)} z ${finalResults.cubeResults.todayStats.numberOfTries} ułożeń`
        );
        const recentResultsTable = page.getByRole('table', {name: 'Ostatnie wyniki kostki'});
        await expect(recentResultsTable).toBeVisible();
        await expect(recentResultsTable.getByText(formatCubeTime(solveTimes.at(-1)!))).toBeVisible();
        const displayedRecentResultsCount = finalResults.cubeResults.todayResults.length;
        await expect(recentResultsTable.getByRole('row')).toHaveCount(Math.min(displayedRecentResultsCount, 5) + 1);
        for (let pageIndex = 0; pageIndex < Math.ceil(displayedRecentResultsCount / 5); pageIndex++) {
            const from = pageIndex * 5 + 1;
            const to = Math.min((pageIndex + 1) * 5, displayedRecentResultsCount);
            await expect(page.getByText(`${from}–${to} z ${displayedRecentResultsCount}`)).toBeVisible();
            if (to < displayedRecentResultsCount) {
                const nextPageButton = page.getByRole('button', {name: 'Następna strona'});
                await expect(nextPageButton).toBeEnabled();
                await nextPageButton.dispatchEvent('click');
            }
        }

        await page.setViewportSize({width: 390, height: 844});
        await expect(recentResultsTable.getByRole('row')).toHaveCount(Math.min(displayedRecentResultsCount, 3) + 1);
        await expect(
            page.getByText(`1–${Math.min(displayedRecentResultsCount, 3)} z ${displayedRecentResultsCount}`)
        ).toBeVisible();

        await page.setViewportSize({width: 1280, height: 720});
        await expect(recentResultsTable.getByRole('row')).toHaveCount(Math.min(displayedRecentResultsCount, 5) + 1);
        await expect(
            page.getByText(`1–${Math.min(displayedRecentResultsCount, 5)} z ${displayedRecentResultsCount}`)
        ).toBeVisible();

        const finalStatsPromise = waitForGraphQlData<CubeStatsData>(page, 'GetCubeStats');
        await page.goto(`/CUBES/${domainPublicId}/stats`);
        await expect(page.getByRole('heading', {name: 'Statystyki kostek'})).toBeVisible();
        const finalStats = await finalStatsPromise;
        const finalMonthlySummary = summarizeCubeStats(finalStats.cubeResults.stats);
        const finalTodayStats = finalStats.cubeResults.stats.find(day => day.day === solveDay);
        expect(finalTodayStats, 'Brak dzisiejszego wiersza statystyk').toBeDefined();
        expect(finalMonthlySummary.numberOfTries).toBe(initialMonthlySummary.numberOfTries + solveTimes.length);
        expect(finalMonthlySummary.activeDays).toBe(
            initialMonthlySummary.activeDays + ((initialTodayStats?.numberOfTries ?? 0) > 0 ? 0 : 1)
        );
        expect(finalMonthlySummary.bestTime).toBe(recordTime);
        expect(finalTodayStats!.numberOfTries).toBe(initialTodayNumberOfSolves + solveTimes.length);
        expect(finalTodayStats!.min).toBe(recordTime);
        expect(finalTodayStats!.max).toBe(Math.max(initialTodayStats?.max ?? 0, ...solveTimes));
        expect(finalTodayStats!.minAo5, 'Pięć nowych wyników powinno wyznaczyć Ao5').not.toBeNull();
        expect(Math.min(...finalStats.cubeResults.topTenAllTime.map(result => result.timeInMillis))).toBe(recordTime);

        await expect(page.getByRole('group', {name: 'Liczba prób'}).getByRole('heading')).toHaveText(
            String(finalMonthlySummary.numberOfTries)
        );
        await expect(page.getByRole('group', {name: 'Aktywne dni'}).getByRole('heading')).toHaveText(
            String(finalMonthlySummary.activeDays)
        );
        await expect(page.getByRole('group', {name: 'Najlepszy czas'}).getByRole('heading')).toHaveText(
            formatCubeTime(finalMonthlySummary.bestTime)
        );
        await expect(page.getByRole('group', {name: 'Najlepsze Ao5'}).getByRole('heading')).toHaveText(
            formatCubeTime(finalMonthlySummary.bestAo5)
        );

        const todayLabel = await page.evaluate(day => {
            return new Intl.DateTimeFormat('pl-PL', {day: 'numeric', month: 'long'}).format(
                new Date(`${day}T12:00:00`)
            );
        }, solveDay);
        const dailyStatsTable = page.getByRole('table', {name: 'Dzienne statystyki kostki'});
        const todayRow = dailyStatsTable.getByRole('row').filter({hasText: todayLabel});
        await expect(todayRow).toBeVisible();
        expect((await todayRow.locator('th, td').allInnerTexts()).map(text => text.trim())).toEqual([
            todayLabel,
            String(finalTodayStats!.numberOfTries),
            formatCubeTime(finalTodayStats!.min),
            formatCubeTime(finalTodayStats!.max),
            formatCubeTime(finalTodayStats!.minAo5),
            formatCubeTime(finalTodayStats!.minAo30),
        ]);

        const topTenRows = page.getByRole('table', {name: 'Top 10 wyników wszech czasów'}).getByRole('row');
        await expect(topTenRows.nth(1).getByText(formatCubeTime(recordTime), {exact: true})).toBeVisible();
    });
});
