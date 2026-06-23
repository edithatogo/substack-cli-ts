import { mergeAttributes, Node } from "@tiptap/core";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";

interface SubstackImageAttributes {
  src: string | null;
  alt: string | null;
  title: string | null;
  caption: string | null;
}

interface EmbedNodeAttributes {
  url: string | null;
  embedType: string | null;
}

export const PaywallDivider = Node.create({
  name: "paywallDivider",
  group: "block",
  atom: true,

  parseHTML() {
    return [{ tag: 'div[data-substack-cli-node="paywall"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-substack-cli-node": "paywall",
      }),
    ];
  },
});

export const SubscribeWidget = Node.create({
  name: "subscribeWidget",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      label: {
        default: "Subscribe",
        parseHTML: (element) => element.getAttribute("data-label") ?? "Subscribe",
        renderHTML: (attributes) => ({
          "data-label": typeof attributes.label === "string" ? attributes.label : "Subscribe",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-substack-cli-node="subscribe-widget"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-substack-cli-node": "subscribe-widget",
      }),
    ];
  },
});

export const SubstackImage = Node.create({
  name: "image",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("src"),
        renderHTML: (attributes: SubstackImageAttributes) => ({
          src: normalizeAttribute(attributes.src),
        }),
      },
      alt: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("alt"),
        renderHTML: (attributes: SubstackImageAttributes) => ({
          alt: normalizeAttribute(attributes.alt),
        }),
      },
      title: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("title"),
        renderHTML: (attributes: SubstackImageAttributes) => ({
          title: normalizeAttribute(attributes.title),
        }),
      },
      caption: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-caption"),
        renderHTML: (attributes: SubstackImageAttributes) => ({
          "data-caption": normalizeAttribute(attributes.caption),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },
});

export const EmbedNode = Node.create({
  name: "embedNode",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      url: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-url"),
        renderHTML: (attributes: EmbedNodeAttributes) => ({
          "data-url": normalizeAttribute(attributes.url),
        }),
      },
      embedType: {
        default: "url",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-embed-type") ?? "url",
        renderHTML: (attributes: EmbedNodeAttributes) => ({
          "data-embed-type": attributes.embedType ?? "url",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-substack-cli-node="embed"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-substack-cli-node": "embed",
      }),
    ];
  },
});

export function getTiptapExtensions() {
  return [
    PaywallDivider,
    SubscribeWidget,
    SubstackImage,
    EmbedNode,
    Table.configure({
      resizable: false,
      allowTableNodeSelection: false,
    }),
    TableRow,
    TableCell,
    TableHeader,
  ];
}

function normalizeAttribute(value: string | null): string | undefined {
  return value ?? undefined;
}
