import * as vscode from "vscode";
import { State } from "./extension";
import { Group, generateSvgUri, writeSvgContent, generateRandomColor } from "./utils";
import { readSettings, saveSettings } from "./settings";

export function applyHighlight(state: State, editors: vscode.TextEditor[]): void {
    // remove old decorations from all the text editor using the given decorationType
    state.decorations.forEach(decorationType => decorationType.dispose());
    state.decorations = [];

    editors.forEach((editor) => {
        let sourceCode = editor.document.getText();
        const sourceCodeArr = sourceCode.split("\n");

        state.groups.forEach((group) => {
            //apply new decorations
            group.filters.forEach((filter) => {
                let filterCount = 0;
                //if filter's highlight is off, or this editor is in focus mode and filter is not shown, we don't want to put decorations
                //especially when a specific line fits more than one filter regex and some of them are shown while others are not.
                if (filter.isHighlighted && (!editor.document.uri.toString().startsWith('focus:') || filter.isShown)) {
                    let lineNumbers: number[] = [];
                    for (let lineIdx = 0; lineIdx < sourceCodeArr.length; lineIdx++) {
                        if (filter.regex.test(sourceCodeArr[lineIdx])) {
                            lineNumbers.push(lineIdx);
                        }
                    }
                    filterCount = lineNumbers.length;

                    const decorationsArray = lineNumbers.map((lineIdx) => {
                        return new vscode.Range(
                            new vscode.Position(lineIdx, 0),
                            new vscode.Position(lineIdx, 0) //position does not matter because isWholeLine is set to true
                        );
                    });
                    let decorationType = vscode.window.createTextEditorDecorationType(
                        {
                            backgroundColor: filter.color,
                            isWholeLine: true,
                        }
                    );
                    //store the decoration type for future removal
                    state.decorations.push(decorationType);
                    editor.setDecorations(decorationType, decorationsArray);
                }
                //filter.count represents the count of the lines for the activeEditor, so if the current editor is active, we update the count
                if (editor === vscode.window.activeTextEditor) {
                    filter.count = filterCount;
                }
            });
        });
    });
}

//set bool for whether the lines matched the given filter will be kept for focus mode
export function setVisibility(isShown: boolean, treeItem: vscode.TreeItem, state: State) {
    const id = treeItem.id;
    const group = state.groups.find(group => (group.id === id));
    if (group !== undefined) {
        group.isShown = isShown;
        group.filters.map(filter => (filter.isShown = isShown));
    } else {
        state.groups.map(group => {
            const filter = group.filters.find(filter => (filter.id === id));
            if (filter !== undefined) {
                filter.isShown = isShown;
            }
        });
    }
    refreshEditors(state);
}

//turn on focus mode for the active editor. Will create a new tab if not already for the virtual document
export function turnOnFocusMode(state: State) {
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    let escapedUri = editor.document.uri.toString();
    if (escapedUri.startsWith('focus:')) {
        //avoid creating nested focus mode documents
        vscode.window.showInformationMessage('You are on focus mode virtual document already!');
        return;
    } else {
        //set special schema
        let virtualUri = vscode.Uri.parse('focus:' + escapedUri);
        //because of the special schema, openTextDocument will use the focusProvider
        vscode.workspace.openTextDocument(virtualUri).then(doc => vscode.window.showTextDocument(doc));
    }
}

export function deleteFilter(treeItem: vscode.TreeItem, state: State) {
    state.groups.map(group => {
        const deleteIndex = group.filters.findIndex(filter => (filter.id === treeItem.id));
        if (deleteIndex !== -1) {
            group.filters.splice(deleteIndex, 1);
        }
    });
    refreshEditors(state);
}

export function addFilter(treeItem: vscode.TreeItem, state: State) {
    vscode.window.showInputBox({
        prompt: "[FILTER] Type a regex to filter",
        ignoreFocusOut: false
    }).then(regexStr => {
        if (regexStr === undefined) {
            return;
        }
        const group = state.groups.find(group => (group.id === treeItem.id));
        const id = `${Math.random()}`;
        const filter = {
            isHighlighted: true,
            isShown: true,
            regex: new RegExp(regexStr),
            color: generateRandomColor(),
            id,
            iconPath: generateSvgUri(state.storageUri, id, true),
            count: 0
        };
        group!.filters.push(filter);
        //the order of the following two lines is deliberate (due to some unknown reason of async dependencies...)
        writeSvgContent(filter, state.filterTreeViewProvider);
        refreshEditors(state);
    });
}

export function editFilter(treeItem: vscode.TreeItem, state: State) {
    vscode.window.showInputBox({
        prompt: "[FILTER] Type a new regex",
        ignoreFocusOut: false
    }).then(regexStr => {
        if (regexStr === undefined) {
            return;
        }
        const id = treeItem.id;
        state.groups.map(group => {
            const filter = group.filters.find(filter => (filter.id === id));
            if (filter !== undefined) {
                filter.regex = new RegExp(regexStr);
            }
        });
        refreshEditors(state);
    });
}

export function setHighlight(isHighlighted: boolean, treeItem: vscode.TreeItem, state: State) {
    const id = treeItem.id;
    const group = state.groups.find(group => (group.id === id));
    if (group !== undefined) {
        group.isHighlighted = isHighlighted;
        group.filters.map(filter => {
            filter.isHighlighted = isHighlighted;
            filter.iconPath = generateSvgUri(state.storageUri, filter.id, filter.isHighlighted);
            writeSvgContent(filter, state.filterTreeViewProvider);
        });
        refreshFilterTreeView(state);
    } else {
        state.groups.map(group => {
            const filter = group.filters.find(filter => (filter.id === id));
            if (filter !== undefined) {
                filter.isHighlighted = isHighlighted;
                filter.iconPath = generateSvgUri(state.storageUri, filter.id, filter.isHighlighted);
                writeSvgContent(filter, state.filterTreeViewProvider);
            }
        });
    }
    applyHighlight(state, vscode.window.visibleTextEditors);
}

//refresh every visible component, including:
//document content of the visible focus mode virtual document,
//decoration of the visible focus mode virtual document,
//highlight decoration of visible editors
//treeview on the side bar
export function refreshEditors(state: State) {
    vscode.window.visibleTextEditors.forEach(editor => {
        let escapedUri = editor.document.uri.toString();
        if (escapedUri.startsWith('focus:')) {
            state.focusProvider.refresh(editor.document.uri);
            let focusDecorationType = vscode.window.createTextEditorDecorationType(
                {
                    before: {
                        contentText: ">>>>>>>focus mode<<<<<<<",
                        color: "#888888",
                    }
                }
            );
            let focusDecorationRangeArray = [new vscode.Range(
                new vscode.Position(0, 0),
                new vscode.Position(1, 0)
            )];
            editor.setDecorations(focusDecorationType, focusDecorationRangeArray);
        }
    });
    applyHighlight(state, vscode.window.visibleTextEditors);
    console.log("refreshEditos");
    state.filterTreeViewProvider.refresh();
}

export function refreshFilterTreeView(state: State) {
    console.log("refresh only tree view");
    state.filterTreeViewProvider.refresh();
}

export function updateFilterAndTreeView(state: State) {
    console.log("update filter and tree view");
    state.filterTreeViewProvider.update(state.groups);
    state.focusProvider.update(state.groups);
}

export function updateProjectAndTreeView(state: State) {
    console.log("update project tree view");
    state.projectTreeViewProvider.update(state.projects);
}

export function addGroup(state: State) {
    if (state.selectedIndex === -1) {
        vscode.window.showInformationMessage('You need to add a project first!');
        return;
    }

    vscode.window.showInputBox({
        prompt: '[GROUP] Type a new group name',
        ignoreFocusOut: false
    }).then(name => {
        if (name === undefined) {
            return;
        }
        const id = `${Math.random()}`;
        const group = {
            filters: [],
            isHighlighted: true,
            isShown: true,
            name: name,
            id
        };
        state.groups.push(group);
        refreshFilterTreeView(state);
    });
}

export function editGroup(treeItem: vscode.TreeItem, state: State) {
    vscode.window.showInputBox({
        prompt: "[GROUP] Type a new group name",
        ignoreFocusOut: false
    }).then(name => {
        if (name === undefined) {
            return;
        }
        const id = treeItem.id;
        const group = state.groups.find(group => (group.id === id));
        group!.name = name;
        refreshFilterTreeView(state);
    });
}

export function deleteGroup(treeItem: vscode.TreeItem, state: State) {
    const deleteIndex = state.groups.findIndex(group => (group.id === treeItem.id));
    if (deleteIndex !== -1) {
        state.groups.splice(deleteIndex, 1);
    }
    refreshEditors(state);
}

export function saveProject(state: State) {
    if (state.groups.length === 0) {
        vscode.window.showErrorMessage('There is no filter groups');
        return;
    }

    const selected = state.projects.find(p => (p.selected === true));
    if (selected === undefined) {
        vscode.window.showErrorMessage('There is no selected project');
        return;
    }

    vscode.window.showInputBox({
        value: selected.name,
        prompt: "[PROJECT] Type a project name",
        ignoreFocusOut: false
    }).then(name => {
        if (name === undefined) {
            return;
        }
        selected.name = name;
        selected.groups = state.groups;

        saveSettings(state.projects);
    });
}

export function addProject(state: State) {
    vscode.window.showInputBox({
        prompt: "[PROJECT] Type a new project name",
        ignoreFocusOut: false
    }).then(name => {
        if (name === undefined) {
            return;
        }

        const project = {
            groups: [],
            name,
            id: `${Math.random()}`,
            selected: false
        };

        state.projects.push(project);
        saveSettings(state.projects);
        updateProjectAndTreeView(state);
    });
}

export function deleteProject(treeItem: vscode.TreeItem, state: State) {
    const deleteIndex = state.projects.findIndex(project => (project.id === treeItem.id));
    if (deleteIndex !== -1) {
        if (deleteIndex === state.selectedIndex) {
            state.groups = [];
            state.selectedIndex = -1;
            updateFilterAndTreeView(state);
            refreshEditors(state);
        }
        state.projects.splice(deleteIndex, 1);
        saveSettings(state.projects);
        updateProjectAndTreeView(state);
    }
}

export function refreshSettings(state: State) {
    state.projects = readSettings(state.storageUri);

    if (state.selectedIndex !== -1 && state.projects.length > state.selectedIndex) {
        state.projects[state.selectedIndex].selected = true;
        state.groups = state.projects[state.selectedIndex].groups;
    } else {
        state.selectedIndex = -1;
        state.groups = [];
    }
    updateProjectAndTreeView(state);
    updateFilterAndTreeView(state);
    refreshEditors(state);
}

export function projectSelected(treeItem: vscode.TreeItem, state: State): boolean {
    const selectedIndex = state.projects.findIndex(p => p.id === treeItem.id);
    if (selectedIndex !== -1) {
        if (state.selectedIndex === selectedIndex) {
            vscode.window.showInformationMessage('This project is already selected');
            return true;
        }
        state.projects.forEach(p => p.selected = false);
        state.selectedIndex = selectedIndex;

        const project = state.projects[selectedIndex];
        project.selected = true;
        state.groups = project.groups;
        updateProjectAndTreeView(state);
        updateFilterAndTreeView(state);
        refreshEditors(state);
        return true;
    }
    return false;
}