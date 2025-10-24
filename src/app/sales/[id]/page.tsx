import { notFound } from "next/navigation"
import { getAdminServices } from "@/lib/admin-actions"
import type { Customer, Sale, SalesItem, Product, Unit } from "@/lib/types"
import { SaleInvoice } from "./components/sale-invoice";
import { toPlainObject } from "@/lib/utils";


async function getSaleData(saleId: string) {
    const { firestore } = await getAdminServices();

    const saleDoc = await firestore.collection('sales_transactions').doc(saleId).get();
    if (!saleDoc.exists) {
        return { sale: null, items: [], customer: null, productsMap: new Map(), unitsMap: new Map() };
    }
    const sale = toPlainObject({ id: saleDoc.id, ...saleDoc.data() }) as Sale;

    const itemsSnapshot = await firestore.collection('sales_transactions').doc(saleId).collection('sales_items').get();
    const items = itemsSnapshot.docs.map(doc => toPlainObject({ id: doc.id, ...doc.data() }) as SalesItem);

    let customer: Customer | null = null;
    if (sale.customerId) {
        const customerDoc = await firestore.collection('customers').doc(sale.customerId).get();
        if (customerDoc.exists) {
            customer = toPlainObject({ id: customerDoc.id, ...customerDoc.data() }) as Customer;
        }
    }

    const productIds = [...new Set(items.map(item => item.productId))];
    const productsMap = new Map<string, Product>();
    if (productIds.length > 0) {
        const productsSnapshot = await firestore.collection('products').where('id', 'in', productIds).get();
        productsSnapshot.forEach(doc => {
            productsMap.set(doc.id, toPlainObject({ id: doc.id, ...doc.data() }) as Product);
        });
    }

    const unitsSnapshot = await firestore.collection('units').get();
    const unitsMap = new Map<string, Unit>();
    unitsSnapshot.forEach(doc => {
        unitsMap.set(doc.id, toPlainObject({ id: doc.id, ...doc.data() }) as Unit);
    });

    return { sale, items, customer, productsMap, unitsMap };
}


export default async function SaleDetailPage({ params }: { params: { id: string } }) {
  const { sale, items, customer, productsMap, unitsMap } = await getSaleData(params.id);

  if (!sale) {
    notFound()
  }

  return <SaleInvoice sale={sale} items={items} customer={customer} productsMap={productsMap} unitsMap={unitsMap} />
}
