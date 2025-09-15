using db from '../db/schema';

service sales {
  entity SalesOrders as projection on db.SalesOrders;
  entity SalesOrderItems as projection on db.SalesOrderItems;

  action uploadSalesOrders(fileContent : String) returns String;
  action uploadSample() returns String;
}
