/**
 * Calculates line amounts and total quotation amount on the backend.
 * Never trust client calculations!
 */
function calculateQuotationItems(rawItems) {
  let totalAmount = 0;

  const processedItems = rawItems.map((item) => {
    const quantity = parseInt(item.quantity, 10);
    const unitPrice = parseFloat(item.unit_price);
    const discountPercent = parseFloat(item.discount_percent || 0);
    const gstPercent = parseFloat(item.gst_percent !== undefined ? item.gst_percent : 18);

    if (isNaN(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for product ${item.product_id}`);
    }
    if (isNaN(unitPrice) || unitPrice < 0) {
      throw new Error(`Invalid unit price for product ${item.product_id}`);
    }

    const baseAmount = quantity * unitPrice;
    const discountAmount = baseAmount * (discountPercent / 100);
    const amountAfterDiscount = baseAmount - discountAmount;
    const gstAmount = amountAfterDiscount * (gstPercent / 100);
    const lineAmount = Number((amountAfterDiscount + gstAmount).toFixed(2));

    totalAmount += lineAmount;

    return {
      product_id: item.product_id,
      quantity,
      unit_price: unitPrice,
      discount_percent: discountPercent,
      gst_percent: gstPercent,
      line_amount: lineAmount,
    };
  });

  return {
    items: processedItems,
    totalAmount: Number(totalAmount.toFixed(2)),
  };
}

module.exports = {
  calculateQuotationItems,
};
