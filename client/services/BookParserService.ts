import * as FileSystem from "expo-file-system";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

export interface BookMetadata {
  title: string;
  author: string;
  description?: string;
  coverUri?: string;
  language?: string;
  publisher?: string;
  publishDate?: string;
}

export interface BookChapter {
  id: string;
  title: string;
  href: string;
  order: number;
}

export interface ParsedBook {
  metadata: BookMetadata;
  chapters: BookChapter[];
  content: string;
  toc: BookChapter[];
  totalPages: number;
}

export interface Fb2Section {
  title?: string;
  content: string;
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: true,
  trimValues: true,
});

export class BookParserService {
  static async parseBook(fileUri: string, fileType: string): Promise<ParsedBook> {
    switch (fileType) {
      case "epub":
        return this.parseEpub(fileUri);
      case "fb2":
        return this.parseFb2(fileUri);
      case "pdf":
        return this.parsePdf(fileUri);
      case "txt":
        return this.parseTxt(fileUri);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  static async parseEpub(fileUri: string): Promise<ParsedBook> {
    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: "base64",
      });

      const zip = await JSZip.loadAsync(fileContent, { base64: true });

      const containerXml = await zip.file("META-INF/container.xml")?.async("string");
      if (!containerXml) {
        throw new Error("Invalid EPUB: Missing container.xml");
      }

      const containerParsed = xmlParser.parse(containerXml);
      const rootfilePath = containerParsed?.container?.rootfiles?.rootfile?.["@_full-path"];

      if (!rootfilePath) {
        throw new Error("Invalid EPUB: Cannot find rootfile path");
      }

      const opfContent = await zip.file(rootfilePath)?.async("string");
      if (!opfContent) {
        throw new Error("Invalid EPUB: Cannot read OPF file");
      }

      const opfParsed = xmlParser.parse(opfContent);
      const opfPackage = opfParsed.package;
      const metadata = opfPackage?.metadata || {};
      const manifest = opfPackage?.manifest?.item || [];
      const spine = opfPackage?.spine?.itemref || [];

      const dcMetadata = {
        title: this.extractMetadataValue(metadata, "dc:title") || "Untitled",
        author: this.extractMetadataValue(metadata, "dc:creator") || "Unknown Author",
        description: this.extractMetadataValue(metadata, "dc:description"),
        language: this.extractMetadataValue(metadata, "dc:language"),
        publisher: this.extractMetadataValue(metadata, "dc:publisher"),
      };

      const manifestItems = Array.isArray(manifest) ? manifest : [manifest];
      const spineItems = Array.isArray(spine) ? spine : [spine];

      const basePath = rootfilePath.includes("/")
        ? rootfilePath.substring(0, rootfilePath.lastIndexOf("/") + 1)
        : "";

      let fullContent = "";
      const chapters: BookChapter[] = [];

      for (let i = 0; i < spineItems.length; i++) {
        const spineItem = spineItems[i];
        const itemId = spineItem["@_idref"];
        const manifestItem = manifestItems.find((m: Record<string, string>) => m["@_id"] === itemId);

        if (manifestItem) {
          const href = manifestItem["@_href"];
          const fullPath = basePath + href;
          const itemContent = await zip.file(fullPath)?.async("string");

          if (itemContent) {
            const textContent = this.extractTextFromHtml(itemContent);
            fullContent += textContent + "\n\n";

            const chapterTitle = this.extractTitleFromHtml(itemContent) || `Chapter ${i + 1}`;
            chapters.push({
              id: itemId,
              title: chapterTitle,
              href: href,
              order: i,
            });
          }
        }
      }

      const totalPages = Math.ceil(fullContent.length / 2000);

      return {
        metadata: dcMetadata,
        chapters,
        content: fullContent,
        toc: chapters,
        totalPages: Math.max(totalPages, 1),
      };
    } catch (error) {
      console.error("Error parsing EPUB:", error);
      throw new Error(`Failed to parse EPUB: ${error}`);
    }
  }

  static async parseFb2(fileUri: string): Promise<ParsedBook> {
    try {
      let fileContent: string;

      if (fileUri.endsWith(".zip") || fileUri.includes(".fb2.zip")) {
        const base64Content = await FileSystem.readAsStringAsync(fileUri, {
          encoding: "base64",
        });
        const zip = await JSZip.loadAsync(base64Content, { base64: true });
        const fb2File = Object.keys(zip.files).find((name) => name.endsWith(".fb2"));
        if (!fb2File) {
          throw new Error("No FB2 file found in archive");
        }
        fileContent = (await zip.file(fb2File)?.async("string")) || "";
      } else {
        fileContent = await FileSystem.readAsStringAsync(fileUri);
      }

      const fb2Parsed = xmlParser.parse(fileContent);
      const fictionBook = fb2Parsed.FictionBook || fb2Parsed["fiction-book"];

      if (!fictionBook) {
        throw new Error("Invalid FB2 format");
      }

      const description = fictionBook.description || {};
      const titleInfo = description["title-info"] || {};
      const body = fictionBook.body;

      const authorInfo = titleInfo.author || {};
      const firstName = authorInfo["first-name"] || "";
      const lastName = authorInfo["last-name"] || "";
      const author = `${firstName} ${lastName}`.trim() || "Unknown Author";

      const metadata: BookMetadata = {
        title: this.extractFb2Text(titleInfo["book-title"]) || "Untitled",
        author,
        description: this.extractFb2Text(titleInfo.annotation),
        language: titleInfo.lang,
      };

      const sections = this.extractFb2Sections(body);
      const chapters: BookChapter[] = sections.map((section, index) => ({
        id: `section-${index}`,
        title: section.title || `Chapter ${index + 1}`,
        href: "",
        order: index,
      }));

      const fullContent = sections.map((s) => s.content).join("\n\n");
      const totalPages = Math.ceil(fullContent.length / 2000);

      return {
        metadata,
        chapters,
        content: fullContent,
        toc: chapters,
        totalPages: Math.max(totalPages, 1),
      };
    } catch (error) {
      console.error("Error parsing FB2:", error);
      throw new Error(`Failed to parse FB2: ${error}`);
    }
  }

  static async parsePdf(fileUri: string): Promise<ParsedBook> {
    return {
      metadata: {
        title: "PDF Document",
        author: "Unknown Author",
      },
      chapters: [],
      content: "PDF content will be rendered using PDF viewer component.",
      toc: [],
      totalPages: 10,
    };
  }

  static async parseTxt(fileUri: string): Promise<ParsedBook> {
    try {
      const content = await FileSystem.readAsStringAsync(fileUri);
      const lines = content.split("\n");
      const title = lines[0]?.trim() || "Untitled";

      const totalPages = Math.ceil(content.length / 2000);

      return {
        metadata: {
          title,
          author: "Unknown Author",
        },
        chapters: [{ id: "main", title: "Full Text", href: "", order: 0 }],
        content,
        toc: [],
        totalPages: Math.max(totalPages, 1),
      };
    } catch (error) {
      console.error("Error parsing TXT:", error);
      throw new Error(`Failed to parse TXT: ${error}`);
    }
  }

  static async extractBookMetadata(
    fileUri: string,
    fileType: string
  ): Promise<BookMetadata> {
    try {
      const parsed = await this.parseBook(fileUri, fileType);
      return parsed.metadata;
    } catch {
      return {
        title: "Unknown Title",
        author: "Unknown Author",
      };
    }
  }

  private static extractMetadataValue(metadata: Record<string, unknown>, key: string): string | undefined {
    const value = metadata[key];
    if (!value) return undefined;
    if (typeof value === "string") return value;
    if (typeof value === "object" && value !== null) {
      const obj = value as Record<string, unknown>;
      return (obj["#text"] as string) || String(value);
    }
    return String(value);
  }

  private static extractTextFromHtml(html: string): string {
    let text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(dec))
      .replace(/\s+/g, " ")
      .trim();

    return text;
  }

  private static extractTitleFromHtml(html: string): string | null {
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match) {
      return this.extractTextFromHtml(h1Match[1]);
    }

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      return this.extractTextFromHtml(titleMatch[1]);
    }

    return null;
  }

  private static extractFb2Text(node: unknown): string {
    if (!node) return "";
    if (typeof node === "string") return node;
    if (typeof node === "object" && node !== null) {
      const obj = node as Record<string, unknown>;
      if ("#text" in obj) return String(obj["#text"]);
      if (Array.isArray(node)) {
        return node.map((n) => this.extractFb2Text(n)).join(" ");
      }
      return Object.values(obj)
        .map((v) => this.extractFb2Text(v))
        .join(" ");
    }
    return String(node);
  }

  private static extractFb2Sections(body: unknown): Fb2Section[] {
    const sections: Fb2Section[] = [];

    if (!body) return sections;

    const processSection = (section: Record<string, unknown>, depth = 0) => {
      if (!section) return;

      const title = section.title ? this.extractFb2Text(section.title) : undefined;
      let content = "";

      if (section.p) {
        const paragraphs = Array.isArray(section.p) ? section.p : [section.p];
        content = paragraphs.map((p) => this.extractFb2Text(p)).join("\n\n");
      }

      if (title || content) {
        sections.push({ title, content });
      }

      if (section.section) {
        const subsections = Array.isArray(section.section)
          ? section.section
          : [section.section];
        subsections.forEach((sub: Record<string, unknown>) => processSection(sub, depth + 1));
      }
    };

    const bodyObj = body as Record<string, unknown>;
    if (bodyObj.section) {
      const bodySections = Array.isArray(bodyObj.section) ? bodyObj.section : [bodyObj.section];
      bodySections.forEach((section: Record<string, unknown>) => processSection(section));
    } else {
      processSection(bodyObj);
    }

    return sections;
  }
}
