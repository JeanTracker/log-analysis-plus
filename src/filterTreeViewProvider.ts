import * as vscode from 'vscode';
import { Filter, Group } from "./utils";

//provides filters as tree items to be displayed on the sidebar
export class FilterTreeViewProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private groupItemCache: Map<string, GroupItem> = new Map();
    private filterItemCache: Map<string, FilterItem> = new Map();

    constructor(private groupArr: Group[]) { }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    //getChildren(vscode.TreeItem) returns empty list because filters have no children.
    //getChildren() returns the root elements (all the filters)
    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (element === undefined) {
            return Promise.resolve(this.groupArr.map(group => this.getNewGroupItem(group)));
        }
        if (element instanceof GroupItem) {
            return Promise.resolve(element.filterArr.map(filter => this.getNewFilterItem(filter)));
        } else {
            return Promise.resolve([]);
        }
    }

    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter<vscode.TreeItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

    refresh(): void {
        console.log("in refresh");
        this._onDidChangeTreeData.fire(undefined);
    }

    getNewGroupItem(group: Group): GroupItem {
        let groupItem = this.groupItemCache.get(group.id);
        if (groupItem === undefined) {
            groupItem = new GroupItem(group);
            this.groupItemCache.set(group.id, groupItem);
        } else {
            groupItem.update(group);
        }
        return groupItem;
    }

    getNewFilterItem(filter: Filter): FilterItem {
        let filterItem = this.filterItemCache.get(filter.id);
        if (filterItem === undefined) {
            filterItem = new FilterItem(filter);
            this.filterItemCache.set(filter.id, filterItem);
        } else {
            filterItem.update(filter);
        }
        return filterItem;
    }
}

export class GroupItem extends vscode.TreeItem {
    filterArr: Filter[] = [];

    constructor(
        group: Group,
    ) {
        super(group.name, vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'g-unlit-invisible';
        this.update(group);
    }

    update(group: Group) {
        this.label = group.name;
        this.id = group.id;
        this.filterArr = group.filterArr;

        if (group.isHighlighted) {
            if (group.isShown) {
                this.contextValue = 'g-lit-visible';
            } else {
                this.description = '';
                this.contextValue = 'g-lit-invisible';
            }
        } else {
            this.description = '';
            if (group.isShown) {
                this.contextValue = 'g-unlit-visible';
            } else {
                this.contextValue = 'g-unlit-invisible';
            }
        }
    }

    //contextValue connects to package.json>menus>view/item/context
    contextValue: 'g-lit-visible' | 'g-unlit-visible' | 'g-lit-invisible' | 'g-unlit-invisible';
}

//represents a filter as one row in the sidebar
export class FilterItem extends vscode.TreeItem {
    constructor(
        filter: Filter,
    ) {
        super(filter.regex.toString(), vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'f-unlit-invisible';
        this.update(filter);
    }

    update(filter: Filter) {
        this.label = filter.regex.toString();
        this.id = filter.id;
        this.iconPath = filter.iconPath;

        if (filter.isHighlighted) {
            if (filter.isShown) {
                this.description = ` · ${filter.count}`;
                this.contextValue = 'f-lit-visible';
            } else {
                this.description = '';
                this.contextValue = 'f-lit-invisible';
            }
        } else {
            this.description = '';
            if (filter.isShown) {
                this.contextValue = 'f-unlit-visible';
            } else {
                this.contextValue = 'f-unlit-invisible';
            }
        }
    }

    //contextValue connects to package.json>menus>view/item/context
    contextValue: 'f-lit-visible' | 'f-unlit-visible' | 'f-lit-invisible' | 'f-unlit-invisible';
}
