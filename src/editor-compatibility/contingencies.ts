import type { ProseMirrorNode } from "../types.js";
import type { EditorCompatibilityAssessment } from "./diagnostics.js";

/**
 * Transforms tables containing unsupported tableHeader nodes into accessible,
 * labelled bullet lists. Preserves all text content while removing the table structure
 * that causes Substack primary editor deserialization failures.
 */
export function normalizeTablesToAccessibleLists(document: ProseMirrorNode): ProseMirrorNode {
  function transformNode(node: ProseMirrorNode): ProseMirrorNode {
    if (node.type === "table") {
      return convertTableToBulletList(node);
    }

    if (!node.content || node.content.length === 0) {
      return { ...node };
    }

    return {
      ...node,
      content: node.content.map(transformNode),
    };
  }

  return transformNode(document);
}

function extractCellText(cellNode: ProseMirrorNode): string {
  const parts: string[] = [];
  function collect(n: ProseMirrorNode): void {
    if (n.type === "text" && n.text) {
      parts.push(n.text);
    }
    n.content?.forEach(collect);
  }
  collect(cellNode);
  return parts.join(" ").trim();
}

function convertTableToBulletList(tableNode: ProseMirrorNode): ProseMirrorNode {
  const rows = tableNode.content ?? [];
  if (rows.length === 0) {
    return {
      type: "paragraph",
      content: [{ type: "text", text: "[Empty Table]" }],
    };
  }

  // First row often contains headers
  const headerRow = rows[0]?.content ?? [];
  const headers = headerRow.map((cell, idx) => {
    const text = extractCellText(cell);
    return text.length > 0 ? text : `Column ${idx + 1}`;
  });

  const dataRows = rows.slice(1);
  const listItems: ProseMirrorNode[] = [];

  for (const row of dataRows) {
    const cells = row.content ?? [];
    const itemEntries: string[] = [];

    cells.forEach((cell, idx) => {
      const headerLabel = headers[idx] ?? `Column ${idx + 1}`;
      const cellValue = extractCellText(cell);
      if (cellValue.length > 0) {
        itemEntries.push(`${headerLabel}: ${cellValue}`);
      }
    });

    if (itemEntries.length > 0) {
      listItems.push({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: itemEntries.join(" | ") }],
          },
        ],
      });
    }
  }

  // If table only had a header row or no data rows, represent headers as an item
  if (listItems.length === 0) {
    listItems.push({
      type: "listItem",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: headers.join(" | ") }],
        },
      ],
    });
  }

  return {
    type: "bulletList",
    content: listItems,
  };
}

/**
 * Assesses operational risk for draft/published write workflows and advises
 * whether a write should be blocked or routed to a contingency.
 */
export function evaluateEditorOperationalPolicy(assessment: EditorCompatibilityAssessment): {
  canProceedWithPrimaryWrite: boolean;
  hardBlockReason?: string | undefined;
  remediationAdvice?: string | undefined;
  contingencyRecommended?: "cli-update-in-place" | "table-normalization" | undefined;
} {
  // Hard stop on primary editor incompatibility (e.g. tableHeader)
  if (!assessment.primaryEditor.ok) {
    const headers = assessment.primaryEditor.tableHeaderCount;
    return {
      canProceedWithPrimaryWrite: false,
      hardBlockReason: `Primary editor schema rejection: document contains ${headers} unsupported tableHeader node(s).`,
      remediationAdvice:
        "Substack primary editor rejects tableHeader nodes (Unknown node type: tableHeader). " +
        "Run table normalization to convert tables to accessible labelled lists, or replace tableHeader with tableCell.",
      contingencyRecommended: "table-normalization",
    };
  }

  // Auxiliary editor risk
  if (assessment.auxiliaryEditor.riskLevel === "high") {
    return {
      canProceedWithPrimaryWrite: true,
      remediationAdvice:
        "Auxiliary editor risk: document contains rich nodes (headings/images/blockquotes/lists) " +
        "that are known to trigger Substack secondary editor crash alerts on published revisions. " +
        "Use CLI-only update-in-place as an operational contingency if browser editing displays 'Something has gone wrong'.",
      contingencyRecommended: "cli-update-in-place",
    };
  }

  return {
    canProceedWithPrimaryWrite: true,
  };
}
