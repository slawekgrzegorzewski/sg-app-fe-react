import {GQLDomainSimple} from "../../application/model/types";
import dayjs, {Dayjs} from "dayjs";

export const NON_EXISTING_ID = -1;

export type IntellectualPropertyDTO = {
    id: number;
    description: string;
    tasks: TaskDTO[];
}

export type TaskDTO = {
    intellectualPropertyId: number;
    id: number;
    description: string;
    coAuthors: string;
    attachments: string[];
    timeRecords: TimeRecordDTO[];
}

export type TimeRecordDTO = {
    taskId: number;
    id: number;
    date: Date;
    description: string;
    numberOfHours: number;
    timeRecordCategory: TimeRecordCategoryDTO | null
}

export type TimeRecordEditorObject = {
    task: { id: number; description: string };
    id: number;
    date: Dayjs;
    description: string;
    numberOfHours: number;
}

export type TimeRecordCategoryDTO = {
    timeRecordId: number;
    id: number;
    name: string;
}

export const notExistingIPR: IntellectualPropertyDTO = {
    id: NON_EXISTING_ID,
    description: '',
    tasks: []
};

export const emptyIPRProvider: () => IntellectualPropertyDTO = () => {
    return {...notExistingIPR};
}

export const notExistingTask: TaskDTO = {
    intellectualPropertyId: NON_EXISTING_ID,
    id: NON_EXISTING_ID,
    description: '',
    coAuthors: '',
    attachments: [],
    timeRecords: []
};

export const emptyTaskProvider: (intellectualPropertyId: number) => TaskDTO = (intellectualPropertyId: number) => {
    let newTask = {...notExistingTask};
    newTask.intellectualPropertyId = intellectualPropertyId;
    return newTask;
}

export const notExistingTimeRecordCategory: TimeRecordCategoryDTO = {
    timeRecordId: NON_EXISTING_ID,
    id: NON_EXISTING_ID,
    name: ''
};

export const emptyTimeRecordCategoryProvider: (timeRecordId: number) => TimeRecordCategoryDTO = (timeRecordId: number) => {
    let newTimeRecordCategory = {...notExistingTimeRecordCategory};
    newTimeRecordCategory.timeRecordId = timeRecordId;
    return newTimeRecordCategory;
}

export const notExistingNonIPTimeRecord: TimeRecordDTO = {
    taskId: NON_EXISTING_ID,
    id: NON_EXISTING_ID,
    date: new Date(),
    description: '',
    numberOfHours: 0,
    timeRecordCategory: emptyTimeRecordCategoryProvider(NON_EXISTING_ID)
};

export const emptyTimeRecordEditorProvider: () => TimeRecordEditorObject = () => {
    return {
        task: {
            id: NON_EXISTING_ID,
            description: ''
        },
        id: NON_EXISTING_ID,
        date: dayjs(),
        description: '',
        numberOfHours: 0
    };
}

export type GQLIntellectualProperty = {
    __typename?: "IntellectualProperty";
    domain: { __typename?: "DomainSimple"; publicId: number; name: string };
    description: string;
    id: number;
    tasks?: Array<GQLTask> | null
};

export type GQLTask = {
    __typename?: "Task";
    id: number;
    attachments?: Array<string> | null;
    coAuthors: string;
    description: string;
    timeRecords?: Array<GQLTimeRecord> | null
};

export type GQLTimeRecord = {
    __typename?: "TimeRecord";
    id: number;
    date: string;
    numberOfHours: any;
    description?: string | null;
    timeRecordCategory?: GQLTimeRecordCategory | null;
    domain: GQLDomainSimple
};

export type GQLTimeRecordCategory = {
    __typename?: "TimeRecordCategory";
    id: number;
    name: string;
    domain: GQLDomainSimple
};

export function mapIntellectualProperty(ipr: GQLIntellectualProperty): IntellectualPropertyDTO {
    return {
        id: ipr.id,
        description: ipr.description,
        tasks: (ipr.tasks || []).map(task => mapTask(ipr.id, task))
    }
}

export function mapTask(intellectualPropertyId: number, task: GQLTask): TaskDTO {
    return {
        intellectualPropertyId: intellectualPropertyId,
        id: task.id,
        description: task.description,
        coAuthors: task.coAuthors,
        attachments: task.attachments || [],
        timeRecords: (task.timeRecords || []).map(timeRecord => mapTimeRecord(task.id, timeRecord))
    }
}

export function mapTimeRecord(taskId: number, timeRecord: GQLTimeRecord): TimeRecordDTO {
    return {
        taskId: taskId,
        id: timeRecord.id,
        date: new Date(timeRecord.date),
        description: timeRecord.description || '',
        numberOfHours: timeRecord.numberOfHours,
        timeRecordCategory: timeRecord.timeRecordCategory
            ? mapTimeRecordCategory(timeRecord.id, timeRecord.timeRecordCategory!)
            : null
    };
}

export function mapTimeRecordCategory(timeRecordId: number, timeRecordCategory: GQLTimeRecordCategory): TimeRecordCategoryDTO {
    return {
        timeRecordId: timeRecordId,
        id: timeRecordCategory.id,
        name: timeRecordCategory.name
    };
}
