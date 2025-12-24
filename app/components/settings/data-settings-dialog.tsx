"use client";

import { AlertTriangle, Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { downloadData, importData } from "@/lib/data-management";

export function DataSettingsDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !confirm(
        "This will overwrite your current chats and settings. Are you sure?"
      )
    ) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      const success = await importData(file);
      if (success) {
        toast({
          title: "Data imported successfully",
          status: "success",
        });
        setIsOpen(false);
        // Reload to reflect changes
        window.location.reload();
      } else {
        toast({
          title: "Import failed",
          description: "Invalid file format or corrupted data.",
          status: "error",
        });
      }
    } catch {
      toast({
        title: "Import failed",
        status: "error",
      });
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Data Management</DialogTitle>
          <DialogDescription>
            Export your chats and settings to a JSON file, or import a backup.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/50 dark:bg-yellow-900/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-600 dark:text-yellow-500" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-500">
                  Important Note
                </p>
                <p className="mt-1 text-yellow-700 dark:text-yellow-400">
                  Data is stored locally in your browser. Importing data will
                  replace your current chat history.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              className="flex h-24 flex-col items-center justify-center gap-2"
              onClick={() => downloadData()}
              variant="outline"
            >
              <Download className="h-6 w-6" />
              <span>Export Data</span>
            </Button>

            <Button
              className="flex h-24 flex-col items-center justify-center gap-2"
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
            >
              <Upload className="h-6 w-6" />
              <span>Import Data</span>
            </Button>
            <Input
              accept=".json"
              className="hidden"
              onChange={handleImport}
              ref={fileInputRef}
              type="file"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
