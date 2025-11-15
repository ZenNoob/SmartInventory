
'use client'

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, getDocs } from "firebase/firestore";
import { Customer, Product, Unit, SalesItem, PurchaseOrderItem, Supplier } from "@/lib/types";
import { PurchaseOrderForm } from "../components/purchase-order-form";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";


export default function NewPurchasePage() {
    const firestore = useFirestore();
    const searchParams = useSearchParams();
    const [allSalesItems, setAllSalesItems] = useState<SalesItem[]>([]);
    const [salesItemsLoading, setSalesItemsLoading] = useState(true);
    const [draftItems, setDraftItems] = useState<PurchaseOrderItem[]>([]);

    const productsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "products"));
    }, [firestore]);
    
    const suppliersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "suppliers"));
    }, [firestore]);

    const unitsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "units"));
    }, [firestore]);
    
    const salesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "sales_transactions"));
    }, [firestore]);

    const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);
    const { data: suppliers, isLoading: suppliersLoading } = useCollection<Supplier>(suppliersQuery);
    const { data: units, isLoading: unitsLoading } = useCollection<Unit>(unitsQuery);
    const { data: sales, isLoading: salesLoading } = useCollection<any>(salesQuery);

    useEffect(() => {
        async function fetchAllSalesItems() {
        if (!firestore || !sales) {
            if (!salesLoading) setSalesItemsLoading(false);
            return;
        };
        
        setSalesItemsLoading(true);
        const items: SalesItem[] = [];
        try {
            for (const sale of sales) {
            const itemsCollectionRef = collection(firestore, `sales_transactions/${sale.id}/sales_items`);
            const itemsSnapshot = await getDocs(itemsCollectionRef);
            itemsSnapshot.forEach(doc => {
                items.push({ id: doc.id, ...doc.data() } as SalesItem);
            });
            }
            setAllSalesItems(items);
        } catch (error) {
            console.error("Error fetching sales items: ", error);
        } finally {
            setSalesItemsLoading(false);
        }
        }
        fetchAllSalesItems();
    }, [sales, firestore, salesLoading]);

    useEffect(() => {
        if (searchParams.get('draft') === 'true') {
            const storedItems = localStorage.getItem('draftPurchaseOrderItems');
            if (storedItems) {
                try {
                    const parsedItems = JSON.parse(storedItems);
                    setDraftItems(parsedItems);
                    // Clear the local storage after reading to avoid re-using old data
                    localStorage.removeItem('draftPurchaseOrderItems');
                } catch (error) {
                    console.error("Failed to parse draft items from localStorage:", error);
                }
            }
        }
    }, [searchParams]);


    const isLoading = productsLoading || unitsLoading || salesItemsLoading || suppliersLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p>Đang tải dữ liệu...</p>
            </div>
        )
    }

    return (
        <PurchaseOrderForm 
            products={products || []}
            units={units || []}
            allSalesItems={allSalesItems || []}
            suppliers={suppliers || []}
            draftItems={draftItems}
        />
    )
}
