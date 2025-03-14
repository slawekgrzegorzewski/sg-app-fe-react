import * as React from "react";
import {useContext, useEffect, useRef, useState} from "react";
import Box from "@mui/material/Box";
import {Stack, styled, useTheme} from "@mui/material";
import {draggable, dropTargetForElements} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {combine} from "@atlaskit/pragmatic-drag-and-drop/combine";
import {ShowBackdropContext} from "../../utils/DrawerAppBar";

export interface SimpleCrudListRowProps<T> {
    entity: T,
    idExtractor: (t: T) => string,

    entityDisplay(t: T): React.JSX.Element,

    selectEntityListener(t: T): void,

    reorderProps?: SimpleCrudListRowDNDReorderProps
}

export interface SimpleCrudListRowDNDReorderProps {
    dndLabel: string,
    aboveId: string | null,
    belowId: string | null,
    onReorder?: (event: ReorderEvent) => Promise<void>,
}

type MouseDirection = 'unknown' | 'down' | 'up'

type DraggingInfo = {
    mouseDirection: MouseDirection;
    previousVerticalLocation: number;
};

export type ReorderEvent = {
    id: string;
    aboveId: string | null;
    belowId: string | null;
};

const init: DraggingInfo = {
    mouseDirection: 'unknown',
    previousVerticalLocation: 0
};

export function SimpleCrudListRow<T>({
                                         entity,
                                         idExtractor,
                                         entityDisplay,
                                         selectEntityListener,
                                         reorderProps
                                     }: SimpleCrudListRowProps<T>) {

    const ref = useRef(null);
    const [draggingInfo, setDraggingInfo] = useState<DraggingInfo>(init);
    const theme = useTheme();
    const {setShowBackdrop} = useContext(ShowBackdropContext);

    useEffect(() => {
            const el = ref.current!;
            if (!reorderProps || !el) return;
            const entityId = idExtractor(entity);

            return combine(
                draggable({
                    element: el,
                    getInitialData: () => ({
                        id: entityId,
                        dndLabel: reorderProps.dndLabel,
                        mouseDirection: 'unknown' as MouseDirection
                    }),
                    onDragStart: (e) => setDraggingInfo(() => {
                        return {
                            mouseDirection: 'unknown',
                            previousVerticalLocation: e.location.current.input.clientY
                        };
                    }),
                    onDrop: () => {
                        setDraggingInfo(init);
                    }
                }),
                dropTargetForElements({
                    element: el,
                    canDrop: ({source}) => {
                        return source.element !== el && reorderProps.dndLabel === source.data.dndLabel;
                    },
                    getData: () => ({aboveId: reorderProps.aboveId, belowId: reorderProps.belowId}),
                    getIsSticky() {
                        return true;
                    },
                    onDragEnter: (e) => {
                        setDraggingInfo({
                            mouseDirection: 'unknown',
                            previousVerticalLocation: e.location.current.input.clientY
                        });
                    },
                    onDrag: (e) => {
                        const currentLocation = e.location.current.input.clientY
                        setDraggingInfo(draggingInfo => {
                            function getDirection() {
                                let direction = draggingInfo.previousVerticalLocation > currentLocation ? 'up' : (draggingInfo.previousVerticalLocation < currentLocation ? 'down' : draggingInfo.mouseDirection);
                                const possibleDirections: MouseDirection[] = [];
                                if (!reorderProps?.aboveId || reorderProps.aboveId !== e.source.data.id) possibleDirections.push('up');
                                if (!reorderProps?.belowId || reorderProps.belowId !== e.source.data.id) possibleDirections.push('down');
                                return possibleDirections.includes(direction) ? direction : possibleDirections.length > 0 ? possibleDirections[0] : 'unknown';
                            }

                            const direction = getDirection();
                            e.source.data.mouseDirection = direction;
                            return {
                                mouseDirection: direction,
                                previousVerticalLocation: currentLocation
                            };
                        });
                    },
                    onDragLeave: () => {
                        setDraggingInfo(init);
                    },
                    onDrop: (e) => {
                        const defaultOnReorder = () => Promise.resolve();
                        setShowBackdrop(true);
                        (reorderProps.onReorder || defaultOnReorder)({
                            id: e.source.data.id as string,
                            aboveId: e.source.data.mouseDirection === 'up' ? reorderProps.aboveId : entityId,
                            belowId: e.source.data.mouseDirection === 'down' ? reorderProps.belowId : entityId
                        }).finally(() => {
                            setShowBackdrop(false);
                            setDraggingInfo(init);
                        });
                    }
                }));
        },
        [entity, idExtractor, reorderProps, setShowBackdrop]
    )
    ;

    const EntityRowBox = styled(Box)(({theme}) => ({
        '&:hover': {
            color: theme.palette.primary.contrastText,
            backgroundColor: theme.palette.primary.main,
        }
    }));

    if (draggingInfo.mouseDirection !== 'unknown')
        return <Stack direction={'row'} key={idExtractor(entity)}
                      style={draggingInfo.mouseDirection === 'up' ? {borderTop: '2px solid ' + theme.palette.primary.main} : {borderBottom: '2px solid ' + theme.palette.primary.main}}>
            <Box onClick={() => selectEntityListener(entity)}
                 alignSelf={'stretch'}>
                {entityDisplay(entity)}
            </Box>
        </Stack>;
    else
        return <Stack direction={'row'} ref={ref} key={idExtractor(entity)}>
            <EntityRowBox onClick={() => selectEntityListener(entity)}
                          alignSelf={'stretch'}>
                {entityDisplay(entity)}
            </EntityRowBox>
        </Stack>;
}