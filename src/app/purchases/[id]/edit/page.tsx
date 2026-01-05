'use client'

import { useEffect, useState, use } from "react";
import { Product, Unit, SalesItem, PurchaseOrder, Supplier } from "@/lib/types";
import { PurchaseOrderForm } from "../../components/purchase-order-form";
import { notFound } from "next/navigation";
import { useStore } from "@/contexts/store-context";

export default function EditPurchasePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const { currentStore } = useStore();
    
    const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [allSalesItems, setAllSalesItems] = useState<SalesItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notFoundState, setNotFoundState] = useState(false);

    useEffect(() => {
        async function fetchData() {
            if (!currentStore?.id) return;
            
            setIsLoading(true);
            try {
                // Fetch purchase order
                const orderResponse = await fetch(`/api/purchases/${resolvedParams.id}`, {
                    headers: {
                        'X-Store-Id': currentStore.id,
                    },
                });
                
                if (!orderResponse.ok) {
                    if (orderResponse.status === 404) {
                        setNotFoundState(true);
                        return;
                    }
                    throw new Error('Failed to fetch purchase order');
                }
                
                const orderResult = await orderResponse.json();
                setPurchaseOrder(orderResult.purchaseOrder);
                
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
                
                // Sales items are not needed for edit, set empty array
                setAllSalesItems([]);
                
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        }
        
        fetchData();
    }, [currentStore?.id, resolvedParams.id]);

    if (notFoundState) {
        notFound();
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p>Đang tải dữ liệu...</p>
            </div>
        );
    }

    if (!purchaseOrder) {
        notFound();
    }

    return (
        <PurchaseOrderForm 
            products={products}
            units={units}
            allSalesItems={allSalesItems}
            suppliers={suppliers}
            purchaseOrder={purchaseOrder}
        />
    );
}
