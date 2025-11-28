import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { Community } from "@/types";
import { Plus, Users, Lock, Globe } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export function CommunitiesPage() {
  const { user } = useAuthStore();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const result = await api.getMyCommunities();
        setCommunities(result.communities);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load communities");
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchCommunities();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Communities</h2>
          <p className="text-muted-foreground mb-4">Sign in to join and create communities</p>
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Communities</h1>
        <Link
          to="/communities/create"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create</span>
        </Link>
      </div>

      {communities.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-lg bg-muted/30">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">No communities yet</h2>
          <p className="text-muted-foreground mb-4">
            Create a community or accept an invite to get started
          </p>
          <Link
            to="/communities/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Create your first community
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {communities.length} / 10 communities
          </p>
          {communities.map((community) => (
            <CommunityCard key={community.id} community={community} />
          ))}
        </div>
      )}
    </div>
  );
}

function CommunityCard({ community }: { community: Community }) {
  return (
    <Link
      to={`/communities/${community.uuid}`}
      className="block p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start gap-4">
        {community.icon ? (
          <img
            src={community.icon}
            alt={community.name}
            className="w-12 h-12 rounded-lg object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{community.name}</h3>
            <span title={community.isPublic ? "Public" : "Invite only"}>
              {community.isPublic ? (
                <Globe className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Lock className="w-4 h-4 text-muted-foreground" />
              )}
            </span>
          </div>
          {community.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {community.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>{community.memberCount} members</span>
            {community.myRole && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                {community.myRole}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default CommunitiesPage;
