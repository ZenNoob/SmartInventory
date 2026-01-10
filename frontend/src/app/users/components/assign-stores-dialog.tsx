'use client'

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Store, Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { apiClient } from "@/lib/api-client"

interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  address?: string;
}

interface UserStoreAssignment {
  storeId: string;
  storeName: string;
  storeCode: string;
}

interface AssignStoresDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentStores: UserStoreAssignment[];
  onSuccess: () => void;
}

export function AssignStoresDialog({
  isOpen,
  onOpenChange,
  userId,
  userName,
  currentStores,
  onSuccess,
}: AssignStoresDialogProps) {
  const { toast } = useToast();
  const [allStores, setAllStores] = useState<StoreInfo[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all stores when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchStores();
      setSelectedStoreIds(currentStores.map(s => s.storeId));
    }
  }, [isOpen, currentStores]);

  const fetchStores = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.getStores();
      setAllStores(data.map(s => ({
        id: s.id,
        name: s.name,
        slug: s.slug || '',
        address: s.address,
      })));
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Không thể tải danh sách cửa hàng",
      });
    }
    setIsLoading(false);
  };

  const handleStoreToggle = (storeId: string) => {
    setSelectedStoreIds(prev => 
      prev.includes(storeId) 
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStoreIds.length === allStores.length) {
      setSelectedStoreIds([]);
    } else {
      setSelectedStoreIds(allStores.map(s => s.id));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.assignUserStores(userId, selectedStoreIds);
      toast({
        title: "Thành công!",
        description: `Đã cập nhật cửa hàng cho ${userName}`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning stores:', error);
      const errorMessage = error instanceof Error ? error.message : "Không thể cập nhật cửa hàng";
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: errorMessage,
      });
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Gắn cửa hàng
          </DialogTitle>
          <DialogDescription>
            Chọn các cửa hàng mà <strong>{userName}</strong> có quyền truy cập.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between py-2 border-b">
              <Label className="text-sm font-medium">
                Đã chọn {selectedStoreIds.length}/{allStores.length} cửa hàng
              </Label>
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                {selectedStoreIds.length === allStores.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
              </Button>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {allStores.map((store) => (
                  <div
                    key={store.id}
                    className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                    onClick={() => handleStoreToggle(store.id)}
                  >
                    <Checkbox
                      id={store.id}
                      checked={selectedStoreIds.includes(store.id)}
                      onCheckedChange={() => handleStoreToggle(store.id)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={store.id} className="font-medium cursor-pointer">
                        {store.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Mã: {store.slug}
                        {store.address && ` • ${store.address}`}
                      </p>
                    </div>
                  </div>
                ))}
                {allStores.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Không có cửa hàng nào
                  </p>
                )}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
