import { useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { useToast } from "../components/Toast";

type CsvRowPreview = { row: number; data: Record<string, unknown> };
type CsvPreviewResponse = {
  required_columns: string[];
  detected_columns: string[];
  missing_required_columns: string[];
  preview_rows: CsvRowPreview[];
  total_rows: number;
  unique_skus: number;
  inventory_rows: number;
};

type CsvCommitResponse = {
  products_created: number;
  products_updated: number;
  inventory_upserted: number;
};

function downloadText(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildTemplateCsv() {
  const header = [
    "sku",
    "name",
    "category",
    "base_description",
    "price_amount",
    "price_currency",
    "location_code",
    "qty_on_hand",
    "qty_reserved",
  ].join(",");
  const rows = [
    ['SKU-001', '"Keripik Pisang Coklat"', "makanan", '"Keripik pisang renyah rasa coklat"', "25000", "IDR", "WH-JKT", "120", "0"],
    ['SKU-001', '"Keripik Pisang Coklat"', "makanan", '"Keripik pisang renyah rasa coklat"', "25000", "IDR", "WH-SBY", "60", "0"],
    ['SKU-002', '"T-Shirt Cotton Premium"', "fashion", '"Kaos cotton combed, nyaman dipakai"', "99000", "IDR", "DEFAULT", "25", "0"],
  ].map((r) => r.join(","));
  return `${header}\n${rows.join("\n")}\n`;
}

export default function MarketplaceImportPage() {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCommit, setLoadingCommit] = useState(false);

  const templateCsv = useMemo(() => buildTemplateCsv(), []);

  async function doPreview() {
    if (!file) {
      toast.push({ title: "Pilih file CSV dulu", tone: "neutral" });
      return;
    }
    setLoadingPreview(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await apiFetch<CsvPreviewResponse>("/api/v1/marketplace/import/preview", { method: "POST", body: form });
      setPreview(res);
      if (res.missing_required_columns?.length) {
        toast.push({
          title: "Kolom wajib belum lengkap",
          detail: `Missing: ${res.missing_required_columns.join(", ")}`,
          tone: "neutral",
        });
      } else {
        toast.push({ title: "Preview berhasil", detail: `${res.total_rows} rows, ${res.unique_skus} SKU`, tone: "success" });
      }
    } catch (e: any) {
      toast.push({ title: "Gagal preview CSV", detail: e?.message || "Unknown error", tone: "danger" });
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function doCommit() {
    if (!file) {
      toast.push({ title: "Pilih file CSV dulu", tone: "neutral" });
      return;
    }
    setLoadingCommit(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await apiFetch<CsvCommitResponse>("/api/v1/marketplace/import/commit", { method: "POST", body: form });
      toast.push({
        title: "Import selesai",
        detail: `Products: +${res.products_created}, updated ${res.products_updated}. Inventory upserted ${res.inventory_upserted}.`,
        tone: "success",
      });
      setPreview(null);
    } catch (e: any) {
      toast.push({ title: "Gagal import CSV", detail: e?.message || "Unknown error", tone: "danger" });
    } finally {
      setLoadingCommit(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card
        title="Marketplace Import (CSV)"
        subtitle="Upload data produk dan stock dari marketplace agar masuk ke Master Product dan Inventory."
        right={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => downloadText("template_marketplace_import.csv", templateCsv, "text/csv;charset=utf-8")}>
              Download Template
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-900">Kolom minimal (wajib)</div>
            <div className="text-sm text-slate-600">sku, name, category, price_amount</div>
            <div className="text-sm font-medium text-slate-900">Kolom opsional</div>
            <div className="text-sm text-slate-600">
              base_description, price_currency (IDR), location_code, qty_on_hand, qty_reserved
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-900">Upload CSV</div>
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFile(f);
                setPreview(null);
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" onClick={doPreview} disabled={!file || loadingPreview || loadingCommit}>
                {loadingPreview ? "Preview…" : "Preview"}
              </Button>
              <Button onClick={doCommit} disabled={!file || loadingCommit || loadingPreview}>
                {loadingCommit ? "Import…" : "Import"}
              </Button>
            </div>
            <div className="text-xs text-slate-500">
              Jika ada kolom inventory, data akan di-upsert per SKU + location_code. currency saat ini hanya mendukung IDR.
            </div>
          </div>
        </div>
      </Card>

      {preview ? (
        <Card
          title="Preview"
          subtitle={`Rows: ${preview.total_rows} · SKU: ${preview.unique_skus} · Inventory rows: ${preview.inventory_rows}`}
        >
          {preview.missing_required_columns?.length ? (
            <div className="mb-3 rounded-none border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Missing required columns: {preview.missing_required_columns.join(", ")}
            </div>
          ) : null}

          <div className="overflow-auto rounded-none border border-slate-200/70">
            <table className="min-w-[720px] w-full border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-slate-700">
                <tr>
                  <th className="border-b border-slate-200/70 px-3 py-2 font-medium">Row</th>
                  <th className="border-b border-slate-200/70 px-3 py-2 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {preview.preview_rows.map((r) => (
                  <tr key={r.row} className="odd:bg-white even:bg-slate-50/30">
                    <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-600">{r.row}</td>
                    <td className="border-b border-slate-100 px-3 py-2 align-top">
                      <div className="grid gap-1">
                        {Object.entries(r.data).map(([k, v]) => (
                          <div key={k} className="flex flex-wrap items-baseline gap-2">
                            <div className="text-xs font-semibold text-slate-700">{k}</div>
                            <div className="text-xs text-slate-500">{String(v ?? "")}</div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
