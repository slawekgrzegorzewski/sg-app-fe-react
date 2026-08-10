import {clickableProps} from '../application/components/clickable';
import {
    Box,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Paper,
    Stack,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import Typography from '@mui/material/Typography';
import {MultiCurrencySummary} from '../application/components/MultiCurrencySummary';
import React, {useId, useState} from 'react';
import {ComparatorBuilder} from '../utils/comparator-builder';
import dayjs from 'dayjs';
import 'dayjs/locale/pl';
import {Expense, Income} from '../types';
import Decimal from 'decimal.js';
import {compactListRow} from '../utils/theme/utils';
import {FormattedMoneyText} from '../application/components/FormattedMoneyText';
import CloseIcon from '@mui/icons-material/Close';

export interface BillingElementsInCategoryProps {
    categoryName: string;
    billingElements: (Income | Expense)[];
}

function isIncome(billingElement: Income | Expense): billingElement is Income {
    return billingElement.__typename === 'Income';
}

function elementsCountLabel(count: number) {
    if (count === 1) {
        return '1 pozycja';
    }
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)) {
        return `${count} pozycje`;
    }
    return `${count} pozycji`;
}

export function BillingElementsInCategory({categoryName, billingElements}: BillingElementsInCategoryProps) {
    const [expanded, setExpanded] = useState(false);
    const dialogTitleId = useId();
    const theme = useTheme();
    const isTouchDevice = useMediaQuery('(pointer: coarse)');
    const categoryType = billingElements.length > 0 && isIncome(billingElements[0]) ? 'income' : 'expense';
    const categoryDialogTitle = `${categoryType === 'income' ? 'Dochody' : 'Wydatki'} w kategorii: ${categoryName}`;
    const sortedBillingElements = [...billingElements].sort(
        ComparatorBuilder.comparingByDate<Expense | Income>(be => new Date(be.date))
            .thenComparing(be => be.publicId)
            .build()
    );

    const closeDialog = () => setExpanded(false);
    const openDialog = () => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        setExpanded(true);
    };

    return (
        <>
            <Stack
                direction="column"
                width="100%"
                sx={{
                    ...compactListRow(theme),
                    cursor: 'pointer',
                    '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: 2,
                    },
                }}
                {...clickableProps(openDialog, undefined, expanded)}
            >
                <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                    <Typography variant={'body1'}>{categoryName}</Typography>
                    <MultiCurrencySummary
                        data={billingElements}
                        currencyExtractor={be => be.currency}
                        amountExtractor={be => new Decimal(be.amount)}
                        sx={{'& .MuiTypography-root': {color: 'text.primary'}}}
                    />
                </Stack>
            </Stack>

            <Dialog
                open={expanded}
                onClose={closeDialog}
                aria-labelledby={dialogTitleId}
                fullScreen={isTouchDevice}
                fullWidth
                maxWidth="md"
                sx={{
                    '& .MuiDialog-paper': {
                        maxWidth: isTouchDevice ? '100%' : '800px',
                        width: isTouchDevice ? '100%' : '800px',
                    },
                }}
            >
                <DialogTitle id={`${dialogTitleId}-container`} sx={{px: {xs: 2, sm: 3}, py: 2, position: 'relative'}}>
                    <Typography id={dialogTitleId} variant="h4" component="span">
                        {categoryDialogTitle}
                    </Typography>
                    <IconButton
                        autoFocus
                        aria-label="Zamknij"
                        onClick={event => {
                            event.stopPropagation();
                            closeDialog();
                        }}
                        sx={{position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)'}}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent dividers sx={{px: {xs: 1.5, sm: 2.5}, py: 2}} onClick={e => e.stopPropagation()}>
                    <Stack spacing={2} sx={{width: '100%', maxWidth: 740, mx: 'auto'}}>
                        <Paper variant="outlined" sx={{p: {xs: 1.5, sm: 2}}}>
                            <Stack
                                direction={{xs: 'column', sm: 'row'}}
                                alignItems={{xs: 'stretch', sm: 'center'}}
                                justifyContent="space-between"
                                spacing={1.5}
                            >
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Chip
                                        size="small"
                                        variant="outlined"
                                        color={categoryType === 'income' ? 'success' : 'error'}
                                        label={categoryType === 'income' ? 'Dochody' : 'Wydatki'}
                                    />
                                    <Chip
                                        size="small"
                                        variant="outlined"
                                        label={elementsCountLabel(billingElements.length)}
                                    />
                                </Stack>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                                    <Typography variant="body2" color="text.secondary">
                                        Łącznie
                                    </Typography>
                                    <MultiCurrencySummary
                                        data={billingElements}
                                        currencyExtractor={be => be.currency}
                                        amountExtractor={be => new Decimal(be.amount)}
                                    />
                                </Stack>
                            </Stack>
                        </Paper>

                        <Stack spacing={1}>
                            {sortedBillingElements.map(be => (
                                <Paper
                                    variant="outlined"
                                    key={be.publicId}
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: {xs: '1fr auto', sm: '120px minmax(0, 1fr) 150px'},
                                        gridTemplateAreas: {
                                            xs: '"date amount" "description description"',
                                            sm: '"date description amount"',
                                        },
                                        columnGap: 2,
                                        rowGap: 0.75,
                                        alignItems: 'center',
                                        p: {xs: 1.5, sm: 1.75},
                                        '&:hover': {bgcolor: 'action.hover'},
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{gridArea: 'date', whiteSpace: 'nowrap'}}
                                    >
                                        {dayjs(be.date).locale('pl').format('D MMM YYYY')}
                                    </Typography>
                                    <Typography sx={{gridArea: 'description', minWidth: 0, overflowWrap: 'anywhere'}}>
                                        {be.description}
                                    </Typography>
                                    <Box sx={{gridArea: 'amount', textAlign: 'right'}}>
                                        <FormattedMoneyText
                                            money={{amount: new Decimal(be.amount), currency: be.currency}}
                                            parenthesizeNegative
                                            sx={{
                                                color: categoryType === 'income' ? 'success.main' : 'error.main',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {formattedValue => <>{formattedValue}</>}
                                        </FormattedMoneyText>
                                    </Box>
                                </Paper>
                            ))}
                        </Stack>
                    </Stack>
                </DialogContent>
            </Dialog>
        </>
    );
}
