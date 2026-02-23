import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Activity, BarChart3, Clock3, RefreshCw, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NeonBox, NeonText } from "@/components/NeonGlow";
import { fetchVisitStats } from "@/lib/visitsApi";

const formatDay = (dayValue) => {
  if (!dayValue) return "-";
  return new Date(`${dayValue}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
};

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total_visits: 0,
    visits_last_24h: 0,
    visits_last_7d: 0,
    daily_visits: [],
    top_paths: [],
  });

  const loadStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchVisitStats();
      setStats(data);
    } catch (err) {
      setError(err.message || "Nao foi possivel carregar analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const dailyVisitsAscending = useMemo(() => {
    return [...stats.daily_visits].sort((a, b) =>
      String(a.day).localeCompare(String(b.day))
    );
  }, [stats.daily_visits]);

  const maxDailyVisits = useMemo(() => {
    return dailyVisitsAscending.reduce(
      (max, entry) => Math.max(max, Number(entry.visits || 0)),
      0
    );
  }, [dailyVisitsAscending]);

  return (
    <div className="min-h-screen pt-32 pb-20 bg-gray-950 relative">
      <Helmet>
        <title>Analytics | Kaiky Brito</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>

      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-cyan-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-pink-500 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              <NeonText color="cyan" intensity="high">
                Analytics
              </NeonText>
            </h1>
            <p className="text-gray-400">
              Painel de visitas por rota do portfolio.
            </p>
          </div>
          <Button
            onClick={loadStats}
            disabled={loading}
            variant="outline"
            className="border-cyan-400/60 text-cyan-300 hover:bg-cyan-400 hover:text-gray-900"
          >
            <RefreshCw size={16} className="mr-2" />
            Atualizar
          </Button>
        </div>

        {error ? (
          <NeonBox color="magenta" className="p-6 bg-gray-900/70 border-red-500/40">
            <p className="text-red-300">{error}</p>
          </NeonBox>
        ) : null}

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <NeonBox color="cyan" className="p-6 bg-gray-900/70">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-2">
              <Activity size={14} />
              Visitas Totais
            </p>
            <p className="text-4xl font-bold text-cyan-300">
              {loading ? "..." : stats.total_visits}
            </p>
          </NeonBox>

          <NeonBox color="accent" className="p-6 bg-gray-900/70">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-2">
              <Clock3 size={14} />
              Ultimas 24h
            </p>
            <p className="text-4xl font-bold text-cyan-300">
              {loading ? "..." : stats.visits_last_24h}
            </p>
          </NeonBox>

          <NeonBox color="magenta" className="p-6 bg-gray-900/70">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-2">
              <BarChart3 size={14} />
              Ultimos 7 dias
            </p>
            <p className="text-4xl font-bold text-pink-400">
              {loading ? "..." : stats.visits_last_7d}
            </p>
          </NeonBox>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <NeonBox color="cyan" className="p-6 bg-gray-900/70">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <BarChart3 size={18} className="text-cyan-300" />
              Visitas por dia (7 dias)
            </h2>

            {loading ? (
              <p className="text-gray-400">Carregando...</p>
            ) : dailyVisitsAscending.length === 0 ? (
              <p className="text-gray-500">Sem dados ainda.</p>
            ) : (
              <div className="space-y-3">
                {dailyVisitsAscending.map((entry) => {
                  const value = Number(entry.visits || 0);
                  const width =
                    maxDailyVisits > 0 ? Math.max((value / maxDailyVisits) * 100, 4) : 4;

                  return (
                    <div key={entry.day}>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{formatDay(entry.day)}</span>
                        <span>{value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-pink-500"
                          style={{ width: `${width}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </NeonBox>

          <NeonBox color="magenta" className="p-6 bg-gray-900/70">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Route size={18} className="text-pink-400" />
              Rotas mais acessadas
            </h2>

            {loading ? (
              <p className="text-gray-400">Carregando...</p>
            ) : stats.top_paths.length === 0 ? (
              <p className="text-gray-500">Sem dados ainda.</p>
            ) : (
              <div className="space-y-3">
                {stats.top_paths.map((entry) => (
                  <div
                    key={entry.path}
                    className="flex justify-between items-center gap-3 bg-gray-800/60 rounded-md px-3 py-2 border border-gray-700"
                  >
                    <span className="text-sm text-gray-200 break-all">{entry.path}</span>
                    <span className="text-sm font-semibold text-pink-300">{entry.visits}</span>
                  </div>
                ))}
              </div>
            )}
          </NeonBox>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;

