/*
 * Fixture page for the mobile tree at the scale an organisation table in a
 * consuming application reaches: thousands of rows, one parent holding most of
 * them. Every name here is invented. Deliberately left out of `exampleCatalog` and `exampleMeta`, so it is
 * reachable only at /examples/hierarchy-scale and nothing in the docs or the
 * catalog tests sees it. Delete the file and its two routes to remove it.
 */
import * as React from "react";
import ReactDataGrid from "../../src/ReactDataGrid";
import type {
  TypeColumns,
  TypeFilterValue,
  TypeMobileListRows,
  TypeMobileTransformProps,
} from "../../src/types";
import { resolveThemeBase } from "../../src/theme/context";
import { useExamplesUi } from "./App";

type OrgNode = {
  orgid: number;
  clientnr: number;
  orgname: string;
  parent_orgid: number | null;
  contact_email: string;
  nodes?: OrgNode[];
};

const columns: TypeColumns = [
  { name: "orgname", header: "Organization", defaultFlex: 2, minWidth: 240 },
  { name: "orgid", header: "Org #", type: "number", width: 110 },
  { name: "clientnr", header: "Client #", type: "number", width: 120 },
  {
    name: "contact_email",
    header: "Email",
    defaultFlex: 1,
    minWidth: 200,
    filterable: false,
  },
];

const SUFFIXES = [
  "Holding",
  "Logistik",
  "Handel",
  "Service",
  "Technik",
  "Bau",
  "Consulting",
  "Medien",
];

/*
 * An organisation table of this shape usually keeps a parent id on a flat
 * list, so a tree grid needs the nested shape built first. Doing it here keeps
 * the page honest about the work a migration would carry.
 */
function nest(rows: OrgNode[]) {
  const byId = new Map(rows.map((row) => [row.orgid, { ...row }]));
  const roots: OrgNode[] = [];
  for (const row of byId.values()) {
    const parent = row.parent_orgid == null ? null : byId.get(row.parent_orgid);
    if (!parent) {
      roots.push(row);
      continue;
    }
    parent.nodes = parent.nodes ?? [];
    parent.nodes.push(row);
  }
  return roots;
}

function buildOrgs(bigBranchSize: number) {
  const rows: OrgNode[] = [];
  let nextId = 1000;
  const add = (orgname: string, parent: number | null) => {
    const orgid = nextId++;
    rows.push({
      orgid,
      clientnr: 40000 + orgid,
      orgname,
      parent_orgid: parent,
      contact_email: `office@${orgname.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.example`,
    });
    return orgid;
  };

  // The shape that matters: one root carrying thousands of direct children.
  const big = add("Quellrand Group", null);
  for (let index = 0; index < bigBranchSize; index++) {
    const child = add(
      `${SUFFIXES[index % SUFFIXES.length]} ${String(index + 1).padStart(4, "0")}`,
      big
    );
    // A slice of them nest one deeper, so depth is exercised too.
    if (index % 50 === 0) {
      for (let sub = 0; sub < 6; sub++) {
        add(`Standort ${index + 1}-${sub + 1}`, child);
      }
    }
  }

  // A couple of ordinary roots so the roots themselves are a normal list.
  for (const name of ["Zabrik AG", "Mirovel GmbH", "Torneby KG"]) {
    const root = add(name, null);
    for (let index = 0; index < 8; index++) {
      add(`${name.split(" ")[0]} Filiale ${index + 1}`, root);
    }
  }

  return { rows, roots: nest(rows) };
}

const BRANCH_SIZES = [500, 2000, 5000] as const;

/*
 * `orgid` filters as a string so the operator can be `contains`, which is what
 * such a table usually wants: an org number is looked up by fragment far more
 * often than by an exact match. Filtering here goes through the grid, so
 * unlike the mobile toolbar's search it reveals a match inside a closed branch.
 */
const initialFilters: TypeFilterValue = [
  { name: "orgname", type: "string", operator: "contains", value: "" },
  { name: "orgid", type: "string", operator: "contains", value: "" },
];

/*
 * The "brief": whatever `renderRowDetails` returns is mounted inside the open
 * row, so a consumer's own component lands here unchanged.
 */
function OrgBrief({ org }: { org: OrgNode }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <span className="text-muted-foreground">
          Org #<span className="ml-1 text-foreground">{org.orgid}</span>
        </span>
        <span className="text-muted-foreground">
          Client #<span className="ml-1 text-foreground">{org.clientnr}</span>
        </span>
        <span className="text-muted-foreground">
          Parent
          <span className="ml-1 text-foreground">
            {org.parent_orgid ?? "none"}
          </span>
        </span>
      </div>
      <p className="text-muted-foreground">
        Contact <span className="text-foreground">{org.contact_email}</span>
      </p>
      <div className="flex flex-col gap-1">
        <span className="font-medium text-foreground">Provisioned</span>
        <ul className="flex flex-wrap gap-2">
          {["AV", "XDR", "MAIL", "WEB"].map((product) => (
            <li
              key={product}
              className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground"
            >
              {product}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function HierarchyScaleExample() {
  const { gridTheme, i18n } = useExamplesUi();
  const gridThemeBase = resolveThemeBase(gridTheme);
  const [branchSize, setBranchSize] =
    React.useState<(typeof BRANCH_SIZES)[number]>(2000);
  const [pageSize, setPageSize] = React.useState(25);
  const [scroll, setScroll] = React.useState<"container" | "page">("page");
  const [insetBackground, setInsetBackground] = React.useState(true);
  const [indent, setIndent] = React.useState(16);
  const [briefHeight, setBriefHeight] = React.useState(260);
  const [listRows, setListRows] = React.useState<TypeMobileListRows>("divided");

  const { rows, roots } = React.useMemo(
    () => buildOrgs(branchSize),
    [branchSize]
  );
  const briefRecords = React.useMemo(() => rows.slice(0, 400), [rows]);

  const mobileTransform: TypeMobileTransformProps = {
    scroll,
    listRows,
    pageSize,
    showMoreStep: pageSize,
    breakpoint: 1024,
    showSettings: true,
    settingsSurface: "drawer",
    showSearch: true,
    showSort: true,
    showResultCount: true,
  };

  return (
    <div
      className="flex min-h-screen flex-col gap-4 bg-background p-4"
      data-testid="hierarchy-scale"
      // The surface has to follow the grid's theme, not the site's, or a light
      // grid theme lands on a dark page and takes its text with it.
      data-theme={gridThemeBase === "default" ? undefined : gridTheme}
      data-theme-base={gridThemeBase === "default" ? undefined : gridThemeBase}
      style={
        {
          "--tdg-mobile-tree-indent": `${indent}px`,
          ...(insetBackground
            ? {}
            : { "--tdg-mobile-row-indent-inset": "0px" }),
        } as React.CSSProperties
      }
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">
          Hierarchy at scale
        </h1>
        <p className="text-sm text-muted-foreground">
          {rows.length.toLocaleString()} organisations, {roots.length} roots,
          and one root holding {branchSize.toLocaleString()} direct children.
          Narrow the window below 1024px for the mobile layout.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Children</span>
          <select
            className="rounded border border-border bg-background px-2 py-1"
            value={branchSize}
            onChange={(event) =>
              setBranchSize(
                Number(event.target.value) as (typeof BRANCH_SIZES)[number]
              )
            }
          >
            {BRANCH_SIZES.map((size) => (
              <option key={size} value={size}>
                {size.toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Branch page</span>
          <select
            className="rounded border border-border bg-background px-2 py-1"
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div
          className="flex items-center gap-1 rounded-md border border-border p-0.5"
          role="group"
          aria-label="List row style"
        >
          {(["divided", "boxed"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={listRows === option}
              onClick={() => setListRows(option)}
              className={
                listRows === option
                  ? "rounded px-2 py-1 bg-foreground text-background"
                  : "rounded px-2 py-1 text-muted-foreground"
              }
            >
              {option}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Scroll</span>
          <select
            className="rounded border border-border bg-background px-2 py-1"
            value={scroll}
            onChange={(event) =>
              setScroll(event.target.value as "container" | "page")
            }
          >
            <option value="container">container</option>
            <option value="page">page</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Indent</span>
          <input
            type="range"
            min={0}
            max={32}
            value={indent}
            onChange={(event) => setIndent(Number(event.target.value))}
          />
          <span className="tabular-nums text-muted-foreground">{indent}px</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={insetBackground}
            onChange={(event) => setInsetBackground(event.target.checked)}
          />
          <span className="text-muted-foreground">Inset open background</span>
        </label>
      </div>

      <div
        data-testid="hierarchy-scale-grid"
        className={
          scroll === "page"
            ? "min-w-0"
            : "h-[560px] min-w-0 border-t border-border"
        }
      >
        <ReactDataGrid
          theme={gridTheme}
          i18n={i18n}
          idProperty="orgid"
          columns={columns}
          dataSource={roots}
          treeEnabled
          treeBranchPageSize={pageSize}
          nodesProperty="nodes"
          treeColumn="orgname"
          generateIdFromPath
          allowMobileTransform
          mobileTransform={mobileTransform}
          virtualized
          enableFiltering
          defaultFilterValue={initialFilters}
          columnUserSelect
        />
      </div>

      <header className="mt-6 flex flex-col gap-1 border-t border-border pt-4">
        <h2 className="text-base font-semibold text-foreground">
          Brief, through the list variant
        </h2>
        <p className="text-sm text-muted-foreground">
          A flat grid of {briefRecords.length} organisations with{" "}
          <code>renderRowDetails</code>. On desktop the panel takes a fixed{" "}
          <code>rowExpandHeight</code> and scrolls whatever does not fit, which
          is the Inovua behaviour; drag the slider down to see it. The mobile
          list sizes the same panel to its content instead, since a scroll
          region inside a scrolling page is its own problem.
        </p>
        <label className="mt-1 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Brief height (desktop)</span>
          <input
            type="range"
            min={160}
            max={420}
            step={20}
            value={briefHeight}
            onChange={(event) => setBriefHeight(Number(event.target.value))}
          />
          <span className="tabular-nums text-muted-foreground">
            {briefHeight}px
          </span>
        </label>
      </header>

      <div
        data-testid="hierarchy-scale-brief-grid"
        className={
          scroll === "page"
            ? "min-w-0"
            : "h-[560px] min-w-0 border-t border-border"
        }
      >
        <ReactDataGrid
          theme={gridTheme}
          i18n={i18n}
          idProperty="orgid"
          columns={columns}
          dataSource={briefRecords}
          enableRowExpand
          multiRowExpand
          rowExpandHeight={briefHeight}
          renderRowDetails={({ data }) => <OrgBrief org={data as OrgNode} />}
          allowMobileTransform
          mobileTransform={mobileTransform}
          virtualized
          enableFiltering
          defaultFilterValue={initialFilters}
          columnUserSelect
        />
      </div>

      <header className="mt-6 flex flex-col gap-1 border-t border-border pt-4">
        <h2 className="text-base font-semibold text-foreground">
          Desktop &quot;Show more&quot;, with no library change
        </h2>
        <p className="text-sm text-muted-foreground">
          <code>renderPaginationToolbar</code> replaces the pager, and the props
          it is handed carry <code>onLimitChange</code> and{" "}
          <code>totalCount</code>, so a show-more is that control growing the
          limit. Local pagination sorts and filters the whole set before
          slicing, so the revealed rows are the right ones.
        </p>
      </header>

      <div data-testid="hierarchy-scale-showmore-grid" className="min-w-0">
        <ReactDataGrid
          theme={gridTheme}
          i18n={i18n}
          idProperty="orgid"
          columns={columns}
          dataSource={briefRecords}
          pagination="local"
          defaultLimit={25}
          renderPaginationToolbar={({ limit, totalCount, onLimitChange }) =>
            limit < totalCount ? (
              /* The shell rules a line above this slot and pads it top and
                 bottom, but not at the sides, so the inset that keeps the
                 hover fill off the grid's own border comes from here. */
              <div className="px-2">
                <button
                  type="button"
                  className="w-full rounded-md py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  onClick={() =>
                    onLimitChange(Math.min(limit + 25, totalCount))
                  }
                >
                  Show more ({totalCount - limit})
                </button>
              </div>
            ) : null
          }
          enableRowExpand
          renderRowDetails={({ data }) => <OrgBrief org={data as OrgNode} />}
          allowMobileTransform
          mobileTransform={mobileTransform}
          enableFiltering
          defaultFilterValue={initialFilters}
          columnUserSelect
        />
      </div>
    </div>
  );
}
