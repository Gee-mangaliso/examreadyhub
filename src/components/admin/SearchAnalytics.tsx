import { useState, useEffect } from "react";
import { Search, TrendingUp, Users, Clock } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface SearchStat {
  query: string;
  count: number;
  unique_users: number;
  last_searched: string;
}

const SearchAnalytics = () => {
  const [stats, setStats] = useState<SearchStat[]>([]);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      // Get all search history
      const { data } = await supabase
        .from("search_history")
        .select("query, user_id, created_at, result_count")
        .order("created_at", { ascending: false })
        .limit(500);

      if (!data) { setLoading(false); return; }

      // Aggregate by query
      const agg: Record<string, { count: number; users: Set<string>; last: string }> = {};
      data.forEach((row) => {
        const q = row.query.toLowerCase().trim();
        if (!agg[q]) agg[q] = { count: 0, users: new Set(), last: row.created_at };
        agg[q].count++;
        agg[q].users.add(row.user_id);
        if (row.created_at > agg[q].last) agg[q].last = row.created_at;
      });

      const sorted = Object.entries(agg)
        .map(([query, val]) => ({
          query,
          count: val.count,
          unique_users: val.users.size,
          last_searched: val.last,
        }))
        .sort((a, b) => b.count - a.count);

      setStats(sorted.slice(0, 30));
      setRecentSearches(data.slice(0, 20));
      setLoading(false);
    };
    fetch();
  }, []);

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading analytics…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-heading text-foreground">Search Analytics</h2>
      </div>
      <p className="text-sm text-muted-foreground">See what students are searching for across the platform.</p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10"><Search className="h-5 w-5 text-primary" /></div>
            <span className="text-sm text-muted-foreground">Unique Queries</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.length}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
            <span className="text-sm text-muted-foreground">Total Searches</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.reduce((s, q) => s + q.count, 0)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5 shadow-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
            <span className="text-sm text-muted-foreground">Top Query</span>
          </div>
          <div className="text-lg font-bold text-foreground truncate">{stats[0]?.query || "—"}</div>
        </div>
      </div>

      {/* Popular queries table */}
      <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-heading text-lg text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Most Searched Queries
          </h3>
        </div>
        {stats.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No search data yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Query</TableHead>
                <TableHead className="text-center">Searches</TableHead>
                <TableHead className="text-center">Unique Students</TableHead>
                <TableHead>Last Searched</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((s, i) => (
                <TableRow key={s.query}>
                  <TableCell className="text-muted-foreground font-medium">{i + 1}</TableCell>
                  <TableCell className="font-medium text-foreground">{s.query}</TableCell>
                  <TableCell className="text-center text-foreground">{s.count}</TableCell>
                  <TableCell className="text-center text-foreground">{s.unique_users}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatTimeAgo(s.last_searched)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Recent searches */}
      <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-heading text-lg text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Recent Searches
          </h3>
        </div>
        {recentSearches.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No recent searches.</div>
        ) : (
          <div className="divide-y divide-border max-h-72 overflow-y-auto">
            {recentSearches.map((s, i) => (
              <div key={`${s.query}-${i}`} className="px-6 py-3 flex items-center gap-3">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground flex-1">{s.query}</span>
                <span className="text-xs text-muted-foreground">{s.result_count} results</span>
                <span className="text-[10px] text-muted-foreground/60">{formatTimeAgo(s.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchAnalytics;
