import * as vscode from "vscode";
import { Project, Group, cleanUpIconFiles } from "./utils";
import { FilterTreeViewProvider } from "./filterTreeViewProvider";
import { ProjectTreeViewProvider } from "./projectTreeViewProvider";
import { applyHighlight, deleteFilter, setVisibility, turnOnFocusMode, addFilter, editFilter, setHighlight, refreshEditors, addGroup, editGroup, deleteGroup, saveProject, addProject, deleteProject, refreshSettings, projectSelected } from "./commands";
import { FocusProvider } from "./focusProvider";
import { openSettings } from "./settings";

//GLOBAL to be used for activate and deactivate
let storageUri: vscode.Uri;

export type State = {
    inFocusMode: boolean;
    projects: Project[];
    selectedIndex: number;
    groups: Group[];
    decorations: vscode.TextEditorDecorationType[];
    disposableFoldingRange: vscode.Disposable | null;
    filterTreeViewProvider: FilterTreeViewProvider;
    projectTreeViewProvider: ProjectTreeViewProvider;
    focusProvider: FocusProvider
    storageUri: vscode.Uri;
};

export function activate(context: vscode.ExtensionContext) {
    storageUri = context.globalStorageUri; //get the store path
    cleanUpIconFiles(storageUri); //clean up the old icon files

    const projects: Project[] = [];
    const groups: Group[] = [];
    const state: State = {
        inFocusMode: false,
        projects,
        selectedIndex: -1,
        groups,
        decorations: [],
        disposableFoldingRange: null,
        filterTreeViewProvider: new FilterTreeViewProvider(groups),
        projectTreeViewProvider: new ProjectTreeViewProvider(projects),
        focusProvider: new FocusProvider(groups),
        storageUri
    };

    refreshSettings(state);

    //tell vs code to open focus:... uris with state.focusProvider
    vscode.workspace.registerTextDocumentContentProvider('focus', state.focusProvider);
    //register filterTreeViewProvider under id 'filters' which gets attached
    //to the file explorer according to package.json's contributes>views>explorer
    const view = vscode.window.createTreeView('filters.plus', { treeDataProvider: state.filterTreeViewProvider, showCollapseAll: true });
    context.subscriptions.push(view);

    vscode.window.registerTreeDataProvider('filters.plus.settings', state.projectTreeViewProvider);

    //Add events listener
    var disposableOnDidChangeVisibleTextEditors = vscode.window.onDidChangeVisibleTextEditors(event => {
        refreshEditors(state);
    });
    context.subscriptions.push(disposableOnDidChangeVisibleTextEditors);

    var disposableOnDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(event => {
        refreshEditors(state);
    });
    context.subscriptions.push(disposableOnDidChangeTextDocument);

    var disposableOnDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(event => {
        //update the filter counts for the current activate editor
        applyHighlight(state, vscode.window.visibleTextEditors);
        state.filterTreeViewProvider.refresh();
    });
    context.subscriptions.push(disposableOnDidChangeActiveTextEditor);

    //register commands
    let disposableAddProject = vscode.commands.registerCommand(
        "log-analysis-plus.addProject",
        () => addProject(state));
    context.subscriptions.push(disposableAddProject);

    let disposableDeleteProject = vscode.commands.registerCommand(
        "log-analysis-plus.deleteProject",
        (treeItem: vscode.TreeItem) => {
            if (treeItem === undefined) {
                vscode.window.showErrorMessage('This command is excuted with button in Log Analysis+ Projects');
                return;
            }
            deleteProject(treeItem, state);
            if (state.selectedIndex === -1) {
                view.title = 'Filters+';
            }
        });
    context.subscriptions.push(disposableDeleteProject);

    let disposableOpenSettings = vscode.commands.registerCommand(
        "log-analysis-plus.openSettings",
        () => openSettings(state));
    context.subscriptions.push(disposableOpenSettings);

    let disposableRefreshSettings = vscode.commands.registerCommand(
        "log-analysis-plus.refreshSettings",
        () => refreshSettings(state));
    context.subscriptions.push(disposableRefreshSettings);

    let disposableSelectProject = vscode.commands.registerCommand(
        "log-analysis-plus.selectProject",
        (treeItem: vscode.TreeItem) => {
            if (treeItem === undefined) {
                vscode.window.showErrorMessage('This command is excuted with button in Log Analysis+ Projects');
                return;
            }
            if (projectSelected(treeItem, state)) {
                view.title = 'Filters+ (' + treeItem.label + ')';
                vscode.commands.executeCommand('workbench.view.explorer');
            }
        });
    context.subscriptions.push(disposableSelectProject);

    let disposableSaveProject = vscode.commands.registerCommand(
        "log-analysis-plus.saveProject",
        () => {
            saveProject(state);
            view.title = 'Filters+ (Project)';

        });
    context.subscriptions.push(disposableSaveProject);

    let disposableEnableVisibility = vscode.commands.registerCommand(
        "log-analysis-plus.enableVisibility",
        (treeItem: vscode.TreeItem) => {
            if (treeItem === undefined) {
                vscode.window.showErrorMessage('This command is excuted with button in FILTERS');
                return;
            }
            setVisibility(true, treeItem, state);
        }
    );
    context.subscriptions.push(disposableEnableVisibility);

    let disposableDisableVisibility = vscode.commands.registerCommand(
        "log-analysis-plus.disableVisibility",
        (treeItem: vscode.TreeItem) => {
            if (treeItem === undefined) {
                vscode.window.showErrorMessage('This command is excuted with button in FILTERS');
                return;
            }
            setVisibility(false, treeItem, state);
        }
    );
    context.subscriptions.push(disposableDisableVisibility);

    let disposableTurnOnFocusMode = vscode.commands.registerCommand(
        "log-analysis-plus.turnOnFocusMode",
        () => turnOnFocusMode(state)
    );
    context.subscriptions.push(disposableTurnOnFocusMode);

    let disposibleAddFilter = vscode.commands.registerCommand(
        "log-analysis-plus.addFilter",
        (treeItem: vscode.TreeItem) => {
            if (treeItem === undefined) {
                vscode.window.showErrorMessage('This command is excuted with button in FILTERS');
                return;
            }
            addFilter(treeItem, state);
        }
    );
    context.subscriptions.push(disposibleAddFilter);

    let disposibleEditFilter = vscode.commands.registerCommand(
        "log-analysis-plus.editFilter",
        (treeItem: vscode.TreeItem) => {
            if (treeItem === undefined) {
                vscode.window.showErrorMessage('This command is excuted with button in FILTERS');
                return;
            }
            editFilter(treeItem, state);
        }
    );
    context.subscriptions.push(disposibleEditFilter);

    let disposibleDeleteFilter = vscode.commands.registerCommand(
        "log-analysis-plus.deleteFilter",
        (treeItem: vscode.TreeItem) => {
            if (treeItem === undefined) {
                vscode.window.showErrorMessage('This command is excuted with button in FILTERS');
                return;
            }
            deleteFilter(treeItem, state);
        }
    );
    context.subscriptions.push(disposibleDeleteFilter);

    let disposibleEnableHighlight = vscode.commands.registerCommand(
        "log-analysis-plus.enableHighlight",
        (treeItem: vscode.TreeItem) => {
            if (treeItem === undefined) {
                vscode.window.showErrorMessage('This command is excuted with button in FILTERS');
                return;
            }
            setHighlight(true, treeItem, state);
        }
    );
    context.subscriptions.push(disposibleEnableHighlight);

    let disposibleDisableHighlight = vscode.commands.registerCommand(
        "log-analysis-plus.disableHighlight",
        (treeItem: vscode.TreeItem) => {
            if (treeItem === undefined) {
                vscode.window.showErrorMessage('This command is excuted with button in FILTERS');
                return;
            }
            setHighlight(false, treeItem, state);
        }
    );
    context.subscriptions.push(disposibleDisableHighlight);

    let disposibleAddGroup = vscode.commands.registerCommand(
        "log-analysis-plus.addGroup",
        () => addGroup(state)
    );
    context.subscriptions.push(disposibleAddGroup);

    let disposibleEditGroup = vscode.commands.registerCommand(
        "log-analysis-plus.editGroup",
        (treeItem: vscode.TreeItem) => {
            if (treeItem === undefined) {
                vscode.window.showErrorMessage('This command is excuted with button in FILTERS');
                return;
            }
            editGroup(treeItem, state);
        }
    );
    context.subscriptions.push(disposibleEditGroup);

    let disposibleDeleteGroup = vscode.commands.registerCommand(
        "log-analysis-plus.deleteGroup",
        (treeItem: vscode.TreeItem) => {
            if (treeItem === undefined) {
                vscode.window.showErrorMessage('This command is excuted with button in FILTERS');
                return;
            }
            deleteGroup(treeItem, state);
        }
    );
    context.subscriptions.push(disposibleDeleteGroup);
}

// this method is called when your extension is deactivated
export function deactivate() {
    cleanUpIconFiles(storageUri);
}
