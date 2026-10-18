import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { docsFaviconHeadLinks } from "@kamod-ch/brand";
import { defineConfig } from "@kamod-ch/preactpress/config";
import { getThemeInitScript } from "@kamod-ch/themes";
import tailwindcss from "@tailwindcss/vite";

const configDir = dirname(fileURLToPath(import.meta.url));
const dndRoot = resolve(configDir, "../../core");
const isGithubPages =
  process.env.GITHUB_ACTIONS === "true" || process.env.KAMOD_DOCS_BASE === "github-pages";
const base = process.env.VITE_BASE_PATH ?? (isGithubPages ? "/kamod-dnd/" : "/");

function publicUrl(assetPath: string): string {
  const prefix = base === "/" ? "" : base.replace(/\/$/, "");
  return `${prefix}/${assetPath.replace(/^\//, "")}`;
}

export default defineConfig({
  theme: "./theme/Layout.tsx",
  srcExclude: [
    "README.md",
    "dist/**",
    "components/**",
    "styles/**",
    "public/**",
    "node_modules/**",
  ],
  site: {
    title: "kamod dnd",
    description:
      "Headless Preact drag-and-drop for sortable lists and cross-container transfers — signals, keyboard, and accessible announcements.",
    url: "https://kamod-ch.github.io/kamod-dnd/",
    base,
  },
  markdown: {
    html: false,
    linkify: true,
    typographer: true,
  },
  head: [
    ["meta", { name: "theme-color", content: "#0d9488" }],
    ...docsFaviconHeadLinks(base),
    ["link", { rel: "stylesheet", href: publicUrl("styles/logo.css") }],
    [
      "link",
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
      },
    ],
    ["script", { type: "text/javascript" }, getThemeInitScript({ defaultScheme: "system" })],
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ["preact", "preact/hooks", "@preact/signals"],
    },
    server: {
      fs: {
        allow: [resolve(configDir, ".."), dndRoot],
      },
    },
    ssr: {
      noExternal: [
        "@kamod-ch/brand",
        "@kamod-ch/dnd",
        "@kamod-ch/themes",
        "@atlaskit/pragmatic-drag-and-drop",
        "@atlaskit/pragmatic-drag-and-drop-auto-scroll",
        "@atlaskit/pragmatic-drag-and-drop-hitbox",
        "@preact/signals",
        "preact",
        "preact/hooks",
      ],
    },
  },
  themeConfig: {
    outline: true,
    search: true,
    lastUpdated: true,
    footer: "Released under the MIT License.\n\nCopyright © 2026 Klaus Zahiragic - www.kamod.ch",
    editLink: {
      text: "Edit this page",
      pattern: "https://github.com/kamod-ch/kamod-dnd/edit/main/packages/docs/:path",
    },
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/kamod-ch/kamod-dnd",
        ariaLabel: "kamod dnd on GitHub",
      },
    ],
    nav: [
      { text: "Docs", link: "/" },
      { text: "Examples", link: "/examples/" },
    ],
    sidebar: [
      {
        text: "Getting started",
        items: [
          { text: "Introduction", link: "/" },
          { text: "Installation", link: "/#installation" },
        ],
      },
      {
        text: "Guides",
        items: [
          { text: "Examples", link: "/examples/" },
          { text: "Hierarchical trees", link: "/guides/tree/" },
        ],
      },
    ],
  },
});
