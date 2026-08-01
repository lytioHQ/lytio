# Sales Analysis Prompts

## Versions

| Version | File | Status | Changes |
|---------|------|--------|---------|
| v1 | 1.md | ✅ Active | Initial sales analysis prompt |

## Template Variables

| Variable | Description |
|----------|-------------|
| {{sheet_name}} | Worksheet name |
| {{column_count}} | Number of columns |
| {{column_info}} | Column list with detected types |
| {{row_count}} | Number of data rows |
| {{data_text}} | Formatted data sample |
| {{language_instruction}} | Language directive |
| {{today}} | Current date |

## Adding a New Version

1. Copy 1.md → 2.md 
2. Increment ersion in frontmatter
3. Update prompt_builder.py default version
