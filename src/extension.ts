import * as vscode from "vscode";
import { Filter, Group, cleanUpIconFiles } from "./utils";
import { FilterTreeViewProvider } from "./filterTreeViewProvider";
import { applyHighlight, deleteFilter, setVisibility, importFilters, turnOnFocusMode, exportFilters, addFilter, editFilter, setHighlight, refreshEditors, addGroup, editGroup, deleteGroup } from "./commands";
import { FocusProvider } from "./focusProvider";
//GLOBAL to be used for activate and deactivate
let storageUri: vscode.Uri;

export type State = {
    inFocusMode: boolean;
    groupArr: Group[];
    decorations: vscode.TextEditorDecorationType[];
    disposableFoldingRange: vscode.Disposable | null;
    filterTreeViewProvider: FilterTreeViewProvider;
    focusProvider: FocusProvider
    storageUri: vscode.Uri;
};

export function activate(context: vscode.ExtensionContext) {
    storageUri = context.globalStorageUri; //get the store path
    cleanUpIconFiles(storageUri); //clean up the old icon files

    //internal globals
    const groupArr: Group[] = [];
    const state: State = {
        inFocusMode: false,
        groupArr,
        decorations: [],
        disposableFoldingRange: null,
        filterTreeViewProvider: new FilterTreeViewProvider(groupArr),
        focusProvider: new FocusProvider(groupArr),
        storageUri
    };
    //tell vs code to open focus:... uris with state.focusProvider
    vscode.workspace.registerTextDocumentContentProvider('focus', state.focusProvider);
    //register filterTreeViewProvider under id 'filters' which gets attached
    //to the file explorer according to package.json's contributes>views>explorer
    const view = vscode.window.createTreeView('filters.plus', { treeDataProvider: state.filterTreeViewProvider, showCollapseAll: true });
    context.subscriptions.push(view);

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
    let disposableExport = vscode.commands.registerCommand(
        "log-analysis-plus.exportFilters",
        () => exportFilters(state));
    context.subscriptions.push(disposableExport);

    let disposableImport = vscode.commands.registerCommand(
        "log-analysis-plus.importFilters",
        () => importFilters(state));
    context.subscriptions.push(disposableImport);

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
