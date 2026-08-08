import React from 'react';
import {Tooltip, Typography} from '@mui/material';

interface OverflowTooltipProps {
    children: string;
}

export function OverflowTooltip({children}: OverflowTooltipProps) {
    const textRef = React.useRef<HTMLElement>(null);
    const [overflow, setOverflow] = React.useState(false);

    React.useEffect(() => {
        const element = textRef.current;
        if (!element) {
            return;
        }
        setOverflow(element.scrollWidth > element.clientWidth);
    }, [children]);

    return (
        <Tooltip title={overflow ? children : ''} arrow disableHoverListener={!overflow}>
            <Typography
                ref={textRef}
                sx={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {children}
            </Typography>
        </Tooltip>
    );
}
