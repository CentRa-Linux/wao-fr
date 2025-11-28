import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/authStore";
import { SlideViewer } from "@/components/SlideViewer";
import type { Post, PostVisibility } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

type UploadedComposerMedia = {
  id: number;
  url: string;
  mediaType: "image" | "video" | "slide";
  label?: string;
  isSensitive: boolean;
};

interface PostFormProps {
  onPostCreated?: ((post?: Post) => void) | (() => void);
  replyToPostId?: number;
  placeholder?: string;
  showLongPostButton?: boolean;
  communityUuid?: string;
}

export function PostForm({
  onPostCreated,
  replyToPostId,
  placeholder = "What's happening?",
  showLongPostButton = false,
  communityUuid,
}: PostFormProps) {
  const isCommunityPost = Boolean(communityUuid);
  const { user } = useAuthStore();
  const [content, setContent] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<UploadedComposerMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slideInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  const MAX_LENGTH = 280;
  const remainingChars = MAX_LENGTH - content.length;
  const isOverLimit = remainingChars < 0;
  if (!user) return null;

  const avatarSrc = user.icon ? `${BASE_URL}${user.icon}` : undefined;

  const resetForm = () => {
    setContent("");
    setUploadedMedia([]);
    setVisibility("public");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (slideInputRef.current) slideInputRef.current.value = "";
  };

  const handleToggleSensitive = async (mediaId: number, nextValue: boolean) => {
    setUploadedMedia((prev) =>
      prev.map((media) => (media.id === mediaId ? { ...media, isSensitive: nextValue } : media))
    );
    try {
      await api.updateMediaMetadata(mediaId, { isSensitive: nextValue });
    } catch (error) {
      console.error("Failed to update sensitivity:", error);
      setUploadedMedia((prev) =>
        prev.map((media) => (media.id === mediaId ? { ...media, isSensitive: !nextValue } : media))
      );
      setErrorMessage("センシティブ設定の更新に失敗しました");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const hasContent = content.trim().length > 0;
    const hasMedia = uploadedMedia.length > 0;

    if ((!hasContent && !hasMedia) || isOverLimit || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const post = await api.createPost({
        content: content.trim(),
        postType: replyToPostId ? "reply" : "normal",
        replyid: replyToPostId,
        mediaIds: uploadedMedia.map((media) => media.id),
        visibility: communityUuid ? "community" : visibility,
        communityUuid,
      });
      resetForm();
      onPostCreated?.(post);
    } catch (error) {
      console.error("Failed to create post:", error);
      setErrorMessage("投稿の作成に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!content.trim() || isSubmitting || replyToPostId) {
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createPost({
        content: content.trim(),
        isDraft: true,
        mediaIds: uploadedMedia.map((media) => media.id),
        visibility: communityUuid ? "community" : visibility,
        communityUuid,
      });
      resetForm();
    } catch (error) {
      console.error("Failed to save draft:", error);
      setErrorMessage("下書きの保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setIsUploading(true);
      setErrorMessage(null);
      try {
        for (const file of Array.from(files)) {
          if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
            setErrorMessage("画像または動画ファイルのみアップロード可能です");
            continue;
          }

          const result = await api.uploadMedia(file, false, file.name);
          const mediaType: "image" | "video" = file.type.startsWith("video/") ? "video" : "image";
          setUploadedMedia((prev) => [
            ...prev,
            { id: result.id, url: result.url, mediaType, label: file.name, isSensitive: result.isSensitive ?? false },
          ]);
        }
      } catch (error) {
        console.error("Failed to upload media:", error);
        setErrorMessage("メディアのアップロードに失敗しました");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

  const handleSlideSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setIsUploading(true);
      setErrorMessage(null);
      try {
        for (const file of Array.from(files)) {
          if (file.type !== "application/pdf") {
            setErrorMessage("PDF形式のスライドのみアップロード可能です");
            continue;
          }

          const result = await api.uploadMedia(file, false, file.name);
          setUploadedMedia((prev) => [
            ...prev,
            { id: result.id, url: result.url, mediaType: "slide", label: file.name, isSensitive: result.isSensitive ?? false },
          ]);
        }
      } catch (error) {
        console.error("Failed to upload slide:", error);
        setErrorMessage("スライドのアップロードに失敗しました");
      } finally {
        setIsUploading(false);
        if (slideInputRef.current) {
          slideInputRef.current.value = "";
        }
      }
    };

  const removeMedia = (index: number) => {
    setUploadedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="mb-4 mx-0 md:mx-0">
      <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
        {errorMessage && (
          <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md">
            {errorMessage}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="flex gap-3 md:gap-4">
            <div className="flex-shrink-0 hidden sm:block">
              <Avatar className="w-10 h-10 md:w-12 md:h-12">
                {avatarSrc ? (
                  <AvatarImage src={avatarSrc} alt={user.name} />
                ) : (
                  <AvatarFallback className="bg-blue-500 text-white font-bold">
                    {user.name[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={placeholder}
                className="w-full resize-none border-none bg-transparent text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                rows={3}
                disabled={isSubmitting}
              />

              {/* Media Preview */}
              <div className="mt-3">
                <AnimatePresence mode="popLayout">
                  {uploadedMedia.length > 0 && (
                    <motion.div 
                      layout 
                      className="grid grid-cols-2 gap-2"
                    >
                      {uploadedMedia.map((media, index) => {
                        const mediaUrl = `${BASE_URL}${media.url}`;
                        const wrapperClass = media.mediaType === "slide" ? "relative col-span-2" : "relative";
                        return (
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ type: "spring", bounce: 0.5 }}
                            key={`${media.id}-${index}`}
                            className={wrapperClass}
                            onClick={(event) => event.stopPropagation()}
                          >
                            {media.mediaType === "video" ? (
                              <video src={mediaUrl} className="w-full h-32 object-cover rounded-lg" controls />
                            ) : media.mediaType === "slide" ? (
                              <div className="rounded-lg border border-border bg-muted/50 p-3">
                                <SlideViewer src={mediaUrl} minHeight={160} />
                                <p className="mt-2 text-sm text-muted-foreground truncate">
                                  {media.label || "PDFスライド"}
                                </p>
                              </div>
                            ) : (
                              <img src={mediaUrl} alt={media.label || ""} className="w-full h-32 object-cover rounded-lg" />
                            )}
                            <label className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/60 text-white text-xs px-2 py-1 dark:bg-white/20 dark:text-gray-900">
                              <input
                                type="checkbox"
                                className="accent-white dark:accent-gray-900"
                                checked={media.isSensitive}
                                onChange={(event) => {
                                  event.stopPropagation();
                                  handleToggleSensitive(media.id, event.target.checked);
                                }}
                              />
                              <span>センシティブ</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => removeMedia(index)}
                              className="absolute top-1 right-1 bg-black/70 dark:bg-white/20 text-white dark:text-gray-900 rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80 dark:hover:bg-white/30"
                            >
                              ×
                            </button>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-col gap-2 md:gap-3 mt-3 pt-3 border-t border-border">
                {/* First row: media buttons, visibility, char count */}
                <div className="flex items-center gap-2 w-full">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isSubmitting}
                    className="text-muted-foreground border border-border bg-transparent rounded-full p-1.5 md:p-2 transition-colors btn-hover hover:text-foreground disabled:opacity-50 cursor-pointer"
                    title="画像・動画を追加"
                  >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <input
                    ref={slideInputRef}
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={handleSlideSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => slideInputRef.current?.click()}
                    disabled={isUploading || isSubmitting}
                    className="text-muted-foreground border border-border bg-transparent rounded-full p-1.5 md:p-2 transition-colors btn-hover hover:text-foreground disabled:opacity-50 cursor-pointer"
                    title="スライド（PDF）を追加"
                  >
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4h10a2 2 0 012 2v9.5L15 20H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 20v-4h4" />
                    </svg>
                  </button>
                  {!isCommunityPost && (
                    <select
                      value={visibility}
                      onChange={(event) => setVisibility(event.target.value as PostVisibility)}
                      className="text-xs md:text-sm border border-border rounded-full bg-transparent px-2 md:px-3 py-1 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/60"
                    >
                      <option value="public">公開</option>
                      <option value="followers">フォロワー限定</option>
                    </select>
                  )}
                  <div className="ml-auto">
                    <span
                      data-testid="composer-char-counter"
                      className={`text-xs md:text-sm ${
                        isOverLimit
                          ? "text-red-500 font-bold"
                          : remainingChars < 20
                          ? "text-amber-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {remainingChars}
                    </span>
                  </div>
                </div>

                {/* Second row: action buttons */}
                <div className="flex items-center gap-2 md:gap-3 justify-end flex-wrap">
                  {showLongPostButton && (
                    <button
                      type="button"
                      onClick={() => navigate(communityUuid ? `/blog/create?community=${communityUuid}` : "/blog/create")}
                      className="px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-primary/40 text-xs md:text-sm font-medium text-primary transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-primary active:bg-blue-200 dark:active:bg-blue-900/50 cursor-pointer"
                    >
                      ブログを書く
                    </button>
                  )}
                  {!replyToPostId && (
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={!content.trim() || isSubmitting || isUploading}
                      className="px-3 md:px-4 py-1.5 md:py-2 border border-border text-muted-foreground rounded-full text-xs md:text-sm transition-colors btn-hover hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      下書き
                    </button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={(!content.trim() && uploadedMedia.length === 0) || isOverLimit || isSubmitting || isUploading}
                    className="px-3 md:px-4 py-1.5 md:py-2 bg-primary text-primary-foreground border border-primary rounded-full text-xs md:text-sm font-bold transition-colors hover:opacity-80 active:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? "投稿中..." : replyToPostId ? "返信" : "投稿"}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
