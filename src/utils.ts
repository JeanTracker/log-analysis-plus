import * as vscode from "vscode";
import { FilterTreeViewProvider } from "./filterTreeViewProvider";

// One filter corresponds to one line in the configuration file
export type Filter = {
    isHighlighted: boolean; // if the matching lines will be highlighted
    isShown: boolean; //if the matching lines will be kept in focus mode
    regex: RegExp;
    color: string;
    id: string; //random generated number
    count: number; //count of lines which match the filter in the active editor
};

export type Group = {
    filters: Filter[];
    isHighlighted: boolean; // if the matching lines will be highlighted
    isShown: boolean; //if the matching lines will be kept in focus mode
    name: string;
    id: string; //random generated number
};

export type Project = {
    groups: Group[];
    name: string;
    id: string;
    selected: boolean;
};

export function generateRandomColor(): string {
    return `hsl(${Math.floor(360 * Math.random())}, 40%, 40%)`;
}
