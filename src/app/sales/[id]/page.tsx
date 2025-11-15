
import { notFound } from "next/navigation"
import { getAdminServices } from "@/lib/admin-actions"
import type { Customer, Sale, SalesItem, Product, Unit, ThemeSettings } from "@/lib/types"
import { SaleInvoice } from "./components/sale-invoice";
import { ThermalReceipt } from "./components/thermal-receipt";
import { toPlainObject } from "@/lib/utils";

async function getSaleData(saleId: string) {
    const { firestore } = await getAdminServices();

    const saleDoc = await firestore.collection('sales_transactions').doc(saleId).get();
    if (!saleDoc.exists) {
        return { sale: null, items: [], customer: null, productsMap: new Map(), unitsMap: new Map(), settings: null };
    }
    const sale = toPlainObject({ id: saleDoc.id, ...saleDoc.data() }) as Sale;

    const itemsSnapshot = await firestore.collection('sales_transactions').doc(saleId).collection('sales_items').get();
    const items = itemsSnapshot.docs.map(doc => toPlainObject({ id: doc.id, ...doc.data() }) as SalesItem);

    let customer: Customer | null = null;
    if (sale.customerId && sale.customerId !== 'walk-in-customer') {
        const customerDoc = await firestore.collection('customers').doc(sale.customerId).get();
        if (customerDoc.exists) {
            customer = toPlainObject({ id: customerDoc.id, ...customerDoc.data() }) as Customer;
        }
    }

    const productIds = [...new Set(items.map(item => item.productId))];
    const productsMap = new Map<string, Product>();
    if (productIds.length > 0) {
        const productsSnapshot = await firestore.collection('products').where('__name__', 'in', productIds).get();
        productsSnapshot.forEach(doc => {
            productsMap.set(doc.id, toPlainObject({ id: doc.id, ...doc.data() }) as Product);
        });
    }

    const unitsSnapshot = await firestore.collection('units').get();
    const unitsMap = new Map<string, Unit>();
    unitsSnapshot.forEach(doc => {
        unitsMap.set(doc.id, toPlainObject({ id: doc.id, ...doc.data() }) as Unit);
    });

    const settingsDoc = await firestore.collection('settings').doc('theme').get();
    const settings = settingsDoc.exists ? toPlainObject(settingsDoc.data()) as ThemeSettings : null;

    return { sale, items, customer, productsMap, unitsMap, settings };
}


export default async function SaleDetailPage({ params, searchParams }: { params: { id: string }, searchParams: { [key: string]: string | string[] | undefined } }) {
  const { sale, items, customer, productsMap, unitsMap, settings } = await getSaleData(params.id);

  if (!sale) {
    notFound()
  }

  const isPrintView = searchParams.print === 'true';
  const invoiceFormat = settings?.invoiceFormat || 'A4'; // Default to A4 if not set

  // If print is requested, decide which component to use based on settings
  if (isPrintView) {
    if (invoiceFormat === '80mm' || invoiceFormat === '58mm') {
      return (
        <div className="flex justify-center bg-gray-100 min-h-screen p-4">
          <ThermalReceipt
            sale={sale}
            items={items}
            customer={customer}
            productsMap={productsMap}
            unitsMap={unitsMap}
            settings={settings}
          />
        </div>
      );
    }
  }

  // Default view is the A4/A5 invoice
  return <SaleInvoice sale={sale} items={items} customer={customer} productsMap={productsMap} unitsMap={unitsMap} settings={settings} autoPrint={isPrintView} />
}
