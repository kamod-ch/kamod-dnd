import type { JSX } from "preact";

const KEYWORDS = new Set([
  "as",
  "const",
  "export",
  "false",
  "from",
  "function",
  "if",
  "import",
  "let",
  "new",
  "null",
  "return",
  "true",
  "type",
  "typeof",
]);

type Token = { className: string; text: string };

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let plain = "";

  const flush = () => {
    if (!plain) return;
    tokens.push({ className: "text-foreground", text: plain });
    plain = "";
  };

  while (index < line.length) {
    if (line.startsWith("//", index)) {
      flush();
      tokens.push({ className: "text-muted-foreground italic", text: line.slice(index) });
      break;
    }

    const quote = line[index];
    if (quote === '"' || quote === "'" || quote === "`") {
      flush();
      let end = index + 1;
      while (end < line.length && line[end] !== quote) {
        if (line[end] === "\\") end += 1;
        end += 1;
      }
      tokens.push({
        className: "text-brand-hover",
        text: line.slice(index, Math.min(line.length, end + 1)),
      });
      index = end + 1;
      continue;
    }

    if (/[A-Za-z_$]/.test(line[index] ?? "")) {
      flush();
      let end = index + 1;
      while (end < line.length && /[\w$]/.test(line[end] ?? "")) end += 1;
      const word = line.slice(index, end);
      tokens.push({
        className: KEYWORDS.has(word) ? "font-medium text-brand" : "text-foreground",
        text: word,
      });
      index = end;
      continue;
    }

    plain += line[index];
    index += 1;
  }

  flush();
  return tokens;
}

export function HighlightedCode({ code }: { code: string }): JSX.Element {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <code>
      {lines.map((line, lineIndex) => {
        const tokens = tokenizeLine(line);
        return (
          <span key={lineIndex} class="flex min-w-full">
            <span class="w-8 shrink-0 select-none pr-3 text-right text-muted-foreground/70">
              {lineIndex + 1}
            </span>
            <span class="min-w-0 flex-1 whitespace-pre">
              {tokens.length > 0
                ? tokens.map((token, tokenIndex) => (
                    <span key={tokenIndex} class={token.className}>
                      {token.text}
                    </span>
                  ))
                : " "}
            </span>
          </span>
        );
      })}
    </code>
  );
}
