"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Upload, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { slugify } from "@/lib/utils";
import type { Category } from "@/types";

const productSchema = z.object({
  title: z.string().min(2, "Title is required"),
  slug: z.string().min(2, "Slug is required"),
  description: z.string().optional(),
  short_description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be 0 or more"),
  compare_price: z.coerce.number().nullable().optional(),
  currency: z.string().default("USD"),
  category_id: z.string().nullable().optional(),
  status: z.enum(["draft", "active", "archived"]),
  is_featured: z.boolean().default(false),
  tags: z.string().optional(),
  text_content: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

export default function AdminProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [files, setFiles] = useState<{ name: string; url?: string; textContent?: string; type: "upload" | "text" }[]>([]);
  const isNew = params.id === "new";

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { status: "draft", is_featured: false, currency: "USD" },
  });

  const title = watch("title");

  useEffect(() => {
    if (title && isNew) setValue("slug", slugify(title));
  }, [title, isNew, setValue]);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("categories").select("*").eq("is_active", true).order("sort_order").then(({ data }) => setCategories(data || []));

    if (!isNew) {
      supabase.from("products").select("*, files:product_files(*)").eq("id", params.id).single().then(({ data }) => {
        if (data) {
          reset({
            title: data.title,
            slug: data.slug,
            description: data.description || "",
            short_description: data.short_description || "",
            price: data.price,
            compare_price: data.compare_price,
            currency: data.currency,
            category_id: data.category_id,
            status: data.status,
            is_featured: data.is_featured,
            tags: data.tags?.join(", ") || "",
          });
          setImages(data.images || []);
          setFiles((data.files || []).map((f: { file_name: string; file_url?: string; text_content?: string; file_type: string }) => ({
            name: f.file_name,
            url: f.file_url || undefined,
            textContent: f.text_content || undefined,
            type: f.file_type as "upload" | "text",
          })));
        }
      });
    }
  }, [isNew, params.id, reset]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const supabase = createClient();
    toast.loading("Uploading images...", { id: "image-upload" });
    try {
      const newImages: string[] = [];
      for (const file of Array.from(fileList)) {
        const path = `products/${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage.from("products").upload(path, file);
        if (error) throw error;
        if (data) {
          const { data: urlData } = supabase.storage.from("products").getPublicUrl(data.path);
          newImages.push(urlData.publicUrl);
        }
      }
      setImages((prev) => [...prev, ...newImages]);
      toast.success("Images uploaded successfully!", { id: "image-upload" });
    } catch (err: any) {
      console.error("Image upload error:", err);
      toast.error(err.message || "Failed to upload images.", { id: "image-upload" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const supabase = createClient();
    toast.loading("Uploading files...", { id: "file-upload" });
    try {
      const newFiles: { name: string; url: string; type: "upload" }[] = [];
      for (const file of Array.from(fileList)) {
        const path = `files/${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage.from("product-files").upload(path, file);
        if (error) throw error;
        if (data) {
          newFiles.push({ name: file.name, url: data.path, type: "upload" });
        }
      }
      setFiles((prev) => [...prev, ...newFiles]);
      toast.success("Files uploaded successfully!", { id: "file-upload" });
    } catch (err: any) {
      console.error("File upload error:", err);
      toast.error(err.message || "Failed to upload files.", { id: "file-upload" });
    }
  };

  const addTextFile = () => {
    setFiles((prev) => [...prev, { name: "untitled.txt", textContent: "", type: "text" }]);
  };

  const removeImage = (index: number) => setImages(images.filter((_, i) => i !== index));
  const removeFile = (index: number) => setFiles(files.filter((_, i) => i !== index));

  const onSubmit = async (data: ProductForm) => {
    setSaving(true);
    const supabase = createClient();
    const productData = {
      title: data.title,
      slug: data.slug,
      description: data.description || null,
      short_description: data.short_description || null,
      price: data.price,
      compare_price: data.compare_price || null,
      currency: data.currency,
      category_id: data.category_id === "none" ? null : data.category_id || null,
      status: data.status,
      is_featured: data.is_featured,
      tags: data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      images,
    };

    let productId: string;

    if (isNew) {
      const { data: product, error } = await supabase.from("products").insert(productData).select().single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      productId = product.id;
    } else {
      const { error } = await supabase.from("products").update(productData).eq("id", params.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      productId = params.id as string;
      await supabase.from("product_files").delete().eq("product_id", productId);
    }

    // Insert files
    if (files.length > 0) {
      const fileRecords = files.map((f, i) => ({
        product_id: productId,
        file_name: f.name,
        file_type: f.type,
        file_url: f.url || null,
        text_content: f.textContent || null,
        sort_order: i,
      }));
      await supabase.from("product_files").insert(fileRecords);
    }

    toast.success(isNew ? "Product created!" : "Product updated!");
    router.push("/admin/products");
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">{isNew ? "New Product" : "Edit Product"}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input {...register("title")} placeholder="Product title" />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input {...register("slug")} placeholder="product-slug" />
                {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Short Description</Label>
                <Input {...register("short_description")} placeholder="Brief description for cards" />
              </div>
              <div className="space-y-2">
                <Label>Full Description</Label>
                <Textarea {...register("description")} placeholder="Detailed product description" rows={6} />
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader><CardTitle className="text-base">Images</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative h-24 w-24 overflow-hidden rounded-lg border">
                    <img src={img} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5"><X className="h-3 w-3 text-white" /></button>
                  </div>
                ))}
                <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border border-dashed hover:bg-accent transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Digital Files */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Digital Files</CardTitle>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={addTextFile} className="gap-1"><Plus className="h-3.5 w-3.5" /> Add Text</Button>
                  <label className="inline-flex">
                    <Button type="button" variant="outline" size="sm" className="gap-1" asChild><span><Upload className="h-3.5 w-3.5" /> Upload File</span></Button>
                    <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {files.map((file, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Input
                      value={file.name}
                      onChange={(e) => {
                        const newFiles = [...files];
                        newFiles[i].name = e.target.value;
                        setFiles(newFiles);
                      }}
                      className="h-8 text-sm max-w-xs"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFile(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {file.type === "text" && (
                    <Textarea
                      value={file.textContent || ""}
                      onChange={(e) => {
                        const newFiles = [...files];
                        newFiles[i].textContent = e.target.value;
                        setFiles(newFiles);
                      }}
                      placeholder="Enter text content..."
                      rows={4}
                      className="text-xs font-mono"
                    />
                  )}
                  {file.type === "upload" && file.url && (
                    <p className="text-xs text-muted-foreground">📁 {file.url}</p>
                  )}
                </div>
              ))}
              {files.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No files added yet</p>}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={watch("status")} onValueChange={(v) => setValue("status", v as "draft" | "active" | "archived")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={watch("category_id") || "none"} onValueChange={(v) => setValue("category_id", v === "none" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Featured</Label>
                <Switch checked={watch("is_featured")} onCheckedChange={(v) => setValue("is_featured", v)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Price</Label>
                <Input type="number" step="0.01" {...register("price")} placeholder="0.00" />
                {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Compare Price (optional)</Label>
                <Input type="number" step="0.01" {...register("compare_price")} placeholder="0.00" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Tags</CardTitle></CardHeader>
            <CardContent>
              <Input {...register("tags")} placeholder="tag1, tag2, tag3" />
              <p className="text-xs text-muted-foreground mt-1">Comma separated</p>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : isNew ? "Create Product" : "Update Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
