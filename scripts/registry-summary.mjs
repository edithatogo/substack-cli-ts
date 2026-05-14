import { loadRegistryServerMetadata, summarizeRegistryServerMetadata } from "../dist/registry/metadata.js";

const metadata = loadRegistryServerMetadata();
const summary = summarizeRegistryServerMetadata(metadata);

console.log(JSON.stringify(summary, null, 2));


