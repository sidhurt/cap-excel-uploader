namespace db;

entity BusinessPartners {
  key BPID : String(36);
  name    : String;
  city    : String;
  country : String;
  phone   : String;
  email   : String;
}

entity SalesOrders {
  key OrderID : String(36);
  orderDate   : Date;
  buyer       : Association to BusinessPartners;
  currency    : String;
  netAmount   : Decimal(15,2);
  taxAmount   : Decimal(15,2);
  totalAmount : Decimal(15,2);
  note        : String;
}

entity SalesOrderItems {
  key ItemID : String(36);
  order      : Association to SalesOrders;
  lineNumber : Integer;
  productID  : String;
  description: String;
  quantity   : Decimal(15,2);
  netPrice   : Decimal(15,2);
  taxPercent : Decimal(5,2);
  taxAmount  : Decimal(15,2);
  grossAmount: Decimal(15,2);
}
