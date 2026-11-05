# Note directive body levels

A colon Note body is nested inside the Note and content wrappers. Its block
parser level must reflect both wrappers while parsing; observational markers
remain zero-nesting tokens. Restore the host level even if body parsing throws.

Acceptance examples:

- `- :::note {type=info}` with two blank-separated body paragraphs renders two
  paragraphs inside note-content, without joining their text.
- The next list item and a paragraph after the list keep their ordinary shape.
- A real tight list inside the Note keeps hidden paragraph wrappers.
- Loose lists, nested lists, blockquotes and nested Notes retain body boundaries.
- Body and marker source maps remain absolute; resource notifications remain
  once per accepted Note. Legacy rendering remains unchanged.

Colon body token levels reflect the two emitted wrappers. Legacy Notes are
recognized after block parsing and retain their historical token-level metadata.
Migration equivalence needs to account for that known wrapper contribution
without ignoring ordinary body levels or hidden flags.
