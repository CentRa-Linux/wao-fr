import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { ArrowLeft, Users, Globe, Lock, UserPlus } from "lucide-react";

export function CommunityCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [allowMemberInvite, setAllowMemberInvite] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Community name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const community = await api.createCommunity({
        name: name.trim(),
        description: description.trim(),
        isPublic,
        allowMemberInvite,
      });
      navigate(`/communities/${community.uuid}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create community");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Create Community</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            Community Name *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="My Awesome Community"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {name.length}/100 characters
          </p>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            placeholder="What's your community about?"
          />
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Visibility</h3>

          <label className="flex items-start gap-4 p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="radio"
              name="visibility"
              checked={!isPublic}
              onChange={() => setIsPublic(false)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span className="font-medium">Invite Only</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Members can only join through invitations
              </p>
            </div>
          </label>

          <label className="flex items-start gap-4 p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="radio"
              name="visibility"
              checked={isPublic}
              onChange={() => setIsPublic(true)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span className="font-medium">Public</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Anyone can join this community
              </p>
            </div>
          </label>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Permissions</h3>

          <label className="flex items-start gap-4 p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="checkbox"
              checked={allowMemberInvite}
              onChange={(e) => setAllowMemberInvite(e.target.checked)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span className="font-medium">Allow members to invite</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Any member can invite new people. If disabled, only admins can invite.
              </p>
            </div>
          </label>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-border rounded-full hover:bg-muted transition-colors text-center"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
              <Users className="w-5 h-5" />
            )}
            <span>Create Community</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default CommunityCreatePage;
