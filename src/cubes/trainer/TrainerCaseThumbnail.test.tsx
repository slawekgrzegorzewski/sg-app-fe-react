import {act, render, screen} from '@testing-library/react';
import {CfopStage} from '../../types';
import {faceletsFromCubingAlgorithm} from '../cubing-api';
import {applyCubeMove, SOLVED_CUBE} from '../smart-cube-state';
import {TrainerCaseThumbnail} from './TrainerCaseThumbnail';

jest.mock(
        '../cubing-api',
        () => ({faceletsFromCubingAlgorithm: jest.fn()}));
const faceletsMock = faceletsFromCubingAlgorithm as jest.Mock;

beforeEach(
        () => faceletsMock.mockReset());

it(
        'shares the computed state across a case and its variants',
        async () => {
            faceletsMock.mockResolvedValue(SOLVED_CUBE);
            render(
                <>
                        <TrainerCaseThumbnail stage={CfopStage.F2L} setupAlgorithm="shared" label="Przypadek" />
                        <TrainerCaseThumbnail stage={CfopStage.F2L} setupAlgorithm="shared" label="Wariant" />
                    </>);
            expect(
                    await screen.findByRole(
                            'img',
                            {name: 'Stan początkowy: Wariant'})).toBeInTheDocument();
            expect(
                    screen.getByRole(
                            'img',
                            {name: 'Stan początkowy: Przypadek'})).toBeInTheDocument();
            expect(faceletsMock).toHaveBeenCalledTimes(1);
        });

it(
        'ignores a previous case finishing after the selected case',
        async () => {
            let resolvePrevious!: (value: string) => void;
            faceletsMock.mockImplementation(
                    (setup: string) =>
        setup === 'previous'
                ? new Promise<string>(
                        resolve => {
                  resolvePrevious = resolve;
              })
                : Promise.resolve(SOLVED_CUBE));
            const {rerender} = render(
                <TrainerCaseThumbnail stage={CfopStage.Pll} setupAlgorithm="previous" label="Poprzedni" />);
            rerender(
                <TrainerCaseThumbnail stage={CfopStage.Pll} setupAlgorithm="current" label="Aktualny" />);
            const image = await screen.findByRole(
                    'img',
                    {name: 'Stan początkowy: Aktualny'});
            await act(
                    async () => resolvePrevious(
                            'U'.repeat(54)));
            expect(image).toContainHTML('<rect x="73" y="29" width="10" height="14" fill="#fb8c00"></rect>');
        });

it(
        'shows an unavailable preview without blocking the variant',
        async () => {
            faceletsMock.mockRejectedValue(
                    new Error('Invalid algorithm'));
            render(
                <TrainerCaseThumbnail stage={CfopStage.Oll} setupAlgorithm="invalid" label="Błędny" />);
            expect(
                    await screen.findByRole(
                            'img',
                            {name: 'Podgląd niedostępny: Błędny'})).toBeInTheDocument();
        });

it(
        'turns the F2L view towards an unsolved left slot',
        async () => {
            faceletsMock.mockResolvedValue(
                    applyCubeMove(SOLVED_CUBE, 'L'));
            render(
                <TrainerCaseThumbnail stage={CfopStage.F2L} setupAlgorithm="left-slot" label="Lewa para" />);
            const image = await screen.findByRole(
                    'img',
                    {name: 'Stan początkowy: Lewa para'});
            expect(image).toContainHTML('<rect x="0" y="0" width="14" height="14" fill="#e53935"></rect>');
        });

it(
        'shows only orientation colors for OLL and preserves side colors for PLL',
        async () => {
            faceletsMock.mockResolvedValue(SOLVED_CUBE);
            const {rerender} = render(
                <TrainerCaseThumbnail stage={CfopStage.Oll} setupAlgorithm="orientation" label="OLL" />);
            const oll = await screen.findByRole(
                    'img',
                    {name: 'Stan początkowy: OLL'});
            expect(oll).toContainHTML('<rect x="73" y="29" width="10" height="14" fill="#9e9e9e"></rect>');
            expect(oll).toContainHTML('<rect x="0" y="0" width="14" height="14" fill="#fdd835"></rect>');
            rerender(
                <TrainerCaseThumbnail stage={CfopStage.Pll} setupAlgorithm="orientation" label="PLL" />);
            const pll = screen.getByRole(
                    'img',
                    {name: 'Stan początkowy: PLL'});
            expect(pll).not.toContainHTML('<rect x="73" y="29" width="10" height="14" fill="#9e9e9e"></rect>');
            expect(pll).toContainHTML('<rect x="73" y="29" width="10" height="14" fill="#fb8c00"></rect>');
        });
