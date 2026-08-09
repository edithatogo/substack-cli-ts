# Risks

| Risk | Control | Residual blocker |
| --- | --- | --- |
| Broad coercion changes meaning | Accept only trimmed decimal integer strings for two pagination fields | Future numeric inputs need explicit review |
| Runtime and advertised schemas drift | Generate both from the same exported Zod object map | Output schemas remain separate future work |
| Unknown LLM fields hide prompt errors | Use strict objects for every tool, including empty inputs | Clients must surface MCP validation errors clearly |
| Converter emits incomplete schema | Compatibility probe rejected empty `zod-to-json-schema` output; use native Zod 4 export | Reassess only if upstream behavior changes |
| Missing descriptions weaken tool calls | Describe all accepted fields and assert representative metadata | Tool-level descriptions remain maintained in the catalog |
| Shared schema change affects multiple tools | One-to-one map and catalog tests expose all consumers | Intentional shared changes still require review |
