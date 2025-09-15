const cds = require('@sap/cds');
const XLSX = require('xlsx');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

module.exports = cds.service.impl(async function () {

  const buildHeaderMap = (headers, mappingVariants) => {
    const map = {};
    headers.forEach(h => {
      const key = String(h || '').trim();
      const low = key.toLowerCase();
      let found = null;
      Object.entries(mappingVariants).some(([canon, variants]) => {
        if (variants.map(v => v.toLowerCase()).includes(low)) { found = canon; return true; }
        return false;
      });
      if (!found) {
        const norm = low.replace(/[^a-z0-9]/g,'');
        Object.entries(mappingVariants).some(([canon, variants]) => {
          if (variants.map(v => v.toLowerCase().replace(/[^a-z0-9]/g,'')).includes(norm)) { found = canon; return true; }
          return false;
        });
      }
      map[key] = found || null;
    });
    return map;
  };

  const ORDERS_VARIANTS = {
    OrderID: ['OrderID','Order Id','orderid','order id','order_id','id'],
    orderDate: ['orderDate','order date','date'],
    buyer_BPID: ['buyer_BPID','buyerbpid','buyer id','buyer','buyer_id','bpid','custid','customerid'],
    currency: ['currency','curr'],
    netAmount: ['netAmount','net amount','net_amount','net'],
    taxAmount: ['taxAmount','tax amount','tax_amount','tax'],
    totalAmount: ['totalAmount','total amount','total_amount','total'],
    note: ['note','notes','remark','remarks']
  };

  const ITEMS_VARIANTS = {
    ItemID: ['ItemID','item id','itemid','id'],
    OrderID: ['OrderID','order id','orderid','order_id'],
    lineNumber: ['lineNumber','linenumber','line number','line','itemno','item no','lineno'],
    productID: ['productID','product id','productid','product'],
    description: ['description','desc'],
    quantity: ['quantity','qty','q'],
    netPrice: ['netPrice','net price','price','unitprice'],
    taxPercent: ['taxPercent','tax percent','tax_percent'],
    taxAmount: ['taxAmount','tax amount','tax_amount'],
    grossAmount: ['grossAmount','gross amount','gross_amount','gross']
  };

  const mapOrderRow = (row, headerMap) => {
    const getByCanon = (canon) => {
      for (let h of Object.keys(headerMap)) if (headerMap[h] === canon) return row[h];
      return null;
    };
    return {
      OrderID: getByCanon('OrderID') ? String(getByCanon('OrderID')) : uuidv4(),
      orderDate: getByCanon('orderDate') || null,
      buyer_BPID: getByCanon('buyer_BPID') || null,
      currency: getByCanon('currency') || null,
      netAmount: (getByCanon('netAmount') != null && getByCanon('netAmount') !== '') ? Number(getByCanon('netAmount')) : null,
      taxAmount: (getByCanon('taxAmount') != null && getByCanon('taxAmount') !== '') ? Number(getByCanon('taxAmount')) : null,
      totalAmount: (getByCanon('totalAmount') != null && getByCanon('totalAmount') !== '') ? Number(getByCanon('totalAmount')) : null,
      note: getByCanon('note') || null
    };
  };

  const mapItemRow = (row, headerMap) => {
    const getByCanon = (canon) => {
      for (let h of Object.keys(headerMap)) if (headerMap[h] === canon) return row[h];
      return null;
    };
    return {
      ItemID: getByCanon('ItemID') ? String(getByCanon('ItemID')) : uuidv4(),
      order_OrderID: getByCanon('OrderID') || null,
      lineNumber: (getByCanon('lineNumber') != null && getByCanon('lineNumber') !== '') ? Number(getByCanon('lineNumber')) : null,
      productID: getByCanon('productID') || null,
      description: getByCanon('description') || null,
      quantity: (getByCanon('quantity') != null && getByCanon('quantity') !== '') ? Number(getByCanon('quantity')) : null,
      netPrice: (getByCanon('netPrice') != null && getByCanon('netPrice') !== '') ? Number(getByCanon('netPrice')) : null,
      taxPercent: (getByCanon('taxPercent') != null && getByCanon('taxPercent') !== '') ? Number(getByCanon('taxPercent')) : null,
      taxAmount: (getByCanon('taxAmount') != null && getByCanon('taxAmount') !== '') ? Number(getByCanon('taxAmount')) : null,
      grossAmount: (getByCanon('grossAmount') != null && getByCanon('grossAmount') !== '') ? Number(getByCanon('grossAmount')) : null
    };
  };

  const parseSheetToObjects = (sheet, mappingVariants, rowMapper) => {
    const raw = XLSX.utils.sheet_to_json(sheet, { defval: null });
    if (!Array.isArray(raw) || raw.length === 0) return [];
    const headers = Object.keys(raw[0]);
    const headerMap = buildHeaderMap(headers, mappingVariants);
    return raw.map(r => rowMapper(r, headerMap));
  };

  this.on('uploadSample', async (req) => {
    console.log('[uploadSample] start');
    const sample = './sample-orders.xlsx';
    if (!fs.existsSync(sample)) {
      req.error(500, `Sample file not found at ${sample}`);
      return { message: `Sample file not found at ${sample}` };
    }
    try {
      const wb = XLSX.readFile(sample);
      const sheets = wb.SheetNames;
      if (!sheets || sheets.length === 0) throw new Error('No sheets found');

      const ordersMapped = parseSheetToObjects(wb.Sheets[sheets[0]], ORDERS_VARIANTS, mapOrderRow);
      const itemsMapped = (sheets.length > 1) ? parseSheetToObjects(wb.Sheets[sheets[1]], ITEMS_VARIANTS, mapItemRow) : [];

      const tx = cds.transaction(req);
      if (ordersMapped.length) await tx.run(INSERT.into('db.SalesOrders').entries(ordersMapped));
      if (itemsMapped.length) await tx.run(INSERT.into('db.SalesOrderItems').entries(itemsMapped));
      console.log(`[uploadSample] inserted ${ordersMapped.length} orders and ${itemsMapped.length} items`);
      return { message: `Sample inserted ${ordersMapped.length} orders and ${itemsMapped.length} items` };
    } catch (e) {
      req.error(500, e.message || String(e));
      return { message: `Sample upload failed: ${e.message || String(e)}` };
    }
  });

  this.on('uploadSalesOrders', async (req) => {
    console.log('[uploadSalesOrders] start');
    const { fileContent } = req.data || {};
    if (!fileContent) { req.error(400,'No fileContent provided'); return { message: 'No fileContent provided' }; }
    try {
      const buffer = Buffer.from(fileContent, 'base64');
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const sheets = wb.SheetNames;
      if (!sheets || sheets.length === 0) throw new Error('No sheets found');

      const ordersMapped = parseSheetToObjects(wb.Sheets[sheets[0]], ORDERS_VARIANTS, mapOrderRow);
      const itemsMapped = (sheets.length > 1) ? parseSheetToObjects(wb.Sheets[sheets[1]], ITEMS_VARIANTS, mapItemRow) : [];

      const tx = cds.transaction(req);
      if (ordersMapped.length) await tx.run(INSERT.into('db.SalesOrders').entries(ordersMapped));
      if (itemsMapped.length) await tx.run(INSERT.into('db.SalesOrderItems').entries(itemsMapped));
      return { message: `Inserted ${ordersMapped.length} orders and ${itemsMapped.length} items` };
    } catch (e) {
      req.error(500, e.message || String(e));
      return { message: `Upload failed: ${e.message || String(e)}` };
    }
  });

});
