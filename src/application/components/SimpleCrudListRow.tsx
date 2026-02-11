import * as React from "react";
import {useContext, useEffect, useRef, useState} from "react";
import {Stack, Theme, useTheme} from "@mui/material";
import {draggable, dropTargetForElements} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {combine} from "@atlaskit/pragmatic-drag-and-drop/combine";
import {ShowBackdropContext} from "../../utils/DrawerAppBar";
import {SxProps} from "@mui/system";

export interface SimpleCrudListRowProps<T> {
    index: number;
    entity: T,
    idExtractor: (t: T) => string,
    highlightRowOnHover: boolean;

    entityDisplay(t: T, index: number): React.JSX.Element,

    rowContainerProvider?: (key: string, sx: SxProps<Theme>, additionalProperties: any) => React.JSX.Element

    rowStyle?(t: T, index: number): React.CSSProperties,

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

const ROW_CONTAINER_DEFAULT_PROVIDER: (key: string, sx: SxProps<Theme>, additionalProperties: any) => React.JSX.Element = (key: string, sx: SxProps<Theme>, additionalProperties: any) =>
    <Stack key={key} direction={'row'} alignSelf={'stretch'} sx={sx} {...additionalProperties}></Stack>;

export function SimpleCrudListRow<T>({
                                         index,
                                         entity,
                                         idExtractor,
                                         highlightRowOnHover = true,
                                         rowContainerProvider,
                                         entityDisplay,
                                         rowStyle,
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
                    canDrop: () => {
                        return true;
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
                    onDrop: ({source}) => {
                        if (source.element === el) {
                            console.log("a");
                            setDraggingInfo(init);
                            return;
                        }
                        if (reorderProps.dndLabel === source.data.dndLabel) {
                            console.log("b");
                            setDraggingInfo(init);
                            return;
                        }
                        const defaultOnReorder = () => Promise.resolve();
                        setShowBackdrop(true);
                        (reorderProps.onReorder || defaultOnReorder)({
                            id: source.data.id as string,
                            aboveId: source.data.mouseDirection === 'up' ? reorderProps.aboveId : entityId,
                            belowId: source.data.mouseDirection === 'down' ? reorderProps.belowId : entityId
                        }).finally(() => {
                            setShowBackdrop(false);
                            setDraggingInfo(init);
                        });
                    }
                }));
        },
        [entity, idExtractor, reorderProps, setShowBackdrop]
    );
    return (rowContainerProvider || ROW_CONTAINER_DEFAULT_PROVIDER)(
        idExtractor(entity),
        {
            '&:hover': highlightRowOnHover
                ? {
                    color: theme.palette.primary.contrastText,
                    backgroundColor: theme.palette.primary.main,
                }
                : {},
            ...(draggingInfo.mouseDirection === 'up'
                ? {borderTop: '2px solid ' + theme.palette.primary.main}
                : draggingInfo.mouseDirection === 'down'
                    ? {borderBottom: '2px solid ' + theme.palette.primary.main}
                    : {}),
            ...(rowStyle?.(entity, index) || {}),
        },
        {
            children: entityDisplay(entity, index),
            ref: ref,
            onClick: () => selectEntityListener(entity)
        });
}