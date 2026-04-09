"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  EditPencil,
  Lock,
  Check,
  Xmark,
  ShieldCheck,
  Camera,
  Trash,
} from "iconoir-react";
import { usersApi, UserProfile, UpdateProfileDto } from "@/services/users-api";
import { toast } from "@/components/shared/Toast";

// Debounce timeout for preventing rapid saves
const SAVE_DEBOUNCE_MS = 500;

interface ProfileSectionProps {
  user: UserProfile | null;
  onUpdate: (user: UserProfile) => void;
}

type EditableFieldType =
  | "name"
  | "phone"
  | "profession"
  | "dateOfBirth"
  | "address";

interface EditableFieldProps {
  label: string;
  value: string;
  isEditing: boolean;
  isReadOnly?: boolean;
  readOnlyTooltip?: string;
  isKycLocked?: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
  validation?: (value: string) => string | null;
  placeholder?: string;
  type?: "text" | "tel" | "date";
}

/**
 * EditableField - Inline editable field component
 * Click to edit, Enter to save, Escape to cancel
 */
const EditableField: React.FC<EditableFieldProps> = ({
  label,
  value,
  isEditing,
  isReadOnly = false,
  readOnlyTooltip,
  isKycLocked = false,
  onEdit,
  onSave,
  onCancel,
  validation,
  placeholder,
  type = "text",
}) => {
  const t = useTranslations("account");
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setEditValue(value);
      setError(null);
      // Focus input when editing starts
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isEditing, value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const handleSave = () => {
    if (validation) {
      const validationError = validation(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    onSave(editValue);
  };

  // Read-only field (email or KYC-locked)
  if (isReadOnly || isKycLocked) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-gray-100">
        <div className="flex-1">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-[#171717] mt-0.5">{value || "-"}</p>
        </div>
        <div
          className={`flex items-center gap-2 ${isKycLocked ? "text-green-600" : "text-gray-400"}`}
          title={isKycLocked ? t("kycVerifiedTooltip") : readOnlyTooltip}
        >
          {isKycLocked ? (
            <ShieldCheck className="w-4 h-4" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="py-3 border-b border-gray-100">
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#87E64B] ${
              error ? "border-red-500" : "border-gray-300"
            }`}
            aria-invalid={!!error}
            aria-describedby={error ? `${label}-error` : undefined}
          />
          <button
            onClick={handleSave}
            className="p-2 text-[#87E64B] hover:bg-[#87E64B]/10 rounded"
            aria-label="Save"
          >
            <Check className="w-5 h-5" />
          </button>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded"
            aria-label="Cancel"
          >
            <Xmark className="w-5 h-5" />
          </button>
        </div>
        {error && (
          <p id={`${label}-error`} className="text-sm text-red-500 mt-1">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100">
      <div className="flex-1">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-[#171717] mt-0.5">{value || "-"}</p>
      </div>
      <button
        onClick={onEdit}
        className="p-2 text-gray-400 hover:text-[#171717] hover:bg-gray-100 rounded"
        aria-label={`Edit ${label}`}
      >
        <EditPencil className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * AvatarSection - Profile picture upload/management
 * Allows users to upload, change, or remove their avatar
 */
const AvatarSection: React.FC<{
  user: UserProfile | null;
  onUpdate: (user: UserProfile) => void;
}> = ({ user, onUpdate }) => {
  const t = useTranslations("account");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t("avatarInvalidType"));
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(t("avatarTooLarge"));
      return;
    }

    setIsUploading(true);
    try {
      const response = await usersApi.uploadAvatar(file);
      if (response.data) {
        // Update user with new avatar URL
        if (user) {
          const updatedUser = {
            ...user,
            profilePictureUrl: response.data.profilePictureUrl,
          };
          onUpdate(updatedUser);

          // Update localStorage
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            try {
              const parsed = JSON.parse(storedUser);
              parsed.profilePictureUrl = response.data.profilePictureUrl;
              localStorage.setItem("user", JSON.stringify(parsed));
              window.dispatchEvent(
                new CustomEvent("auth-state-change", {
                  detail: { isAuthenticated: true, user: parsed },
                }),
              );
            } catch {
              // Ignore parse errors
            }
          }
        }
        toast.success(t("avatarUploaded"));
      } else if (response.error) {
        toast.error(response.error.message || t("avatarUploadError"));
      }
    } catch {
      toast.error(t("avatarUploadError"));
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async () => {
    if (!user?.profilePictureUrl) return;

    setIsDeleting(true);
    try {
      const response = await usersApi.deleteAvatar();
      if (response.data?.success) {
        // Update user without avatar
        const updatedUser = { ...user, profilePictureUrl: undefined };
        onUpdate(updatedUser);

        // Update localStorage
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            delete parsed.profilePictureUrl;
            localStorage.setItem("user", JSON.stringify(parsed));
            window.dispatchEvent(
              new CustomEvent("auth-state-change", {
                detail: { isAuthenticated: true, user: parsed },
              }),
            );
          } catch {
            // Ignore parse errors
          }
        }
        toast.success(t("avatarDeleted"));
      } else if (response.error) {
        toast.error(response.error.message || t("avatarDeleteError"));
      }
    } catch {
      toast.error(t("avatarDeleteError"));
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = () => {
    if (!user?.name) return "?";
    const names = user.name.trim().split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return names[0].substring(0, 2).toUpperCase();
  };

  if (!user) return null;

  return (
    <div className="mb-6 pb-6 border-b border-gray-100">
      <div className="flex items-center gap-6">
        {/* Avatar */}
        <div className="relative group">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
            {user.profilePictureUrl ? (
              <Image
                src={user.profilePictureUrl}
                alt={user.name || "Avatar"}
                className="w-full h-full object-cover"
                width={96}
                height={96}
              />
            ) : (
              <span className="text-2xl font-bold text-gray-400">
                {getInitials()}
              </span>
            )}
          </div>

          {/* Overlay on hover */}
          <div
            className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="w-6 h-6 text-white" />
          </div>

          {/* Loading overlay */}
          {isUploading && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Upload controls */}
        <div className="flex-1">
          <p className="font-medium text-[#171717] mb-1">{t("avatarLabel")}</p>
          <p className="text-sm text-gray-500 mb-3">{t("avatarHint")}</p>
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 text-sm bg-[#87E64B] text-[#171717] rounded hover:bg-[#78d43f] disabled:opacity-50 font-bold transition-colors"
            >
              {isUploading ? t("uploading") : t("changeAvatar")}
            </button>
            {user.profilePictureUrl && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50 font-bold transition-colors flex items-center gap-1"
              >
                <Trash className="w-4 h-4" />
                {isDeleting ? t("deleting") : t("removeAvatar")}
              </button>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
};

/**
 * ProfileSection - User profile editing section
 * Story 17.5: Frontend Profile Settings Panel
 * Allows editing name, phone, profession, dateOfBirth, address
 * Note: name, dateOfBirth, address become read-only after KYC verification
 */
const ProfileSection: React.FC<ProfileSectionProps> = ({ user, onUpdate }) => {
  const t = useTranslations("account");
  const [editingField, setEditingField] = useState<EditableFieldType | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  // Debounce ref to prevent rapid saves
  const lastSaveTimeRef = useRef<number>(0);

  const validateName = (value: string): string | null => {
    if (value.trim().length < 2) {
      return t("nameMinLength");
    }
    if (value.length > 255) {
      return t("nameMaxLength");
    }
    return null;
  };

  const validatePhone = (value: string): string | null => {
    if (!value) return null; // Phone is optional
    // E.164 compatible validation - matches backend regex: /^\+?[1-9]\d{6,14}$/
    const cleanedPhone = value.replace(/\s/g, "");
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      return t("invalidPhoneNumber");
    }
    return null;
  };

  // Dispatch auth-state-change event to update other components (e.g., Header)
  const dispatchProfileUpdate = useCallback((updatedUser: UserProfile) => {
    if (typeof window !== "undefined") {
      // Update localStorage user data
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          const updated = {
            ...parsed,
            name: updatedUser.name,
            phoneNumber: updatedUser.phoneNumber,
            profession: updatedUser.profession,
          };
          localStorage.setItem("user", JSON.stringify(updated));

          // Dispatch event to notify other components
          window.dispatchEvent(
            new CustomEvent("auth-state-change", {
              detail: { isAuthenticated: true, user: updated },
            }),
          );
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, []);

  const handleSave = async (field: EditableFieldType, value: string) => {
    if (!user) return;

    // Debounce: prevent rapid saves within SAVE_DEBOUNCE_MS
    const now = Date.now();
    if (now - lastSaveTimeRef.current < SAVE_DEBOUNCE_MS) {
      return;
    }
    lastSaveTimeRef.current = now;

    setIsSaving(true);
    try {
      // Build update data based on field
      const updateData: UpdateProfileDto = {};
      switch (field) {
        case "name":
          updateData.name = value;
          break;
        case "phone":
          updateData.phoneNumber = value || undefined;
          break;
        case "profession":
          updateData.profession = value || undefined;
          break;
        case "dateOfBirth":
          updateData.dateOfBirth = value || undefined;
          break;
        case "address":
          updateData.address = value || undefined;
          break;
      }

      const response = await usersApi.updateProfile(updateData);

      if (response.data) {
        const updatedUser: UserProfile = {
          ...user,
          name: response.data.name,
          phoneNumber: response.data.phoneNumber,
          profession: response.data.profession,
          dateOfBirth: response.data.dateOfBirth,
          address: response.data.address,
          kycVerified: response.data.kycVerified,
          verifiedName: response.data.verifiedName,
          verifiedDob: response.data.verifiedDob,
          updatedAt: response.data.updatedAt,
        };
        onUpdate(updatedUser);
        dispatchProfileUpdate(updatedUser);
        toast.success(t("profileUpdated"));
        setEditingField(null);
      } else if (response.error) {
        // Enhanced error handling with specific messages
        const errorMessage = response.error.message || t("profileUpdateError");
        if (response.status === 400) {
          toast.error(errorMessage); // Validation error from backend
        } else if (response.status === 401) {
          toast.error(t("sessionExpired"));
        } else {
          toast.error(t("profileUpdateError"));
        }
      }
    } catch (error) {
      // Handle network errors or unexpected exceptions
      console.error("Profile update error:", error);
      toast.error(t("profileUpdateError"));
    } finally {
      setIsSaving(false);
    }
  };

  // Format date for display
  const formatDateDisplay = (date: Date | string | undefined): string => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format date for input value (YYYY-MM-DD)
  const formatDateInput = (date: Date | string | undefined): string => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  };

  if (!user) {
    return null;
  }

  const isKycVerified = user.kycVerified;

  return (
    <section>
      <h3 className="text-lg font-bold text-[#171717] mb-4">
        {t("profileSection")}
      </h3>

      {/* KYC Verified Badge */}
      {isKycVerified && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-700">
            {t("kycVerifiedBadge")}
          </span>
        </div>
      )}

      {/* Avatar Section */}
      <AvatarSection user={user} onUpdate={onUpdate} />

      <div className="space-y-1">
        {/* Name - Editable (locked after KYC) */}
        <EditableField
          label={t("nameLabel")}
          value={
            isKycVerified && user.verifiedName
              ? user.verifiedName
              : user.name || ""
          }
          isEditing={editingField === "name"}
          isKycLocked={isKycVerified}
          onEdit={() => setEditingField("name")}
          onSave={(value) => handleSave("name", value)}
          onCancel={() => setEditingField(null)}
          validation={validateName}
          placeholder={t("namePlaceholder")}
        />

        {/* Email - Read Only */}
        <EditableField
          label={t("emailLabel")}
          value={user.email}
          isEditing={false}
          isReadOnly={true}
          readOnlyTooltip={t("emailReadOnly")}
          onEdit={() => {}}
          onSave={() => {}}
          onCancel={() => {}}
        />

        {/* Phone - Always Editable */}
        <EditableField
          label={t("phoneLabel")}
          value={user.phoneNumber || ""}
          isEditing={editingField === "phone"}
          onEdit={() => setEditingField("phone")}
          onSave={(value) => handleSave("phone", value)}
          onCancel={() => setEditingField(null)}
          validation={validatePhone}
          placeholder={t("phonePlaceholder")}
          type="tel"
        />

        {/* Profession - Always Editable (optional) */}
        <EditableField
          label={t("professionLabel")}
          value={user.profession || ""}
          isEditing={editingField === "profession"}
          onEdit={() => setEditingField("profession")}
          onSave={(value) => handleSave("profession", value)}
          onCancel={() => setEditingField(null)}
          placeholder={t("professionPlaceholder")}
        />

        {/* Date of Birth - Always Editable */}
        <EditableField
          label={t("dateOfBirthLabel")}
          value={user.dateOfBirth ? formatDateDisplay(user.dateOfBirth) : ""}
          isEditing={editingField === "dateOfBirth"}
          onEdit={() => setEditingField("dateOfBirth")}
          onSave={(value) => handleSave("dateOfBirth", value)}
          onCancel={() => setEditingField(null)}
          placeholder={t("dateOfBirthPlaceholder")}
          type="date"
        />

        {/* Address - Always Editable */}
        <EditableField
          label={t("addressLabel")}
          value={user.address || ""}
          isEditing={editingField === "address"}
          onEdit={() => setEditingField("address")}
          onSave={(value) => handleSave("address", value)}
          onCancel={() => setEditingField(null)}
          placeholder={t("addressPlaceholder")}
        />
      </div>

      {isSaving && <p className="text-sm text-gray-500 mt-2">{t("saving")}</p>}
    </section>
  );
};

export default ProfileSection;
