
import { notFound } from "next/navigation"
import { getAdminServices } from "@/lib/admin-actions"
import type { PurchaseOrder, PurchaseOrderItem, Product, Unit, ThemeSettings, Supplier } from "@/lib/types"
import { PurchaseOrderInvoice } from "./components/purchase-order-invoice";
import { toPlainObject } from "@/lib/utils";


async function getPurchaseOrderData(purchaseOrderId: string) {
    const { firestore } = await getAdminServices();

    const purchaseOrderDoc = await firestore.collection('purchase_orders').doc(purchaseOrderId).get();
    if (!purchaseOrderDoc.exists) {
        return { purchaseOrder: null, items: [], productsMap: new Map(), unitsMap: new Map(), settings: null, supplier: null };
    }
    const purchaseOrder = toPlainObject({ id: purchaseOrderDoc.id, ...purchaseOrderDoc.data() }) as PurchaseOrder;

    // Items are now nested in the purchaseOrder object
    const items = purchaseOrder.items || [];

    let supplier: Supplier | null = null;
    if (purchaseOrder.supplierId) {
      const supplierDoc = await firestore.collection('suppliers').doc(purchaseOrder.supplierId).get();
      if (supplierDoc.exists) {
        supplier = toPlainObject({ id: supplierDoc.id, ...supplierDoc.data() }) as Supplier;
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

    return { purchaseOrder, items, productsMap, unitsMap, settings, supplier };
}


export default async function PurchaseOrderDetailPage({ params }: { params: { id: string } }) {
  const { purchaseOrder, items, productsMap, unitsMap, settings, supplier } = await getPurchaseOrderData(params.id);

  if (!purchaseOrder) {
    notFound()
  }

  return <PurchaseOrderInvoice purchaseOrder={purchaseOrder} items={items} productsMap={productsMap} unitsMap={unitsMap} settings={settings} supplier={supplier} />
}
