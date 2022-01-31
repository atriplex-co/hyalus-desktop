import MarkdownIt from "markdown-it";
import MarkdownItEmoji from "markdown-it-emoji";
import MarkdownItLinkAttr from "markdown-it-link-attributes";
import highlight from "highlight.js";

export const RTCMaxMessageSize = 1024 * 16;

export const iceServers = [
  {
    urls: ["stun:stun.l.google.com:19302"],
  },
  {
    urls: ["stun:stun1.l.google.com:19302"],
  },
];

export const messageFormatter = new MarkdownIt("zero", {
  html: false,
  linkify: true,
  highlight(str, lang) {
    if (lang && highlight.getLanguage(lang)) {
      try {
        return highlight.highlight(str, {
          language: lang,
          ignoreIllegals: true,
        }).value;
      } catch {
        //
      }
    }

    return "";
  },
})
  .enable([
    "emphasis",
    "strikethrough",
    "backticks",
    "fence",
    "linkify",
    "block",
  ])
  .use(MarkdownItEmoji)
  .use(MarkdownItLinkAttr, {
    attrs: {
      target: "_blank",
      rel: "noopener noreferrer",
      class: "font-bold underline",
    },
  });
