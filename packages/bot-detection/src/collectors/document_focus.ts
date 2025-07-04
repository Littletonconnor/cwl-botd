export function getDocumentFocus() {
  if (document.hasFocus === undefined) {
    return false;
  }

  return document.hasFocus();
}
