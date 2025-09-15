const XLSX = require('xlsx');

const orders = [
  { OrderID: 'SO-1001', orderDate: '2025-09-01', buyer_BPID: 'BP-001', currency: 'USD', netAmount: 1000, taxAmount: 180, totalAmount: 1180, note:'First order' },
  { OrderID: 'SO-1002', orderDate: '2025-09-02', buyer_BPID: 'BP-002', currency: 'EUR', netAmount: 500, taxAmount: 90, totalAmount: 590, note:'Second order' }
];

const items = [
  { ItemID: 'IT-1001', OrderID: 'SO-1001', lineNumber:1, productID:'PROD-1', description:'Product one', quantity:2, netPrice:500, taxPercent:9, taxAmount:90, grossAmount:1090 },
  { ItemID: 'IT-1002', OrderID: 'SO-1001', lineNumber:2, productID:'PROD-2', description:'Product two', quantity:1, netPrice:0, taxPercent:0, taxAmount:0, grossAmount:0 },
  { ItemID: 'IT-2001', OrderID: 'SO-1002', lineNumber:1, productID:'PROD-3', description:'Product three', quantity:5, netPrice:100, taxPercent:18, taxAmount:90, grossAmount:590 }
];

const wb = XLSX.utils.book_new();
wb.SheetNames.push('Orders'); wb.Sheets['Orders'] = XLSX.utils.json_to_sheet(orders);
wb.SheetNames.push('Items');  wb.Sheets['Items']  = XLSX.utils.json_to_sheet(items);

XLSX.writeFile(wb, 'sample-orders.xlsx');
console.log('✅ sample-orders.xlsx created in project root');
