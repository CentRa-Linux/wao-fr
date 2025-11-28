import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import type { Post } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { format } from "date-fns";

export function DraftsPage() {
  const [drafts, setDrafts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const draftPosts = await api.getDrafts();
      const sorted = [...draftPosts].sort((a, b) => b.createdAt - a.createdAt);
      setDrafts(sorted);
    } catch (err) {
      console.error("Failed to load drafts:", err);
      setError("下書きの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (draft: Post) => {
    setEditingDraftId(draft.id);
    setEditingContent(draft.content);
  };

  const cancelEditing = () => {
    setEditingDraftId(null);
    setEditingContent("");
  };

  const saveShortDraft = async () => {
    if (!editingDraftId) return;
    setPendingId(editingDraftId);
    try {
      await api.updatePost(editingDraftId, { content: editingContent, isDraft: true });
      cancelEditing();
      await loadDrafts();
    } catch (err) {
      console.error("Failed to update draft:", err);
      alert("下書きの更新に失敗しました");
    } finally {
      setPendingId(null);
    }
  };

  const publishDraft = async (draftId: number) => {
    setPendingId(draftId);
    try {
      await api.updatePost(draftId, { isDraft: false });
      await loadDrafts();
    } catch (err) {
      console.error("Failed to publish draft:", err);
      alert("公開に失敗しました");
    } finally {
      setPendingId(null);
    }
  };

  const deleteDraft = async (draftId: number) => {
    if (!confirm("この下書きを削除しますか？")) return;
    setPendingId(draftId);
    try {
      await api.deletePost(draftId);
      await loadDrafts();
    } catch (err) {
      console.error("Failed to delete draft:", err);
      alert("削除に失敗しました");
    } finally {
      setPendingId(null);
    }
  };

  const draftList = useMemo(() => drafts, [drafts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-500">
        読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4 text-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">下書き一覧</h1>
        <p className="text-sm text-gray-500">
          長文・通常投稿どちらの下書きもここから管理できます
        </p>
      </div>

      {draftList.length === 0 ? (
        <div className="text-center text-gray-500">下書きはありません。</div>
      ) : (
        draftList.map((draft) => {
          const isEditing = editingDraftId === draft.id;
          const isProcessing = pendingId === draft.id;
          return (
            <Card key={draft.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      {draft.isLong ? "ブログ下書き" : "通常投稿の下書き"}
                    </p>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {draft.isLong ? draft.title || "タイトル未設定" : draft.content.slice(0, 40) || "(内容なし)"}
                    </h2>
                    <p className="text-xs text-gray-400">
                      {format(new Date(draft.createdAt * 1000), "yyyy/MM/dd HH:mm")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {draft.isLong ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/blog/edit/${draft.id}`)}
                        className="px-3 py-1 text-sm border border-border rounded-md btn-hover"
                      >
                        編集
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditing(draft)}
                        className="px-3 py-1 text-sm border border-border rounded-md btn-hover"
                      >
                        編集
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => publishDraft(draft.id)}
                      disabled={isProcessing}
                      className="px-3 py-1 text-sm border rounded-md text-green-600 border-green-200 hover:bg-green-50 disabled:opacity-50"
                    >
                      公開
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteDraft(draft.id)}
                      disabled={isProcessing}
                      className="px-3 py-1 text-sm border rounded-md text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {draft.isLong ? (
                  <p className="text-gray-600 whitespace-pre-line">
                    {draft.content.slice(0, 160)}{draft.content.length > 160 ? "…" : ""}
                  </p>
                ) : isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      rows={4}
                      className="w-full border rounded-md p-2"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="px-3 py-1 text-sm border rounded-md"
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        onClick={saveShortDraft}
                        disabled={isProcessing}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md disabled:opacity-50"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap">{draft.content}</p>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
