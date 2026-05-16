import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  EmbedNode,
  PaywallDivider,
  SubscribeWidget,
  SubstackImage,
  getTiptapExtensions,
} from "./extensions.js";

describe("PaywallDivider", () => {
  it("parses a div with the paywall attribute", () => {
    const result = PaywallDivider.config.parseHTML?.().at(0);
    assert.ok(result);
    assert.deepEqual(result, { tag: 'div[data-substack-cli-node="paywall"]' });
  });

  it("renders HTML with the paywall attribute", () => {
    const renderFn = PaywallDivider.config.renderHTML;
    assert.ok(renderFn);
    const result = renderFn({
      HTMLAttributes: {},
    }) as unknown[];
    assert.equal(result[0], "div");
    const attrs = result[1] as Record<string, string>;
    assert.equal(attrs["data-substack-cli-node"], "paywall");
  });
});

describe("SubscribeWidget", () => {
  it("parses a div with the subscribe-widget attribute", () => {
    const result = SubscribeWidget.config.parseHTML?.().at(0);
    assert.ok(result);
    assert.deepEqual(result, { tag: 'div[data-substack-cli-node="subscribe-widget"]' });
  });

  it("renders HTML with default label", () => {
    const renderFn = SubscribeWidget.config.renderHTML;
    assert.ok(renderFn);
    const result = renderFn({ HTMLAttributes: {} }) as unknown[];
    assert.equal(result[0], "div");
    const attrs = result[1] as Record<string, string>;
    assert.equal(attrs["data-substack-cli-node"], "subscribe-widget");
  });

  it("parses data-label from element", () => {
    const parseAttribute = SubscribeWidget.config.addAttributes?.().label?.parseHTML;
    assert.ok(parseAttribute);
    const el = { getAttribute: (name: string) => (name === "data-label" ? "Subscribe Now" : null) };
    assert.equal(parseAttribute(el as HTMLElement), "Subscribe Now");
  });

  it("falls back to Subscribe when data-label is missing", () => {
    const parseAttribute = SubscribeWidget.config.addAttributes?.().label?.parseHTML;
    assert.ok(parseAttribute);
    const el = { getAttribute: () => null };
    assert.equal(parseAttribute(el as HTMLElement), "Subscribe");
  });
});

describe("SubstackImage", () => {
  it("parses img[src] elements", () => {
    const result = SubstackImage.config.parseHTML?.().at(0);
    assert.ok(result);
    assert.deepEqual(result, { tag: "img[src]" });
  });

  it("renders an img element with merged attributes", () => {
    const renderFn = SubstackImage.config.renderHTML;
    assert.ok(renderFn);
    const result = renderFn({
      HTMLAttributes: { src: "https://example.com/image.png", alt: "Example" },
    }) as unknown[];
    assert.equal(result[0], "img");
    const attrs = result[1] as Record<string, string>;
    assert.equal(attrs.src, "https://example.com/image.png");
    assert.equal(attrs.alt, "Example");
  });

  it("parses image attributes from an element", () => {
    const addAttrs = SubstackImage.config.addAttributes;
    assert.ok(addAttrs);
    const attrs = addAttrs();
    const el = {
      getAttribute: (name: string) => {
        const map: Record<string, string> = {
          src: "https://example.com/photo.jpg",
          alt: "A photo",
          title: "Photo Title",
          "data-caption": "A nice photo",
        };
        return map[name] ?? null;
      },
    } as HTMLElement;

    assert.equal(attrs.src.parseHTML(el), "https://example.com/photo.jpg");
    assert.equal(attrs.alt.parseHTML(el), "A photo");
    assert.equal(attrs.title.parseHTML(el), "Photo Title");
    assert.equal(attrs.caption.parseHTML(el), "A nice photo");
  });

  it("normalizes null attributes to undefined", () => {
    const addAttrs = SubstackImage.config.addAttributes;
    assert.ok(addAttrs);
    const attrs = addAttrs();
    const _el = { getAttribute: () => null } as HTMLElement;

    assert.deepEqual(attrs.src.renderHTML({ src: null }), { src: undefined });
    assert.deepEqual(attrs.alt.renderHTML({ alt: null }), { alt: undefined });
    assert.deepEqual(attrs.title.renderHTML({ title: null }), { title: undefined });
    assert.deepEqual(attrs.caption.renderHTML({ caption: null }), { "data-caption": undefined });
  });
});

describe("EmbedNode", () => {
  it("parses a div with the embed attribute", () => {
    const result = EmbedNode.config.parseHTML?.().at(0);
    assert.ok(result);
    assert.deepEqual(result, { tag: 'div[data-substack-cli-node="embed"]' });
  });

  it("renders HTML with embed marker", () => {
    const renderFn = EmbedNode.config.renderHTML;
    assert.ok(renderFn);
    const result = renderFn({ HTMLAttributes: {} }) as unknown[];
    assert.equal(result[0], "div");
    const attrs = result[1] as Record<string, string>;
    assert.equal(attrs["data-substack-cli-node"], "embed");
  });

  it("parses embed attributes from an element", () => {
    const addAttrs = EmbedNode.config.addAttributes;
    assert.ok(addAttrs);
    const attrs = addAttrs();
    const el = {
      getAttribute: (name: string) => {
        const map: Record<string, string> = {
          "data-url": "https://youtube.com/watch?v=abc123",
          "data-embed-type": "youtube",
        };
        return map[name] ?? null;
      },
    } as HTMLElement;

    assert.equal(attrs.url.parseHTML(el), "https://youtube.com/watch?v=abc123");
    assert.equal(attrs.embedType.parseHTML(el), "youtube");
  });

  it("defaults embedType to 'url' when data-embed-type is missing", () => {
    const addAttrs = EmbedNode.config.addAttributes;
    assert.ok(addAttrs);
    const attrs = addAttrs();
    const el = { getAttribute: () => null } as HTMLElement;
    assert.equal(attrs.embedType.parseHTML(el), "url");
  });
});

describe("getTiptapExtensions", () => {
  it("returns all custom extensions plus table extensions", () => {
    const extensions = getTiptapExtensions();
    assert.equal(extensions.length, 8);
    assert.equal(extensions[0]?.name, "paywallDivider");
    assert.equal(extensions[1]?.name, "subscribeWidget");
    assert.equal(extensions[2]?.name, "image");
    assert.equal(extensions[3]?.name, "embedNode");
  });
});
