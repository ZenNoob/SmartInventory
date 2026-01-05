'use client'

import { useEffect, useState, use } from "react"
import { notFound } from "next/navigation"
import type { PurchaseOrder, PurchaseOrderItem, Product, Unit, ThemeSettings, Supplier } from "@/lib/types"
import { PurchaseOrderInvoice } from "./components/purchase-order-invoice";
import { useStore } from "@/contexts/store-context"

interface PurchaseOrderWithDetails extends PurchaseOrder {
  supplierName?: string;
}

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { currentStore } = useStore();
  
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderWithDetails | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [productsMap, setProductsMap] = useState<Map<string, Product>>(new Map());
  const [unitsMap, setUnitsMap] = useState<Map<string, Unit>>(new Map());
  const [settings, setSettings] = useState<ThemeSettings | null>(null);
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
        
        // Fetch supplier if exists
        if (orderResult.purchaseOrder?.supplierId) {
          const supplierResponse = await fetch(`/api/suppliers/${orderResult.purchaseOrder.supplierId}`, {
            headers: {
              'X-Store-Id': currentStore.id,
            },
          });
          if (supplierResponse.ok) {
            const supplierResult = await supplierResponse.json();
            setSupplier(supplierResult.supplier);
          }
        }
        
        // Fetch products for items
        const productIds = [...new Set(orderResult.purchaseOrder?.items?.map((item: PurchaseOrderItem) => item.productId) || [])];
        if (productIds.length > 0) {
          const productsResponse = await fetch('/api/products', {
            headers: {
              'X-Store-Id': currentStore.id,
            },
          });
          if (productsResponse.ok) {
            const productsResult = await productsResponse.json();
            const map = new Map<string, Product>();
            (productsResult.data || []).forEach((p: Product) => {
              if (productIds.includes(p.id)) {
                map.set(p.id, p);
              }
            });
            setProductsMap(map);
          }
        }
        
        // Fetch units
        const unitsResponse = await fetch('/api/units', {
          headers: {
            'X-Store-Id': currentStore.id,
          },
        });
        if (unitsResponse.ok) {
          const unitsResult = await unitsResponse.json();
          const map = new Map<string, Unit>();
          (unitsResult.units || []).forEach((u: Unit) => map.set(u.id, u));
          setUnitsMap(map);
        }
        
        // TODO: Fetch settings when settings API is implemented
        // For now, use default settings
        setSettings(null);
        
      } catch (error) {
        console.error('Error fetching purchase order data:', error);
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
    <PurchaseOrderInvoice 
      purchaseOrder={purchaseOrder} 
      items={purchaseOrder.items || []} 
      productsMap={productsMap} 
      unitsMap={unitsMap} 
      settings={settings} 
      supplier={supplier} 
    />
  );
}
