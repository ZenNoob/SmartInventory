'use client'

import { useEffect, useState } from "react";
import { Product, Unit, SalesItem, PurchaseOrderItem, Supplier } from "@/lib/types";
import { PurchaseOrderForm } from "../components/purchase-order-form";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/contexts/store-context";

export default function NewPurchasePage() {
    const { currentStore } = useStore();
    const searchParams = useSearchParams();
    
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [allSalesItems, setAllSalesItems] = useState<SalesItem[]>([]);
    const [draftItems, setDraftItems] = useState<PurchaseOrderItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!currentStore?.id) return;
            
            setIsLoading(true);
            try {
                // Fetch products
                const productsResponse = await fetch('/api/products?pageSize=1000', {
                    headers: {
                        'X-Store-Id': currentStore.id,
                    },
                });
                if (productsResponse.ok) {
                    const productsResult = await productsResponse.json();
                    setProducts(productsResult.data || []);
                }
                
                // Fetch suppliers
                const suppliersResponse = await fetch('/api/suppliers', {
                    headers: {
                        'X-Store-Id': currentStore.id,
                    },
                });
                if (suppliersResponse.ok) {
                    const suppliersResult = await suppliersResponse.json();
                    setSuppliers(suppliersResult.suppliers || []);
                }
                
                // Fetch units
                const unitsResponse = await fetch('/api/units', {
                    headers: {
                        'X-Store-Id': currentStore.id,
                    },
                });
                if (unitsResponse.ok) {
                    const unitsResult = await unitsResponse.json();
                    setUnits(unitsResult.units || []);
                }
                
                // Sales items are not needed for new purchase, set empty array
                setAllSalesItems([]);
                
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        }
        
        fetchData();
    }, [currentStore?.id]);

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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p>Đang tải dữ liệu...</p>
            </div>
        );
    }

    return (
        <PurchaseOrderForm 
            products={products}
            units={units}
            allSalesItems={allSalesItems}
            suppliers={suppliers}
            draftItems={draftItems}
        />
    );
}
