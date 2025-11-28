import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { CommunityInvite, InviteAcceptFrom } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import {
  Mail,
  Check,
  X,
  Users,
  Settings,
  Globe,
  Lock,
  UserCheck,
  Ban,
} from "lucide-react";

export function CommunityInvitesPage() {
  const { user } = useAuthStore();
  const [invites, setInvites] = useState<CommunityInvite[]>([]);
  const [acceptFrom, setAcceptFrom] = useState<InviteAcceptFrom>("following");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invitesData, settingsData] = await Promise.all([
          api.getMyInvites(),
          api.getInviteSettings(),
        ]);
        setInvites(invitesData.invites);
        setAcceptFrom(settingsData.acceptFrom);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invites");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAccept = async (inviteId: number) => {
    setProcessingIds((prev) => new Set(prev).add(inviteId));
    try {
      await api.acceptInvite(inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(inviteId);
        return next;
      });
    }
  };

  const handleDecline = async (inviteId: number) => {
    setProcessingIds((prev) => new Set(prev).add(inviteId));
    try {
      await api.declineInvite(inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to decline invite");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(inviteId);
        return next;
      });
    }
  };

  const handleUpdateSettings = async (newValue: InviteAcceptFrom) => {
    setIsSavingSettings(true);
    try {
      await api.updateInviteSettings(newValue);
      setAcceptFrom(newValue);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center py-12">
          <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Community Invites</h2>
          <p className="text-muted-foreground mb-4">Sign in to view your invites</p>
          <Link to="/signin" className="text-primary hover:underline">Sign in</Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center py-12 text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Community Invites</h1>

      {/* Invite Settings */}
      <section className="mb-8 p-4 border border-border rounded-lg">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5" />
          Invite Settings
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Control who can send you community invites
        </p>

        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="radio"
              name="acceptFrom"
              checked={acceptFrom === "following"}
              onChange={() => handleUpdateSettings("following")}
              disabled={isSavingSettings}
            />
            <UserCheck className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <span className="font-medium">People I follow</span>
              <p className="text-sm text-muted-foreground">Accept invites from users you follow</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="radio"
              name="acceptFrom"
              checked={acceptFrom === "mutual"}
              onChange={() => handleUpdateSettings("mutual")}
              disabled={isSavingSettings}
            />
            <Users className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <span className="font-medium">Mutual followers</span>
              <p className="text-sm text-muted-foreground">Accept invites only from mutual followers</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="radio"
              name="acceptFrom"
              checked={acceptFrom === "anyone"}
              onChange={() => handleUpdateSettings("anyone")}
              disabled={isSavingSettings}
            />
            <Globe className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <span className="font-medium">Anyone</span>
              <p className="text-sm text-muted-foreground">Accept invites from anyone</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="radio"
              name="acceptFrom"
              checked={acceptFrom === "nobody"}
              onChange={() => handleUpdateSettings("nobody")}
              disabled={isSavingSettings}
            />
            <Ban className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <span className="font-medium">Nobody</span>
              <p className="text-sm text-muted-foreground">Block all community invites</p>
            </div>
          </label>
        </div>
      </section>

      {/* Pending Invites */}
      <section>
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5" />
          Pending Invites
          {invites.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
              {invites.length}
            </span>
          )}
        </h2>

        {invites.length === 0 ? (
          <div className="text-center py-12 border border-border rounded-lg bg-muted/30">
            <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No pending invites</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="p-4 border border-border rounded-lg"
              >
                <div className="flex items-start gap-4">
                  {invite.community.icon ? (
                    <img
                      src={invite.community.icon}
                      alt={invite.community.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{invite.community.name}</h3>
                      <span title={invite.community.isPublic ? "Public" : "Invite only"}>
                        {invite.community.isPublic ? (
                          <Globe className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </span>
                    </div>
                    {invite.community.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {invite.community.description}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">
                      Invited by{" "}
                      <Link
                        to={`/profile/${invite.inviter.uniqueid}`}
                        className="text-primary hover:underline"
                      >
                        @{invite.inviter.uniqueid}
                      </Link>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => handleAccept(invite.id)}
                    disabled={processingIds.has(invite.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {processingIds.has(invite.id) ? (
                      <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Accept
                  </button>
                  <button
                    onClick={() => handleDecline(invite.id)}
                    disabled={processingIds.has(invite.id)}
                    className="flex items-center gap-2 px-4 py-2 border border-border rounded-full hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default CommunityInvitesPage;
