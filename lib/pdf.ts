import pdfParse from "pdf-parse";

interface PdfTextItem {
  str: string;
  transform: number[];
}

interface PdfPage {
  getTextContent(options?: { normalizeWhitespace?: boolean; disableCombineTextItems?: boolean }): Promise<{
    items: PdfTextItem[];
  }>;
}

// pdf-parse's default renderer only inserts a newline when the y-coordinate
// changes, and otherwise concatenates same-line items with no separator at
// all. That's fine for prose, but invoice tables render each column (qty,
// price, tax, amount) as a separate text run at the same y — so numbers end
// up glued together (e.g. "6" + "95.07" + "0.00" + "570.42" -> "695.070.00570.42",
// impossible to reliably re-segment downstream). Insert a space between
// same-line items so columns stay distinguishable.
function renderPageWithColumnSpacing(page: PdfPage) {
  return page.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false }).then((textContent) => {
    let lastY: number | undefined;
    let text = "";
    for (const item of textContent.items) {
      const y = item.transform[5];
      if (lastY === undefined || y === lastY) {
        if (text.length > 0 && !text.endsWith(" ") && !item.str.startsWith(" ")) {
          text += " ";
        }
        text += item.str;
      } else {
        text += "\n" + item.str;
      }
      lastY = y;
    }
    return text;
  });
}

// Extracts plain text from a PDF buffer. We send text (not the raw PDF binary)
// to the model to keep token usage down, per spec 11.3.
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer, { pagerender: renderPageWithColumnSpacing });
  return result.text.trim();
}
