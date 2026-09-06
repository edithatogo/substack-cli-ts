import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outDir = resolve(repoRoot, "fixtures/prosemirror/editor-compatibility");

function textNode(text, marks) {
  const node = { type: "text", text };
  if (marks && marks.length > 0) {
    node.marks = marks;
  }
  return node;
}

function pNode(text, marks) {
  return {
    type: "paragraph",
    content: [textNode(text, marks)],
  };
}

function headingNode(level, text) {
  return {
    type: "heading",
    attrs: { level },
    content: [textNode(text)],
  };
}

function imageNode(src, alt = "") {
  return {
    type: "image",
    attrs: {
      src,
      alt,
      title: null,
    },
  };
}

function blockquoteNode(text) {
  return {
    type: "blockquote",
    content: [pNode(text)],
  };
}

function bulletListNode(items) {
  return {
    type: "bulletList",
    content: items.map((item) => ({
      type: "listItem",
      content: [pNode(item)],
    })),
  };
}

function orderedListNode(items) {
  return {
    type: "orderedList",
    attrs: { order: 1 },
    content: items.map((item) => ({
      type: "listItem",
      content: [pNode(item)],
    })),
  };
}

function makeTableHeader(title) {
  return {
    type: "tableHeader",
    attrs: { colspan: 1, rowspan: 1, colwidth: null, align: null },
    content: [pNode(title)],
  };
}

function makeTableCell(value) {
  return {
    type: "tableCell",
    attrs: { colspan: 1, rowspan: 1, colwidth: null, align: null },
    content: [pNode(value)],
  };
}

function makeTable(headers, dataRows) {
  return {
    type: "table",
    content: [
      {
        type: "tableRow",
        content: headers.map((h) => makeTableHeader(h)),
      },
      ...dataRows.map((row) => ({
        type: "tableRow",
        content: row.map((cell) => makeTableCell(cell)),
      })),
    ],
  };
}

const fixtures = {
  // Rich published pilot control (post 210551946 reproduction)
  "rich-pilot-control.json": {
    id: "210551946",
    title: "Moral Economics: The Pilot Essay",
    description: "Synthetic reproduction of published pilot post with rich content and no tables",
    document: {
      type: "doc",
      content: [
        headingNode(1, "Moral Economics: The Pilot Essay"),
        pNode("An inquiry into the moral foundations of economic institutions.", [{ type: "bold" }]),
        imageNode("https://substackcdn.com/image/fetch/pilot-synthetic-chart.png", "Pilot Analytical Model"),
        pNode("Explore the full empirical dataset in the appendix.", [
          { type: "link", attrs: { href: "https://example.com/data" } },
        ]),
        blockquoteNode("Institutions are the rules of the game in a society or the humanly devised constraints that shape human interaction."),
        bulletListNode([
          "First premise: Information asymmetries distort moral coordination.",
          "Second premise: Clutter disguises operational friction as safety.",
          "Third premise: Verification requires independent auditability.",
        ]),
        orderedListNode([
          "Audit existing reporting mechanisms.",
          "Establish verifiable consensus thresholds.",
        ]),
        pNode("Concluded with verifiable observations."),
      ],
    },
  },

  // Cover control (post 210552674 reproduction)
  "cover-control.json": {
    id: "210552674",
    title: "Season 1: Moral Economics Series Cover",
    description: "Paragraph-only passing cover control with no rich nodes or tables",
    document: {
      type: "doc",
      content: [
        pNode("Season 1: Collected Essays on Moral Economics", [{ type: "bold" }]),
        pNode("A multi-part inquiry into institutional accountability, measurement drift, and publication safety."),
        pNode("All essays in this series are scheduled for release throughout Autumn 2026."),
        pNode("Read introduction and overview.", [
          { type: "link", attrs: { href: "https://example.com/season-1" } },
        ]),
      ],
    },
  },

  // ME-001: 7 tableHeaders across 2 tables (4 + 3)
  "me-001-tables.json": {
    id: "210552872",
    title: "Moral Economics 001: Epistemic Arbitrage",
    description: "Scheduled essay with 2 tables containing exactly 7 tableHeader nodes (4 + 3)",
    document: {
      type: "doc",
      content: [
        headingNode(1, "Moral Economics 001: Epistemic Arbitrage"),
        pNode("Examines how information brokers exploit epistemic delay."),
        makeTable(
          ["Market Actor", "Information Lag", "Extraction Rate", "Risk Level"],
          [["High-Frequency Trader", "0.2ms", "94.2%", "Elevated"]]
        ),
        pNode("Secondary comparative breakdown across regulatory jurisdictions:"),
        makeTable(
          ["Jurisdiction", "Disclosure Window", "Enforcement Rate"],
          [["North America", "30 days", "61.4%"]]
        ),
        imageNode("https://substackcdn.com/image/fetch/me001-arbitrage.png", "Arbitrage Spread"),
        bulletListNode([
          "Delay creates unhedged externalities.",
          "Transparency reduces structural rent-seeking.",
        ]),
      ],
    },
  },

  // ME-002: 7 tableHeaders across 2 tables (4 + 3)
  "me-002-tables.json": {
    id: "210552983",
    title: "Moral Economics 002: Institutional Sunk Costs",
    description: "Scheduled essay with 2 tables containing exactly 7 tableHeader nodes (4 + 3)",
    document: {
      type: "doc",
      content: [
        headingNode(1, "Moral Economics 002: Institutional Sunk Costs"),
        pNode("Why decaying systems persist beyond rational justification."),
        makeTable(
          ["Capital Tier", "Historical Outlay", "Maintenance Cost", "Abandonment Barrier"],
          [["Tier 1 Infrastructure", "$4.2B", "$120M/yr", "Extreme"]]
        ),
        pNode("Comparative analysis of governance review cycles:"),
        makeTable(
          ["Review Board", "Mandate Scope", "Quorum Threshold"],
          [["Oversight Committee", "Full Audit", "75%"]]
        ),
        blockquoteNode("We build institutions to outlast our lifespans, then suffer when they succeed at persisting."),
      ],
    },
  },

  // ME-003: 4 tableHeaders across 1 table (4)
  "me-003-tables.json": {
    id: "210553075",
    title: "Moral Economics 003: The Compliance Theatre Paradox",
    description: "Scheduled essay with 1 table containing exactly 4 tableHeader nodes",
    document: {
      type: "doc",
      content: [
        headingNode(1, "Moral Economics 003: The Compliance Theatre Paradox"),
        pNode("When checklist adherence substitutes for genuine operational reliability."),
        makeTable(
          ["Protocol Name", "Checklist Steps", "Incident Correlation", "Staff Overhead"],
          [
            ["ISO-Standard Checklist", "142 items", "-0.04 (null)", "18.5 hrs/wk"],
            ["Empirical Safety Audit", "12 items", "+0.72 (strong)", "2.1 hrs/wk"],
          ]
        ),
        bulletListNode([
          "Checklist growth crowds out critical anomaly detection.",
          "High-reliability organizations minimize cosmetic formalities.",
        ]),
      ],
    },
  },

  // ME-004: 4 tableHeaders across 1 table (4)
  "me-004-tables.json": {
    id: "210553156",
    title: "Moral Economics 004: Metric Fixation and Goodhart Decay",
    description: "Scheduled essay with 1 table containing exactly 4 tableHeader nodes",
    document: {
      type: "doc",
      content: [
        headingNode(1, "Moral Economics 004: Metric Fixation and Goodhart Decay"),
        pNode("Any metric optimized to target ceases to be an accurate measure."),
        makeTable(
          ["Target Indicator", "Original Baseline", "Target Value", "Proxy Gaming Index"],
          [
            ["Publication Velocity", "2.1 posts/wk", "5.0 posts/wk", "0.88"],
            ["Subscriber Growth", "150/mo", "500/mo", "0.76"],
          ]
        ),
        blockquoteNode("When a measure becomes a target, it ceases to be a good measure."),
      ],
    },
  },

  // ME-005: 8 tableHeaders across 2 tables (4 + 4)
  "me-005-tables.json": {
    id: "210553256",
    title: "Moral Economics 005: Decentralized Consensus and Trust Anchors",
    description: "Scheduled essay with 2 tables containing exactly 8 tableHeader nodes (4 + 4)",
    document: {
      type: "doc",
      content: [
        headingNode(1, "Moral Economics 005: Decentralized Consensus and Trust Anchors"),
        pNode("Evaluating resilience against distributed consensus failures."),
        makeTable(
          ["Consensus Mechanism", "Fault Tolerance", "Liveness Bound", "Finality Time"],
          [["Deterministic State Machine", "33% Byzantine", "Synchronous", "2.4s"]]
        ),
        pNode("Validator cohort distribution:"),
        makeTable(
          ["Cohort Group", "Node Count", "Stake Weight", "Geographic Diversity"],
          [["Core Validators", "64", "48.2%", "High"]]
        ),
        imageNode("https://substackcdn.com/image/fetch/me005-consensus.png", "Consensus Topology"),
      ],
    },
  },

  // ME-006: 11 tableHeaders across 3 tables (4 + 4 + 3)
  "me-006-tables.json": {
    id: "210553389",
    title: "Moral Economics 006: Synthesis and Post-Clutter Governance",
    description: "Scheduled essay with 3 tables containing exactly 11 tableHeader nodes (4 + 4 + 3)",
    document: {
      type: "doc",
      content: [
        headingNode(1, "Moral Economics 006: Synthesis and Post-Clutter Governance"),
        pNode("Comprehensive synthesis of Season 1 empirical findings."),
        makeTable(
          ["Domain Area", "Pre-Reform Clutter", "Post-Reform Efficacy", "Net Cost Delta"],
          [["Safety Reporting", "84 forms", "92% verified", "-34%"]]
        ),
        pNode("Secondary validation table:"),
        makeTable(
          ["Metric Stream", "Raw Volume", "Normalized Signal", "Noise Ratio"],
          [["Diagnostic Telemetry", "1.2M/day", "0.94", "0.06"]]
        ),
        pNode("Final governance policy matrix:"),
        makeTable(
          ["Policy Stage", "Approval Quorum", "Rollback Protocol"],
          [["Phase 4 Deployment", "100% Unanimous", "Automated"]]
        ),
        bulletListNode([
          "Synthesis confirms systematic clutter reduction raises reliability.",
          "Verification receipts provide tamper-evident assurance.",
        ]),
      ],
    },
  },
};

async function main() {
  await mkdir(outDir, { recursive: true });
  for (const [filename, data] of Object.entries(fixtures)) {
    const filePath = resolve(outDir, filename);
    await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    console.log(`Generated ${filename}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
