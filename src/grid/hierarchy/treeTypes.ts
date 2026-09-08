/* eslint-disable @typescript-eslint/no-explicit-any -- Preserve Inovua's application-defined row callback types. */
import type * as React from "react";

export type TypeExpandedNodes = Record<string, boolean>;

export type TypeNodeProps = {
  expanded: boolean;
  loading: boolean;
  depth: number;
  path: string;
  leafNode: boolean;
  asyncNode: boolean;
  childIndex: number;
  parentNodeId: string | number;
};

export type TypeNodeEvent = {
  id: string | number;
  data: any;
  node: any;
  index: number;
  nodeProps: TypeNodeProps;
};
export type TypeNodeExpandChange = TypeNodeEvent & {
  expandedNodes: TypeExpandedNodes | undefined;
  nodeExpanded: boolean;
};

export type TypeTreeGridProps = {
  treeEnabled?: boolean;
  treeColumn?: string;
  nodesProperty?: string;
  nodePathSeparator?: string;
  generateIdFromPath?: boolean;
  treeNestingSize?: number;
  /**
   * Caps how many children a branch shows at once, with a control after the
   * last of them that reveals the next batch. Left unset a branch shows every
   * child it has, which is how the table has always behaved; the mobile layout
   * falls back to `mobileTransform.pageSize` so a phone stays bounded.
   *
   * Each set of siblings is counted on its own rather than the flat run of
   * rows, so opening one node with thousands of children cannot push the nodes
   * after it off the screen.
   */
  treeBranchPageSize?: number;
  expandedNodes?: TypeExpandedNodes;
  defaultExpandedNodes?: TypeExpandedNodes;
  collapseChildrenRecursive?: boolean;
  unexpandableNodes?: Record<string, boolean>;
  isNodeExpandable?: (args: TypeNodeEvent & { rowIndex: number }) => boolean;
  isNodeLeaf?: (args: { node: any; nodeProps: TypeNodeProps }) => boolean;
  onNodeExpand?: (args: TypeNodeEvent) => boolean | void;
  onNodeCollapse?: (args: TypeNodeEvent) => boolean | void;
  onNodeExpandChange?: (args: TypeNodeExpandChange) => boolean | void;
  onExpandedNodesChange?: (args: TypeNodeExpandChange) => void;
  renderTreeExpandTool?: (args: {
    domProps: React.HTMLAttributes<HTMLElement>;
    size?: number;
  }) => React.ReactNode;
  renderTreeCollapseTool?: (args: {
    domProps: React.HTMLAttributes<HTMLElement>;
    size?: number;
  }) => React.ReactNode;
};
