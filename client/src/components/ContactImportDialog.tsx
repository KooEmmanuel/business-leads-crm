import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportResult {
  success: boolean;
  inserted: number;
  total: number;
  errors?: string[];
}

export function ContactImportDialog() {
  const [file, setFile] = useState<File | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const utils = trpc.useUtils();
  const importMutation = trpc.contacts.import.useMutation({
    onSuccess: (result) => {
      setImportResult(result);
      // Refresh contacts list
      utils.contacts.list.invalidate();
    },
    onError: (error) => {
      setImportResult({
        success: false,
        inserted: 0,
        total: 0,
        errors: [error.message],
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const fileName = selectedFile.name.toLowerCase();
      const isValidType = 
        fileName.endsWith(".csv") || 
        fileName.endsWith(".xlsx") || 
        fileName.endsWith(".xls");
      
      if (!isValidType) {
        alert("Please select a CSV or Excel file (.csv, .xlsx, .xls)");
        return;
      }
      
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      // Convert file to base64
      const fileContent = await fileToBase64(file);
      const fileName = file.name;
      const fileExtension = fileName.split(".").pop()?.toLowerCase() || "";
      const fileType = fileExtension === "csv" ? "csv" : "xlsx";

      await importMutation.mutateAsync({
        fileContent,
        fileName,
        fileType: fileType as "csv" | "xlsx" | "xls",
      });
    } catch (error) {
      console.error("Import error:", error);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,")
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleReset = () => {
    setFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Reset after a delay to allow animations to complete
    setTimeout(() => {
      handleReset();
    }, 200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          Import Contacts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Contacts from File</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* File Selection */}
          {!importResult && (
            <>
              <div className="border border-dashed border-border rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="contact-import-file"
                />
                <label
                  htmlFor="contact-import-file"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {file ? (
                    <>
                      {file.name.endsWith(".csv") ? (
                        <FileText className="w-12 h-12 text-primary" />
                      ) : (
                        <FileSpreadsheet className="w-12 h-12 text-primary" />
                      )}
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Click to select a file</p>
                        <p className="text-sm text-muted-foreground">
                          CSV or Excel (.csv, .xlsx, .xls)
                        </p>
                      </div>
                    </>
                  )}
                </label>
              </div>

              {/* Import Button */}
              <Button
                onClick={handleImport}
                disabled={!file || importMutation.isPending}
                className="w-full"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Contacts
                  </>
                )}
              </Button>
            </>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="space-y-4">
              {importResult.success ? (
                <Alert className="border-green-500 bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    <p className="font-semibold">Import Successful!</p>
                    <p className="text-sm mt-1">
                      {importResult.inserted} of {importResult.total} contacts imported
                    </p>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-500 bg-red-500/10">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    <p className="font-semibold">Import Failed</p>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <ul className="text-sm mt-1 list-disc list-inside">
                        {importResult.errors.slice(0, 5).map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>... and {importResult.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {importResult.errors && importResult.errors.length > 0 && importResult.success && (
                <Alert className="border-yellow-500 bg-yellow-500/10">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-700">
                    <p className="font-semibold">Some rows had errors:</p>
                    <ul className="text-sm mt-1 list-disc list-inside max-h-32 overflow-y-auto">
                      {importResult.errors.slice(0, 10).map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                      {importResult.errors.length > 10 && (
                        <li>... and {importResult.errors.length - 10} more errors</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button onClick={handleReset} variant="outline" className="flex-1">
                  Import Another File
                </Button>
                <Button onClick={handleClose} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

