import { mergeAttributes, Node } from "@tiptap/core";

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
        parseHTML: (element) =>
          element.getAttribute("data-label") ?? "Subscribe",
        renderHTML: (attributes) => ({
          "data-label":
            typeof attributes.label === "string"
              ? attributes.label
              : "Subscribe",
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

export function getTiptapExtensions() {
  return [PaywallDivider, SubscribeWidget];
}
