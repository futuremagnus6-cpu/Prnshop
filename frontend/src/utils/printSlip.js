/**
 * Print slip utility — opens a new window with only the slip content
 * and triggers the browser's print dialog for that window only.
 * This ensures only the slip prints, not the entire page.
 *
 * Uses inline thermal-printer-friendly styles so it works reliably
 * regardless of the parent page's CSS.
 *
 * @param {HTMLElement|string} slipElement - DOM element or CSS selector of the slip content
 * @param {Window} [existingWindow] - An already-opened window to write into (for popup-safe flows)
 */
export const printSlipContent = (slipElement, existingWindow) => {
  let el = slipElement;
  if (typeof el === 'string') {
    el = document.querySelector(el);
  }
  if (!el || !el.innerHTML) return;

  let printWindow = existingWindow;
  if (!printWindow || printWindow.closed) {
    // Build a clean thermal-printable HTML document
    printWindow = window.open('', '_blank', 'width=400,height=600,menubar=no,toolbar=no,location=no,status=no');
    if (!printWindow) {
      alert('Please allow popups for this site to print the slip, or use the browser Print option.');
      return;
    }
  }

  // Build the slip HTML with clean inline styles
  printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Print Slip</title>
<style>
  @page { margin: 0; size: 80mm auto; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', 'Consolas', monospace;
    font-size: 11px;
    width: 80mm;
    margin: 0 auto;
    padding: 8px 6px;
    color: #000;
    background: #fff;
    line-height: 1.4;
  }
  .text-center { text-align: center; }
  .border-b { border-bottom: 1px dashed #999; }
  .border-t { border-top: 1px dashed #999; }
  .pb-4 { padding-bottom: 8px; }
  .pt-2 { padding-top: 4px; }
  .pt-3 { padding-top: 6px; }
  .mb-4 { margin-bottom: 8px; }
  .mb-3 { margin-bottom: 6px; }
  .mt-1 { margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th, td { padding: 3px 2px; text-align: left; }
  th { border-bottom: 1px dashed #999; font-weight: 700; }
  td { border-bottom: 1px dashed #ddd; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .text-xs { font-size: 9px; }
  .text-sm { font-size: 10px; }
  .text-gray-500 { color: #666; }
  .text-gray-600 { color: #444; }
  .text-gray-700 { color: #333; }
  .font-bold { font-weight: 700; }
  .font-semibold { font-weight: 600; }
  .italic { font-style: italic; }
  .capitalize { text-transform: capitalize; }
  .inline-block { display: inline-block; }
  .px-2 { padding: 0 4px; }
  .py-0\\.5 { padding: 1px 0; }
  .rounded { border-radius: 2px; }
  .flex { display: flex; }
  .justify-between { justify-content: space-between; }
  .space-y-1 > * + * { margin-top: 2px; }
  .bg-gray-100 { background: #f5f5f5; }
  .text-green-600 { color: #16a34a; }
  .text-yellow-600 { color: #ca8a04; }
  .text-red-600 { color: #dc2626; }
  .text-center p { margin: 1px 0; }
  .print\\\\:hidden { display: none !important; }
</style>
</head><body>
  ${el.innerHTML}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); window.close(); }, 400);
    };
  </script>
</body></html>`);

  printWindow.document.close();
};
