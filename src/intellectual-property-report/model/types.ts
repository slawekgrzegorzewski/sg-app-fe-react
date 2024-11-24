import {GQLDomain} from "../../application/model/types";

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
    id: number;
    date: Date;
    description: string;
    numberOfHours: number;
    timeRecordCategory: TimeRecordCategoryDTO | null
}

export type TimeRecordCategoryDTO = {
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

export type GQLIntellectualProperty = {
    __typename?: "IntellectualProperty";
    domain: { __typename?: "DomainSimple"; id: number; name: string };
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
    domain: GQLDomain
};

export type GQLTimeRecordCategory = {
    __typename?: "TimeRecordCategory";
    id: number;
    name: string;
    domain: GQLDomain
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
        timeRecords: (task.timeRecords || []).map(timeRecord => mapTimeRecord(timeRecord))
    }
}

export function mapTimeRecord(timeRecord: GQLTimeRecord): TimeRecordDTO {
    return {
        id: timeRecord.id,
        date: new Date(timeRecord.date),
        description: timeRecord.description || '',
        numberOfHours: timeRecord.numberOfHours,
        timeRecordCategory: timeRecord.timeRecordCategory
            ? mapTimeRecordCategory(timeRecord.timeRecordCategory!)
            : null
    };
}

export function mapTimeRecordCategory(timeRecordCategory: GQLTimeRecordCategory): TimeRecordCategoryDTO {
    return {
        id: timeRecordCategory.id,
        name: timeRecordCategory.name
    };
}
