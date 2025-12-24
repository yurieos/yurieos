"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DialogAuthProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export function DialogAuth({ open, setOpen }: DialogAuthProps) {
  // In local mode, auth dialogs are not needed
  // This is a stub component for compatibility
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Local Mode</DialogTitle>
          <DialogDescription>
            This app is running in local mode without authentication. All
            features are available.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
