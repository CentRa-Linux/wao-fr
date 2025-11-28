import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { Community, CommunityMember } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import {
  ArrowLeft,
  Crown,
  Shield,
  UserMinus,
  ShieldPlus,
  ShieldMinus,
  Ban,
  UserPlus,
} from "lucide-react";

export function CommunityMembersPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteUsername, setInviteUsername] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!uuid) return;
      try {
        const [communityData, membersData] = await Promise.all([
          api.getCommunity(uuid),
          api.getCommunityMembers(uuid),
        ]);
        setCommunity(communityData);
        setMembers(membersData.members);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load members");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [uuid]);

  const canManage = community?.myRole === "owner" || community?.myRole === "admin";
  const isOwner = community?.myRole === "owner";

  const handleKick = async (userId: number, userName: string) => {
    if (!uuid || !confirm(`Are you sure you want to remove ${userName} from this community?`)) return;
    try {
      await api.kickMember(uuid, userId);
      setMembers((prev) => prev.filter((m) => m.user.id !== userId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to kick member");
    }
  };

  const handlePromote = async (userId: number) => {
    if (!uuid) return;
    try {
      await api.promoteMember(uuid, userId);
      setMembers((prev) =>
        prev.map((m) => (m.user.id === userId ? { ...m, role: "admin" } : m))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to promote member");
    }
  };

  const handleDemote = async (userId: number) => {
    if (!uuid) return;
    try {
      await api.demoteMember(uuid, userId);
      setMembers((prev) =>
        prev.map((m) => (m.user.id === userId ? { ...m, role: "member" } : m))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to demote admin");
    }
  };

  const handleBan = async (userId: number, userName: string) => {
    if (!uuid) return;
    const reason = prompt(`Enter a reason for banning ${userName} (optional):`);
    if (reason === null) return; // Cancelled
    try {
      await api.banUser(uuid, userId, reason || undefined);
      setMembers((prev) => prev.filter((m) => m.user.id !== userId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to ban user");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uuid || !inviteUsername.trim()) return;

    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      await api.inviteUser(uuid, inviteUsername.trim());
      setInviteSuccess(`Invitation sent to @${inviteUsername}`);
      setInviteUsername("");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setIsInviting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center py-12 text-destructive">
          {error || "Community not found"}
        </div>
      </div>
    );
  }

  const canInvite = community.allowMemberInvite ? community.isMember : canManage;

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
          <h1 className="text-xl font-bold">Members</h1>
          <p className="text-sm text-muted-foreground">{community.name}</p>
        </div>
      </div>

      {/* Invite Form */}
      {canInvite && (
        <div className="mb-6 p-4 border border-border rounded-lg">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Invite User
          </h3>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              placeholder="Username (without @)"
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={isInviting || !inviteUsername.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {isInviting ? "Sending..." : "Invite"}
            </button>
          </form>
          {inviteError && (
            <p className="mt-2 text-sm text-destructive">{inviteError}</p>
          )}
          {inviteSuccess && (
            <p className="mt-2 text-sm text-green-600">{inviteSuccess}</p>
          )}
        </div>
      )}

      {/* Members List */}
      <div className="space-y-2">
        {members.map((member) => {
          const isMe = member.user.id === user?.id;
          const canKick = canManage && !isMe && member.role !== "owner" &&
            (isOwner || member.role !== "admin");
          const canBan = canManage && !isMe && member.role !== "owner" &&
            (isOwner || member.role !== "admin");
          const canPromoteDemote = isOwner && !isMe && member.role !== "owner";

          return (
            <div
              key={member.user.id}
              className="flex items-center gap-4 p-4 border border-border rounded-lg"
            >
              <Link to={`/profile/${member.user.uniqueid}`}>
                {member.user.icon ? (
                  <img
                    src={member.user.icon}
                    alt={member.user.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-medium text-primary">
                      {member.user.name?.charAt(0) || "?"}
                    </span>
                  </div>
                )}
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/profile/${member.user.uniqueid}`}
                    className="font-medium hover:underline truncate"
                  >
                    {member.user.name}
                  </Link>
                  {member.role === "owner" && (
                    <span title="Owner">
                      <Crown className="w-4 h-4 text-yellow-500" />
                    </span>
                  )}
                  {member.role === "admin" && (
                    <span title="Admin">
                      <Shield className="w-4 h-4 text-blue-500" />
                    </span>
                  )}
                  {isMe && (
                    <span className="text-xs text-muted-foreground">(you)</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  @{member.user.uniqueid}
                </p>
              </div>

              {(canKick || canPromoteDemote || canBan) && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {canPromoteDemote && member.role === "member" && (
                    <button
                      onClick={() => handlePromote(member.user.id)}
                      className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-full transition-colors"
                      title="Promote to Admin"
                    >
                      <ShieldPlus className="w-4 h-4" />
                    </button>
                  )}
                  {canPromoteDemote && member.role === "admin" && (
                    <button
                      onClick={() => handleDemote(member.user.id)}
                      className="p-2 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 rounded-full transition-colors"
                      title="Demote to Member"
                    >
                      <ShieldMinus className="w-4 h-4" />
                    </button>
                  )}
                  {canKick && (
                    <button
                      onClick={() => handleKick(member.user.id, member.user.name)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                      title="Remove from Community"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                  {canBan && (
                    <button
                      onClick={() => handleBan(member.user.id, member.user.name)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                      title="Ban User"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CommunityMembersPage;
