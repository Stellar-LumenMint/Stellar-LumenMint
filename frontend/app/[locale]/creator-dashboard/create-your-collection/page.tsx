"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { API_CONFIG } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useToast } from "@/lib/stores";
import { uploadToFirebase } from "@/lib/firebase/uploadtofirebase";
import { getCookie } from "@/lib/CSRFTOKEN";
import { FileDropZone } from "@/lib";
import type { FileWithMeta } from "@/lib/interfaces";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/lib/stores/auth-store";
import { getValidationFieldMessage } from "@/utils/fetchUtils";
import { useLocalizedRoute } from "@/lib/routing";

interface CreateCollectionForm {
  contractAddress: string;
  name: string;
  symbol: string;
  description: string;
}

interface FormErrors {
  contractAddress?: string;
  name?: string;
  symbol?: string;
  description?: string;
  imageUrl?: string;
  general?: string;
}

export default function CreateYourCollection() {
  const { t } = useTranslation();
  const { locale } = useTranslation();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const localizedRoute = useLocalizedRoute();

  const [form, setForm] = useState<CreateCollectionForm>({
    contractAddress: "",
    name: "",
    symbol: "",
    description: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithMeta[]>([]);
  const [bannerFiles, setBannerFiles] = useState<FileWithMeta[]>([]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.contractAddress.trim() || form.contractAddress.trim().length !== 56) {
      newErrors.contractAddress = "Contract address must be a valid 56-character Stellar address";
    }

    if (!form.name.trim()) {
      newErrors.name = t("createCollection.errors.nameRequired");
    } else if (form.name.trim().length > 255) {
      newErrors.name = t("createCollection.errors.nameMaxLength");
    }

    if (!form.symbol.trim()) {
      newErrors.symbol = "Symbol is required";
    } else if (form.symbol.trim().length > 50) {
      newErrors.symbol = "Symbol must be 50 characters or less";
    }

    if (selectedFiles.length === 0) {
      newErrors.imageUrl = "Collection image is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    field: keyof CreateCollectionForm,
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setErrors({});
    setIsLoading(true);

    try {
      const csrfToken = await getCookie();

      // Upload required image
      const imageUrl = await uploadToFirebase(selectedFiles[0].file);

      // Upload optional banner image
      let bannerImageUrl: string | undefined;
      if (bannerFiles.length > 0) {
        bannerImageUrl = await uploadToFirebase(bannerFiles[0].file);
      }

      const payload: Record<string, unknown> = {
        contractAddress: form.contractAddress.trim(),
        name: form.name.trim(),
        symbol: form.symbol.trim(),
        imageUrl,
        ...(form.description.trim() && { description: form.description.trim() }),
        ...(bannerImageUrl && { bannerImageUrl }),
        ...(user?.id && { creatorId: user.id }),
      };

      const res = await fetch(`${API_CONFIG.baseUrl}/collections`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const serverNameErr = getValidationFieldMessage(err, "name");
        const serverDescErr = getValidationFieldMessage(err, "description");
        if (serverNameErr || serverDescErr) {
          setErrors({
            name: serverNameErr,
            description: serverDescErr,
            general: err.message || t("createCollection.errors.failedToCreate"),
          });
        }
        throw new Error(err.message || t("createCollection.errors.failedToCreate"));
      }

      setSuccess(true);
      showSuccess(t("createCollection.success"));

      setTimeout(() => {
        router.push(localizedRoute("/creator-dashboard/collections"));
      }, 2000);
    } catch (error: any) {
      console.error("Error creating collection:", error);
      const errorMessage = error.message || t("createCollection.errors.failedToCreate");
      setErrors((prev) => ({ ...prev, general: errorMessage }));
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[100vh] bg-lumen-background flex items-center justify-center">
        <Card className="w-full max-w-md bg-lumen-card border border-lumen-border backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold text-lumen-text mb-2">
              {t("createCollection.collectionCreated")}
            </h2>
            <p className="text-lumen-subtext mb-4">
              {t("createCollection.collectionCreatedMessage")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100vh] mt-10 bg-lumen-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-lumen-text mb-4">
            {t("createCollection.title")}
          </h1>
          <p className="text-lumen-subtext text-lg">
            {t("createCollection.subtitle")}
          </p>
        </div>

        {errors.general && (
          <Alert className="mb-6 border-red-500/50 bg-red-500/10">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-200">{errors.general}</AlertDescription>
          </Alert>
        )}

        <div className="bg-lumen-card border border-lumen-border backdrop-blur-sm w-full rounded-lg">
          <CardHeader>
            <CardTitle className="text-lumen-text text-2xl">
              {t("createCollection.collectionDetails")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contract Address */}
              <div className="space-y-2">
                <Label htmlFor="contractAddress" className="text-lumen-text font-medium">
                  Contract Address *
                </Label>
                <Input
                  id="contractAddress"
                  type="text"
                  placeholder="GABC...XYZ (56 characters)"
                  value={form.contractAddress}
                  onChange={(e) => handleInputChange("contractAddress", e.target.value)}
                  className={cn(
                    "bg-lumen-bg border-lumen-border text-lumen-text placeholder-lumen-subtext",
                    errors.contractAddress && "border-red-500/70"
                  )}
                  maxLength={56}
                />
                {errors.contractAddress && (
                  <p className="text-red-300 text-sm">{errors.contractAddress}</p>
                )}
              </div>

              {/* Collection Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-lumen-text font-medium">
                  {t("createCollection.collectionName")} *
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t("createCollection.collectionNamePlaceholder")}
                  value={form.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={cn(
                    "bg-lumen-bg border-lumen-border text-lumen-text placeholder-lumen-subtext",
                    errors.name && "border-red-500/70"
                  )}
                  maxLength={255}
                />
                {errors.name && <p className="text-red-300 text-sm">{errors.name}</p>}
              </div>

              {/* Symbol */}
              <div className="space-y-2">
                <Label htmlFor="symbol" className="text-lumen-text font-medium">
                  Symbol *
                </Label>
                <Input
                  id="symbol"
                  type="text"
                  placeholder="e.g. MYC"
                  value={form.symbol}
                  onChange={(e) => handleInputChange("symbol", e.target.value.toUpperCase())}
                  className={cn(
                    "bg-lumen-bg border-lumen-border text-lumen-text placeholder-lumen-subtext",
                    errors.symbol && "border-red-500/70"
                  )}
                  maxLength={50}
                />
                {errors.symbol && <p className="text-red-300 text-sm">{errors.symbol}</p>}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-lumen-text font-medium">
                  {t("createCollection.description")}
                </Label>
                <Textarea
                  id="description"
                  placeholder={t("createCollection.descriptionPlaceholder")}
                  value={form.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="bg-lumen-bg border-lumen-border text-lumen-text placeholder-lumen-subtext min-h-[120px]"
                  maxLength={500}
                />
                {errors.description && (
                  <p className="text-red-400 text-xs font-medium mt-1">
                    {errors.description}
                  </p>
                )}
                <p className="text-lumen-subtext text-xs">
                  {form.description.length}/500 {t("createCollection.characters")}
                </p>
              </div>

              {/* Collection Image (required) */}
              <div className="space-y-2">
                <label className="block text-sm text-lumen-text font-medium">
                  Collection Image *
                </label>
                <FileDropZone
                  onFilesSelected={setSelectedFiles}
                  accept={["image/*"]}
                  maxSizeMB={10}
                />
                {errors.imageUrl && <p className="text-red-300 text-sm">{errors.imageUrl}</p>}
              </div>

              {/* Banner Image (optional) */}
              <div className="space-y-2">
                <label className="block text-sm text-lumen-text font-medium">
                  {t("createCollection.uploadBannerImage")} (optional)
                </label>
                <FileDropZone
                  onFilesSelected={setBannerFiles}
                  accept={["image/*"]}
                  maxSizeMB={10}
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-lg bg-lumen-teal text-lumen-text font-bold hover:bg-lumen-hover transition duration-200 disabled:opacity-50"
              >
                {isLoading ? t("createCollection.creating") : t("createCollection.createCollection")}
              </Button>
            </form>
          </CardContent>
        </div>

        <div className="mt-8 text-center">
          <p className="text-lumen-subtext text-sm">
            {t("createCollection.needHelp")}{" "}
            <a href="#" className="text-lumen-teal hover:text-lumen-teal-dim underline transition-colors">
              {t("createCollection.collectionGuide")}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
