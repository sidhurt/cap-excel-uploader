const cds = require('@sap/cds');
const XLSX = require('xlsx');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

module.exports = cds.service.impl(async function () {

  // --- helper functions and mapping (kept minimal) ---
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
    OrderID: ['OrderID','orderid','order id','order_id','id'],
    orderDate: ['orderDate','order date','date'],
    buyer_BPID: ['buyer_BPID','buyer id','bpid','buyer'],
    currency: ['currency','curr'],
    netAmount: ['netAmount','net amount','net'],
    taxAmount: ['taxAmount','tax amount','tax'],
    totalAmount: ['totalAmount','total amount','total'],
    note: ['note','notes','remark']
  };

  const ITEMS_VARIANTS = {
    ItemID: ['ItemID','itemid','item id','id'],
    OrderID: ['OrderID','orderid','order id','order_id'],
    lineNumber: ['lineNumber','line number','linenumber','itemno'],
    productID: ['productID','product id','product'],
    description: ['description','desc'],
    quantity: ['quantity','qty'],
    netPrice: ['netPrice','net price','price'],
    taxPercent: ['taxPercent','tax percent'],
    taxAmount: ['taxAmount','tax amount'],
    grossAmount: ['grossAmount','gross amount']
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
      order_OrderID: getByCanon('OrderID') || null, // physical FK column for CAP
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

  // -- uploadSample (reads sample-orders.xlsx from disk) --
  this.on('uploadSample', async (req) => {
    const sample = './sample-orders.xlsx';
    if (!fs.existsSync(sample)) return { message: `Sample not found: ${sample}` };
    try {
      const wb = XLSX.readFile(sample);
      const orders = parseSheetToObjects(wb.Sheets[wb.SheetNames[0]], ORDERS_VARIANTS, mapOrderRow);
      const items = (wb.SheetNames.length > 1) ? parseSheetToObjects(wb.Sheets[wb.SheetNames[1]], ITEMS_VARIANTS, mapItemRow) : [];
      const tx = cds.transaction(req);
      if (orders.length) await tx.run(INSERT.into('db.SalesOrders').entries(orders));
      if (items.length) await tx.run(INSERT.into('db.SalesOrderItems').entries(items));
      return { message: `Inserted ${orders.length} orders and ${items.length} items` };
    } catch (e) {
      console.error('[uploadSample] ERROR', e);
      req.error(500, e.message || String(e));
      return { message: `Sample upload failed: ${e.message || String(e)}` };
    }
  });

  // -- uploadSalesOrders (base64 payload) --
  this.on('uploadSalesOrders', async (req) => {
    const { fileContent } = req.data || {};
    if (!fileContent) return req.error(400, 'No fileContent provided');
    try {
      const buffer = Buffer.from(fileContent, 'base64');
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const orders = parseSheetToObjects(wb.Sheets[wb.SheetNames[0]], ORDERS_VARIANTS, mapOrderRow);
      const items = (wb.SheetNames.length > 1) ? parseSheetToObjects(wb.Sheets[wb.SheetNames[1]], ITEMS_VARIANTS, mapItemRow) : [];
      const tx = cds.transaction(req);
      if (orders.length) await tx.run(INSERT.into('db.SalesOrders').entries(orders));
      if (items.length) await tx.run(INSERT.into('db.SalesOrderItems').entries(items));
      return { message: `Inserted ${orders.length} orders and ${items.length} items` };
    } catch (e) {
      console.error('[uploadSalesOrders] ERROR', e);
      req.error(500, e.message || String(e));
      return { message: `Upload failed: ${e.message || String(e)}` };
    }
  });

  // -- CLEAR DATA: delete all items then orders --
  this.on('clearData', async (req) => {
    console.log('[clearData] called');
    const tx = cds.transaction(req);
    try {
      // run deletions through CDS so SQL dialect mapping is used
      await tx.run(DELETE.from('db.SalesOrderItems'));
      await tx.run(DELETE.from('db.SalesOrders'));
      console.log('[clearData] deleted rows from SalesOrderItems and SalesOrders');
      return { message: 'All data deleted successfully' };
    } catch (e) {
      console.error('[clearData] ERROR', e && e.stack ? e.stack : e);
      req.error(500, e.message || String(e));
      return { message: `Failed to clear data: ${e.message || String(e)}` };
    }
  });

});
