import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import type { Community, CommunityBan } from "@/types";
import {
  ArrowLeft,
  Save,
  Trash2,
  Globe,
  Lock,
  UserPlus,
  Users,
  ShieldAlert,
  UserX,
} from "lucide-react";

export function CommunitySettingsPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [community, setCommunity] = useState<Community | null>(null);
  const [bans, setBans] = useState<CommunityBan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [allowMemberInvite, setAllowMemberInvite] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!uuid) return;
      try {
        const [communityData, bansData] = await Promise.all([
          api.getCommunity(uuid),
          api.getCommunityBans(uuid).catch(() => ({ bans: [] })),
        ]);

        if (communityData.myRole !== "owner" && communityData.myRole !== "admin") {
          navigate(`/communities/${uuid}`);
          return;
        }

        setCommunity(communityData);
        setBans(bansData.bans);
        setName(communityData.name);
        setDescription(communityData.description || "");
        setIsPublic(communityData.isPublic);
        setAllowMemberInvite(communityData.allowMemberInvite);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [uuid, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uuid || !name.trim()) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await api.updateCommunity(uuid, {
        name: name.trim(),
        description: description.trim(),
        isPublic,
        allowMemberInvite,
      });
      setCommunity(updated);
      setSuccess("Settings saved successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!uuid) return;
    if (!confirm("Are you sure you want to delete this community? This action cannot be undone. All posts will be deleted.")) {
      return;
    }
    if (!confirm("This is your last chance. Delete community and all its content?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.deleteCommunity(uuid);
      navigate("/communities");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete community");
      setIsDeleting(false);
    }
  };

  const handleUnban = async (userId: number, userName: string) => {
    if (!uuid || !confirm(`Are you sure you want to unban ${userName}?`)) return;
    try {
      await api.unbanUser(uuid, userId);
      setBans((prev) => prev.filter((b) => b.user.id !== userId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to unban user");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !community) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center py-12 text-destructive">{error}</div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center py-12 text-destructive">Community not found</div>
      </div>
    );
  }

  const isOwner = community.myRole === "owner";

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(`/communities/${uuid}`)}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">{community.name}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-500/10 text-green-600 rounded-lg">
            {success}
          </div>
        )}

        {/* Basic Info */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Basic Information
          </h2>

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
            />
          </div>
        </section>

        {/* Visibility */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Visibility</h2>

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
        </section>

        {/* Permissions */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Permissions</h2>

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
        </section>

        <button
          type="submit"
          disabled={isSaving || !name.trim()}
          className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Save Settings
        </button>
      </form>

      {/* Banned Users */}
      <section className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" />
          Banned Users
        </h2>

        {bans.length === 0 ? (
          <p className="text-muted-foreground text-sm">No banned users</p>
        ) : (
          <div className="space-y-2">
            {bans.map((ban) => (
              <div
                key={ban.user.id}
                className="flex items-center gap-4 p-4 border border-border rounded-lg"
              >
                {ban.user.icon ? (
                  <img
                    src={ban.user.icon}
                    alt={ban.user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-medium text-primary">
                      {ban.user.name?.charAt(0) || "?"}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{ban.user.name}</p>
                  <p className="text-sm text-muted-foreground">@{ban.user.uniqueid}</p>
                  {ban.reason && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Reason: {ban.reason}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleUnban(ban.user.id, ban.user.name)}
                  className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                  title="Unban"
                >
                  <UserX className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Danger Zone */}
      {isOwner && (
        <section className="mt-8 p-4 border border-destructive/50 rounded-lg">
          <h2 className="text-lg font-semibold text-destructive flex items-center gap-2 mb-4">
            <Trash2 className="w-5 h-5" />
            Danger Zone
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Deleting a community is permanent. All posts will be deleted and cannot be recovered.
          </p>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 disabled:opacity-50 transition-colors"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Delete Community
          </button>
        </section>
      )}
    </div>
  );
}

export default CommunitySettingsPage;
