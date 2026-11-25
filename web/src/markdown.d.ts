// Markdown files imported with `with { loader: 'text' }` (the privacy notice, H-180) are bundled as their text.
declare module '*.md' {
  const text: string;
  export default text;
}
